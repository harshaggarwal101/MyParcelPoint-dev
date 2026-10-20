const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      unique: true,
      required: true,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipment",
      default: null,
    },
    awb: {
      type: String,
      default: "",
    },
    issueType: {
      type: String,
      enum: [
        "SHIPMENT_DELAY",
        "TRACKING_ISSUE",
        "NDR_ISSUE",
        "RTO_ISSUE",
        "LOST_SHIPMENT",
        "DAMAGED_SHIPMENT",
        "BILLING_ISSUE",
        "OTHER",
      ],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },
    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      default: "OPEN",
    },
    // NEW: Attachments array to store image URLs/paths
    attachments: {
      type: [String],
      default: [],
    },
    adminRemarks: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

module.exports =
  mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema);
