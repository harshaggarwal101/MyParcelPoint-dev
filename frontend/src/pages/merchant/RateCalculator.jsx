import { useState, useCallback } from "react";
import Sidebar from "../../components/Sidebar";
import { FaCalculator, FaTruck, FaPlane, FaClock, FaBox, FaRulerCombined, FaCreditCard, FaChevronDown, FaChevronUp, FaSpinner, FaMapMarkerAlt } from "react-icons/fa";
import api from "../../services/api";

// ─────────────────────────────────────────────────────────────────
// STYLES 
// ─────────────────────────────────────────────────────────────────
const C = {
  // layout
  page: { display: "flex", minHeight: "100vh", background: "#111827", fontFamily: "'Inter', -apple-system, sans-serif", overflowX: "hidden" },
  sidebar: { width: "280px", flexShrink: 0, height: "100vh", position: "sticky", top: 0, overflowY: "auto", background: "#151c2c", borderRight: "1px solid #2a3a52", zIndex: 50 },
  content: { flex: 1, padding: "32px 40px", overflowX: "hidden", minWidth: 0 },
  card: { background: "#1c2333", borderRadius: "20px", padding: "24px 28px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)", border: "1px solid #2a3a52", marginBottom: "20px" },
  // form
  label: { fontSize: "13px", fontWeight: "600", color: "#a0aec0", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" },
  input: { padding: "11px 14px", border: "1.5px solid #2a3a52", borderRadius: "12px", fontSize: "14px", outline: "none", background: "#151c2c", color: "#e8edf5", width: "100%", boxSizing: "border-box", fontFamily: "inherit", transition: "all 0.2s" },
  select: { padding: "11px 14px", border: "1.5px solid #2a3a52", borderRadius: "12px", fontSize: "14px", outline: "none", background: "#151c2c", color: "#e8edf5", width: "100%", boxSizing: "border-box", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" },
};

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
const getMerchantId = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.id || user?.merchantId || null;
  } catch {
    return null;
  }
};

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const getZoneLabel = (zone) => {
  const map = { local: "🏙️ Local", regional: "🗺️ Regional", national: "🇮🇳 National" };
  return map[zone] || zone || "—";
};

// ─────────────────────────────────────────────────────────────────
// COURIER ROW — expandable breakdown
// ─────────────────────────────────────────────────────────────────
const CourierRow = ({ courier, rank, paymentType, serviceType }) => {
  const [expanded, setExpanded] = useState(false);
  const d = courier.calculationDetails || {};

  const isCheapest = rank === "cheapest";
  const isFastest  = rank === "fastest";

  return (
    <div style={{
      border: "1.5px solid",
      borderColor: isCheapest ? "rgba(34,197,94,0.5)" : isFastest ? "rgba(59,130,246,0.5)" : "#2a3a52",
      borderRadius: "16px", marginBottom: "12px", overflow: "hidden",
      background: isCheapest ? "rgba(34,197,94,0.07)" : isFastest ? "rgba(59,130,246,0.07)" : "#151c2c",
      transition: "box-shadow 0.2s",
    }}>
      {/* MAIN ROW */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px 20px", cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}>

        {/* Courier icon */}
        <div style={{
          width: "44px", height: "44px", borderRadius: "12px", flexShrink: 0,
          background: serviceType === "Air" ? "rgba(59,130,246,0.15)" : "rgba(249,115,22,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {serviceType === "Air"
            ? <FaPlane color="#60a5fa" size={18} />
            : <FaTruck color="#f97316" size={18} />}
        </div>

        {/* Courier name + badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "15px", fontWeight: "700", color: "#f1f5f9" }}>
              {courier.courierName}
            </span>
            {isCheapest && (
              <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "20px", background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>
                ⭐ CHEAPEST
              </span>
            )}
            {isFastest && (
              <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "20px", background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>
                ⚡ FASTEST
              </span>
            )}
            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: "rgba(148,163,184,0.1)", color: "#8896b0", fontWeight: "600" }}>
              {courier.pricingType === "MERCHANT" ? "🎯 Custom Rate" : "📋 Standard Rate"}
            </span>
          </div>
          <div style={{ display: "flex", gap: "16px", marginTop: "4px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", color: "#8896b0", display: "flex", alignItems: "center", gap: "4px" }}>
              <FaClock size={10} /> {courier.estimatedDays || 3} days
            </span>
            <span style={{ fontSize: "12px", color: "#8896b0" }}>
              {getZoneLabel(d.zone)}
            </span>
            <span style={{ fontSize: "12px", color: courier.serviceability?.codEnabled !== false ? "#4ade80" : "#4a5c78", fontWeight: "600" }}>
              {courier.serviceability?.codEnabled !== false ? "COD" : "No COD"}
            </span>
            {paymentType === "COD" && d.codCharge > 0 && (
              <span style={{ fontSize: "12px", color: "#facc15" }}>
                COD Fee: {fmt(d.codCharge)}
              </span>
            )}
          </div>
        </div>

        {/* Total price */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: "22px", fontWeight: "800", color: "#f97316", margin: 0 }}>
            {fmt(courier.total)}
          </p>
          <p style={{ fontSize: "11px", color: "#4a5c78", margin: "2px 0 0" }}>incl. all taxes</p>
        </div>

        {/* Expand toggle */}
        <div style={{ color: "#94a3b8", paddingLeft: "8px" }}>
          {expanded ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
        </div>
      </div>

      {/* BREAKDOWN PANEL */}
      {expanded && (
        <div style={{ padding: "0 20px 20px", borderTop: "1px solid #2a3a52" }}>
          <p style={{ fontSize: "12px", fontWeight: "700", color: "#4a5c78", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "16px", marginBottom: "12px" }}>
            Charge Breakdown
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {[
              { label: "Base Rate",       value: d.forwardRate,     show: true },
              { label: "Zone Surcharge",  value: d.zoneRate,        show: (d.zoneRate || 0) > 0 },
              { label: "COD Charge",      value: d.codCharge,       show: paymentType === "COD" },
              { label: "Fuel Charge",     value: d.fuelCharge,      show: (d.fuelCharge || 0) > 0 },
              { label: "Insurance",       value: d.insuranceCharge, show: (d.insuranceCharge || 0) > 0 },
              { label: "ODA Charge",      value: d.odaCharge,       show: (d.odaCharge || 0) > 0 },
              { label: "Handling Charge", value: d.handlingCharge,  show: (d.handlingCharge || 0) > 0 },
              { label: "RTO Charge",      value: d.rtoCharge,       show: (d.rtoCharge || 0) > 0 },
            ].filter(r => r.show).map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", background: "#111827", borderRadius: "8px", border: "1px solid #2a3a52" }}>
                <span style={{ fontSize: "13px", color: "#8896b0" }}>{label}</span>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9" }}>{fmt(value)}</span>
              </div>
            ))}
          </div>

          {/* Subtotal → GST → Total */}
          <div style={{ marginTop: "12px", padding: "12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
              <span style={{ fontSize: "13px", color: "#64748b" }}>Subtotal</span>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{fmt(d.subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
              <span style={{ fontSize: "13px", color: "#64748b" }}>GST ({d.gstPercentage || 18}%)</span>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{fmt(d.gstAmount)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", borderTop: "1.5px solid #e2e8f0", marginTop: "4px" }}>
              <span style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>Total</span>
              <span style={{ fontSize: "16px", fontWeight: "800", color: "#ea580c" }}>{fmt(d.finalCharge)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// SERVICE TAB PANEL — list of couriers for one service type
// ─────────────────────────────────────────────────────────────────
const ServicePanel = ({ couriers, loading, serviceType, paymentType }) => {
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <FaSpinner size={24} color="#ea580c" style={{ animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#64748b", marginTop: "12px", fontSize: "14px" }}>Fetching {serviceType} rates…</p>
      </div>
    );
  }

  if (!couriers) return null;

  if (couriers.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>📦</div>
        <p style={{ fontSize: "16px", fontWeight: "700", color: "#64748b", margin: "0 0 6px" }}>
          No {serviceType} Rates Available
        </p>
        <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
          Ask your admin to configure {serviceType} rate cards.
        </p>
      </div>
    );
  }

  // Determine cheapest & fastest
  const sorted = [...couriers].sort((a, b) => a.total - b.total);
  const cheapestId = sorted[0]?.courierId?.toString();
  const fastestId  = [...couriers].sort((a, b) => (a.estimatedDays || 99) - (b.estimatedDays || 99))[0]?.courierId?.toString();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <p style={{ fontSize: "13px", color: "#8896b0", margin: 0 }}>
          {couriers.length} courier{couriers.length !== 1 ? "s" : ""} available · sorted by price
        </p>
        <div style={{ display: "flex", gap: "8px" }}>
          <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "20px", background: "rgba(34,197,94,0.15)", color: "#4ade80", fontWeight: "600" }}>⭐ Cheapest</span>
          <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "20px", background: "rgba(59,130,246,0.15)", color: "#60a5fa", fontWeight: "600" }}>⚡ Fastest</span>
        </div>
      </div>

      {sorted.map((courier) => {
        const cid = courier.courierId?.toString();
        const rank = cid === cheapestId && cid === fastestId ? "cheapest"
                   : cid === cheapestId ? "cheapest"
                   : cid === fastestId  ? "fastest"
                   : null;
        return (
          <CourierRow
            key={`${serviceType}-${cid}`}
            courier={courier}
            rank={rank}
            paymentType={paymentType}
            serviceType={serviceType}
          />
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
const RateCalculator = () => {
  // Form state
  const [pickup,   setPickup]   = useState("");
  const [delivery, setDelivery] = useState("");
  const [weight,   setWeight]   = useState("");
  const [length,   setLength]   = useState("");
  const [breadth,  setBreadth]  = useState("");
  const [height,   setHeight]   = useState("");
  const [paymentType, setPaymentType] = useState("PREPAID");
  const [shippingMode, setShippingMode] = useState("All"); // All, Surface, Air

  // Results state — per service type
  const [surfaceRates, setSurfaceRates] = useState(null); // null = not yet fetched
  const [airRates,     setAirRates]     = useState(null);
  const [loadingSurface, setLoadingSurface] = useState(false);
  const [loadingAir,     setLoadingAir]     = useState(false);
  const [errors, setErrors] = useState({ surface: null, air: null });

  // Active results tab
  const [activeTab, setActiveTab] = useState("Surface");

  // ── Computed weights ──
  const actualWeight     = parseFloat(weight) || 0;
  const volumetricWeight = (parseFloat(length) || 0) * (parseFloat(breadth) || 0) * (parseFloat(height) || 0) / 5000;
  const chargeableWeight = Math.max(actualWeight, volumetricWeight);

  // ── Fetch one service type ──
  const fetchServiceType = useCallback(async (serviceType, merchantId) => {
    const setter    = serviceType === "Surface" ? setSurfaceRates    : setAirRates;
    const setLoading = serviceType === "Surface" ? setLoadingSurface  : setLoadingAir;
    const setError  = (msg) => setErrors((prev) => ({ ...prev, [serviceType.toLowerCase()]: msg }));

    setLoading(true);
    setError(null);
    setter(null);

    try {
      const res = await api.get(
        `/ratecards/recommendation?merchantId=${merchantId}&weight=${chargeableWeight}&serviceType=${serviceType}&pickup=${pickup}&destination=${delivery}&paymentMode=${paymentType}`
      );
      if (res.data.success && res.data.couriers) {
        setter(res.data.couriers);
      } else {
        setter([]);
      }
    } catch (err) {
      const msg = err.response?.data?.message || `No ${serviceType} rates configured.`;
      setError(msg);
      setter([]);
    } finally {
      setLoading(false);
    }
  }, [chargeableWeight, pickup, delivery, paymentType]);

  // ── Main calculate ──
  const calculateRates = async () => {
    if (!pickup.trim()) { alert("Please enter Pickup Pincode"); return; }
    if (!delivery.trim()) { alert("Please enter Delivery Pincode"); return; }
    if (!weight || Number(weight) <= 0) { alert("Please enter a valid Weight"); return; }

    const merchantId = getMerchantId();

    if (shippingMode === "All") {
      setActiveTab("Surface");
      fetchServiceType("Surface", merchantId);
      fetchServiceType("Air", merchantId);
    } else if (shippingMode === "Surface") {
      setActiveTab("Surface");
      fetchServiceType("Surface", merchantId);
      setAirRates(null);
      setErrors((prev) => ({ ...prev, air: null }));
    } else {
      setActiveTab("Air");
      fetchServiceType("Air", merchantId);
      setSurfaceRates(null);
      setErrors((prev) => ({ ...prev, surface: null }));
    }
  };

  const hasResults = (shippingMode === "Surface" && surfaceRates !== null) ||
                     (shippingMode === "Air" && airRates !== null) ||
                     (shippingMode === "All" && (surfaceRates !== null || airRates !== null));
  const isLoading  = loadingSurface || loadingAir;

  // ── Zone label from results ──
  const zoneLabel = (() => {
    const couriers = activeTab === "Surface" ? surfaceRates : airRates;
    const zone = couriers?.[0]?.calculationDetails?.zone;
    return getZoneLabel(zone);
  })();

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div style={C.page} className="rate-container merchant-page-container">
      <style>{`
        @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        input:focus, select:focus { border-color: #f97316 !important; box-shadow: 0 0 0 3px rgba(249,115,22,0.15) !important; background: #1a2540 !important; }
        .rc-row:hover { background: #1e2a40 !important; }
        input::placeholder { color: #4a5c78; }
        select option { background: #1c2333; color: #e8edf5; }
      `}</style>

      {/* Sidebar */}
      <div style={C.sidebar} className="rate-sidebar merchant-sidebar-container"><Sidebar /></div>

      {/* Main content */}
      <div style={C.content} className="rate-content merchant-main-container">

        {/* ── Header ── */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#f1f5f9", margin: "0 0 4px", display: "flex", alignItems: "center", gap: "10px" }}>
            <FaCalculator color="#f97316" /> Rate Calculator
          </h1>
          <p style={{ fontSize: "14px", color: "#8896b0", margin: 0 }}>
            Compare Surface &amp; Air courier rates instantly — powered by real rate cards
          </p>
        </div>

        {/* ── Form Card ── */}
        <div style={C.card}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "18px" }}>

            {/* Pickup */}
            <div>
              <label style={C.label}><FaMapMarkerAlt color="#ea580c" size={12} /> Pickup Pincode <span style={{ color: "#ef4444" }}>*</span></label>
              <input style={C.input} type="text" placeholder="e.g. 110001" maxLength={6}
                value={pickup} onChange={(e) => setPickup(e.target.value)} />
            </div>

            {/* Delivery */}
            <div>
              <label style={C.label}><FaMapMarkerAlt color="#2563eb" size={12} /> Delivery Pincode <span style={{ color: "#ef4444" }}>*</span></label>
              <input style={C.input} type="text" placeholder="e.g. 400001" maxLength={6}
                value={delivery} onChange={(e) => setDelivery(e.target.value)} />
            </div>

            {/* Weight */}
            <div>
              <label style={C.label}><FaBox size={12} color="#64748b" /> Weight (kg) <span style={{ color: "#ef4444" }}>*</span></label>
              <input style={C.input} type="number" placeholder="e.g. 0.5" min="0" step="0.1"
                value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>

            {/* Length */}
            <div>
              <label style={C.label}><FaRulerCombined size={12} color="#64748b" /> Length (cm)</label>
              <input style={C.input} type="number" placeholder="L" min="0"
                value={length} onChange={(e) => setLength(e.target.value)} />
            </div>

            {/* Breadth */}
            <div>
              <label style={C.label}><FaRulerCombined size={12} color="#64748b" /> Breadth (cm)</label>
              <input style={C.input} type="number" placeholder="B" min="0"
                value={breadth} onChange={(e) => setBreadth(e.target.value)} />
            </div>

            {/* Height */}
            <div>
              <label style={C.label}><FaRulerCombined size={12} color="#64748b" /> Height (cm)</label>
              <input style={C.input} type="number" placeholder="H" min="0"
                value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>

            {/* Payment Type */}
            <div>
              <label style={C.label}><FaCreditCard size={12} color="#64748b" /> Payment Type</label>
              <select style={C.select} value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                <option value="PREPAID">Prepaid</option>
                <option value="COD">Cash on Delivery</option>
              </select>
            </div>

            {/* Shipping Mode */}
            <div>
              <label style={C.label}><FaTruck size={12} color="#64748b" /> Shipping Mode</label>
              <select style={C.select} value={shippingMode} onChange={(e) => setShippingMode(e.target.value)}>
                <option value="All">All Services (Surface & Air)</option>
                <option value="Surface">Surface Only</option>
                <option value="Air">Air Only</option>
              </select>
            </div>

            {/* Calculate Button */}
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                onClick={calculateRates}
                disabled={isLoading}
                style={{
                  width: "100%", height: "48px",
                  background: isLoading ? "#94a3b8" : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                  color: "#fff", border: "none", borderRadius: "12px",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  fontWeight: "700", fontSize: "14px", fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  boxShadow: isLoading ? "none" : "0 4px 12px rgba(249,115,22,0.3)",
                  transition: "all 0.2s",
                }}
              >
                {isLoading
                  ? <><FaSpinner style={{ animation: "spin 0.8s linear infinite" }} size={14} /> Fetching…</>
                  : <>🚀 Get Rates</>}
              </button>
            </div>
          </div>

          {/* Volumetric weight hint */}
          {(length || breadth || height) && (
            <div style={{ marginTop: "16px", padding: "12px 16px", background: "rgba(249,115,22,0.08)", borderRadius: "10px", border: "1px solid rgba(249,115,22,0.25)", display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "13px", color: "#a0aec0" }}>
                <b>Actual:</b> {actualWeight.toFixed(2)} kg
              </span>
              <span style={{ fontSize: "13px", color: "#a0aec0" }}>
                <b>Volumetric:</b> {volumetricWeight > 0 ? volumetricWeight.toFixed(2) : "—"} kg
              </span>
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#f97316" }}>
                📦 Chargeable: {chargeableWeight > 0 ? chargeableWeight.toFixed(2) : "—"} kg
              </span>
              <span style={{ fontSize: "12px", color: "#4a5c78", marginLeft: "auto" }}>
                Chargeable = max(actual, L×B×H ÷ 5000)
              </span>
            </div>
          )}
        </div>

        {/* ── Results ── */}
        {!hasResults && !isLoading && (
          <div style={{ ...C.card, textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: "52px", marginBottom: "16px" }}>📦</div>
            <p style={{ fontSize: "18px", fontWeight: "700", color: "#8896b0", margin: "0 0 8px" }}>No Rates Calculated Yet</p>
            <p style={{ fontSize: "14px", color: "#4a5c78", margin: 0 }}>Fill in the details above and click <b style={{ color: "#f97316" }}>Get Rates</b> to compare Surface &amp; Air options</p>
          </div>
        )}

        {hasResults && (
          <div style={C.card}>
            {/* ── Top summary strip ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: "800", color: "#f1f5f9", margin: "0 0 4px" }}>
                  Courier Rates
                </h2>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "13px", color: "#8896b0" }}>
                    📍 {pickup} → {delivery}
                  </span>
                  <span style={{ fontSize: "13px", color: "#8896b0" }}>
                    ⚖️ {chargeableWeight.toFixed(2)} kg
                  </span>
                  <span style={{ fontSize: "13px", color: "#8896b0" }}>
                    💳 {paymentType === "COD" ? "Cash on Delivery" : "Prepaid"}
                  </span>
                  {zoneLabel && <span style={{ fontSize: "13px", color: "#8896b0" }}>{zoneLabel}</span>}
                </div>
              </div>
              <button
                onClick={() => { setSurfaceRates(null); setAirRates(null); setErrors({ surface: null, air: null }); }}
                style={{ padding: "7px 16px", border: "1px solid #2a3a52", borderRadius: "8px", background: "transparent", color: "#8896b0", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
              >
                ✕ Clear
              </button>
            </div>

            {/* ── Surface / Air Tabs ── */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "20px", background: "#111827", borderRadius: "12px", padding: "4px" }}>
              {["Surface", "Air"].filter(tab => {
                if (shippingMode === "Surface") return tab === "Surface";
                if (shippingMode === "Air") return tab === "Air";
                return true;
              }).map((tab) => {
                const isActive = activeTab === tab;
                const count = tab === "Surface" ? (surfaceRates?.length ?? null) : (airRates?.length ?? null);
                const tabLoading = tab === "Surface" ? loadingSurface : loadingAir;
                return (
                  <button key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      flex: 1, padding: "10px 16px", borderRadius: "10px", border: "none", cursor: "pointer",
                      background: isActive ? "#1c2333" : "transparent",
                      color: isActive ? "#f1f5f9" : "#4a5c78",
                      fontWeight: isActive ? "700" : "500",
                      fontSize: "14px", fontFamily: "inherit",
                      boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
                      transition: "all 0.2s",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                    }}>
                    {tab === "Surface" ? <FaTruck size={13} /> : <FaPlane size={13} />}
                    {tab}
                    {tabLoading ? (
                      <FaSpinner size={11} style={{ animation: "spin 0.8s linear infinite" }} />
                    ) : count !== null ? (
                      <span style={{
                        fontSize: "11px", padding: "1px 7px", borderRadius: "20px", fontWeight: "700",
                        background: isActive ? "#f97316" : "#2a3a52",
                        color: isActive ? "#fff" : "#8896b0",
                      }}>{count}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* ── Error banner ── */}
            {errors[activeTab.toLowerCase()] && (
              <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "10px", marginBottom: "16px" }}>
                <p style={{ fontSize: "13px", color: "#f87171", margin: 0, fontWeight: "600" }}>
                  ⚠️ {errors[activeTab.toLowerCase()]}
                </p>
              </div>
            )}

            {/* ── Courier list ── */}
            <ServicePanel
              couriers={activeTab === "Surface" ? surfaceRates : airRates}
              loading={activeTab === "Surface" ? loadingSurface : loadingAir}
              serviceType={activeTab}
              paymentType={paymentType}
            />
          </div>
        )}

        {/* ── Weight info card (always shown when weight entered) ── */}
        {(actualWeight > 0 || volumetricWeight > 0) && hasResults && (
          <div style={{ ...C.card, background: "linear-gradient(135deg, rgba(249,115,22,0.07) 0%, #1c2333 100%)" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#f1f5f9", margin: "0 0 14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <FaBox color="#f97316" size={14} /> Chargeable Weight Details
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              {[
                { label: "Actual Weight",     value: `${actualWeight.toFixed(2)} kg`,                              highlight: false },
                { label: "Volumetric Weight", value: volumetricWeight > 0 ? `${volumetricWeight.toFixed(2)} kg` : "N/A (no dims)", highlight: false },
                { label: "Chargeable Weight", value: chargeableWeight > 0 ? `${chargeableWeight.toFixed(2)} kg` : "—", highlight: true },
              ].map(({ label, value, highlight }) => (
                <div key={label} style={{ padding: "14px", background: highlight ? "rgba(249,115,22,0.12)" : "#111827", borderRadius: "12px", border: `1.5px solid ${highlight ? "rgba(249,115,22,0.4)" : "#2a3a52"}` }}>
                  <p style={{ fontSize: "12px", color: "#4a5c78", margin: "0 0 6px", fontWeight: "600" }}>{label}</p>
                  <p style={{ fontSize: "18px", fontWeight: "800", color: highlight ? "#f97316" : "#f1f5f9", margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: "12px", color: "#4a5c78", margin: "12px 0 0", padding: "10px", background: "#111827", borderRadius: "8px", borderLeft: "3px solid #f97316" }}>
              <b style={{ color: "#8896b0" }}>Formula:</b> Volumetric Weight = L × B × H ÷ 5000. Chargeable weight = max(actual, volumetric). You are billed on the higher value.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default RateCalculator;