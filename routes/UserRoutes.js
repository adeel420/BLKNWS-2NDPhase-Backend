const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const { generateToken } = require("../middleware/jwt");
const SibApiV3Sdk = require("sib-api-v3-sdk");
require("dotenv").config();

const router = express.Router();

// ====================== BREVO CONFIG ======================
const brevoClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = brevoClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;
const contactsApi = new SibApiV3Sdk.ContactsApi();

// ====================== HELPER: SYNC TO BREVO ======================
const syncContactToBrevo = async (email, name) => {
  try {
    const createContact = new SibApiV3Sdk.CreateContact();
    createContact.email = email;
    createContact.attributes = {
      FIRSTNAME: name,
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
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res
        .status(400)
        .json({ error: "Name, email, and password are required" });

    const existEmail = await User.findOne({ email });
    if (existEmail)
      return res.status(400).json({ error: "Email already exists" });

    const user = new User({ name, email, password });
    await user.save();

    // Sync to Brevo
    await syncContactToBrevo(email, name);

    res.status(200).json({
      message: "Signup successful",
      user: { id: user._id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error("❌ Signup Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ====================== LOGIN ======================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ error: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ error: "Invalid email or password" });

    const token = generateToken({ id: user._id });
    res.status(200).json({
      message: "Login successful",
      token,
      user: { id: user._id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error("❌ Login Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
