// server/cron/donationRequestScheduler.js
// CRON scheduler for sequential NGO notifications based on proximity

const cron = require('node-cron');
const Donation = require('../models/Donation');
const Request = require('../models/Request');
const User = require('../models/User');
const { haversineDistance } = require('../utils/haversine');

// Maximum distance in kilometers for NGO assignment
const MAX_DISTANCE_KM = 20;

// Track if scheduler is already running (singleton pattern)
let isSchedulerRunning = false;

/**
 * Start the donation request scheduler
 * Runs every 1 minute (CRON: every-1-minute)
 */
function startDonationScheduler() {
    // Prevent duplicate scheduler registration
    if (isSchedulerRunning) {
        console.log('Donation scheduler already running, skipping duplicate registration');
        return;
    }

    isSchedulerRunning = true;

    console.log('Donation scheduler started and will run every 1 minute');

    // Schedule job to run every minute
    cron.schedule('*/1 * * * *', async () => {
        const now = new Date();
        console.log(`\nCRON scheduler running at ${now.toLocaleString()}`);

        try {
            // Expire donations past their expiresAt
            const expiredDonationsResult = await Donation.updateMany(
                {
                    expiresAt: { $lte: now },
                    // Only donations nobody has accepted expire; reserved/in-transit ones keep going
                    status: 'pending'
                },
                { $set: { status: 'expired' } }
            );

            if (expiredDonationsResult.modifiedCount > 0) {
                console.log(`Marked ${expiredDonationsResult.modifiedCount} donation as expired`);

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
                        console.log(`Expired ${expiredRequestsResult.modifiedCount} related request`);
                    }
                }
            }

            // Expire requests past their expiresAt
            const expiredRequestsResult = await Request.updateMany(
                {
                    status: 'pending',
                    expiresAt: { $lte: now }
                },
                { $set: { status: 'expired' } }
            );

            if (expiredRequestsResult.modifiedCount > 0) {
                console.log(`Expired ${expiredRequestsResult.modifiedCount} timed-out request`);
            }

            // Find donations needing NGO assignment
            // Only select donations that are:
            // - status = 'pending' (NOT reserved, completed, expired, or in_transit)
            // - expiresAt > now (not yet expired)
            // - Have no pending request
            const pendingDonations = await Donation.find({
                status: 'pending',
                expiresAt: { $gt: now }
            });

            console.log('Checking pending donations');

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

            if (donationsNeedingAssignment.length > 0) {
                console.log(`Found ${donationsNeedingAssignment.length} donation needing NGO assignment`);
            }

            // Find nearest NGO and create request for each donation
            for (const donation of donationsNeedingAssignment) {
                // Double-check donation is still pending (idempotency)
                const freshDonation = await Donation.findById(donation._id);
                if (!freshDonation || freshDonation.status !== 'pending') {
                    console.log(`Donation expired, skipping further processing`);
                    continue;
                }

                console.log(`Donation '${donation.title}' needs NGO assignment`);

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
                    }));

                // Filter NGOs within 20 km radius
                const ngosWithinRadius = ngosWithDistance.filter(item => item.distance <= MAX_DISTANCE_KM);

                if (ngosWithinRadius.length === 0) {
                    console.log(`No NGOs found within ${MAX_DISTANCE_KM} km for donation '${donation.title}'`);
                    continue;
                }

                console.log(`Found ${ngosWithinRadius.length} NGOs within ${MAX_DISTANCE_KM} km`);

                // Sort by distance and select nearest NGO
                ngosWithinRadius.sort((a, b) => a.distance - b.distance);
                const nearestNgo = ngosWithinRadius[0];

                console.log(`Nearest NGO is '${nearestNgo.ngo.name}' at ${nearestNgo.distance.toFixed(1)} km`);

                // Create request with 10-minute expiry
                const requestExpiresAt = new Date(now.getTime() + 10 * 60 * 1000);

                const newRequest = new Request({
                    donationId: donation._id,
                    ngoId: nearestNgo.ngo._id,
                    status: 'pending',
                    createdAt: now,
                    expiresAt: requestExpiresAt,
                    distanceKm: Math.round(nearestNgo.distance * 10) / 10
                });

                await newRequest.save();

                console.log(`Request created for NGO '${nearestNgo.ngo.name}'`);
            }

            console.log('Scheduler run complete\n');

        } catch (error) {
            console.error('Error in donation scheduler:', error.message);
        }
    });
}

module.exports = { startDonationScheduler };
