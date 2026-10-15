const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // Basic Details
    name: {
      type: String,
      required: true,
      trim: true,
    },

    companyName: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    firebaseUid: {
      type: String,
      default: "",
      trim: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    phoneVerified: {
      type: Boolean,
      default: false,
    },

    logo: {
      type: String,
      default: "",
    },

    password: {
      type: String,
      required: true,
    },

    // Business Details
    gstNumber: {
      type: String,
      default: "",
    },

    panNumber: {
      type: String,
      default: "",
    },

    businessType: {
      type: String,
      default: "",
    },

    businessCategory: {
      type: String,
      default: "",
    },

    yearOfEstablishment: {
      type: String,
      default: "",
    },

    website: {
      type: String,
      default: "",
    },

    // Address Details
    address: {
      type: String,
      default: "",
    },

    city: {
      type: String,
      default: "",
    },

    state: {
      type: String,
      default: "",
    },

    pincode: {
      type: String,
      default: "",
    },

    landmark: {
      type: String,
      default: "",
    },

    // Bank Details
    accountHolderName: {
      type: String,
      default: "",
    },

    accountNumber: {
      type: String,
      default: "",
    },

    ifscCode: {
      type: String,
      default: "",
    },

    bankName: {
      type: String,
      default: "",
    },

    branchName: {
      type: String,
      default: "",
    },

    upiId: {
      type: String,
      default: "",
    },

    // User Role
    role: {
      type: String,
      enum: [
        "SUPER_ADMIN",
        "ADMIN",
        "MERCHANT",
        "STAFF",
        "COURIER",
        "WAREHOUSE",
      ],
      default: "MERCHANT",
    },

    // Approval & KYC
    kycStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },

    isApproved: {
      type: Boolean,
      default: false,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    // Wallet
    walletBalance: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    kycDocuments: {
      gstCertificate: { type: String, default: "" },
      panCard: { type: String, default: "" },
      aadhaarFront: { type: String, default: "" },
      aadhaarBack: { type: String, default: "" },
      addressProof: { type: String, default: "" },
    },

    permissions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        return ret;
      },
    },
  },
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);