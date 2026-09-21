import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import api from "../../services/api";
import { 
  FaTruck,
  FaSearch,
  FaDownload,
  FaTimes,
  FaEye,
  FaFileInvoice,
  FaBox,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUndo,
  FaFilter,
  FaFileAlt,
  FaCheckSquare,
} from "react-icons/fa";
import "./Shipments.css"; 

const Shipments = () => {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [selectedTimeline, setSelectedTimeline] = useState([]);
  const [schedulingId, setSchedulingId] = useState(null);
  const [toast, setToast] = useState(null); // { message, type: 'success'|'error' }

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Show toast for 3 seconds
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleSchedulePickup = async (shipmentId) => {
    try {
      setSchedulingId(shipmentId);
      const res = await api.post(`/shipments/${shipmentId}/pickup`);

      // Sirf is ek shipment ko update karo — pura list reload nahi hoga
      setShipments((prev) =>
        prev.map((s) =>
          s._id === shipmentId
            ? { ...s, status: "PICKUP_SCHEDULED", pickupStatus: "SCHEDULED" }
            : s
        )
      );

      showToast(res.data.message || "Pickup Scheduled Successfully", "success");
    } catch (error) {
      console.error("Schedule pickup error:", error);
      showToast(error.response?.data?.message || "Failed to schedule pickup.", "error");
    } finally {
      setSchedulingId(null);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const res = await api.get("/shipments");
      setShipments(res.data.shipments || []);
    } catch (error) {
      console.error("Error fetching shipments:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (filteredList) => {
    if (selectedIds.length === filteredList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredList.map((s) => s._id));
    }
  };

  const clearSelection = () => setSelectedIds([]);

  const handleBulkPickup = async () => {
    if (selectedIds.length === 0) return;
    const ok = window.confirm(`${selectedIds.length} shipments ke liye pickup schedule karna hai?`);
    if (!ok) return;
    try {
      setBulkLoading(true);
      const res = await api.post("/shipments/bulk-pickup", { shipmentIds: selectedIds });

      // Bulk mein bhi sirf selected ones update karo
      setShipments((prev) =>
        prev.map((s) =>
          selectedIds.includes(s._id)
            ? { ...s, status: "PICKUP_SCHEDULED", pickupStatus: "SCHEDULED" }
            : s
        )
      );

      setSelectedIds([]);
      showToast(res.data.message || "Bulk Pickup Scheduled!", "success");
    } catch (error) {
      showToast(error.response?.data?.message || "Bulk pickup failed", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleGenerateManifest = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkLoading(true);
      const res = await api.post("/shipments/manifest", { shipmentIds: selectedIds });
      if (res.data.manifestUrl) {
        window.open(res.data.manifestUrl, "_blank");
      } else {
        alert("Manifest generate hua lekin URL nahi mila.");
      }
      setSelectedIds([]);
    } catch (error) {
      alert(error.response?.data?.message || "Manifest generation failed");
    } finally {
      setBulkLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "DELIVERED": return { background: "#dcfce7", color: "#166534" };
      case "RTO": return { background: "#fee2e2", color: "#991b1b" };
      case "NDR": return { background: "#fef3c7", color: "#92400e" };
      case "IN_TRANSIT": return { background: "#dbeafe", color: "#1d4ed8" };
      case "OUT_FOR_DELIVERY": return { background: "#dbeafe", color: "#1d4ed8" };
      case "PICKED_UP": return { background: "#e0e7ff", color: "#4338ca" };
      case "READY_FOR_PICKUP": return { background: "#ffedd5", color: "#c2410c" };
      case "PICKUP_PENDING": return { background: "#ffedd5", color: "#c2410c" };
      case "PICKUP_SCHEDULED": return { background: "#dcfce7", color: "#15803d" };
      case "CANCELLED": return { background: "#fee2e2", color: "#991b1b" };
      default: return { background: "#f1f5f9", color: "#475569" };
    }
  };

  const downloadLabel = async (shipmentId, awb) => {
    try {
      const response = await api.get(`/shipments/${shipmentId}/label`, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Label-${awb || shipmentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Label download error:", error);
      alert("Label download failed. Please try again.");
    }
  };

  const downloadInvoice = async (shipment) => {
    try {
      let invoiceId = null;
      if (shipment.invoiceId?._id) {
        invoiceId = shipment.invoiceId._id;
      } else if (typeof shipment.invoiceId === "string") {
        invoiceId = shipment.invoiceId;
      }
      if (!invoiceId) { alert("Invoice not generated"); return; }
      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";
      const response = await fetch(`${baseUrl}/invoices/${invoiceId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Invoice download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Invoice download failed");
    }
  };

  const totalShipments = shipments.length;
  const delivered = shipments.filter(s => s.status === "DELIVERED").length;
  const inTransit = shipments.filter(s => s.status === "IN_TRANSIT" || s.status === "OUT_FOR_DELIVERY").length;
  const pending = shipments.filter(s => s.status === "PICKUP_PENDING" || s.status === "PICKUP_SCHEDULED").length;
  const ndr = shipments.filter(s => s.status === "NDR").length;
  const rto = shipments.filter(s => s.status === "RTO").length;

  const filtered = shipments.filter((s) => {
    const matchesSearch =
      s.awb?.toLowerCase().includes(search.toLowerCase()) ||
      (s.orderId?.customerName || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" ? true : s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < filtered.length;

  return (
    <>
      <div className="shipments-container">
        <div className="sidebar-wrapper">
          <Sidebar />
        </div>

        <main className="shipments-main">
          <h1 className="shipments-title">Shipments Management</h1>
          <p className="shipments-subtitle">Manage and track all your shipments</p>

          <div className="shipments-stats-grid">
            <div className="stat-card stat-card-blue">
              <FaBox className="stat-icon stat-icon-blue" />
              <div className="stat-value">{totalShipments}</div>
              <div className="stat-label">Total</div>
            </div>
            <div className="stat-card stat-card-orange">
              <FaClock className="stat-icon stat-icon-orange" />
              <div className="stat-value">{pending}</div>
              <div className="stat-label">Pending</div>
            </div>
            <div className="stat-card stat-card-blue">
              <FaTruck className="stat-icon stat-icon-blue" />
              <div className="stat-value">{inTransit}</div>
              <div className="stat-label">In Transit</div>
            </div>
            <div className="stat-card stat-card-green">
              <FaCheckCircle className="stat-icon stat-icon-green" />
              <div className="stat-value">{delivered}</div>
              <div className="stat-label">Delivered</div>
            </div>
            <div className="stat-card stat-card-yellow">
              <FaExclamationTriangle className="stat-icon stat-icon-yellow" />
              <div className="stat-value">{ndr}</div>
              <div className="stat-label">NDR</div>
            </div>
            <div className="stat-card stat-card-red">
              <FaUndo className="stat-icon stat-icon-red" />
              <div className="stat-value">{rto}</div>
              <div className="stat-label">RTO</div>
            </div>
          </div>

          <div className="shipments-search-wrapper">
            <FaSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Search by AWB or Customer Name..." 
              className="shipments-search-input"
              onChange={(e) => setSearch(e.target.value)} 
            />
            <div className="filter-wrapper">
              <FaFilter className="filter-icon" />
              <select
                className="shipments-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Status</option>
                <option value="READY_FOR_PICKUP">Ready For Pickup</option>
                <option value="PICKUP_SCHEDULED">Pickup Scheduled</option>
                <option value="PICKED_UP">Picked Up</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="OUT_FOR_DELIVERY">Out For Delivery</option>
                <option value="DELIVERED">Delivered</option>
                <option value="NDR">NDR</option>
                <option value="RTO">RTO</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="shipments-table-card">
            <div className="shipments-table-header">
              <h3 className="shipments-table-title">
                Shipment Records
                <span className="shipments-count">({filtered.length} shipments)</span>
              </h3>
              {selectedIds.length > 0 && (
                <span className="bulk-selected-info">
                  <FaCheckSquare size={13} />
                  {selectedIds.length} selected
                </span>
              )}
            </div>
            
            <div className="shipments-table-wrapper">
              {loading ? (
                <div className="shipments-loading">Loading Shipments...</div>
              ) : (
                <table className="shipments-table">
                  <thead>
                    <tr className="shipments-table-head">
                      <th className="shipments-th shipments-th-checkbox">
                        <input
                          type="checkbox"
                          className="bulk-checkbox"
                          checked={allSelected}
                          ref={(el) => { if (el) el.indeterminate = someSelected; }}
                          onChange={() => toggleSelectAll(filtered)}
                          title="Select All"
                        />
                      </th>
                      {["AWB","CUSTOMER","COURIER","STATUS","DATE","SCHEDULE PICKUP","DETAILS","INVOICE","LABEL","TIMELINE"].map((h) => (
                        <th key={h} className="shipments-th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length > 0 ? (
                      filtered.map((shipment) => {
                        const statusStyle = getStatusStyle(shipment.status);
                        const isSelected = selectedIds.includes(shipment._id);
                        return (
                          <tr key={shipment._id} className={`shipments-row${isSelected ? " shipments-row-selected" : ""}`}>
                            <td className="shipments-td shipments-td-checkbox">
                              <input
                                type="checkbox"
                                className="bulk-checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectOne(shipment._id)}
                              />
                            </td>
                            <td className="shipments-td">
                              <b className="shipments-awb">{shipment.awb}</b>
                            </td>
                            <td className="shipments-td">
                              <span className="shipments-customer">{shipment.orderId?.customerName || "N/A"}</span>
                            </td>
                            <td className="shipments-td">
                              <span className="shipments-courier">{shipment.courier}</span>
                            </td>
                            <td className="shipments-td">
                              <span className="shipments-status-badge" style={{ background: statusStyle.background, color: statusStyle.color }}>
                                {shipment.status}
                              </span>
                            </td>
                            <td className="shipments-td">
                              <span className="shipments-date">
                                {new Date(shipment.createdAt).toLocaleDateString('en-GB')}
                              </span>
                            </td>
                            <td className="shipments-td">
                              {shipment.status === "READY_FOR_PICKUP" || shipment.status === "PICKUP_PENDING" || shipment.pickupStatus === "PENDING" ? (
                                <button
                                  onClick={() => handleSchedulePickup(shipment._id)}
                                  disabled={schedulingId === shipment._id}
                                  className="shipments-btn shipments-btn-pickup"
                                >
                                  <FaTruck size={11} />
                                  {schedulingId === shipment._id ? "Scheduling..." : "Schedule Pickup"}
                                </button>
                              ) : shipment.status === "PICKUP_SCHEDULED" || shipment.pickupStatus === "SCHEDULED" ? (
                                <span className="shipments-pickup-scheduled-tag">
                                  <FaCheckCircle size={10} /> Scheduled
                                </span>
                              ) : (
                                <span style={{ fontSize: "11px", color: "#64748b" }}>-</span>
                              )}
                            </td>
                            <td className="shipments-td">
                              <button onClick={() => navigate(`/merchant/shipments/${shipment._id}`)} className="shipments-btn shipments-btn-details">
                                <FaEye size={11} /> Details
                              </button>
                            </td>
                            <td className="shipments-td">
                              <button onClick={() => downloadInvoice(shipment)} className="shipments-btn shipments-btn-invoice">
                                <FaFileInvoice size={11} /> Invoice
                              </button>
                            </td>
                            <td className="shipments-td">
                              <button onClick={() => downloadLabel(shipment._id, shipment.awb)} className="shipments-btn shipments-btn-label">
                                <FaDownload size={11} /> Label
                              </button>
                            </td>
                            <td className="shipments-td">
                              <button 
                                onClick={async () => { 
                                  try { 
                                    const res = await api.get(`/shipments/${shipment._id}/timeline`); 
                                    setSelectedTimeline(res.data.timeline); 
                                    setShowModal(true); 
                                  } catch { 
                                    alert("Timeline not available"); 
                                  } 
                                }} 
                                className="shipments-btn shipments-btn-timeline"
                              >
                                <FaEye size={11} /> Timeline
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="11" className="shipments-empty">
                          {search || statusFilter !== "ALL" ? "No matching shipments found" : "No Shipments Found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`shipment-toast shipment-toast-${toast.type}`}>
          {toast.type === "success" ? <FaCheckCircle size={15} /> : <FaTimes size={15} />}
          {toast.message}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="bulk-action-bar">
          <div className="bulk-action-left">
            <FaCheckSquare size={16} className="bulk-action-icon" />
            <span className="bulk-action-count">
              <strong>{selectedIds.length}</strong> shipment{selectedIds.length > 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="bulk-action-buttons">
            <button className="bulk-btn bulk-btn-pickup" onClick={handleBulkPickup} disabled={bulkLoading}>
              <FaTruck size={13} />
              {bulkLoading ? "Processing..." : `Schedule Pickup (${selectedIds.length})`}
            </button>
            <button className="bulk-btn bulk-btn-manifest" onClick={handleGenerateManifest} disabled={bulkLoading}>
              <FaFileAlt size={13} />
              {bulkLoading ? "Processing..." : `Manifest (${selectedIds.length})`}
            </button>
            <button className="bulk-btn bulk-btn-clear" onClick={clearSelection} disabled={bulkLoading}>
              <FaTimes size={13} /> Clear
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="shipments-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="shipments-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="shipments-modal-header">
              <h2 className="shipments-modal-title">Shipment Timeline</h2>
              <button onClick={() => setShowModal(false)} className="shipments-modal-close">
                <FaTimes />
              </button>
            </div>
            <div className="shipments-modal-body">
              {selectedTimeline?.length > 0 ? selectedTimeline.map((item, index) => (
                <div key={index} className="shipments-timeline-item">
                  <div className="shipments-timeline-status">{item.status}</div>
                  <div className="shipments-timeline-remark">{item.remark}</div>
                  <div className="shipments-timeline-meta">
                    {item.location && `📍 ${item.location}`} 
                    {item.location && item.createdAt && " - "}
                    {item.createdAt && new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
              )) : <p className="shipments-timeline-empty">No updates yet</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Shipments;
