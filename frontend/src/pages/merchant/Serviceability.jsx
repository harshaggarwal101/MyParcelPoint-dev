import { useState } from "react";
import Sidebar from "../../components/Sidebar";
import api from "../../services/api";
import { FaMapMarkerAlt, FaSearch, FaCheckCircle, FaTimesCircle, FaTruck, FaPlane, FaExchangeAlt, FaClock, FaInfoCircle, FaLocationArrow } from "react-icons/fa";
import "./Serviceability.css";

const PRESET_PINCODES = [
  { city: "Delhi", pincode: "110001" },
  { city: "Mumbai", pincode: "400001" },
  { city: "Bengaluru", pincode: "560001" },
  { city: "Kolkata", pincode: "700001" },
  { city: "Chennai", pincode: "600001" },
  { city: "Hyderabad", pincode: "500001" },
];

const Serviceability = () => {
  const [pickup, setPickup] = useState("");
  const [delivery, setDelivery] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const checkServiceability = async () => {
    if (!pickup || !delivery) {
      setError("Please enter both Pickup and Delivery pincodes");
      return;
    }
    if (!/^\d{6}$/.test(pickup) || !/^\d{6}$/.test(delivery)) {
      setError("Please enter valid 6-digit pincodes (e.g. 110001)");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await api.get(`/ratecards/serviceability/${delivery}`);
      const couriersList = res.data.couriers || [];

      setResult({
        serviceable: couriersList.length > 0,
        estimatedDays: couriersList[0]?.estimatedDays || 3,
        couriers: couriersList,
        pickupPincode: pickup,
        deliveryPincode: delivery,
      });
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to check serviceability. Please check pincodes and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    const temp = pickup;
    setPickup(delivery);
    setDelivery(temp);
  };

  return (
    <div className="serviceability-container">
      <div className="serviceability-sidebar">
        <Sidebar />
      </div>

      <main className="serviceability-main">
        <div className="serviceability-wrapper">
          {/* PAGE HEADER */}
          <div className="serviceability-header">
            <div>
              <h1 className="serviceability-title">
                <FaMapMarkerAlt className="header-icon-orange" /> Pincode Serviceability Checker
              </h1>
              <p className="serviceability-subtitle">
                Check courier coverage, estimated delivery timelines & available partners across India
              </p>
            </div>
          </div>

          {/* CHECKER FORM CARD */}
          <div className="serviceability-card">
            <div className="card-top-bar">
              <h3>Check Delivery Availability</h3>
              <span className="live-indicator">⚡ Live Courier Coverage</span>
            </div>

            <div className="pincode-input-row">
              {/* Pickup Pincode */}
              <div className="pincode-field-group">
                <label className="pincode-label">
                  <FaMapMarkerAlt color="#f97316" size={13} /> Pickup Pincode <span className="req-star">*</span>
                </label>
                <div className="input-with-icon">
                  <input
                    type="text"
                    placeholder="e.g. 110001"
                    maxLength={6}
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value.replace(/\D/g, ""))}
                    className="serviceability-input"
                  />
                </div>
              </div>

              {/* Swap Button */}
              <button
                type="button"
                onClick={handleSwap}
                className="swap-pincodes-btn"
                title="Swap Pickup & Delivery Pincodes"
              >
                <FaExchangeAlt />
              </button>

              {/* Delivery Pincode */}
              <div className="pincode-field-group">
                <label className="pincode-label">
                  <FaLocationArrow color="#60a5fa" size={13} /> Delivery Pincode <span className="req-star">*</span>
                </label>
                <div className="input-with-icon">
                  <input
                    type="text"
                    placeholder="e.g. 400001"
                    maxLength={6}
                    value={delivery}
                    onChange={(e) => setDelivery(e.target.value.replace(/\D/g, ""))}
                    className="serviceability-input"
                  />
                </div>
              </div>
            </div>

            {/* PRESET CHIPS */}
            <div className="preset-pincodes-section">
              <span className="preset-title">Quick Select City Pincodes:</span>
              <div className="preset-chips-list">
                {PRESET_PINCODES.map((item) => (
                  <button
                    key={item.pincode}
                    type="button"
                    className="preset-chip"
                    onClick={() => {
                      if (!pickup) setPickup("110001");
                      setDelivery(item.pincode);
                    }}
                  >
                    📍 {item.city} ({item.pincode})
                  </button>
                ))}
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              onClick={checkServiceability}
              className="serviceability-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="btn-spinner" /> Checking Coverage...
                </>
              ) : (
                <>
                  <FaSearch /> Check Serviceability Now
                </>
              )}
            </button>

            {error && (
              <div className="serviceability-error-banner">
                <FaInfoCircle size={15} /> {error}
              </div>
            )}
          </div>

          {/* RESULTS CARD */}
          {result && (
            <div className="serviceability-results-wrapper">
              {/* STATUS BANNER */}
              <div
                className={`result-status-banner ${
                  result.serviceable ? "banner-success" : "banner-fail"
                }`}
              >
                <div className="status-banner-left">
                  <div className="status-banner-icon">
                    {result.serviceable ? (
                      <FaCheckCircle size={28} />
                    ) : (
                      <FaTimesCircle size={28} />
                    )}
                  </div>
                  <div>
                    <h2 className="status-banner-title">
                      {result.serviceable
                        ? "Pincode is Serviceable!"
                        : "Location Currently Unserviceable"}
                    </h2>
                    <p className="status-banner-sub">
                      {result.serviceable
                        ? `Delivery from ${result.pickupPincode} to ${result.deliveryPincode} is supported.`
                        : `No active courier partners cover pincode ${result.deliveryPincode} at this time.`}
                    </p>
                  </div>
                </div>

                {result.serviceable && (
                  <div className="eta-badge-card">
                    <span className="eta-label">ESTIMATED ETA</span>
                    <h3 className="eta-value">{result.estimatedDays} Days</h3>
                  </div>
                )}
              </div>

              {/* COURIER PARTNERS LIST */}
              {result.serviceable && (
                <div className="available-couriers-card">
                  <div className="couriers-card-header">
                    <div className="header-title-group">
                      <FaTruck className="header-icon-orange" />
                      <h3>Available Courier Partners ({result.couriers.length})</h3>
                    </div>
                    <span className="cod-badge">💵 COD Supported</span>
                  </div>

                  <div className="couriers-grid">
                    {result.couriers.map((courier, index) => {
                      const cName = courier.courierName || courier.name || "Courier Partner";
                      const cDays = courier.estimatedDays || result.estimatedDays;
                      const cMode = courier.serviceType || "Surface";

                      return (
                        <div key={index} className="courier-item-card">
                          <div className="courier-card-top">
                            <div className="courier-icon-wrapper">
                              {cMode === "Air" ? (
                                <FaPlane color="#60a5fa" size={16} />
                              ) : (
                                <FaTruck color="#f97316" size={16} />
                              )}
                            </div>
                            <div>
                              <h4 className="courier-card-name">{cName}</h4>
                              <span className="courier-mode-tag">{cMode} Shipping</span>
                            </div>
                          </div>

                          <div className="courier-card-bottom">
                            <div className="eta-pill">
                              <FaClock size={11} /> {cDays} Days Delivery
                            </div>
                            <span className="active-badge">Active</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Serviceability;