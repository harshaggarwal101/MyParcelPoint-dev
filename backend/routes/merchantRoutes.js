const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/authMiddleware");

// NEW: Import the smart upload middleware we created earlier
const upload = require("../middleware/uploadMiddleware");

const {
  getProfile,
  updateProfile,
  changePassword,
  uploadKYCDocument,
  uploadLogo,
} = require("../controllers/merchantController");
const kycUpload = require("../middleware/kycUploadMiddleware");
const logoUpload = require("../middleware/logoUploadMiddleware");

// Get Profile
router.get("/profile", authMiddleware, getProfile);

// Update Profile
router.put(
  "/profile",
  authMiddleware,
  upload.single("profilePicture"), // NEW: Injected multer to catch the image
  updateProfile,
);

// Change Password Route
router.put("/change-password", authMiddleware, changePassword);

// KYC Upload Route
router.post(
  "/kyc-upload",
  authMiddleware,
  kycUpload.fields([
    { name: "panCard", maxCount: 1 },
    { name: "aadhaarFront", maxCount: 1 },
    { name: "aadhaarBack", maxCount: 1 },
    { name: "gstCertificate", maxCount: 1 },
    { name: "document", maxCount: 1 },
  ]),
  uploadKYCDocument,
);

// Permanent Logo Upload Route
router.post("/logo", authMiddleware, logoUpload.single("logo"), uploadLogo);

module.exports = router;
