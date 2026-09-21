import { useEffect, useState } from "react";
import { FaTicketAlt, FaSearch, FaEye, FaSync, FaCheck, FaTimes, FaReply, FaUser, FaEnvelope, FaTag, FaBox, FaExclamationTriangle, FaClock } from "react-icons/fa";

import AdminSidebar from "../../components/admin/AdminSidebar";
import api from "../../services/api";
import "./AdminTickets.css"; 

const AdminTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showViewModal, setShowViewModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [merchantFilter, setMerchantFilter] = useState("");

  const [replyData, setReplyData] = useState({
    adminRemarks: "",
    status: "IN_PROGRESS",
  });

  // Fetch all tickets (admin sees all merchants' tickets)
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tickets");
      setTickets(res.data.tickets || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Update ticket status and add admin remarks
  const handleUpdateTicket = async () => {
    if (!replyData.adminRemarks.trim()) {
      return alert("Please enter remarks");
    }

    try {
      await api.patch(`/tickets/${selectedTicket._id}/status`, {
        status: replyData.status,
        adminRemarks: replyData.adminRemarks,
      });

      alert("Ticket Updated Successfully");
      setShowReplyModal(false);
      setReplyData({
        adminRemarks: "",
        status: "IN_PROGRESS",
      });
      fetchTickets();
    } catch (error) {
      console.error(error);
      alert("Failed to update ticket");
    }
  };

  // Resolve ticket
  const handleResolveTicket = async (ticketId) => {
    if (!window.confirm("Resolve this ticket?")) return;

    try {
      await api.patch(`/tickets/${ticketId}/status`, {
        status: "RESOLVED",
        adminRemarks: "Ticket resolved by admin",
      });

      alert("Ticket Resolved Successfully");
      fetchTickets();
    } catch (error) {
      console.error(error);
      alert("Failed to resolve ticket");
    }
  };

  // Close ticket
  const handleCloseTicket = async (ticketId) => {
    if (!window.confirm("Close this ticket?")) return;

    try {
      await api.patch(`/tickets/${ticketId}/status`, {
        status: "CLOSED",
        adminRemarks: "Ticket closed by admin",
      });

      alert("Ticket Closed Successfully");
      fetchTickets();
    } catch (error) {
      console.error(error);
      alert("Failed to close ticket");
    }
  };

  // Stats
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => t.status === "OPEN").length;
  const progressTickets = tickets.filter((t) => t.status === "IN_PROGRESS").length;
  const resolvedTickets = tickets.filter((t) => t.status === "RESOLVED").length;
  const closedTickets = tickets.filter((t) => t.status === "CLOSED").length;

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.ticketNumber?.toLowerCase().includes(search.toLowerCase()) ||
      t.awb?.toLowerCase().includes(search.toLowerCase()) ||
      t.merchantId?.name?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !statusFilter || t.status === statusFilter;
    const matchesPriority = !priorityFilter || t.priority === priorityFilter;
    const matchesMerchant = !merchantFilter || t.merchantId?._id === merchantFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesMerchant;
  });

  // Get unique merchants for filter
  const uniqueMerchants = [...new Map(
    tickets
      .filter(t => t.merchantId)
      .map(t => [t.merchantId._id, t.merchantId])
  ).values()];

  // Helper functions
  const getStatusClass = (status) => {
    switch(status) {
      case "OPEN": return "tickets-badge-status-open";
      case "IN_PROGRESS": return "tickets-badge-status-progress";
      case "RESOLVED": return "tickets-badge-status-resolved";
      case "CLOSED": return "tickets-badge-status-closed";
      default: return "tickets-badge-status-closed";
    }
  };

  const getPriorityClass = (priority) => {
    switch(priority) {
      case "HIGH": return "tickets-badge-priority-high";
      case "MEDIUM": return "tickets-badge-priority-medium";
      case "LOW": return "tickets-badge-priority-low";
      default: return "tickets-badge-priority-default";
    }
  };

  const getStatusBadge = (status) => {
    return (
      <span className={`tickets-badge ${getStatusClass(status)}`}>
        {status?.replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <div className="tickets-container">
      <AdminSidebar />
      <div className="tickets-main">
        <div className="tickets-header">
          <h1 className="tickets-header-title">
            🎫 Support Tickets
          </h1>
          <p className="tickets-header-subtitle">
            View and manage all merchant support tickets
          </p>
        </div>

        {/* Stats Cards */}
        <div className="tickets-stats-grid">
          <div className="tickets-stat-card">
            <div className="tickets-stat-left">
              <div className="tickets-stat-label">Total Tickets</div>
              <h2 className="tickets-stat-value">{totalTickets}</h2>
            </div>
            <div className="tickets-stat-icon tickets-stat-icon-blue">
              <FaTicketAlt color="#3b82f6" size={22} />
            </div>
          </div>
          <div className="tickets-stat-card">
            <div className="tickets-stat-left">
              <div className="tickets-stat-label">Open</div>
              <h2 className="tickets-stat-value">{openTickets}</h2>
            </div>
            <div className="tickets-stat-icon tickets-stat-icon-yellow">
              <FaTicketAlt color="#f59e0b" size={22} />
            </div>
          </div>
          <div className="tickets-stat-card">
            <div className="tickets-stat-left">
              <div className="tickets-stat-label">In Progress</div>
              <h2 className="tickets-stat-value">{progressTickets}</h2>
            </div>
            <div className="tickets-stat-icon tickets-stat-icon-blue">
              <FaTicketAlt color="#3b82f6" size={22} />
            </div>
          </div>
          <div className="tickets-stat-card">
            <div className="tickets-stat-left">
              <div className="tickets-stat-label">Resolved</div>
              <h2 className="tickets-stat-value">{resolvedTickets}</h2>
            </div>
            <div className="tickets-stat-icon tickets-stat-icon-green">
              <FaTicketAlt color="#10b981" size={22} />
            </div>
          </div>
          <div className="tickets-stat-card">
            <div className="tickets-stat-left">
              <div className="tickets-stat-label">Closed</div>
              <h2 className="tickets-stat-value">{closedTickets}</h2>
            </div>
            <div className="tickets-stat-icon tickets-stat-icon-gray">
              <FaTicketAlt color="#64748b" size={22} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="tickets-filters">
          <div className="tickets-search-wrapper">
            <FaSearch className="tickets-search-icon" />
            <input
              type="text"
              placeholder="Search by Ticket #, AWB, or Merchant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="tickets-search-input"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="tickets-select"
          >
            <option value="">All Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="tickets-select"
          >
            <option value="">All Priority</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
          <select
            value={merchantFilter}
            onChange={(e) => setMerchantFilter(e.target.value)}
            className="tickets-select"
          >
            <option value="">All Merchants</option>
            {uniqueMerchants.map((merchant) => (
              <option key={merchant._id} value={merchant._id}>
                {merchant.name || merchant.email}
              </option>
            ))}
          </select>
          <button
            onClick={fetchTickets}
            className="tickets-refresh-btn"
          >
            <FaSync className={loading ? "tickets-refresh-btn-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Tickets Table */}
        <div className="tickets-table-container">
          <div className="tickets-table-header">
            <h3 className="tickets-table-title">Ticket List</h3>
            <span className="tickets-table-count">
              Showing {filteredTickets.length} of {tickets.length}
            </span>
          </div>
          
          {loading ? (
            <div className="tickets-no-data">Loading tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="tickets-no-data">
              <div className="tickets-no-data-icon">🎫</div>
              <p className="tickets-no-data-title">
                {search || statusFilter || priorityFilter || merchantFilter
                  ? "No tickets match your filters"
                  : "No Support Tickets Found"}
              </p>
              <p className="tickets-no-data-sub">
                All tickets from merchants will appear here.
              </p>
            </div>
          ) : (
            <div className="tickets-table-wrapper">
              <table className="tickets-table">
                <thead>
                  <tr>
                    <th className="tickets-th">Ticket #</th>
                    <th className="tickets-th">Merchant</th>
                    <th className="tickets-th">AWB</th>
                    <th className="tickets-th">Type</th>
                    <th className="tickets-th">Priority</th>
                    <th className="tickets-th">Status</th>
                    <th className="tickets-th">Created</th>
                    <th className="tickets-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket._id} className="tickets-tr">
                      <td className="tickets-td">
                        <strong className="tickets-ticket-number">{ticket.ticketNumber}</strong>
                      </td>
                      <td className="tickets-td">
                        {ticket.merchantId?.name || ticket.merchantId?.email || "Unknown"}
                      </td>
                      <td className="tickets-td">{ticket.awb || "-"}</td>
                      <td className="tickets-td">
                        {ticket.issueType?.replace(/_/g, " ")}
                      </td>
                      <td className="tickets-td">
                        <span className={`tickets-badge ${getPriorityClass(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="tickets-td">
                        {getStatusBadge(ticket.status)}
                      </td>
                      <td className="tickets-td">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </td>
                      <td className="tickets-td">
                        <div className="tickets-actions">
                          <button
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setShowViewModal(true);
                            }}
                            className="tickets-action-btn"
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                          {(ticket.status === "OPEN" || ticket.status === "IN_PROGRESS") && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  setReplyData({
                                    adminRemarks: "",
                                    status: ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status,
                                  });
                                  setShowReplyModal(true);
                                }}
                                className="tickets-action-btn tickets-action-btn-blue"
                                title="Reply & Update"
                              >
                                <FaReply />
                              </button>
                              <button
                                onClick={() => handleResolveTicket(ticket._id)}
                                className="tickets-action-btn tickets-action-btn-green"
                                title="Resolve"
                              >
                                <FaCheck />
                              </button>
                              <button
                                onClick={() => handleCloseTicket(ticket._id)}
                                className="tickets-action-btn tickets-action-btn-red"
                                title="Close"
                              >
                                <FaTimes />
                              </button>
                            </>
                          )}
                          {ticket.status === "RESOLVED" && (
                            <button
                              onClick={() => handleCloseTicket(ticket._id)}
                              className="tickets-action-btn tickets-action-btn-red"
                              title="Close"
                            >
                              <FaTimes />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* View Ticket Modal */}
      {showViewModal && selectedTicket && (
        <div className="tickets-modal-overlay">
          <div className="tickets-modal">
            {/* Modal Header */}
            <div className="tickets-modal-header">
              <h3 className="tickets-modal-title">
                <FaTicketAlt style={{ color: "#7c3aed" }} />
                Ticket Details
              </h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="tickets-modal-close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="tickets-modal-body">
              {/* Merchant Info Card */}
              <div className="tickets-merchant-card">
                <p className="tickets-merchant-name">
                  <FaUser size={16} />
                  {selectedTicket.merchantId?.name || "Unknown Merchant"}
                </p>
                <p className="tickets-merchant-email">
                  <FaEnvelope size={14} />
                  {selectedTicket.merchantId?.email || "No email available"}
                </p>
              </div>

              {/* Ticket Info Grid */}
              <div className="tickets-modal-grid">
                <div className="tickets-modal-field">
                  <span className="tickets-modal-label">
                    <FaTag size={12} style={{ marginRight: "4px" }} />
                    Ticket Number
                  </span>
                  <span className="tickets-modal-value">
                    {selectedTicket.ticketNumber}
                  </span>
                </div>
                <div className="tickets-modal-field">
                  <span className="tickets-modal-label">
                    <FaBox size={12} style={{ marginRight: "4px" }} />
                    AWB
                  </span>
                  <span className="tickets-modal-value">
                    {selectedTicket.awb || "-"}
                  </span>
                </div>
                <div className="tickets-modal-field">
                  <span className="tickets-modal-label">
                    <FaExclamationTriangle size={12} style={{ marginRight: "4px" }} />
                    Issue Type
                  </span>
                  <span className="tickets-modal-value">
                    {selectedTicket.issueType?.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="tickets-modal-field">
                  <span className="tickets-modal-label">Priority</span>
                  <span className="tickets-modal-value">
                    <span className={`tickets-badge ${getPriorityClass(selectedTicket.priority)}`}>
                      {selectedTicket.priority}
                    </span>
                  </span>
                </div>
                <div className="tickets-modal-field">
                  <span className="tickets-modal-label">Status</span>
                  <span className="tickets-modal-value">
                    {getStatusBadge(selectedTicket.status)}
                  </span>
                </div>
                <div className="tickets-modal-field">
                  <span className="tickets-modal-label">
                    <FaClock size={12} style={{ marginRight: "4px" }} />
                    Created Date
                  </span>
                  <span className="tickets-modal-value">
                    {new Date(selectedTicket.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="tickets-description-box">
                <div className="tickets-description-label">Description</div>
                <p className="tickets-description-text">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Admin Remarks */}
              {selectedTicket.adminRemarks && (
                <div className="tickets-admin-remark">
                  <div className="tickets-admin-remark-label">
                    <FaReply size={12} style={{ marginRight: "4px" }} />
                    Admin Remarks
                  </div>
                  <p className="tickets-admin-remark-text">
                    {selectedTicket.adminRemarks}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {(selectedTicket.status === "OPEN" || selectedTicket.status === "IN_PROGRESS") && (
                <div className="tickets-modal-actions">
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setReplyData({
                        adminRemarks: "",
                        status: selectedTicket.status === "OPEN" ? "IN_PROGRESS" : selectedTicket.status,
                      });
                      setShowReplyModal(true);
                    }}
                    className="tickets-modal-btn tickets-modal-btn-primary"
                  >
                    <FaReply /> Reply & Update
                  </button>
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      handleResolveTicket(selectedTicket._id);
                    }}
                    className="tickets-modal-btn tickets-modal-btn-success"
                  >
                    <FaCheck /> Resolve
                  </button>
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      handleCloseTicket(selectedTicket._id);
                    }}
                    className="tickets-modal-btn tickets-modal-btn-gray"
                  >
                    <FaTimes /> Close
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="tickets-modal-footer">
              <button
                onClick={() => setShowViewModal(false)}
                className="tickets-modal-btn-close"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && selectedTicket && (
        <div className="tickets-reply-overlay">
          <div className="tickets-reply-modal">
            <h2 className="tickets-reply-title">Update Ticket</h2>
            <p className="tickets-reply-subtitle">
              Ticket: <strong>{selectedTicket.ticketNumber}</strong>
            </p>
            
            <div className="tickets-reply-field">
              <label className="tickets-reply-label">
                Status
              </label>
              <select
                value={replyData.status}
                onChange={(e) => setReplyData({...replyData, status: e.target.value})}
                className="tickets-reply-select"
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            
            <div className="tickets-reply-field">
              <label className="tickets-reply-label">
                Admin Remarks <span className="tickets-reply-label-required">*</span>
              </label>
              <textarea
                value={replyData.adminRemarks}
                onChange={(e) => setReplyData({...replyData, adminRemarks: e.target.value})}
                className="tickets-reply-textarea"
                rows="4"
                placeholder="Add your remarks..."
                maxLength={500}
              />
              <p className="tickets-reply-char-count">
                {replyData.adminRemarks.length}/500
              </p>
            </div>

            <div className="tickets-reply-footer">
              <button
                onClick={() => {
                  setShowReplyModal(false);
                  setReplyData({
                    adminRemarks: "",
                    status: "IN_PROGRESS",
                  });
                }}
                className="tickets-reply-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTicket}
                className="tickets-reply-submit"
              >
                Update Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTickets;