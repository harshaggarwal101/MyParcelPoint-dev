const mongoose = require("mongoose");

const merchantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    companyName: {
      type: String,
      default: "",
    },

    gstNumber: {
      type: String,
      default: "",
    },

    panNumber: {
      type: String,
      default: "",
    },

    bankAccount: {
      type: String,
      default: "",
    },

    ifscCode: {
      type: String,
      default: "",
      uppercase: true,
      trim: true,
    },

    bankName: {
      type: String,
      default: "",
    },

    address: {
      type: String,
      default: "",
    },

    logo: {
      type: String,
      default: "",
    },
    profilePicture: { type: String, default: "" },
  },
  {
    timestamps: true,
  },
);

module.exports =
  mongoose.models.Merchant || mongoose.model("Merchant", merchantSchema);
