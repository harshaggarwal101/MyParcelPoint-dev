import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import api from "../../services/api";
import {
  FaTicketAlt,
  FaSearch,
  FaPlus,
  FaEye,
  FaSync,
  FaPaperclip,
  FaTimes,
} from "react-icons/fa";
import "./Tickets.css";

const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const [formData, setFormData] = useState({
    awb: "",
    issueType: "SHIPMENT_DELAY",
    priority: "MEDIUM",
    description: "",
  });

  const [selectedFiles, setSelectedFiles] = useState([]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tickets/my");
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

  const clearSelectedFiles = () => {
    selectedFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setSelectedFiles([]);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles((prev) => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[indexToRemove].previewUrl);
      newFiles.splice(indexToRemove, 1);
      return newFiles;
    });
  };

  const handleCreateTicket = async () => {
    if (!formData.description.trim()) {
      return alert("Description is required");
    }

    if (formData.description.length < 10) {
      return alert("Please enter at least 10 characters");
    }

    try {
      const submitData = new FormData();
      submitData.append("awb", formData.awb);
      submitData.append("issueType", formData.issueType);
      submitData.append("priority", formData.priority);
      submitData.append("description", formData.description);

      selectedFiles.forEach((item) => {
        submitData.append("attachments", item.file);
      });

      await api.post("/tickets", submitData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Ticket Created Successfully");
      setShowRaiseModal(false);
      setFormData({
        awb: "",
        issueType: "SHIPMENT_DELAY",
        priority: "MEDIUM",
        description: "",
      });
      clearSelectedFiles();
      fetchTickets();
    } catch (error) {
      console.error(error);
      alert("Failed to create ticket. Please try again.");
    }
  };

  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => t.status === "OPEN").length;
  const progressTickets = tickets.filter(
    (t) => t.status === "IN_PROGRESS",
  ).length;
  const resolvedTickets = tickets.filter((t) => t.status === "RESOLVED").length;
  const closedTickets = tickets.filter((t) => t.status === "CLOSED").length;

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.ticketNumber?.toLowerCase().includes(search.toLowerCase()) ||
      t.awb?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !statusFilter || t.status === statusFilter;
    const matchesPriority = !priorityFilter || t.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const backendUrl =
    import.meta.env.VITE_API_URL?.replace("/api", "") ||
    "http://localhost:5001";

  return (
    <div className="tickets-container">
      <div className="tickets-sidebar">
        <Sidebar />
      </div>

      <div className="tickets-content">
        <div className="tickets-header">
          <div>
            <h1 className="tickets-title">
              <FaTicketAlt className="tickets-title-icon" />
              Support Tickets
            </h1>
            <p className="tickets-subtitle">
              Manage your support requests and track their status
            </p>
          </div>
          <button
            onClick={() => {
              setShowRaiseModal(true);
              clearSelectedFiles();
            }}
            className="tickets-raise-btn"
          >
            <FaPlus /> Raise Ticket
          </button>
        </div>

        <div className="tickets-stats-grid">
          <div className="tickets-stat-card">
            <div className="tickets-stat-label">Total</div>
            <h2 className="tickets-stat-value">{totalTickets}</h2>
          </div>
          <div className="tickets-stat-card">
            <div className="tickets-stat-label">Open</div>
            <h2 className="tickets-stat-value tickets-stat-value-open">
              {openTickets}
            </h2>
          </div>
          <div className="tickets-stat-card">
            <div className="tickets-stat-label">In Progress</div>
            <h2 className="tickets-stat-value tickets-stat-value-progress">
              {progressTickets}
            </h2>
          </div>
          <div className="tickets-stat-card">
            <div className="tickets-stat-label">Resolved</div>
            <h2 className="tickets-stat-value tickets-stat-value-resolved">
              {resolvedTickets}
            </h2>
          </div>
          <div className="tickets-stat-card">
            <div className="tickets-stat-label">Closed</div>
            <h2 className="tickets-stat-value tickets-stat-value-closed">
              {closedTickets}
            </h2>
          </div>
        </div>

        <div className="tickets-filter-section">
          <div className="tickets-search-wrapper">
            <FaSearch className="tickets-search-icon" />
            <input
              type="text"
              placeholder="Search by Ticket # or AWB..."
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
          <button onClick={fetchTickets} className="tickets-refresh-btn">
            <FaSync className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>

        <div className="tickets-table-wrapper">
          {loading ? (
            <div className="tickets-empty">
              <p className="tickets-empty-text">Loading tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="tickets-empty">
              <div className="tickets-empty-icon">🎫</div>
              <h3 className="tickets-empty-title">No Support Tickets Found</h3>
              <p className="tickets-empty-sub">
                Raise your first support ticket.
              </p>
            </div>
          ) : (
            <>
              <table className="tickets-table">
                <thead>
                  <tr>
                    <th className="tickets-th">Ticket #</th>
                    <th className="tickets-th">AWB</th>
                    <th className="tickets-th">Type</th>
                    <th className="tickets-th">Priority</th>
                    <th className="tickets-th">Status</th>
                    <th className="tickets-th">Created</th>
                    <th className="tickets-th">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket._id} className="tickets-row">
                      <td className="tickets-td tickets-td-number">
                        {ticket.ticketNumber}
                      </td>
                      <td className="tickets-td">{ticket.awb || "-"}</td>
                      <td className="tickets-td">
                        {ticket.issueType?.replace(/_/g, " ")}
                      </td>
                      <td className="tickets-td">
                        <span
                          className={`tickets-badge tickets-badge-priority-${ticket.priority?.toLowerCase()}`}
                        >
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="tickets-td">
                        <span
                          className={`tickets-badge tickets-badge-status-${ticket.status?.toLowerCase().replace(/_/g, "-")}`}
                        >
                          {ticket.status?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="tickets-td tickets-td-date">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </td>
                      <td className="tickets-td">
                        <button
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setShowViewModal(true);
                          }}
                          className="tickets-view-btn"
                        >
                          <FaEye />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="tickets-footer">
                Showing {filteredTickets.length} of {tickets.length} tickets
              </div>
            </>
          )}
        </div>
      </div>

      {showRaiseModal && (
        <div className="tickets-modal-overlay">
          <div className="tickets-modal">
            <h2 className="tickets-modal-title">Raise New Ticket</h2>

            <div className="tickets-modal-field">
              <label className="tickets-modal-label">
                AWB <span className="tickets-modal-optional">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.awb}
                onChange={(e) =>
                  setFormData({ ...formData, awb: e.target.value })
                }
                className="tickets-modal-input"
                placeholder="Enter AWB number (optional)"
              />
            </div>

            <div className="tickets-modal-field">
              <label className="tickets-modal-label">Issue Type</label>
              <select
                value={formData.issueType}
                onChange={(e) =>
                  setFormData({ ...formData, issueType: e.target.value })
                }
                className="tickets-modal-select"
              >
                <option value="SHIPMENT_DELAY">Shipment Delay</option>
                <option value="TRACKING_ISSUE">Tracking Issue</option>
                <option value="NDR_ISSUE">NDR Issue</option>
                <option value="RTO_ISSUE">RTO Issue</option>
                <option value="LOST_SHIPMENT">Lost Shipment</option>
                <option value="DAMAGED_SHIPMENT">Damaged Shipment</option>
                <option value="BILLING_ISSUE">Billing Issue</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="tickets-modal-field">
              <label className="tickets-modal-label">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value })
                }
                className="tickets-modal-select"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div className="tickets-modal-field">
              <label className="tickets-modal-label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="tickets-modal-textarea"
                rows="4"
                maxLength={500}
                placeholder="Describe your issue in detail..."
              />
              <div className="tickets-modal-char-count">
                {formData.description.length}/500
              </div>
            </div>

            <div className="tickets-modal-field">
              <label className="tickets-modal-label">
                Upload Photos{" "}
                <span className="tickets-modal-optional">
                  (Optional, Max 5MB)
                </span>
              </label>
              <div className="tickets-file-upload-wrapper">
                <input
                  type="file"
                  id="ticket-files"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <label
                  htmlFor="ticket-files"
                  className="tickets-file-upload-btn"
                >
                  <FaPaperclip /> Choose Images
                </label>
              </div>

              {/* Cleaned up CSS Classes for Image Previews */}
              {selectedFiles.length > 0 && (
                <div className="tickets-file-preview-list">
                  {selectedFiles.map((item, index) => (
                    <div key={index} className="tickets-file-preview-item">
                      <img
                        src={item.previewUrl}
                        alt={`Preview ${index}`}
                        className="tickets-preview-img"
                      />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          removeFile(index);
                        }}
                        title="Remove Image"
                        className="tickets-remove-btn"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="tickets-modal-footer">
              <button
                onClick={() => {
                  setShowRaiseModal(false);
                  clearSelectedFiles();
                }}
                className="tickets-modal-btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTicket}
                className="tickets-modal-btn-submit"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedTicket && (
        <div className="tickets-modal-overlay">
          <div className="tickets-view-modal">
            <h2 className="tickets-modal-title">Ticket Details</h2>
            <div className="tickets-view-grid">
              <div>
                <div className="tickets-view-label">Ticket Number</div>
                <div className="tickets-view-value">
                  {selectedTicket.ticketNumber}
                </div>
              </div>
              <div>
                <div className="tickets-view-label">AWB</div>
                <div className="tickets-view-value">
                  {selectedTicket.awb || "-"}
                </div>
              </div>
              <div>
                <div className="tickets-view-label">Issue Type</div>
                <div className="tickets-view-value">
                  {selectedTicket.issueType?.replace(/_/g, " ")}
                </div>
              </div>
              <div>
                <div className="tickets-view-label">Priority</div>
                <div className="tickets-view-value">
                  {selectedTicket.priority}
                </div>
              </div>
              <div>
                <div className="tickets-view-label">Status</div>
                <div className="tickets-view-value">
                  {selectedTicket.status?.replace(/_/g, " ")}
                </div>
              </div>
              <div>
                <div className="tickets-view-label">Created Date</div>
                <div className="tickets-view-value">
                  {new Date(selectedTicket.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="tickets-view-section">
              <div className="tickets-view-label">Description</div>
              <div className="tickets-view-description">
                {selectedTicket.description}
              </div>
            </div>

            {selectedTicket.attachments &&
              selectedTicket.attachments.length > 0 && (
                <div className="tickets-view-section">
                  <div className="tickets-view-label">Attachments</div>

                  {/* Cleaned up CSS Classes for View Modal Attachments */}
                  <div className="tickets-file-preview-list">
                    {selectedTicket.attachments.map((url, i) => {
                      const fullUrl = url.startsWith("http")
                        ? url
                        : `${backendUrl}${url}`;
                      return (
                        <a
                          key={i}
                          href={fullUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tickets-file-preview-item"
                          style={{ display: "block", overflow: "hidden" }}
                        >
                          <img
                            src={fullUrl}
                            alt={`Attachment ${i + 1}`}
                            className="tickets-preview-img"
                          />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

            {selectedTicket.adminRemarks && (
              <div className="tickets-view-section">
                <div className="tickets-view-label">Admin Remarks</div>
                <div className="tickets-view-remarks">
                  {selectedTicket.adminRemarks}
                </div>
              </div>
            )}
            <div className="tickets-modal-footer">
              <button
                onClick={() => setShowViewModal(false)}
                className="tickets-modal-btn-cancel"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;
