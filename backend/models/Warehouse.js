const mongoose = require("mongoose");

const warehouseSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    warehouseCode: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
    },

    warehouseName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    contactPerson: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    phone: {
      type: String,
      required: [true, "Phone number is required."],
      trim: true,
      match: [
        /^[6-9]\d{9}$/,
        "Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.",
      ],
    },

    alternatePhone: {
      type: String,
      default: "",
      trim: true,
      validate: {
        validator: (value) => !value || /^[6-9]\d{9}$/.test(value),
        message:
          "Alternate phone must be a valid 10-digit Indian mobile number.",
      },
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    gstNumber: {
      type: String,
      uppercase: true,
      trim: true,
      default: "",
    },

    panNumber: {
      type: String,
      uppercase: true,
      trim: true,
      default: "",
    },

    addressLine1: {
      type: String,
      required: true,
      trim: true,
    },

    addressLine2: {
      type: String,
      default: "",
      trim: true,
    },

    landmark: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    pincode: {
      type: String,
      required: true,
      match: /^\d{6}$/,
    },

    country: {
      type: String,
      default: "India",
    },

    pickupStartTime: {
      type: String,
      default: "10:00",
    },

    pickupEndTime: {
      type: String,
      default: "18:00",
    },

    workingDays: {
      type: [String],
      default: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
    },

    warehouseType: {
      type: String,
      enum: ["MAIN", "BRANCH", "FULFILLMENT"],
      default: "MAIN",
    },

    pickupInstructions: {
      type: String,
      default: "",
      maxlength: 500,
    },

    latitude: {
      type: Number,
      default: null,
    },

    longitude: {
      type: Number,
      default: null,
    },

    dailyCapacity: {
      type: Number,
      default: 0,
    },

    allowCOD: {
      type: Boolean,
      default: true,
    },

    allowReversePickup: {
      type: Boolean,
      default: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

warehouseSchema.index({
  merchantId: 1,
  warehouseName: 1,
});

warehouseSchema.index({
  merchantId: 1,
  isDefault: 1,
});

// ================================
// AUTO-GENERATE WAREHOUSE CODE
// ================================
warehouseSchema.pre("save", function () {
  if (!this.warehouseCode) {
    this.warehouseCode =
      "WH" + Date.now() + Math.floor(1000 + Math.random() * 9000);
  }
});

module.exports =
  mongoose.models.Warehouse ||
  mongoose.model("Warehouse", warehouseSchema);