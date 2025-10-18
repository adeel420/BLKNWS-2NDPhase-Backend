const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
require("dotenv").config();

const jwtAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1]; // Extract token
    if (!token) {
      return res.status(401).json({ error: "Invalid token format" });
    }

    // Debugging: Decode token before verifying
    const decoded = jwt.decode(token);
    console.log("Decoded Token:", decoded);

    // Verify token
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Verified Token Payload:", verified);

    if (!verified.id) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    req.user = { id: verified.id };
    next();
  } catch (error) {
    console.log("JWT Verification Error:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET);
};

module.exports = { jwtAuthMiddleware, generateToken };
