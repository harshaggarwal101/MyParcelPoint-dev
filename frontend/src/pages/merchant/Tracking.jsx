import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import api from "../../services/api";
import { FaTruck, FaBox, FaCalendarAlt, FaPhoneAlt, FaUser, FaCheckCircle, FaClock, FaMapMarkerAlt, FaSearch, FaTimes, FaCopy, FaExclamationTriangle, FaShippingFast, FaWarehouse, FaWeightHanging, FaMoneyBillWave, FaInfoCircle } from "react-icons/fa";
import "./Tracking.css";

const STEP_DEFINITIONS = [
  { key: "ORDER_CREATED", label: "Order Created", sub: "Order logged in system" },
  { key: "PICKUP_SCHEDULED", label: "Pickup Scheduled", sub: "Courier assigned" },
  { key: "IN_TRANSIT", label: "In Transit", sub: "On the move" },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", sub: "Arriving today" },
  { key: "DELIVERED", label: "Delivered", sub: "Handed to recipient" },
];

const Tracking = () => {
  const { awb: urlAwb } = useParams();
  const navigate = useNavigate();
  const [awbInput, setAwbInput] = useState(urlAwb || "");
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const getStatusMeta = (status) => {
    switch (status) {
      case "DELIVERED":
        return {
          bg: "rgba(34, 197, 94, 0.15)",
          color: "#4ade80",
          border: "rgba(34, 197, 94, 0.3)",
          text: "Delivered",
          icon: <FaCheckCircle />,
          stepIndex: 4,
        };
      case "OUT_FOR_DELIVERY":
        return {
          bg: "rgba(59, 130, 246, 0.15)",
          color: "#60a5fa",
          border: "rgba(59, 130, 246, 0.3)",
          text: "Out for Delivery",
          icon: <FaShippingFast />,
          stepIndex: 3,
        };
      case "IN_TRANSIT":
        return {
          bg: "rgba(249, 115, 22, 0.15)",
          color: "#f97316",
          border: "rgba(249, 115, 22, 0.3)",
          text: "In Transit",
          icon: <FaTruck />,
          stepIndex: 2,
        };
      case "PICKED_UP":
      case "PICKUP_SCHEDULED":
        return {
          bg: "rgba(168, 85, 247, 0.15)",
          color: "#c084fc",
          border: "rgba(168, 85, 247, 0.3)",
          text: "Picked Up",
          icon: <FaBox />,
          stepIndex: 1,
        };
      case "PICKUP_PENDING":
        return {
          bg: "rgba(234, 179, 8, 0.15)",
          color: "#facc15",
          border: "rgba(234, 179, 8, 0.3)",
          text: "Pickup Pending",
          icon: <FaClock />,
          stepIndex: 0,
        };
      case "NDR":
        return {
          bg: "rgba(249, 115, 22, 0.2)",
          color: "#fb923c",
          border: "rgba(249, 115, 22, 0.4)",
          text: "NDR Action Required",
          icon: <FaExclamationTriangle />,
          stepIndex: 2,
        };
      case "RTO":
      case "RETURNED":
        return {
          bg: "rgba(239, 68, 68, 0.15)",
          color: "#f87171",
          border: "rgba(239, 68, 68, 0.3)",
          text: "RTO Initiated",
          icon: <FaExclamationTriangle />,
          stepIndex: 2,
        };
      case "CANCELLED":
        return {
          bg: "rgba(100, 116, 139, 0.2)",
          color: "#94a3b8",
          border: "rgba(100, 116, 139, 0.3)",
          text: "Cancelled",
          icon: <FaTimes />,
          stepIndex: 0,
        };
      default:
        return {
          bg: "rgba(100, 116, 139, 0.15)",
          color: "#94a3b8",
          border: "rgba(100, 116, 139, 0.3)",
          text: status || "Processing",
          icon: <FaClock />,
          stepIndex: 0,
        };
    }
  };

  const fetchTracking = useCallback(async (targetAwb) => {
    const searchAwb = (targetAwb || awbInput).trim();
    if (!searchAwb) {
      setErrorMsg("Please enter a valid AWB number");
      return;
    }
    setErrorMsg("");
    try {
      setLoading(true);
      const res = await api.get(`/shipments/track/${searchAwb}`);
      if (res.data && res.data.shipment) {
        setShipment(res.data.shipment);
      } else if (res.data && res.data.data) {
        setShipment(res.data.data);
      } else {
        setShipment(null);
        setErrorMsg("Shipment not found for AWB: " + searchAwb);
      }
    } catch (error) {
      setShipment(null);
      setErrorMsg(error?.response?.data?.message || "No tracking details found for this AWB");
    } finally {
      setLoading(false);
    }
  }, [awbInput]);

  useEffect(() => {
    if (urlAwb) {
      setAwbInput(urlAwb);
      fetchTracking(urlAwb);
    }
  }, [urlAwb, fetchTracking]);

  const handleCopyAwb = () => {
    if (!shipment?.awb) return;
    navigator.clipboard.writeText(shipment.awb);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentStatusMeta = getStatusMeta(shipment?.status);
  const eventsList = shipment?.trackingEvents || shipment?.tracking || [];
  const sortedEvents = [...eventsList].reverse();

  return (
    <div className="tracking-container">
      <div className="sidebar-wrapper">
        <Sidebar />
      </div>

      <main className="tracking-main">
        <div className="tracking-content-wrapper">
          {/* HEADER */}
          <div className="tracking-page-header">
            <div>
              <h1 className="tracking-title">
                <FaShippingFast className="header-icon-accent" /> Live Shipment Tracking
              </h1>
              <p className="tracking-subtitle">
                Enter your Air Waybill (AWB) to view real-time location, status timeline & details
              </p>
            </div>
          </div>

          {/* SEARCH BAR CARD */}
          <div className="tracking-search-card">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchTracking(awbInput);
              }}
              className="tracking-search-form"
            >
              <div className="tracking-input-container">
                <FaSearch className="tracking-search-icon-inside" />
                <input
                  type="text"
                  placeholder="Enter AWB Number (e.g. AWB17813389...)"
                  value={awbInput}
                  onChange={(e) => setAwbInput(e.target.value)}
                  className="tracking-input-field"
                />
                {awbInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setAwbInput("");
                      setShipment(null);
                      setErrorMsg("");
                    }}
                    className="tracking-clear-btn"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
              <button type="submit" disabled={loading} className="tracking-submit-btn">
                {loading ? (
                  <>
                    <div className="btn-spinner" /> Searching...
                  </>
                ) : (
                  <>
                    <FaSearch /> Track Now
                  </>
                )}
              </button>
            </form>

            {errorMsg && (
              <div className="tracking-error-banner">
                <FaExclamationTriangle size={14} /> {errorMsg}
              </div>
            )}
          </div>

          {/* SHIPMENT CONTENT */}
          {shipment && (
            <>
              {/* TOP STATUS OVERVIEW BANNER */}
              <div className="tracking-overview-card">
                <div className="overview-header">
                  <div className="awb-info-group">
                    <span className="awb-label">AWB NUMBER</span>
                    <div className="awb-value-row">
                      <h2 className="awb-number">{shipment.awb || awbInput}</h2>
                      <button onClick={handleCopyAwb} className="copy-awb-btn" title="Copy AWB">
                        <FaCopy size={13} /> {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div className="status-badge-container">
                    <div
                      className="tracking-badge-pill"
                      style={{
                        background: currentStatusMeta.bg,
                        color: currentStatusMeta.color,
                        border: `1px solid ${currentStatusMeta.border}`,
                      }}
                    >
                      <span className="badge-icon">{currentStatusMeta.icon}</span>
                      <span className="badge-text">{currentStatusMeta.text}</span>
                    </div>
                  </div>
                </div>

                <div className="overview-divider" />

                {/* VISUAL STEPPER */}
                <div className="stepper-wrapper">
                  <div className="stepper-track">
                    <div
                      className="stepper-progress-bar"
                      style={{
                        width: `${(currentStatusMeta.stepIndex / (STEP_DEFINITIONS.length - 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="stepper-nodes">
                    {STEP_DEFINITIONS.map((step, idx) => {
                      const isCompleted = idx <= currentStatusMeta.stepIndex;
                      const isCurrent = idx === currentStatusMeta.stepIndex;
                      return (
                        <div
                          key={step.key}
                          className={`stepper-node ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""}`}
                        >
                          <div className="node-circle">
                            {isCompleted ? <FaCheckCircle size={14} /> : <span>{idx + 1}</span>}
                          </div>
                          <span className="node-label">{step.label}</span>
                          <span className="node-sub">{step.sub}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* GRID INFO CARDS */}
              <div className="tracking-grid-layout">
                {/* CARD 1: PACKAGE & COURIER */}
                <div className="info-card">
                  <div className="card-header">
                    <FaTruck className="card-header-icon" />
                    <h3>Courier & Package</h3>
                  </div>
                  <div className="card-body">
                    <div className="info-row">
                      <span className="info-label">Courier Partner</span>
                      <span className="info-value courier-highlight">{shipment.courier || "Delhivery"}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Service Type</span>
                      <span className="info-value">{shipment.serviceType || "Surface"}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Payment Mode</span>
                      <span className={`payment-pill ${shipment.orderId?.paymentMode === "COD" || shipment.paymentMode === "COD" ? "cod" : "prepaid"}`}>
                        <FaMoneyBillWave size={11} /> {shipment.orderId?.paymentMode || shipment.paymentMode || "PREPAID"}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Order Amount</span>
                      <span className="info-value text-bold">₹{shipment.orderId?.amount || shipment.amount || 0}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Weight</span>
                      <span className="info-value">
                        <FaWeightHanging size={11} color="#8896b0" /> {shipment.weight || shipment.orderId?.weight || 0.5} kg
                      </span>
                    </div>
                  </div>
                </div>

                {/* CARD 2: RECIPIENT & ADDRESS */}
                <div className="info-card">
                  <div className="card-header">
                    <FaUser className="card-header-icon" />
                    <h3>Recipient Info</h3>
                  </div>
                  <div className="card-body">
                    <div className="info-row">
                      <span className="info-label">Customer Name</span>
                      <span className="info-value text-bold">{shipment.orderId?.customerName || shipment.customerName || "Customer"}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Phone</span>
                      <span className="info-value">
                        <FaPhoneAlt size={10} color="#f97316" /> {shipment.orderId?.customerPhone || shipment.customerPhone || "N/A"}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Destination Pincode</span>
                      <span className="info-value pincode-badge">
                        <FaMapMarkerAlt size={10} /> {shipment.orderId?.pincode || shipment.pincode || "N/A"}
                      </span>
                    </div>
                    <div className="info-row address-row">
                      <span className="info-label">Delivery Address</span>
                      <span className="info-value address-text">
                        {shipment.orderId?.customerAddress || shipment.customerAddress || "Address not provided"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CARD 3: DATES & WAREHOUSE */}
                <div className="info-card">
                  <div className="card-header">
                    <FaWarehouse className="card-header-icon" />
                    <h3>Dates & Warehouse</h3>
                  </div>
                  <div className="card-body">
                    <div className="info-row">
                      <span className="info-label">Pickup Date</span>
                      <span className="info-value">
                        <FaCalendarAlt size={11} color="#60a5fa" />{" "}
                        {shipment.pickupDate
                          ? new Date(shipment.pickupDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "Scheduled"}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Expected / Delivery</span>
                      <span className="info-value highlight-date">
                        <FaCalendarAlt size={11} color="#4ade80" />{" "}
                        {shipment.deliveryDate
                          ? new Date(shipment.deliveryDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "Expected in 2-3 Days"}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Pickup Location</span>
                      <span className="info-value">
                        {shipment.warehouseId?.name || "Primary Warehouse"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* LIVE TIMELINE SECTION */}
              <div className="tracking-timeline-card">
                <div className="timeline-header">
                  <div className="timeline-title-group">
                    <FaClock className="header-icon-accent" />
                    <h2>Activity Timeline</h2>
                  </div>
                  <span className="event-count-badge">
                    {sortedEvents.length} Event{sortedEvents.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {sortedEvents.length > 0 ? (
                  <div className="timeline-container">
                    {sortedEvents.map((event, index) => {
                      const isLatest = index === 0;
                      return (
                        <div key={index} className={`timeline-item ${isLatest ? "latest" : ""}`}>
                          <div className="timeline-marker">
                            <div className="marker-dot">
                              {event.status === "DELIVERED" ? (
                                <FaCheckCircle size={12} />
                              ) : isLatest ? (
                                <div className="pulse-dot" />
                              ) : (
                                <FaClock size={10} />
                              )}
                            </div>
                            {index !== sortedEvents.length - 1 && <div className="marker-line" />}
                          </div>

                          <div className="timeline-content">
                            <div className="timeline-header-row">
                              <span className="event-status">{event.status || "UPDATE"}</span>
                              {isLatest && <span className="latest-tag">LATEST UPDATE</span>}
                              <span className="event-time">
                                <FaClock size={10} />{" "}
                                {event.timestamp
                                  ? new Date(event.timestamp).toLocaleString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "Recently"}
                              </span>
                            </div>

                            <p className="event-remark">{event.remark || event.activity || "Package status updated"}</p>

                            {event.location && (
                              <div className="event-location">
                                <FaMapMarkerAlt size={11} /> {event.location}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="timeline-empty">
                    <FaInfoCircle size={32} color="#8896b0" />
                    <p>Shipment created. Awaiting first scan update from courier server.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* EMPTY INITIAL STATE */}
          {!shipment && !loading && !errorMsg && (
            <div className="tracking-initial-state">
              <div className="initial-icon-bg">
                <FaShippingFast size={48} color="#f97316" />
              </div>
              <h3>Track Any Shipment Instantly</h3>
              <p>Enter any AWB number above to fetch complete shipment history, courier milestones, and live delivery updates.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Tracking;