const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { registerUser, loginUser,confirmEmail,syncEmailVerification} = require("../controllers/authController");

// ====================================
// RATE LIMITERS
// ====================================
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many registration attempts. Please try again after 1 hour.",
  },
});

const kycUpload = require("../middleware/kycUploadMiddleware");

// ====================================
// PUBLIC ROUTES
// ====================================
router.post(
  "/register",
  registerLimiter,
  kycUpload.fields([
    { name: "gstCertificate", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
  ]),
  registerUser
);
router.post("/login",loginLimiter, loginUser);
router.post("/confirm-email", confirmEmail);
router.post("/sync-email-verification", loginLimiter, syncEmailVerification);

module.exports = router;
