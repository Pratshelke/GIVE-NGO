// server/models/Donation.js
// This file defines the Donation schema for tracking food/item donations

const mongoose = require('mongoose');

// Define the Donation Schema
const donationSchema = new mongoose.Schema({
    // Title of the donation (e.g., "Fresh Vegetables")
    title: {
        type: String,
        required: true
    },

    // Detailed description of what is being donated
    description: {
        type: String,
        required: true
    },

    // Quantity/amount being donated (e.g., "50kg", "100 meals")
    quantity: {
        type: String,
        required: true
    },

    // Reference to the User who is donating (Donor)
    // This creates a relationship between Donation and User collections
    donorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  // References the User model
        required: true
    },

    // Formatted pickup address text (readable by NGO)
    address: {
        type: String,
        required: true
    },

    // Location in GeoJSON format for map features
    location: {
        type: {
            type: String,
            enum: ['Point'],  // GeoJSON type
            required: true
        },
        coordinates: {
            type: [Number],  // [longitude, latitude]
            required: true
        }
    },

    // Current status of the donation - tracks full lifecycle
    // pending → reserved → in_transit → completed
    // OR pending → expired (if no NGO accepts in time)
    status: {
        type: String,
        enum: ['pending', 'reserved', 'in_transit', 'completed', 'expired'],
        default: 'pending'
    },

    // Reference to the NGO that accepted this donation (optional)
    currentNgoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  // References the User model (NGO user)
        required: false  // This is optional until an NGO accepts
    },

    // Timestamp for when donation was created
    createdAt: {
        type: Date,
        default: Date.now
    },

    // Expiry timestamp - donation expires if no NGO accepts within 1 hour
    // Auto-calculated as createdAt + 1 hour
    expiresAt: {
        type: Date,
        default: function () {
            // Set expiry to 1 hour (3600000 ms) from creation
            return new Date(Date.now() + 60 * 60 * 1000);
        }
    }
});

// Create the Donation model
const Donation = mongoose.model('Donation', donationSchema);

// Export the model
module.exports = Donation;
