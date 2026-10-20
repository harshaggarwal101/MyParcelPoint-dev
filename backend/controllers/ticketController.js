const Ticket = require("../models/Ticket");

// =================================
// CREATE TICKET (MERCHANT)
// =================================
const createTicket = async (req, res) => {
  try {
    const { shipmentId, awb, issueType, description, priority } = req.body;

    const ticketNumber = "TKT" + Date.now();

    // NEW: Map uploaded files to an array of URLs
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map((file) => `/uploads/tickets/${file.filename}`);
    }

    const ticket = await Ticket.create({
      ticketNumber,
      merchantId: req.user.id,
      shipmentId,
      awb,
      issueType,
      description,
      priority,
      attachments, // NEW: Save attachments array to the ticket
    });

    res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      ticket,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =================================
// GET MY TICKETS (MERCHANT)
// =================================
const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({
      merchantId: req.user.id,
    })
      .populate("shipmentId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =================================
// GET ALL TICKETS (ADMIN)
// =================================
const getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate("merchantId", "name companyName email")
      .populate("shipmentId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =================================
// GET SINGLE TICKET
// =================================
const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("merchantId", "name companyName email")
      .populate("shipmentId");

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =================================
// UPDATE TICKET STATUS (ADMIN)
// =================================
const updateTicketStatus = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    ticket.status = req.body.status;

    if (req.body.adminRemarks) {
      ticket.adminRemarks = req.body.adminRemarks;
    }

    await ticket.save();

    res.status(200).json({
      success: true,
      message: "Ticket updated successfully",
      ticket,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getAllTickets,
  getTicketById,
  updateTicketStatus,
};
