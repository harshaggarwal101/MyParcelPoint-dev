const bcrypt = require("bcryptjs");
const Merchant = require("../models/Merchant");
const User = require("../models/User");

// Get Merchant Profile
const getProfile = async (req, res) => {
  try {
    // Parallel fetching for better performance
    const [merchant, user] = await Promise.all([
      Merchant.findOne({ userId: req.user.id }),
      User.findById(req.user.id).select("-password"),
    ]);

    // Auto create merchant profile if not exists
    let merchantData = merchant;
    if (!merchantData) {
      merchantData = await Merchant.create({
        userId: req.user.id,
      });
    }

    res.status(200).json({
      success: true,
      merchant: merchantData,
      user: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update Merchant Profile
// Update Merchant Profile
const updateProfile = async (req, res) => {
  try {
    const {
      companyName,
      name,
      phone,
      gstNumber,
      panNumber,
      bankAccount,
      ifscCode,
      bankName,
      address,
      city,
      state,
      pincode,
    } = req.body;

    // NEW: Check if an image was uploaded via Multer
    let profilePictureUrl = undefined;
    if (req.file) {
      // Because we previously routed all images to the tickets folder in uploadMiddleware,
      // the profile picture will also land there. 
      profilePictureUrl = `/uploads/tickets/${req.file.filename}`;
    }

    // Production validation: Company Name is required
    if (
      companyName !== undefined &&
      !companyName.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Company Name is required.",
      });
    }

    // Find or create merchant with single DB operation
    const merchantUpdateData = {
      companyName: companyName?.trim() ?? undefined,
      gstNumber: gstNumber?.trim() ?? undefined,
      panNumber: panNumber?.trim() ?? undefined,
      bankAccount: bankAccount?.trim() ?? undefined,
      ifscCode: ifscCode?.trim()?.toUpperCase() ?? undefined,
      bankName: bankName?.trim() ?? undefined,
      address: address?.trim() ?? undefined,
    };

    // NEW: Append profile picture if one was uploaded
    if (profilePictureUrl) {
      merchantUpdateData.profilePicture = profilePictureUrl;
    }

    let merchant = await Merchant.findOneAndUpdate(
      { userId: req.user.id },
      { $set: merchantUpdateData },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    // Update user fields that are common
    const userUpdateData = {};
    
    if (name !== undefined) userUpdateData.name = name?.trim();
    if (phone !== undefined) userUpdateData.phone = phone?.trim();
    if (companyName !== undefined) userUpdateData.companyName = companyName?.trim();
    if (gstNumber !== undefined) userUpdateData.gstNumber = gstNumber?.trim();
    if (panNumber !== undefined) userUpdateData.panNumber = panNumber?.trim();
    if (bankAccount !== undefined) userUpdateData.accountNumber = bankAccount?.trim();
    if (ifscCode !== undefined) userUpdateData.ifscCode = ifscCode?.trim()?.toUpperCase();
    if (bankName !== undefined) userUpdateData.bankName = bankName?.trim();
    if (address !== undefined) userUpdateData.address = address?.trim();
    if (city !== undefined) userUpdateData.city = city?.trim();
    if (state !== undefined) userUpdateData.state = state?.trim();
    if (pincode !== undefined) userUpdateData.pincode = pincode?.trim();
    
    // NEW: Append profile picture to User document as well
    if (profilePictureUrl) {
      userUpdateData.profilePicture = profilePictureUrl;
    }

    let user = null;
    if (Object.keys(userUpdateData).length > 0) {
      user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: userUpdateData },
        { new: true, runValidators: true }
      ).select("-password");
    } else {
      user = await User.findById(req.user.id).select("-password");
    }

    res.status(200).json({
      success: true,
      message: "Profile Updated Successfully",
      merchant: merchant,
      user: user,
    });
  } catch (error) {
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field} already exists. Please use a different value.`,
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Change Password
const changePassword = async (req, res) => {
  try {
    let {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    // Trim password inputs to remove extra spaces
    const current = currentPassword?.trim() || "";
    const newPass = newPassword?.trim() || "";
    const confirm = confirmPassword?.trim() || "";

    // Validation - All fields required
    if (!current || !newPass || !confirm) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    // Validation - New password matches confirm password
    if (newPass !== confirm) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match.",
      });
    }

    // Validation - Password strength (uppercase, lowercase, number, min 8 chars)
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!passwordRegex.test(newPass)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number.",
      });
    }

    // Validation - New password cannot be same as current
    if (current === newPass) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be same as current password.",
      });
    }

    // Find user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(
      current,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    // Hash new password and save
    user.password = await bcrypt.hash(newPass, 10);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Upload KYC Document(s)
const uploadKYCDocument = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.kycDocuments) {
      user.kycDocuments = {};
    }

    // Support req.files (multi-field upload via kycUpload.fields)
    if (req.files) {
      const fieldNames = ["panCard", "aadhaarFront", "aadhaarBack", "gstCertificate", "addressProof"];
      let uploadedAny = false;

      for (const field of fieldNames) {
        if (req.files[field] && req.files[field][0]) {
          const fileObj = req.files[field][0];
          const relPath = fileObj.path.replace(/\\/g, "/").replace(/^.*\/uploads\//, "/uploads/");
          user.kycDocuments[field] = relPath;
          uploadedAny = true;
        }
      }

      if (uploadedAny) {
        user.kycStatus = "PENDING";
        await user.save();

        return res.status(200).json({
          success: true,
          message: "KYC Documents uploaded successfully! Admin will review your documents.",
          kycStatus: user.kycStatus,
          kycDocuments: user.kycDocuments,
          user,
        });
      }
    }

    // Support single file req.file upload
    const { docType } = req.body;
    if (!["gstCertificate", "panCard", "aadhaarFront", "aadhaarBack", "addressProof"].includes(docType)) {
      return res.status(400).json({ success: false, message: "Invalid document type" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No document files uploaded" });
    }

    const relPath = req.file.path.replace(/\\/g, "/").replace(/^.*\/uploads\//, "/uploads/");
    user.kycDocuments[docType] = relPath;
    user.kycStatus = "PENDING";
    await user.save();

    res.status(200).json({
      success: true,
      message: "Document uploaded successfully",
      kycStatus: user.kycStatus,
      kycDocuments: user.kycDocuments,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Upload Merchant Permanent Logo
const uploadLogo = async (req, res) => {
  try {
    let logoData = null;
    if (req.file) {
      const fs = require("fs");
      const fileBuffer = fs.readFileSync(req.file.path);
      const mimeType = req.file.mimetype || "image/png";
      logoData = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    } else if (req.body.logo) {
      logoData = req.body.logo;
    }

    if (!logoData) {
      return res.status(400).json({ success: false, message: "No logo image provided" });
    }

    const [user, merchant] = await Promise.all([
      User.findByIdAndUpdate(req.user.id, { logo: logoData }, { new: true }).select("-password"),
      Merchant.findOneAndUpdate({ userId: req.user.id }, { logo: logoData }, { new: true, upsert: true }),
    ]);

    res.status(200).json({
      success: true,
      message: "Permanent logo updated successfully",
      logo: logoData,
      user,
      merchant,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  uploadKYCDocument,
  uploadLogo,
};
