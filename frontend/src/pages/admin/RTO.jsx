import { useEffect, useState, useCallback } from "react";
import { FaUndo, FaTruck, FaExclamationTriangle, FaEye, FaTimes, FaSync, FaChevronDown, FaUser, FaPhone, FaSearch, FaSpinner, FaClock, FaStore, FaClipboardList } from "react-icons/fa";
import AdminSidebar from "../../components/admin/AdminSidebar";
import api from "../../services/api";
import "./RTO.css";

const RTO = () => {
  const [shipments, setShipments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [courierFilter, setCourierFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);


  const statusStyles = {
    INITIATED: {
      className: "rto-status-initiated",
      icon: "🟡"
    },
    PICKUP_SCHEDULED: {
      className: "rto-status-pickup-scheduled",
      icon: "📅"
    },
    PICKED_UP: {
      className: "rto-status-picked-up",
      icon: "📦"
    },
    IN_TRANSIT: {
      className: "rto-status-in-transit",
      icon: "🚚"
    },
    RECEIVED_AT_WAREHOUSE: {
      className: "rto-status-warehouse",
      icon: "🏢"
    },
    COMPLETED: {
      className: "rto-status-completed",
      icon: "•"
    }
  };

  // Status display names
  const statusDisplayNames = {
    INITIATED: "Initiated",
    PICKUP_SCHEDULED: "Pickup Scheduled",
    PICKED_UP: "Picked Up",
    IN_TRANSIT: "In Transit",
    RECEIVED_AT_WAREHOUSE: "Warehouse Received",
    COMPLETED: "Completed"
  };

  // Status order for timeline
  const statusOrder = ['INITIATED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'RECEIVED_AT_WAREHOUSE', 'COMPLETED'];

  // ================================
  // API FUNCTIONS
  // ================================

  // Schedule Pickup
  const schedulePickup = async (id) => {
    try {
      setActionLoading(true);
      await api.put(`/rto/${id}/schedule-pickup`);
      showToast('Pickup scheduled successfully', 'success');
      fetchRTO();
    } catch (error) {
      console.error('Error scheduling pickup:', error);
      showToast('Failed to schedule pickup', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Mark Picked Up
  const markPickedUp = async (id) => {
    try {
      setActionLoading(true);
      await api.put(`/rto/${id}/picked-up`);
      showToast('Marked as picked up successfully', 'success');
      fetchRTO();
    } catch (error) {
      console.error('Error marking picked up:', error);
      showToast('Failed to mark as picked up', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Move to Transit
  const moveTransit = async (id) => {
    try {
      setActionLoading(true);
      await api.put(`/rto/${id}/in-transit`);
      showToast('Moved to transit successfully', 'success');
      fetchRTO();
    } catch (error) {
      console.error('Error moving to transit:', error);
      showToast('Failed to move to transit', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Warehouse Received
  const warehouseReceived = async (id) => {
    try {
      setActionLoading(true);
      await api.put(`/rto/${id}/received`);
      showToast('Received at warehouse successfully', 'success');
      fetchRTO();
    } catch (error) {
      console.error('Error marking warehouse received:', error);
      showToast('Failed to mark warehouse received', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Complete RTO
  const completeRTO = async (id) => {
    try {
      setActionLoading(true);
      await api.put(`/rto/${id}/complete`);
      showToast('RTO completed successfully', 'success');
      fetchRTO();
    } catch (error) {
      console.error('Error completing RTO:', error);
      showToast('Failed to complete RTO', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Fetch RTO shipments
  const fetchRTO = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await api.get("/admin/rto");

      const rtoShipments = (res.data.rtos || res.data || []).filter(
        (s) => s.status && (
          s.status === "INITIATED" ||
          s.status === "PICKUP_SCHEDULED" ||
          s.status === "PICKED_UP" ||
          s.status === "IN_TRANSIT" ||
          s.status === "RECEIVED_AT_WAREHOUSE" ||
          s.status === "COMPLETED"
        )
      );

      setShipments(rtoShipments);
    } catch (error) {
      console.error("Error fetching RTO:", error);
      setError("Failed to load RTO shipments. Please try again.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRTO();
    const interval = setInterval(() => fetchRTO(false), 30000);
    return () => clearInterval(interval);
  }, [fetchRTO]);

  const uniqueCouriers = [...new Set(shipments.map(s => s.courier).filter(Boolean))];

  // Filter shipments
  const filteredShipments = shipments.filter((s) => {
    const matchesSearch = s.awb?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.orderId?.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.orderId?.customerPhone?.includes(searchTerm) ||
      s.orderId?.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.orderId?.merchantName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
    const matchesCourier = courierFilter === "ALL" || s.courier === courierFilter;
    return matchesSearch && matchesStatus && matchesCourier;
  });

  // Statistics
  const totalRTO = shipments.length;
  const pickupScheduled = shipments.filter((s) => s.status === "PICKUP_SCHEDULED").length;
  const inTransit = shipments.filter((s) => s.status === "IN_TRANSIT").length;
  const completed = shipments.filter((s) => s.status === "COMPLETED").length;

  const handleViewDetails = (shipment) => {
    setSelectedShipment(shipment);
    setShowModal(true);
  };

  const showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      border-radius: 8px;
      font-weight: 600;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedShipment(null);
  };

  // Helper to get status class
  const getStatusClass = (status) => {
    return statusStyles[status]?.className || "rto-status-initiated";
  };

  // Helper to get status icon
  const getStatusIcon = (status) => {
    return statusStyles[status]?.icon || "📌";
  };

  if (loading) {
    return (
      <div className="admin-scope rto-container">
        <AdminSidebar />
        <div className="rto-content" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px"
            }}>
              <FaSpinner size={40} color="#ef4444" className="rto-spin" />
            </div>
            <h3 style={{ color: "#0f172a", margin: "0 0 8px 0", fontSize: "20px" }}>Loading RTO Cases</h3>
            <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>Please wait while we fetch the data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-scope rto-container">
      <AdminSidebar />

      <div className="rto-content">
        {/* Header */}
        <div className="rto-header">
          <div>
            <h1 className="rto-header-title">
              RTO Management
            </h1>
            <p className="rto-header-subtitle">
              Monitor and manage Return To Origin shipments
            </p>
          </div>
          <button
            onClick={() => fetchRTO(true)}
            disabled={isRefreshing}
            className="rto-refresh-btn"
          >
            <FaSync className={isRefreshing ? "rto-spin" : ""} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="rto-error">
            <FaExclamationTriangle style={{ marginRight: "8px" }} />
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="rto-stats-grid">
          <div className="rto-stat-card">
            <div className="rto-stat-inner">
              <div>
                <p className="rto-stat-label">Total RTO</p>
                <h2 className="rto-stat-value rto-stat-value-yellow">{totalRTO}</h2>
              </div>
              <div className="rto-stat-icon rto-stat-icon-yellow">
                ↩️
              </div>
            </div>
          </div>

          <div className="rto-stat-card">
            <div className="rto-stat-inner">
              <div>
                <p className="rto-stat-label">Pickup Scheduled</p>
                <h2 className="rto-stat-value rto-stat-value-blue">{pickupScheduled}</h2>
              </div>
              <div className="rto-stat-icon rto-stat-icon-blue">
                📅
              </div>
            </div>
          </div>

          <div className="rto-stat-card">
            <div className="rto-stat-inner">
              <div>
                <p className="rto-stat-label">In Transit</p>
                <h2 className="rto-stat-value rto-stat-value-orange">{inTransit}</h2>
              </div>
              <div className="rto-stat-icon rto-stat-icon-orange">
                🚚
              </div>
            </div>
          </div>

          <div className="rto-stat-card">
            <div className="rto-stat-inner">
              <div>
                <p className="rto-stat-label">Completed</p>
                <h2 className="rto-stat-value rto-stat-value-green">{completed}</h2>
              </div>
              <div className="rto-stat-icon rto-stat-icon-green">
                Completed
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="rto-filters">
          <div className="rto-search-wrapper">
            <FaSearch className="rto-search-icon" />
            <input
              type="text"
              placeholder="Search AWB, Order, Customer, Merchant or Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rto-search-input"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="rto-search-clear"
              >
                <FaTimes />
              </button>
            )}
          </div>

          <div className="rto-filter-group">
            <div className="rto-select-wrapper">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rto-select"
              >
                <option value="ALL">All Status</option>
                <option value="INITIATED">🟡 Initiated</option>
                <option value="PICKUP_SCHEDULED">📅 Pickup Scheduled</option>
                <option value="PICKED_UP">📦 Picked Up</option>
                <option value="IN_TRANSIT">🚚 In Transit</option>
                <option value="RECEIVED_AT_WAREHOUSE">🏢 Warehouse</option>
                <option value="COMPLETED">Completed</option>
              </select>
              <FaChevronDown className="rto-select-arrow" />
            </div>

            <div className="rto-select-wrapper">
              <select
                value={courierFilter}
                onChange={(e) => setCourierFilter(e.target.value)}
                className="rto-select"
              >
                <option value="ALL">All Couriers</option>
                {uniqueCouriers.map((courier) => (
                  <option key={courier} value={courier}>{courier}</option>
                ))}
              </select>
              <FaChevronDown className="rto-select-arrow" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rto-table-container">
          <div className="rto-table-wrapper">
            <table className="rto-table">
              <thead className="rto-thead">
                <tr>
                  <th className="rto-th">AWB</th>
                  <th className="rto-th">Order</th>
                  <th className="rto-th">Customer</th>
                  <th className="rto-th">Merchant</th>
                  <th className="rto-th">Courier</th>
                  <th className="rto-th">Reason</th>
                  <th className="rto-th">Status</th>
                  <th className="rto-th rto-th-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.length > 0 ? (
                  filteredShipments.map((s) => {
                    const status = s.status || "INITIATED";

                    return (
                      <tr key={s._id} className="rto-tr">
                        <td className="rto-td">
                          <span className="rto-awb">
                            {s.awb || "N/A"}
                          </span>
                        </td>
                        <td className="rto-td rto-order-number">
                          {s.orderId?.orderNumber || "N/A"}
                        </td>
                        <td className="rto-td">
                          <div className="rto-customer-name">
                            {s.orderId?.customerName || "N/A"}
                          </div>
                          <div className="rto-customer-phone">
                            📞 {s.orderId?.customerPhone || "N/A"}
                          </div>
                        </td>
                        <td className="rto-td">
                          <div className="rto-merchant-name">
                            <FaStore size={12} />
                            {s.orderId?.merchantName || "N/A"}
                          </div>
                        </td>
                        <td className="rto-td">
                          <span className="rto-courier-badge">
                            {s.courier || "N/A"}
                          </span>
                        </td>
                        <td className="rto-td">
                          {s.rtoReason || s.reason || "Return to Origin"}
                        </td>
                        <td className="rto-td">
                          <span className={`rto-status-badge ${getStatusClass(status)}`}>
                            {getStatusIcon(status)} {statusDisplayNames[status] || status}
                          </span>
                        </td>
                        <td className="rto-td rto-th-center">
                          <div className="rto-actions">
                            {/* View Button - Always Visible */}
                            <button
                              onClick={() => handleViewDetails(s)}
                              className="rto-action-btn rto-action-view"
                            >
                              <FaEye size={11} /> View
                            </button>

                            {/* Status-based Action Buttons */}
                            {status === "INITIATED" && (
                              <button
                                onClick={() => schedulePickup(s._id)}
                                disabled={actionLoading}
                                className="rto-action-btn rto-action-schedule"
                              >
                                📅 Schedule Pickup
                              </button>
                            )}

                            {status === "PICKUP_SCHEDULED" && (
                              <button
                                onClick={() => markPickedUp(s._id)}
                                disabled={actionLoading}
                                className="rto-action-btn rto-action-picked"
                              >
                                📦 Picked Up
                              </button>
                            )}

                            {status === "PICKED_UP" && (
                              <button
                                onClick={() => moveTransit(s._id)}
                                disabled={actionLoading}
                                className="rto-action-btn rto-action-transit"
                              >
                                🚚 Move Transit
                              </button>
                            )}

                            {status === "IN_TRANSIT" && (
                              <button
                                onClick={() => warehouseReceived(s._id)}
                                disabled={actionLoading}
                                className="rto-action-btn rto-action-received"
                              >
                                🏢 Received
                              </button>
                            )}

                            {status === "RECEIVED_AT_WAREHOUSE" && (
                              <button
                                onClick={() => completeRTO(s._id)}
                                disabled={actionLoading}
                                className="rto-action-btn rto-action-complete"
                              >
                                Complete
                              </button>
                            )}

                            {status === "COMPLETED" && (
                              <span className="rto-action-completed-text">
                                Completed
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" style={{ padding: 0 }}>
                      <div className="rto-no-data">
                        <div className="rto-no-data-icon">
                          <FaUndo size={32} color="#cbd5e1" />
                        </div>
                        <h3 className="rto-no-data-title">
                          No RTO Shipments Found
                        </h3>
                        <p className="rto-no-data-text">
                          {searchTerm || statusFilter !== "ALL" || courierFilter !== "ALL"
                            ? "Try adjusting your filters to see more results."
                            : "No return-to-origin cases available at the moment."}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="rto-footer">
          <span>
            Showing <strong>{filteredShipments.length}</strong> of <strong>{shipments.length}</strong> RTO cases
          </span>
          <div className="rto-footer-stats">
            <span>Total: {shipments.length}</span>
            <span>•</span>
            <span>Pickup Scheduled: {pickupScheduled}</span>
            <span>•</span>
            <span>In Transit: {inTransit}</span>
            <span>•</span>
            <span>Completed: {completed}</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedShipment && (
        <div className="rto-modal-overlay" onClick={closeModal}>
          <div className="rto-modal" onClick={(e) => e.stopPropagation()}>
            <button className="rto-modal-close" onClick={closeModal}>
              <FaTimes />
            </button>

            <div className="rto-modal-header">
              <div className="rto-modal-header-icon">
                ↩️
              </div>
              <div>
                <h2 className="rto-modal-title">
                  RTO Details
                </h2>
                <p className="rto-modal-subtitle">
                  AWB: <strong>{selectedShipment.awb || "N/A"}</strong>
                </p>
              </div>
            </div>

            <div className="rto-modal-grid">
              <div className="rto-modal-field">
                <p className="rto-modal-label">Order Number</p>
                <p className="rto-modal-value">
                  {selectedShipment.orderId?.orderNumber || "N/A"}
                </p>
              </div>
              <div className="rto-modal-field">
                <p className="rto-modal-label">Status</p>
                <span className={`rto-status-badge ${getStatusClass(selectedShipment.status)}`}>
                  {getStatusIcon(selectedShipment.status)}
                  {statusDisplayNames[selectedShipment.status] || selectedShipment.status || "Initiated"}
                </span>
              </div>
              <div className="rto-modal-field">
                <p className="rto-modal-label">Customer Name</p>
                <p className="rto-modal-value">
                  <FaUser size={12} style={{ display: "inline", marginRight: "4px", color: "#94a3b8" }} />
                  {selectedShipment.orderId?.customerName || "N/A"}
                </p>
              </div>
              <div className="rto-modal-field">
                <p className="rto-modal-label">Phone</p>
                <p className="rto-modal-value rto-modal-value-phone">
                  <FaPhone size={12} />
                  {selectedShipment.orderId?.customerPhone || "N/A"}
                </p>
              </div>
              <div className="rto-modal-field">
                <p className="rto-modal-label">Merchant</p>
                <p className="rto-modal-value">
                  <FaStore size={12} style={{ display: "inline", marginRight: "4px", color: "#94a3b8" }} />
                  {selectedShipment.orderId?.merchantName || "N/A"}
                </p>
              </div>
              <div className="rto-modal-field">
                <p className="rto-modal-label">Courier</p>
                <p className="rto-modal-value">
                  <FaTruck size={12} style={{ display: "inline", marginRight: "4px", color: "#94a3b8" }} />
                  {selectedShipment.courier || "N/A"}
                </p>
              </div>
            </div>

            <div className="rto-modal-reason">
              <p className="rto-modal-reason-text">
                <strong>Reason:</strong> {selectedShipment.rtoReason || selectedShipment.reason || "Return to Origin"}
              </p>
            </div>

            {/* Admin Remarks */}
            <div className="rto-modal-note">
              <p className="rto-modal-note-text">
                <strong>Admin Remarks:</strong> {selectedShipment.adminRemarks || "No remarks"}
              </p>
            </div>

            {/* Courier Remarks */}
            <div className="rto-modal-note">
              <p className="rto-modal-note-text">
                <strong>Courier Remarks:</strong> {selectedShipment.courierRemarks || "No remarks from courier"}
              </p>
            </div>

            {/* Timeline */}
            <div className="rto-modal-timeline">
              <p className="rto-modal-timeline-title">
                <FaClock size={14} />
                Timeline
              </p>
              {statusOrder.map((step) => {
                const currentStatus = selectedShipment.status || "INITIATED";
                const stepIndex = statusOrder.indexOf(step);
                const currentIndex = statusOrder.indexOf(currentStatus);
                const isCompleted = stepIndex <= currentIndex;

                return (
                  <div key={step} className={`rto-modal-timeline-item ${isCompleted ? 'rto-modal-timeline-item-completed' : 'rto-modal-timeline-item-pending'}`}>
                    <span className="rto-modal-timeline-icon">
                      {isCompleted ? "●" : "○"}
                    </span>
                    <span className={`rto-modal-timeline-label ${isCompleted ? 'rto-modal-timeline-label-completed' : 'rto-modal-timeline-label-pending'}`}>
                      {statusDisplayNames[step] || step}
                    </span>
                    {isCompleted && step === currentStatus && (
                      <span className="rto-modal-timeline-current">
                        Current
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Attempt History */}
            {selectedShipment.attemptHistory && selectedShipment.attemptHistory.length > 0 && (
              <div className="rto-modal-attempts">
                <p className="rto-modal-attempts-title">
                  <FaClipboardList size={14} />
                  Attempt History
                </p>
                {selectedShipment.attemptHistory.map((attempt, index) => (
                  <div key={index} className="rto-modal-attempt-item">
                    <span className="rto-modal-attempt-label">
                      Attempt {index + 1}
                    </span>
                    <span className="rto-modal-attempt-date">
                      {attempt.date ? new Date(attempt.date).toLocaleDateString() : 'N/A'}
                    </span>
                    <span className="rto-modal-attempt-status">
                      {attempt.status || 'No status'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="rto-modal-footer">
              <button className="rto-modal-close-btn" onClick={closeModal}>
                Close
              </button>

              {/* Modal Action Buttons */}
              {selectedShipment.status === "INITIATED" && (
                <button
                  onClick={() => {
                    schedulePickup(selectedShipment._id);
                    closeModal();
                  }}
                  disabled={actionLoading}
                  className="rto-modal-action-btn rto-modal-action-schedule"
                >
                  📅 Schedule Pickup
                </button>
              )}

              {selectedShipment.status === "PICKUP_SCHEDULED" && (
                <button
                  onClick={() => {
                    markPickedUp(selectedShipment._id);
                    closeModal();
                  }}
                  disabled={actionLoading}
                  className="rto-modal-action-btn rto-modal-action-picked"
                >
                  📦 Picked Up
                </button>
              )}

              {selectedShipment.status === "PICKED_UP" && (
                <button
                  onClick={() => {
                    moveTransit(selectedShipment._id);
                    closeModal();
                  }}
                  disabled={actionLoading}
                  className="rto-modal-action-btn rto-modal-action-transit"
                >
                  🚚 Move Transit
                </button>
              )}

              {selectedShipment.status === "IN_TRANSIT" && (
                <button
                  onClick={() => {
                    warehouseReceived(selectedShipment._id);
                    closeModal();
                  }}
                  disabled={actionLoading}
                  className="rto-modal-action-btn rto-modal-action-received"
                >
                  🏢 Received
                </button>
              )}

              {selectedShipment.status === "RECEIVED_AT_WAREHOUSE" && (
                <button
                  onClick={() => {
                    completeRTO(selectedShipment._id);
                    closeModal();
                  }}
                  disabled={actionLoading}
                  className="rto-modal-action-btn rto-modal-action-complete"
                >
                  Complete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RTO;