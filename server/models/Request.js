// server/models/Request.js
// This file defines the Request schema for NGOs requesting donations

const mongoose = require('mongoose');

// Define the Request Schema
// A Request is created when an NGO wants to accept a donation
const requestSchema = new mongoose.Schema({
    // Reference to the Donation being requested
    donationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donation',  // References the Donation model
        required: true
    },

    // Reference to the NGO making the request
    ngoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  // References the User model (must be NGO role)
        required: true
    },

    // Status of the request
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'expired'],  // Added 'expired' status
        default: 'pending'  // New requests start as 'pending'
    },

    // Timestamp for when request was created
    createdAt: {
        type: Date,
        default: Date.now
    },

    // Expiry timestamp - request expires if NGO doesn't respond within 10 minutes
    // Auto-calculated as createdAt + 10 minutes
    expiresAt: {
        type: Date,
        default: function () {
            // Set expiry to 10 minutes (600000 ms) from creation
            return new Date(Date.now() + 10 * 60 * 1000);
        }
    },

    // Timestamp for when donor responded to the request (optional)
    respondedAt: {
        type: Date,
        required: false  // Only set when donor accepts/rejects
    }
});

// Create the Request model
const Request = mongoose.model('Request', requestSchema);

// Export the model
module.exports = Request;
