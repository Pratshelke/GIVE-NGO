// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        select: false  // Don't return password by default
    },
    role: {
        type: String,
        enum: ['Donor', 'NGO'],
        required: true
    },
    // Phone number - required for all users
    phoneNumber: {
        type: String,
        required: true
    },
    // Address - required for NGO, optional for Donor
    address: {
        type: String,
        required: false
    },
    // Location in GeoJSON format - required for NGO, optional for Donor
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: false
        },
        coordinates: {
            type: [Number],
            required: false
        }
    },
    // Availability flag for NGOs - used by CRON scheduler
    // Only applicable for NGO role users
    isAvailable: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Custom validation: NGO must have location and address
userSchema.pre('validate', function (next) {
    if (this.role === 'NGO') {
        if (!this.address) {
            return next(new Error('Address is required for NGO'));
        }
        if (!this.location || !this.location.coordinates || this.location.coordinates.length !== 2) {
            return next(new Error('Location is required for NGO'));
        }
    }
    next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    // Only hash if password is modified
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
