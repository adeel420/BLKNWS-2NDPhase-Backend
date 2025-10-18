// ====================== IMPORTS ======================
const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const { sendVerificationCode, welcomeCode } = require("../middleware/email");
const { jwtAuthMiddleware, generateToken } = require("../middleware/jwt");
const SibApiV3Sdk = require("sib-api-v3-sdk"); // ✅ Brevo SDK
require("dotenv").config();

const router = express.Router();
const saltRounds = 10;

// ====================== BREVO CONFIG ======================
const brevoClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = brevoClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY; // Keep key in .env file
const contactsApi = new SibApiV3Sdk.ContactsApi();

// ====================== SIGNUP ======================
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existEmail = await User.findOne({ email });
    if (existEmail) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const user = new User({ name, email, password, verificationCode });
    await user.save();

    // Send verification email
    await sendVerificationCode(email, verificationCode);

    // ✅ Add new contact to Brevo
    try {
      const createContact = new SibApiV3Sdk.CreateContact();
      createContact.email = email;
      createContact.attributes = { FIRSTNAME: name };
      createContact.listIds = [2]; // ← Replace with your Brevo list ID
      createContact.updateEnabled = true;
      await contactsApi.createContact(createContact);
      console.log(`Brevo: Added contact for ${email}`);
    } catch (brevoErr) {
      console.error(
        "Brevo Contact Error:",
        brevoErr?.response?.text || brevoErr
      );
    }

    res.status(200).json({
      message: "Signup successful. Check your email for verification code",
    });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ====================== LOGIN ======================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ error: "Invalid email or password" });

    if (!user.isVerified) {
      return res.status(400).json({ error: "Please verify your email first" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = generateToken({ id: user._id });

    res.status(200).json({
      message: "Login successful",
      token,
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ====================== EMAIL VERIFICATION ======================
router.post("/verify-email", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code)
      return res.status(400).json({ error: "Verification code is required" });

    const user = await User.findOne({ verificationCode: code.toString() });
    if (!user)
      return res.status(400).json({ error: "Invalid verification code" });

    user.isVerified = true;
    user.verificationCode = undefined;
    await user.save();

    await welcomeCode(user.email, user.name);

    res.status(200).json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("Verification Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ====================== FORGOT PASSWORD ======================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = otpExpiry;
    await user.save({ validateBeforeSave: false });

    await sendVerificationCode(email, otp);

    res.status(200).json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ====================== RESET PASSWORD ======================
router.put("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        error: "Email, OTP, and new password are required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    if (!user.resetPasswordOTP || !user.resetPasswordExpires) {
      return res.status(400).json({ error: "OTP was not requested" });
    }

    if (user.resetPasswordOTP !== otp.toString()) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ error: "OTP has expired" });
    }

    user.password = await bcrypt.hash(newPassword, saltRounds);
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ====================== LOGIN DATA ======================
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
