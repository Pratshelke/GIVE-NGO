// server/cron/donationRequestScheduler.js
// CRON scheduler for sequential NGO notifications based on proximity

const cron = require('node-cron');
const Donation = require('../models/Donation');
const Request = require('../models/Request');
const User = require('../models/User');
const { haversineDistance } = require('../utils/haversine');

// Track if scheduler is already running (singleton pattern)
let isSchedulerRunning = false;

/**
 * Start the donation request scheduler
 * Runs every 1 minute (CRON: every-1-minute)
 */
function startDonationScheduler() {
    // Prevent duplicate scheduler registration
    if (isSchedulerRunning) {
        console.log('[CRON] Donation scheduler already running, skipping duplicate registration');
        return;
    }

    isSchedulerRunning = true;

    console.log('[CRON] Donation scheduler started - runs every 1 minute');

    // Schedule job to run every minute
    cron.schedule('*/1 * * * *', async () => {
        const now = new Date();
        console.log(`\n[CRON] ========== Scheduler run at ${now.toISOString()} ==========`);

        try {
            // ============================================
            // STEP 1: Expire donations past their expiresAt
            // ============================================
            const expiredDonationsResult = await Donation.updateMany(
                {
                    expiresAt: { $lte: now },
                    status: { $nin: ['completed', 'expired'] }
                },
                { $set: { status: 'expired' } }
            );

            if (expiredDonationsResult.modifiedCount > 0) {
                console.log(`[CRON] Step 1: Expired ${expiredDonationsResult.modifiedCount} donation(s)`);

                // Also expire all pending requests for these donations
                const expiredDonations = await Donation.find({
                    status: 'expired',
                    expiresAt: { $lte: now }
                }).select('_id');

                const donationIds = expiredDonations.map(d => d._id);

                if (donationIds.length > 0) {
                    const expiredRequestsResult = await Request.updateMany(
                        {
                            donationId: { $in: donationIds },
                            status: 'pending'
                        },
                        { $set: { status: 'expired' } }
                    );

                    if (expiredRequestsResult.modifiedCount > 0) {
                        console.log(`[CRON] Step 1: Expired ${expiredRequestsResult.modifiedCount} related request(s)`);
                    }
                }
            } else {
                console.log('[CRON] Step 1: No donations to expire');
            }

            // ============================================
            // STEP 2: Expire requests past their expiresAt
            // ============================================
            const expiredRequestsResult = await Request.updateMany(
                {
                    status: 'pending',
                    expiresAt: { $lte: now }
                },
                { $set: { status: 'expired' } }
            );

            if (expiredRequestsResult.modifiedCount > 0) {
                console.log(`[CRON] Step 2: Expired ${expiredRequestsResult.modifiedCount} timed-out request(s)`);
            } else {
                console.log('[CRON] Step 2: No requests to expire');
            }

            // ============================================
            // STEP 3: Find donations needing NGO assignment
            // ============================================
            // Only select donations that are:
            // - status = 'pending' (NOT reserved, completed, expired, or in_transit)
            // - expiresAt > now (not yet expired)
            // - Have no pending request
            const pendingDonations = await Donation.find({
                status: 'pending',
                expiresAt: { $gt: now }
            });

            console.log(`[CRON] Step 3: Found ${pendingDonations.length} pending donation(s) to check`);

            // Filter out donations that already have a pending request
            const donationsNeedingAssignment = [];

            for (const donation of pendingDonations) {
                const existingPendingRequest = await Request.findOne({
                    donationId: donation._id,
                    status: 'pending'
                });

                if (!existingPendingRequest) {
                    donationsNeedingAssignment.push(donation);
                }
            }

            console.log(`[CRON] Step 3: ${donationsNeedingAssignment.length} donation(s) need NGO assignment`);

            // ============================================
            // STEP 4 & 5: Find nearest NGO and create request
            // ============================================
            for (const donation of donationsNeedingAssignment) {
                // Double-check donation is still pending (idempotency)
                const freshDonation = await Donation.findById(donation._id);
                if (!freshDonation || freshDonation.status !== 'pending') {
                    console.log(`[CRON] Skipping donation ${donation._id} - status changed`);
                    continue;
                }

                // Get all NGOs that have already been requested for this donation
                const existingRequests = await Request.find({
                    donationId: donation._id
                }).select('ngoId');

                const alreadyRequestedNgoIds = existingRequests.map(r => r.ngoId.toString());

                // Find eligible NGOs:
                // - role = 'NGO'
                // - isAvailable = true
                // - has valid location
                // - NOT already requested for this donation
                const eligibleNgos = await User.find({
                    role: 'NGO',
                    isAvailable: true,
                    'location.coordinates': { $exists: true }
                });

                // Filter out already requested NGOs and calculate distances
                const ngosWithDistance = eligibleNgos
                    .filter(ngo => !alreadyRequestedNgoIds.includes(ngo._id.toString()))
                    .map(ngo => ({
                        ngo,
                        distance: haversineDistance(
                            donation.location.coordinates,
                            ngo.location.coordinates
                        )
                    }))
                    .sort((a, b) => a.distance - b.distance);

                if (ngosWithDistance.length === 0) {
                    console.log(`[CRON] Step 4: No eligible NGOs for donation ${donation._id}`);
                    continue;
                }

                // Select nearest NGO
                const nearestNgo = ngosWithDistance[0];
                console.log(`[CRON] Step 4: Nearest NGO for donation ${donation._id} is ${nearestNgo.ngo._id} (${nearestNgo.distance.toFixed(2)} km)`);

                // Create request with 10-minute expiry
                const requestExpiresAt = new Date(now.getTime() + 10 * 60 * 1000);

                const newRequest = new Request({
                    donationId: donation._id,
                    ngoId: nearestNgo.ngo._id,
                    status: 'pending',
                    createdAt: now,
                    expiresAt: requestExpiresAt
                });

                await newRequest.save();

                console.log(`[CRON] Step 5: Created request ${newRequest._id} for NGO ${nearestNgo.ngo._id} (expires at ${requestExpiresAt.toISOString()})`);
            }

            console.log('[CRON] ========== Scheduler run complete ==========\n');

        } catch (error) {
            console.error('[CRON] Error in donation scheduler:', error.message);
        }
    });
}

module.exports = { startDonationScheduler };
