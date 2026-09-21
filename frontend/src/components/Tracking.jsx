import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { FaSpinner, FaExclamationTriangle, FaExternalLinkAlt } from "react-icons/fa";
import "./Tracking.css";

function Tracking() {
  const [awb, setAwb] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shipmentData, setShipmentData] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!awb.trim()) {
      alert("Please enter an AWB or tracking number");
      return;
    }

    setLoading(true);
    setError("");
    setShipmentData(null);

    try {
      const res = await api.get(`/shipments/public-track/${encodeURIComponent(awb.trim())}`);
      if (res.data.success) {
        setShipmentData(res.data.shipment);
      } else {
        setError(res.data.message || "Shipment Not Found");
      }
    } catch (err) {
      console.error("Home Tracking Error:", err);
      setError(err?.response?.data?.message || "No shipment details found for this AWB number.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const s = (status || "").toUpperCase();
    if (s.includes("DELIVERED")) return "#10b981";
    if (s.includes("TRANSIT") || s.includes("OUT FOR DELIVERY") || s.includes("DISPATCH")) return "#3b82f6";
    if (s.includes("CANCEL") || s.includes("RTO") || s.includes("FAILED")) return "#ef4444";
    return "#f59e0b";
  };

  return (
    <section className="tracking-section">
      <div className="tracking-card">
        <h2>Track Your Shipment</h2>

        <p>
          Enter your tracking number to get real-time shipment updates.
        </p>

        <form onSubmit={handleSubmit} className="tracking-form">
          <input
            type="text"
            placeholder="Enter Tracking Number (e.g. AWB123456)"
            value={awb}
            onChange={(e) => setAwb(e.target.value)}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Searching..." : "Track Now"}
          </button>
        </form>

        {loading && (
          <div style={{ marginTop: "20px", textAlign: "center", color: "#64748b" }}>
            <FaSpinner className="spin-icon" size={24} style={{ animation: "spin 1s linear infinite", color: "#f97316" }} />
            <p style={{ marginTop: "8px", fontSize: "14px" }}>Fetching live tracking details...</p>
          </div>
        )}

        {error && (
          <div style={{ marginTop: "20px", padding: "16px", background: "#fef2f2", borderRadius: "12px", border: "1px solid #fee2e2", color: "#991b1b", textAlign: "center" }}>
            <FaExclamationTriangle size={24} color="#ef4444" style={{ marginBottom: "6px" }} />
            <p style={{ margin: 0, fontWeight: "600", fontSize: "14px" }}>{error}</p>
          </div>
        )}

        {shipmentData && (
          <div style={{ marginTop: "24px", textAlign: "left", background: "#f8fafc", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a", fontWeight: "700" }}>Shipment Summary</h3>
              <button 
                onClick={() => navigate(`/tracking?awb=${encodeURIComponent(awb.trim())}`)}
                style={{ background: "transparent", border: "none", color: "#f97316", fontWeight: "600", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              >
                View Full Details <FaExternalLinkAlt size={10} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", fontSize: "13px" }}>
              <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ color: "#64748b", display: "block", fontSize: "11px" }}>AWB Number</span>
                <strong style={{ color: "#0f172a" }}>{shipmentData.awb}</strong>
              </div>
              <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ color: "#64748b", display: "block", fontSize: "11px" }}>Courier</span>
                <strong style={{ color: "#0f172a" }}>{shipmentData.courierName}</strong>
              </div>
              <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ color: "#64748b", display: "block", fontSize: "11px" }}>Status</span>
                <span style={{ color: getStatusColor(shipmentData.status), fontWeight: "700" }}>{shipmentData.status}</span>
              </div>
              <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ color: "#64748b", display: "block", fontSize: "11px" }}>Origin &rarr; Destination</span>
                <strong style={{ color: "#0f172a" }}>{shipmentData.origin} &rarr; {shipmentData.destination}</strong>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}

export default Tracking;