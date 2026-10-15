const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { auth: firebaseAuth } = require("../config/firebaseAdmin");

// Register User - Complete Version
const registerUser = async (req, res) => {
  try {
    const {
      companyName,
      name,
      phone,
      email,
      password,
      gstNumber,
      panNumber,
      businessType,
      businessCategory,
      yearOfEstablishment,
      website,
      address,
      city,
      state,
      pincode,
      landmark,
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
      branchName,
      upiId,
      role,
      kycStatus,
      firebaseIdToken,
    } = req.body;

    // Validation - Required Fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email and password"
      });
    }

    // Email validation
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    // Phone validation
    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid 10-digit mobile number"
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
      });
    }


        

    if (!firebaseIdToken) {
      return res.status(400).json({
        success: false,
        message: "Firebase authentication is required.",
      });
    }

    let decodedToken;

    try {
      decodedToken = await firebaseAuth.verifyIdToken(firebaseIdToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid Firebase identity. Please try registering again.",
      });
    }

    if (
      !decodedToken.uid ||
      !decodedToken.email ||
      decodedToken.email.toLowerCase() !== email.trim().toLowerCase()
    ) {
      return res.status(401).json({
        success: false,
        message: "Firebase account does not match the submitted email.",
      });
    }



    const digits = String(phone || "").replace(/\D/g, "");

    const submittedPhoneE164 =
      digits.length === 10
        ? `+91${digits}`
        : digits.length === 12 && digits.startsWith("91")
          ? `+${digits}`
          : "";

    if (
      !submittedPhoneE164 ||
      decodedToken.phone_number !== submittedPhoneE164
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Please verify the submitted mobile number using Firebase OTP.",
      });
    }


    // Check existing user
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email"
      });
    }

    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: "User already exists with this phone number"
        });
      }
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Role Management
    const userRole = "MERCHANT";

    // Company name validation for merchants
    if (userRole === "MERCHANT" && !companyName) {
      return res.status(400).json({
        success: false,
        message: "Company name is required for merchant registration"
      });
    }

    // KYC Status Management
    const userKycStatus = "PENDING";

    // Handle KYC Document Uploads
    let gstDocPath = "";
    let panDocPath = "";

    if (req.files) {
      if (req.files.gstCertificate && req.files.gstCertificate[0]) {
        gstDocPath = `/uploads/kyc/${req.files.gstCertificate[0].filename}`;
      }
      if (req.files.panCard && req.files.panCard[0]) {
        panDocPath = `/uploads/kyc/${req.files.panCard[0].filename}`;
      }
    }

    // Create User
    const user = await User.create({
      name: name.trim(),
      companyName: companyName || "",
      phone: phone || "",
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      gstNumber: gstNumber || "",
      panNumber: panNumber || "",
      businessType: businessType || "",
      businessCategory: businessCategory || "",
      yearOfEstablishment: yearOfEstablishment || "",
      website: website || "",
      address: address || "",
      city: city || "",
      state: state || "",
      pincode: pincode || "",
      landmark: landmark || "",
      accountHolderName: accountHolderName || "",
      accountNumber: accountNumber || "",
      ifscCode: ifscCode || "",
      bankName: bankName || "",
      branchName: branchName || "",
      upiId: upiId || "",
      role: userRole,
      kycStatus: userKycStatus,
      isApproved: false,
      isBlocked: false,
      isActive: true,
      walletBalance: 0,
      kycDocuments: {
        gstCertificate: gstDocPath,
        panCard: panDocPath,
        addressProof: "",
      },
      firebaseUid: decodedToken.uid,
      emailVerified: decodedToken.email_verified === true,
      phoneVerified: decodedToken.phone_number === submittedPhoneE164,
    });

    // Response
    const userResponse = {
      id: user._id,
      name: user.name,
      companyName: user.companyName,
      phone: user.phone,
      email: user.email,
      role: user.role,
      gstNumber: user.gstNumber,
      kycStatus: user.kycStatus,
      isApproved: user.isApproved,
      isActive: user.isActive
    };

    res.status(201).json({
      success: true,
      message: userRole === "MERCHANT" 
        ? "Registration successful! Please login to your account to complete your profile setup." 
        : `${userRole} Registered Successfully`,
      user: userResponse
    });

  } catch (error) {
    console.error("Registration Error:", error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists. Please use a different ${field}.`
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error"
    });
  }
};

// Login User
const loginUser = async (req, res) => {
  try {
    const loginInput = (req.body.email || req.body.phone || req.body.identifier || "").trim();
    const { password } = req.body;

    if (!loginInput || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email/mobile number and password"
      });
    }

    const user = await User.findOne({
      $or: [
        { email: loginInput.toLowerCase() },
        { phone: loginInput }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid Email/Mobile Number or Password",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked. Please contact admin.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact admin.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid Email/Mobile Number or Password",
      });
    }
    if (user.emailVerified !== true) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in.",
        needsEmailVerification: true,
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
        name: user.name
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    const userData = {
      id: user._id,
      name: user.name,
      companyName: user.companyName,
      phone: user.phone,
      email: user.email,
      role: user.role,
      gstNumber: user.gstNumber,
      kycStatus: user.kycStatus,
      isApproved: user.isApproved,
      isActive: user.isActive,
      walletBalance: user.walletBalance
    };

    res.status(200).json({
      success: true,
      message: "Login Successful",
      token,
      user: userData
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// Get Current User Profile
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error("Get User Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get All Merchants (For Admin)
const getAllMerchants = async (req, res) => {
  try {
    const merchants = await User.find({ 
      role: "MERCHANT" 
    }).select("-password").sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: merchants.length,
      merchants
    });
  } catch (error) {
    console.error("Get Merchants Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Approve Merchant (For Admin)
const approveMerchant = async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved, kycStatus } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.role !== "MERCHANT") {
      return res.status(400).json({
        success: false,
        message: "User is not a merchant"
      });
    }

    user.isApproved = isApproved !== undefined ? isApproved : true;
    if (kycStatus) {
      user.kycStatus = kycStatus;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: `Merchant ${user.isApproved ? "approved" : "rejected"} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isApproved: user.isApproved,
        kycStatus: user.kycStatus
      }
    });
  } catch (error) {
    console.error("Approve Merchant Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const confirmEmail = async (req, res) => {
  try {
    const { firebaseIdToken } = req.body;

    if (!firebaseIdToken) {
      return res.status(400).json({
        success: false,
        message: "Firebase authentication is required.",
      });
    }

    let decodedToken;

    try {
      decodedToken = await firebaseAuth.verifyIdToken(firebaseIdToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid Firebase authentication token.",
      });
    }

    if (decodedToken.email_verified !== true || !decodedToken.email) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first.",
      });
    }

    const user = await User.findOne({
      firebaseUid: decodedToken.uid,
      email: decodedToken.email.toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Matching application account not found.",
      });
    }

    user.emailVerified = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully.",
    });
  } catch (error) {
    console.error("Confirm email error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to confirm email verification.",
    });
  }
};


const syncEmailVerification = async (req, res) => {
  try {
    const firebaseUid = String(req.body.firebaseUid || "").trim();

    if (!firebaseUid) {
      return res.status(400).json({
        success: false,
        message: "Firebase user ID is required.",
      });
    }

    // Verify the actual Firebase account on the server.
    const firebaseUser = await firebaseAuth.getUser(firebaseUid);

    if (!firebaseUser.email || !firebaseUser.emailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email using the link first.",
      });
    }

    // Find the matching MyParcelPoint account.
    const email = firebaseUser.email.toLowerCase();

    const user = await User.findOne({
      firebaseUid: firebaseUser.uid,
      email,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Matching application account not found.",
      });
    }

    // Update MongoDB only after Firebase confirms verification.
    user.emailVerified = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verification synchronized successfully.",
      phoneVerified: user.phoneVerified === true,
    });
  } catch (error) {
    console.error(
      "Sync email verification error:",
      error.code || error.message,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to synchronize email verification.",
    });
  }
};


module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  getAllMerchants,
  approveMerchant,
  confirmEmail,
  syncEmailVerification,
};