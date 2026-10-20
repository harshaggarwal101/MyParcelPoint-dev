const express = require("express");
const router = express.Router();

const {
  authMiddleware,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// NEW: Import the multer upload middleware
const upload = require("../middleware/uploadMiddleware");

const {
  createTicket,
  getMyTickets,
  getAllTickets,
  getTicketById,
  updateTicketStatus,
} = require("../controllers/ticketController");

// =================================
// MERCHANT ROUTES
// =================================

// Raise Ticket
router.post(
  "/",
  authMiddleware,
  authorizeRoles("MERCHANT"),
  upload.array("attachments", 5), // NEW: Process up to 5 files named "attachments"
  createTicket,
);

// My Tickets
router.get("/my", authMiddleware, authorizeRoles("MERCHANT"), getMyTickets);

// =================================
// ADMIN ROUTES
// =================================

// All Tickets
router.get(
  "/",
  authMiddleware,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  getAllTickets,
);

// Single Ticket
router.get(
  "/:id",
  authMiddleware,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  getTicketById,
);

// Update Status
router.patch(
  "/:id/status",
  authMiddleware,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  updateTicketStatus,
);

module.exports = router;
