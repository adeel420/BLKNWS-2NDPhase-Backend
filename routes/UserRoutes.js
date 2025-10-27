const express = require("express");
const User = require("../models/userModel");
const { generateToken, jwtAuthMiddleware } = require("../middleware/jwt");
const SibApiV3Sdk = require("sib-api-v3-sdk");
require("dotenv").config();

const router = express.Router();

// ====================== BREVO CONFIG ======================
const brevoClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = brevoClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;
const contactsApi = new SibApiV3Sdk.ContactsApi();

// ====================== HELPER: SYNC TO BREVO ======================
const syncContactToBrevo = async (email, name, location) => {
  try {
    const createContact = new SibApiV3Sdk.CreateContact();
    createContact.email = email;
    createContact.attributes = {
      FIRSTNAME: name,
      LOCATION: location,
    };
    createContact.listIds = [2]; // Replace with your actual Brevo list ID
    createContact.updateEnabled = true;

    await contactsApi.createContact(createContact);
    console.log(`✅ Brevo: Contact synced for ${email}`);
  } catch (err) {
    console.error("❌ Brevo Sync Error:", err.response?.text || err.message);
  }
};

// ====================== SIGNUP ======================
router.post("/signup", async (req, res) => {
  try {
    const { name, email, location } = req.body;

    if (!name || !email || !location)
      return res
        .status(400)
        .json({ error: "Name, email, and location are required" });

    // Check if email already exists
    const existEmail = await User.findOne({ email });
    if (existEmail)
      return res.status(400).json({ error: "Email already exists" });

    // Create new user
    const user = new User({ name, email, location });
    await user.save();

    // Sync to Brevo
    await syncContactToBrevo(email, name, location);

    res.status(200).json({
      message: "Signup successful",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        location: user.location,
      },
    });
  } catch (err) {
    console.error("❌ Signup Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ====================== LOGIN ======================
router.post("/login", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: "Email is required" });

    // Find user by email
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(400)
        .json({ error: "User not found. Please signup first." });

    // Generate token with user ID
    const token = generateToken({ id: user._id, email: user.email });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        location: user.location,
      },
    });
  } catch (err) {
    console.error("❌ Login Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/login-data", jwtAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ error: "User ID is missing" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ email: user.email, name: user.name });
  } catch (err) {
    console.error("Login Data Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
