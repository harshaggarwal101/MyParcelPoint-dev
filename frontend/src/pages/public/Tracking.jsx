import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../services/api";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { FaTruck, FaExclamationTriangle, FaMapMarkerAlt, FaSpinner } from "react-icons/fa";
import "./TrackingPage.css";

function TrackingPage() {
  const [searchParams] = useSearchParams();
  const [awb, setAwb] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shipmentData, setShipmentData] = useState(null);

  useEffect(() => {
    const urlAwb = searchParams.get("awb");
    if (urlAwb) {
      setAwb(urlAwb);
      fetchTracking(urlAwb);
    }
  }, [searchParams]);

  const fetchTracking = async (awbToSearch) => {
    const searchAwb = awbToSearch || awb;
    if (!searchAwb.trim()) {
      alert("Please enter AWB Number");
      return;
    }

    setLoading(true);
    setError("");
    setShipmentData(null);

    try {
      const res = await api.get(`/shipments/public-track/${encodeURIComponent(searchAwb.trim())}`);
      if (res.data.success) {
        setShipmentData(res.data.shipment);
      } else {
        setError(res.data.message || "Shipment Not Found");
      }
    } catch (err) {
      console.error("Tracking Error:", err);
      setError(err?.response?.data?.message || "No shipment details found for this AWB number.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchTracking();
  };

  const getStatusColor = (status) => {
    const s = (status || "").toUpperCase();
    if (s.includes("DELIVERED")) return "#10b981";
    if (s.includes("TRANSIT") || s.includes("OUT FOR DELIVERY") || s.includes("DISPATCH")) return "#3b82f6";
    if (s.includes("CANCEL") || s.includes("RTO") || s.includes("FAILED")) return "#ef4444";
    return "#f59e0b";
  };

  return (
    <>
      <Navbar />

      <div className="tracking-page">
        <div className="tracking-container">

          <span className="tracking-tag">
            REAL TIME SHIPMENT TRACKING
          </span>

          <h1>Track Your Shipment</h1>

          <p>
            Enter your AWB number to get real-time shipment updates,
            courier details and delivery status.
          </p>

          <form onSubmit={handleSubmit} className="tracking-search">
            <input
              type="text"
              placeholder="Enter AWB Number (e.g. AWB123456)"
              value={awb}
              onChange={(e) => setAwb(e.target.value)}
            />

            <button type="submit" disabled={loading}>
              {loading ? "Searching..." : "Track Shipment"}
            </button>
          </form>

          {loading && (
            <div className="tracking-loading-box">
              <FaSpinner className="spin-icon" size={32} />
              <p>Fetching real-time shipment tracking details...</p>
            </div>
          )}

          {error && (
            <div className="tracking-error-box">
              <FaExclamationTriangle size={36} color="#ef4444" />
              <h3>Shipment Not Found</h3>
              <p>{error}</p>
            </div>
          )}

          {shipmentData && (
            <div className="tracking-result">
              <h3>Shipment Details</h3>

              <div className="tracking-grid">
                <div>
                  <span>AWB Number</span>
                  <p>{shipmentData.awb}</p>
                </div>

                <div>
                  <span>Courier</span>
                  <p>{shipmentData.courierName}</p>
                </div>

                <div>
                  <span>Status</span>
                  <p className="status" style={{ color: getStatusColor(shipmentData.status), background: `${getStatusColor(shipmentData.status)}18` }}>
                    {shipmentData.status}
                  </p>
                </div>

                <div>
                  <span>Origin</span>
                  <p>{shipmentData.origin}</p>
                </div>

                <div>
                  <span>Destination</span>
                  <p>{shipmentData.destination}</p>
                </div>

                <div>
                  <span>Expected Delivery</span>
                  <p>
                    {shipmentData.expectedDelivery
                      ? new Date(shipmentData.expectedDelivery).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* TRACKING TIMELINE EVENTS */}
              {shipmentData.trackingHistory && shipmentData.trackingHistory.length > 0 && (
                <div className="tracking-timeline-wrapper">
                  <h4 className="timeline-title">
                    <FaTruck style={{ marginRight: "8px", color: "#f97316" }} /> Tracking Timeline
                  </h4>
                  <div className="public-timeline">
                    {shipmentData.trackingHistory.map((event, idx) => (
                      <div key={idx} className="timeline-item">
                        <div className="timeline-dot" />
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <span className="timeline-status-text">{event.status || event.activity || "Update"}</span>
                            <span className="timeline-time">
                              {event.timestamp
                                ? new Date(event.timestamp).toLocaleString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </span>
                          </div>
                          {event.location && (
                            <div className="timeline-location">
                              <FaMapMarkerAlt size={12} style={{ marginRight: "4px" }} />
                              {event.location}
                            </div>
                          )}
                          {event.remarks && <div className="timeline-remarks">{event.remarks}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>

      <Footer />
    </>
  );
}

export default TrackingPage;