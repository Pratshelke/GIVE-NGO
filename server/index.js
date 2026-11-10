// server/index.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
if (!process.env.JWT_SECRET) {
  console.warn("⚠️  JWT_SECRET not set, using an insecure development secret");
  process.env.JWT_SECRET = "givengo-dev-secret";
}

// Import models
const User = require("./models/User");
const Donation = require("./models/Donation");
const Request = require("./models/Request");

// Import middleware
const auth = require("./middleware/auth");

// Import CRON scheduler
const { startDonationScheduler } = require("./cron/donationRequestScheduler");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get("/health", (req, res) => {
  const state = mongoose.connection.readyState;


  res.json({
    ok: true,
    message: "Server is running",
    mongoStatus:
      state === 1
        ? "connected"
        : state === 2
          ? "connecting"
          : "disconnected",
    readyStateCode: state,
  });
});

// ============================================
// API Endpoints: Authentication
// ============================================

// POST /auth/register - Register new user
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, role, phoneNumber, address, location } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, email, password, role, phoneNumber"
      });
    }

    // NGO-specific validation
    if (role === 'NGO') {
      if (!address) {
        return res.status(400).json({
          success: false,
          message: "Address is required for NGO registration"
        });
      }
      if (!location || !location.coordinates) {
        return res.status(400).json({
          success: false,
          message: "Location is required for NGO registration"
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists"
      });
    }

    // Build user data based on role
    const userData = {
      name,
      email,
      password,
      role,
      phoneNumber
    };

    // NGOs must have address + location; donors may optionally save a default pickup point
    if (address) userData.address = address;
    if (location && location.coordinates) userData.location = location;

    // Create new user (password will be hashed by pre-save hook)
    const newUser = new User(userData);
    await newUser.save();

    // Generate JWT
    const token = jwt.sign(
      { _id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user info and token
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phoneNumber: newUser.phoneNumber,
        address: newUser.address
      }
    });
  } catch (error) {
    console.error("Error registering user:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to register user",
      error: error.message
    });
  }
});

// POST /auth/login - Login user
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Find user (include password for comparison)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user info and token
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("❌ Error logging in:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to login",
      error: error.message
    });
  }
});

// GET /auth/me - Get current user (protected)
app.get("/auth/me", auth, async (req, res) => {
  try {
    // Fetch full user details
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({ success: true, user: publicUser(user) });
  } catch (error) {
    console.error("❌ Error fetching user:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message
    });
  }
});

// ============================================
// API Endpoints: Users
// ============================================

// POST /users - Create a new user (legacy endpoint - prefer /auth/register)
app.post("/users", async (req, res) => {
  try {
    const userData = req.body;

    // Validate required fields
    if (!userData.name || !userData.email || !userData.password || !userData.role) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, email, password, role"
      });
    }

    // Create and save user
    const newUser = new User(userData);
    const savedUser = await newUser.save();

    // Return user without password for security
    const userResponse = {
      _id: savedUser._id,
      name: savedUser.name,
      email: savedUser.email,
      role: savedUser.role,
      createdAt: savedUser.createdAt
    };

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: userResponse
    });
  } catch (error) {
    console.error("❌ Error creating user:", error.message);
    res.status(400).json({
      success: false,
      message: "Failed to create user",
      error: error.message
    });
  }
});

// GET /users/:id - Fetch user info (without password)
app.get("/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // Find user by ID, exclude password from result
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        address: user.address
      }
    });
  } catch (error) {
    console.error("Error fetching user:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message
    });
  }
});

// PUT /users/:id - Update user profile (protected, owner only)
app.put("/users/:id", auth, async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, phoneNumber, address, location, isAvailable } = req.body;

    // Verify ownership - users can only update their own profile
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own profile"
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (name) user.name = name;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (address) user.address = address;
    if (location && location.coordinates) user.location = location;
    if (typeof isAvailable === 'boolean') user.isAvailable = isAvailable;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: publicUser(user)
    });
  } catch (error) {
    console.error("Error updating user:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message
    });
  }
});


// Shape a user document for API responses (never includes the password)
function publicUser(u) {
  return {
    _id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    phoneNumber: u.phoneNumber,
    address: u.address,
    location: u.location && u.location.coordinates && u.location.coordinates.length ? u.location : undefined,
    isAvailable: u.isAvailable,
    createdAt: u.createdAt
  };
}

// ============================================
// Public endpoints: map + impact numbers
// ============================================

// GET /ngos - NGOs with a location (for maps and "who gets asked first")
app.get("/ngos", async (req, res) => {
  try {
    const ngos = await User.find({ role: 'NGO', 'location.coordinates.1': { $exists: true } });
    res.json({
      success: true,
      ngos: ngos.map(n => ({ _id: n._id, name: n.name, address: n.address, location: n.location, isAvailable: n.isAvailable !== false }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch NGOs", error: error.message });
  }
});

// GET /stats - Public impact numbers
app.get("/stats", async (req, res) => {
  try {
    const done = await Donation.find({ status: 'completed' });
    const kg = done.reduce((s, d) => s + (/kg/i.test(d.quantity) ? parseFloat(d.quantity) || 0 : (d.servings || 0) * 0.3), 0);
    res.json({
      success: true,
      stats: {
        mealsServed: done.reduce((s, d) => s + (d.servings || 0), 0),
        kgSaved: Math.round(kg),
        donationsCompleted: done.length,
        activeDonations: await Donation.countDocuments({ status: { $in: ['pending', 'reserved', 'in_transit'] } }),
        ngos: await User.countDocuments({ role: 'NGO' }),
        donors: await User.countDocuments({ role: 'Donor' })
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch stats", error: error.message });
  }
});

// GET /donations/public - Active donations for the live map (no contact details)
app.get("/donations/public", async (req, res) => {
  try {
    const donations = await Donation.find({ status: { $in: ['pending', 'reserved', 'in_transit'] } })
      .select('-description')
      .populate('donorId', 'name')
      .populate('currentNgoId', 'name');
    res.json({ success: true, donations });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch donations", error: error.message });
  }
});

// GET /donations/:id/requests - Dispatch log for a donation (owner donor or any NGO)
app.get("/donations/:id/requests", auth, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ success: false, message: "Donation not found" });
    if (req.user.role === 'Donor' && donation.donorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not your donation" });
    }
    const requests = await Request.find({ donationId: donation._id }).sort({ createdAt: 1 }).populate('ngoId', 'name');
    res.json({
      success: true,
      requests: requests.map(r => ({
        ...r.toObject(),
        ngoId: r.ngoId ? r.ngoId._id : null,
        ngoName: r.ngoId ? r.ngoId.name : 'NGO'
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch dispatch log", error: error.message });
  }
});

// ============================================
// API Endpoints: Donations
// ============================================

// POST /donations - Create a new donation (protected - Donor only)
app.post("/donations", auth, async (req, res) => {
  try {
    // Verify user is a Donor
    if (req.user.role !== 'Donor') {
      return res.status(403).json({
        success: false,
        message: "Only donors can create donations"
      });
    }

    const donationData = req.body;

    // Override donorId with authenticated user's ID
    const newDonation = new Donation({
      ...donationData,
      donorId: req.user._id
    });

    const savedDonation = await newDonation.save();

    res.status(201).json({
      success: true,
      message: "Donation created successfully",
      donation: savedDonation
    });
  } catch (error) {
    console.error("❌ Error creating donation:", error.message);
    res.status(400).json({
      success: false,
      message: "Failed to create donation",
      error: error.message
    });
  }
});

// GET /donations - Get donations (protected, filtered by user role)
app.get("/donations", auth, async (req, res) => {
  try {
    // Donors see only their own donations
    // NGOs see all pending donations (for browsing)
    let filter = {};

    if (req.user.role === 'Donor') {
      filter.donorId = req.user._id;
    } else if (req.user.role === 'NGO') {
      // NGOs can see all donations (needed for request page)
      filter = {};
    }

    const donations = await Donation.find(filter).populate('currentNgoId', 'name phoneNumber').populate('donorId', 'name phoneNumber address email');

    // Check and update expired donations
    const now = new Date();
    for (let donation of donations) {
      if (donation.status === 'pending' && now > donation.expiresAt) {
        donation.status = 'expired';
        await donation.save();
      }
    }

    res.status(200).json({
      success: true,
      count: donations.length,
      donations: donations
    });
  } catch (error) {
    console.error("❌ Error fetching donations:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch donations",
      error: error.message
    });
  }
});

// PUT /donations/:id - Edit donation (protected, owner only, pending only)
app.put("/donations/:id", auth, async (req, res) => {
  try {
    const donationId = req.params.id;
    const { title, description, quantity } = req.body;

    // Find the donation
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found"
      });
    }

    // Verify ownership
    if (donation.donorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to edit this donation"
      });
    }

    // GUARD: Only allow editing if donation is still pending
    if (donation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit donation. Status is '${donation.status}'. Only 'pending' donations can be edited.`
      });
    }

    // Update allowed fields only
    if (title) donation.title = title;
    if (description) donation.description = description;
    if (quantity) donation.quantity = quantity;

    await donation.save();

    res.status(200).json({
      success: true,
      message: "Donation updated successfully",
      donation: donation
    });
  } catch (error) {
    console.error("❌ Error updating donation:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update donation",
      error: error.message
    });
  }
});

// DELETE /donations/:id - Cancel donation (protected, owner only, soft delete)
app.delete("/donations/:id", auth, async (req, res) => {
  try {
    const donationId = req.params.id;

    // Find the donation
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found"
      });
    }

    // Verify ownership
    if (donation.donorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this donation"
      });
    }

    // GUARD: Only allow cancellation if donation is still pending
    if (donation.status !== 'pending') {
      return res.status(400).json({
        success: false,


        message: `Cannot cancel donation. Status is '${donation.status}'. Only 'pending' donations can be cancelled.`
      });
    }

    // Soft delete: set status to expired
    donation.status = 'expired';
    await donation.save();

    res.status(200).json({
      success: true,
      message: "Donation cancelled successfully",
      donation: donation
    });
  } catch (error) {
    console.error("❌ Error cancelling donation:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to cancel donation",
      error: error.message
    });
  }
});

// ============================================
// API Endpoints: Requests
// ============================================

// POST /requests - Create a new request (internal/system use - protected)
app.post("/requests", auth, async (req, res) => {
  try {
    // Verify user is an NGO
    if (req.user.role !== 'NGO') {
      return res.status(403).json({
        success: false,
        message: "Only NGOs can create requests"
      });
    }

    const requestData = req.body;

    // Check if donation exists and is not expired
    const donation = await Donation.findById(requestData.donationId);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found"
      });
    }

    // Check if donation has expired
    const now = new Date();
    if (now > donation.expiresAt) {
      donation.status = 'expired';
      await donation.save();
      return res.status(400).json({
        success: false,
        message: "Donation has expired. Cannot create request."
      });
    }

    // Check if donation is still pending
    if (donation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Donation is ${donation.status}. Cannot create new requests.`
      });
    }

    // Override ngoId with authenticated user
    const newRequest = new Request({
      ...requestData,
      ngoId: req.user._id
    });

    const savedRequest = await newRequest.save();

    res.status(201).json({
      success: true,
      message: "Request created successfully",
      request: savedRequest
    });
  } catch (error) {
    console.error("❌ Error creating request:", error.message);
    res.status(400).json({
      success: false,
      message: "Failed to create request",
      error: error.message
    });
  }
});

// GET /requests - Get requests (protected, filtered by NGO)
app.get("/requests", auth, async (req, res) => {
  try {
    // NGOs see only their own requests
    let filter = {};

    if (req.user.role === 'NGO') {
      filter.ngoId = req.user._id;
    } else {
      // Donors should not access this route
      return res.status(403).json({
        success: false,
        message: "Only NGOs can view requests"
      });
    }

    const requests = await Request.find(filter);

    res.status(200).json({
      success: true,
      count: requests.length,
      requests: requests
    });
  } catch (error) {
    console.error("❌ Error fetching requests:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch requests",
      error: error.message
    });
  }
});

// ============================================
// API Endpoints: Accept/Reject Request Flow
// ============================================

// POST /requests/:id/accept - NGO accepts a request (protected)
app.post("/requests/:id/accept", auth, async (req, res) => {
  try {
    const requestId = req.params.id;

    // Find the request by ID
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found"
      });
    }

    // Verify ownership - only the NGO who created the request can accept it
    if (request.ngoId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to accept this request"
      });
    }

    // Validate request is still pending
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`
      });
    }

    // Find the associated donation
    const donation = await Donation.findById(request.donationId);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found"
      });
    }

    // Check if donation has expired
    const now = new Date();
    if (now > donation.expiresAt) {
      donation.status = 'expired';
      await donation.save();

      request.status = 'rejected';
      request.respondedAt = now;
      await request.save();

      return res.status(400).json({
        success: false,
        message: "Donation has expired. Cannot accept request."
      });
    }

    // Check if donation is still pending
    if (donation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Donation is already ${donation.status}. Cannot accept new requests.`
      });
    }

    // Accept the request and reserve the donation
    request.status = 'accepted';
    request.respondedAt = now;
    await request.save();

    donation.status = 'reserved';
    donation.currentNgoId = request.ngoId;
    await donation.save();

    // Reject all OTHER pending requests for this donation
    await Request.updateMany(
      {
        donationId: donation._id,
        _id: { $ne: request._id },  // Exclude the accepted request
        status: 'pending'
      },
      {
        status: 'rejected',
        respondedAt: now
      }
    );

    // Return success response
    res.status(200).json({
      success: true,
      message: "Request accepted successfully. Donation reserved for NGO.",
      request: request,
      donation: donation
    });

  } catch (error) {
    console.error("❌ Error accepting request:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to accept request",
      error: error.message
    });
  }
});

// POST /requests/:id/reject - NGO rejects own request (protected)
app.post("/requests/:id/reject", auth, async (req, res) => {
  try {
    const requestId = req.params.id;

    // Find the request by ID
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found"
      });
    }

    // Verify ownership
    if (request.ngoId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to reject this request"
      });
    }

    // Validate request is still pending
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`
      });
    }

    // Reject the request
    request.status = 'rejected';
    request.respondedAt = new Date();
    await request.save();

    // Donation remains 'pending' - available for other NGOs

    res.status(200).json({
      success: true,
      message: "Request rejected. Donation remains available.",
      request: request
    });

  } catch (error) {
    console.error("❌ Error rejecting request:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to reject request",
      error: error.message
    });
  }
});

// ============================================
// API Endpoints: Donation Lifecycle
// ============================================

// POST /donations/:id/confirm-pickup - NGO confirms pickup (protected)
app.post("/donations/:id/confirm-pickup", auth, async (req, res) => {
  try {
    const donationId = req.params.id;

    // Find the donation
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found"
      });
    }

    // Verify caller is the NGO assigned to this donation
    if (!donation.currentNgoId || donation.currentNgoId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to confirm pickup for this donation"
      });
    }

    // Validate donation status is 'reserved'
    if (donation.status !== 'reserved') {
      return res.status(400).json({
        success: false,
        message: `Cannot confirm pickup. Donation status is '${donation.status}'. Expected 'reserved'.`
      });
    }

    // Update status to 'in_transit'
    donation.status = 'in_transit';
    await donation.save();

    res.status(200).json({
      success: true,
      message: "Pickup confirmed. Donation is now in transit.",
      donation: donation
    });

  } catch (error) {
    console.error("❌ Error confirming pickup:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to confirm pickup",
      error: error.message
    });
  }
});

// POST /donations/:id/complete - NGO marks as completed (protected)
app.post("/donations/:id/complete", auth, async (req, res) => {
  try {
    const donationId = req.params.id;

    // Find the donation
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: "Donation not found"
      });
    }

    // Verify caller is the NGO assigned to this donation
    if (!donation.currentNgoId || donation.currentNgoId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to complete this donation"
      });
    }

    // Validate donation status is 'in_transit'
    if (donation.status !== 'in_transit') {
      return res.status(400).json({
        success: false,
        message: `Cannot complete. Donation status is '${donation.status}'. Expected 'in_transit'.`
      });
    }

    // Update status to 'completed'
    donation.status = 'completed';
    await donation.save();

    res.status(200).json({
      success: true,
      message: "Donation completed successfully!",
      donation: donation
    });

  } catch (error) {
    console.error("❌ Error completing donation:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to complete donation",
      error: error.message
    });
  }
});


// MongoDB Connection
const connectDB = async () => {
  try {
    // Add connection event listeners BEFORE connecting
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully');
      console.log('🔍 Connection state after connect:', mongoose.connection.readyState);

      // Start CRON scheduler after DB connection is established
      startDonationScheduler();
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);

    // Double-check the state after connection
    console.log('🔍 Final connection state:', mongoose.connection.readyState);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    console.error("Please check your MONGO_URI in the .env file");
    // Don't exit the process, let the server run even if DB connection fails
  }
};

// Start server function
const startServer = async () => {
  // Connect to MongoDB first
  await connectDB();

  // Then start the Express server
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📍 Health check available at http://localhost:${PORT}/health`);
  });
};

// Initialize application
startServer();