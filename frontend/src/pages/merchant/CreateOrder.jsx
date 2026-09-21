import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import api from "../../services/api";

const CreateOrder = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
    city: "",
    state: "",
    pincode: "",
    productName: "",
    sku: "",
    quantity: 1,
    weight: "",
    length: "",
    breadth: "",
    height: "",
    paymentMode: "PREPAID",
    amount: "",
    notes: "",
    warehouseId: "",
    insuranceEnabled: false,
    sendWhatsAppNotification: true,
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const res = await api.get("/warehouses");
      const activeW = (res.data.warehouses || []).filter((w) => w.isActive);
      setWarehouses(activeW);
      if (activeW.length > 0) {
        setFormData((prev) => ({ ...prev, warehouseId: activeW[0]._id }));
      }
    } catch {
      setWarehouses([]);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const length = parseFloat(formData.length);
    const breadth = parseFloat(formData.breadth);
    const height = parseFloat(formData.height);
    const weight = parseFloat(formData.weight);

    if (!weight || weight <= 0) {
      alert("Weight is mandatory and must be greater than 0");
      setLoading(false);
      return;
    }

    if (!length || length <= 0 || !breadth || breadth <= 0 || !height || height <= 0) {
      alert("Length, Breadth, and Height dimensions are mandatory and must be greater than 0");
      setLoading(false);
      return;
    }

    try {
      await api.post("/orders", formData);
      alert("Order Created Successfully");
      navigate("/merchant/orders", { replace: true });
    } catch (error) {
      alert(error?.response?.data?.message || "Order Creation Failed");
    } finally {
      setLoading(false);
    }
  };

  // Grid styles using inline
  const gridStyles = {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "20px",
  };

  const fullWidthStyle = {
    gridColumn: "1 / -1",
  };

  return (
    <div
      className="merchant-page-container"
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#111827",
      }}
    >
      <div
        className="merchant-sidebar-container"
        style={{
          width: "280px",
          flexShrink: 0,
        }}
      >
        <Sidebar />
      </div>

      <div
        className="merchant-main-container"
        style={{
          flex: 1,
          padding: "30px",
          overflowX: "hidden",
        }}
      >
        <div style={{ marginBottom: "25px" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#f1f5f9",
              marginBottom: "6px",
            }}
          >
            Create Order
          </h1>
          <p
            style={{
              color: "#94a3b8",
              margin: 0,
            }}
          >
            Create and manage customer orders with warehouse, insurance, and notification preferences
          </p>
        </div>
        
        <form
          onSubmit={handleSubmit}
          style={{
            background: "#1c2333",
            padding: "30px",
            borderRadius: "16px",
            border: "1px solid #2a3a52",
            boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
          }}
        >
          <div style={gridStyles}>
            {/* Pickup & Warehouse Settings */}
            <div style={fullWidthStyle}>
              <h2 style={sectionTitle}>Pickup Warehouse Location</h2>
            </div>

            <div style={fullWidthStyle}>
              <label style={labelStyle}>Select Pickup Warehouse *</label>
              <select
                name="warehouseId"
                value={formData.warehouseId}
                onChange={handleChange}
                required
                style={{
                  ...inputStyle,
                  background: "#151c2c",
                  fontWeight: "600",
                  borderColor: "#2a3a52",
                  color: "#e8edf5"
                }}
              >
                <option value="">-- Select Pickup Warehouse --</option>
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>
                    🏬 {w.name} ({w.city}, {w.pincode}) - {w.contactPhone || w.phone || 'Active'}
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Details Section */}
            <div style={fullWidthStyle}>
              <h2 style={sectionTitle}>Customer Details</h2>
            </div>
            
            <input 
              name="customerName" 
              placeholder="Customer Name *" 
              value={formData.customerName} 
              onChange={handleChange} 
              required 
              style={inputStyle} 
            />
            <input 
              name="customerPhone" 
              placeholder="Phone Number *" 
              value={formData.customerPhone} 
              onChange={handleChange} 
              required 
              style={inputStyle} 
            />
            
            <input 
              name="customerEmail" 
              placeholder="Email Address" 
              value={formData.customerEmail} 
              onChange={handleChange} 
              style={inputStyle} 
            />
            <input 
              name="pincode" 
              placeholder="Pincode *" 
              value={formData.pincode} 
              onChange={handleChange} 
              required
              style={inputStyle} 
            />
            
            <input 
              name="city" 
              placeholder="City *" 
              value={formData.city} 
              onChange={handleChange} 
              required
              style={inputStyle} 
            />
            <input 
              name="state" 
              placeholder="State *" 
              value={formData.state} 
              onChange={handleChange} 
              required
              style={inputStyle} 
            />
            
            <textarea 
              name="customerAddress" 
              placeholder="Full Delivery Address *" 
              value={formData.customerAddress} 
              onChange={handleChange} 
              required 
              style={{...inputStyle, ...fullWidthStyle}}
              rows="3"
            />

            {/* Product & Package Section */}
            <div style={fullWidthStyle}>
              <h2 style={sectionTitle}>Product & Package Details</h2>
            </div>
            
            <input 
              name="productName" 
              placeholder="Product Name *" 
              value={formData.productName} 
              onChange={handleChange} 
              required 
              style={inputStyle} 
            />
            <input 
              name="sku" 
              placeholder="SKU" 
              value={formData.sku} 
              onChange={handleChange} 
              style={inputStyle} 
            />
            
            <input 
              type="number" 
              name="quantity" 
              placeholder="Quantity" 
              value={formData.quantity} 
              onChange={handleChange} 
              style={inputStyle} 
            />
            <input 
              type="number" 
              name="weight" 
              placeholder="Weight (kg) *" 
              value={formData.weight} 
              onChange={handleChange} 
              required
              min="0.01"
              step="any"
              style={inputStyle} 
            />
            
            <input 
              type="number" 
              name="length" 
              placeholder="Length (cm) *" 
              value={formData.length} 
              onChange={handleChange} 
              required
              min="0.01"
              step="any"
              style={inputStyle} 
            />
            <input 
              type="number" 
              name="breadth" 
              placeholder="Breadth (cm) *" 
              value={formData.breadth} 
              onChange={handleChange} 
              required
              min="0.01"
              step="any"
              style={inputStyle} 
            />
            
            <input 
              type="number" 
              name="height" 
              placeholder="Height (cm) *" 
              value={formData.height} 
              onChange={handleChange} 
              required
              min="0.01"
              step="any"
              style={{...inputStyle, ...fullWidthStyle}}
            />

            {/* Live Dimensions & Volumetric Summary Card */}
            {(() => {
              const lVal = parseFloat(formData.length) || 0;
              const bVal = parseFloat(formData.breadth) || 0;
              const hVal = parseFloat(formData.height) || 0;
              const wVal = parseFloat(formData.weight) || 0;
              const totalVol = lVal * bVal * hVal;
              const volWt = totalVol > 0 ? (totalVol / 5000) : 0;
              const chargeableWt = Math.max(wVal, volWt);

              return (
                <div
                  style={{
                    ...fullWidthStyle,
                    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                    border: "1px solid #3b82f6",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    marginTop: "6px",
                    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.15)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#60a5fa", fontWeight: "700", fontSize: "15px" }}>
                      <span>📦 Package Dimensions & Volumetric Summary</span>
                    </div>
                    <span style={{ fontSize: "11px", background: "rgba(59, 130, 246, 0.2)", color: "#93c5fd", padding: "4px 10px", borderRadius: "6px", fontWeight: "600" }}>
                      Standard Formula (L × B × H ÷ 5000)
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
                    <div style={{ background: "rgba(255,255,255,0.05)", padding: "10px 14px", borderRadius: "8px" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>Total Dimensions</div>
                      <div style={{ fontSize: "15px", color: "#f8fafc", fontWeight: "700", marginTop: "3px" }}>
                        {lVal > 0 && bVal > 0 && hVal > 0 ? `${lVal} × ${bVal} × ${hVal} cm` : "0 × 0 × 0 cm"}
                      </div>
                    </div>

                    <div style={{ background: "rgba(255,255,255,0.05)", padding: "10px 14px", borderRadius: "8px" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>Total Volume</div>
                      <div style={{ fontSize: "15px", color: "#38bdf8", fontWeight: "700", marginTop: "3px" }}>
                        {totalVol > 0 ? `${totalVol.toLocaleString()} cm³` : "0 cm³"}
                      </div>
                    </div>

                    <div style={{ background: "rgba(255,255,255,0.05)", padding: "10px 14px", borderRadius: "8px" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>Volumetric Weight</div>
                      <div style={{ fontSize: "15px", color: "#fbbf24", fontWeight: "700", marginTop: "3px" }}>
                        {volWt > 0 ? `${volWt.toFixed(2)} kg` : "0.00 kg"}
                      </div>
                    </div>

                    <div style={{ background: "rgba(59, 130, 246, 0.15)", border: "1px solid rgba(59, 130, 246, 0.4)", padding: "10px 14px", borderRadius: "8px" }}>
                      <div style={{ fontSize: "11px", color: "#93c5fd", fontWeight: "700", textTransform: "uppercase" }}>Chargeable Weight</div>
                      <div style={{ fontSize: "15px", color: "#4ade80", fontWeight: "800", marginTop: "3px" }}>
                        {chargeableWt > 0 ? `${chargeableWt.toFixed(2)} kg` : "0.00 kg"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* Payment Details Section */}
            <div style={fullWidthStyle}>
              <h2 style={sectionTitle}>Payment & Order Value</h2>
            </div>
            
            <input 
              type="number" 
              name="amount" 
              placeholder="Order Value (₹) *" 
              value={formData.amount} 
              onChange={handleChange} 
              required 
              style={inputStyle} 
            />
            <select 
              name="paymentMode" 
              value={formData.paymentMode} 
              onChange={handleChange} 
              style={inputStyle}
            >
              <option value="PREPAID">PREPAID</option>
              <option value="COD">COD</option>
            </select>

            {/* Insurance & Notification Preferences */}
            <div style={fullWidthStyle}>
              <h2 style={sectionTitle}>Insurance & Notification Options</h2>
            </div>

            <div
              style={{
                ...fullWidthStyle,
                background: "#151c2c",
                border: "1px solid #2a3a52",
                borderRadius: "12px",
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                <div>
                  <span style={{ color: "#f8fafc", fontSize: "14px", fontWeight: "700" }}>
                    🛡️ Enable Parcel Loss & Damage Insurance Cover
                    {parseFloat(formData.amount) > 0 && (
                      <span style={{ color: "#4ade80", marginLeft: "8px", fontWeight: "700" }}>
                        (Charge: ₹{(parseFloat(formData.amount) / 30).toFixed(2)} for ₹{parseFloat(formData.amount).toLocaleString()} Order)
                      </span>
                    )}
                  </span>
                  <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "normal", marginTop: "3px" }}>
                    Protects package against lost or damaged transit shipments (Fixed Standard: ₹50 per ₹1,500 Order Value).
                  </div>
                </div>
                <input
                  type="checkbox"
                  name="insuranceEnabled"
                  checked={formData.insuranceEnabled}
                  onChange={handleChange}
                  style={{ width: "20px", height: "20px", cursor: "pointer", accentColor: "#f97316" }}
                />
              </label>

              <hr style={{ border: "none", borderTop: "1px solid #2a3a52", margin: 0 }} />

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                <div>
                  <span style={{ color: "#f8fafc", fontSize: "14px", fontWeight: "700" }}>📱 Send Instant WhatsApp & SMS Delivery Tracking Updates</span>
                  <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "normal", marginTop: "3px" }}>
                    Sends live tracking link and delivery status updates to customer automatically.
                  </div>
                </div>
                <input
                  type="checkbox"
                  name="sendWhatsAppNotification"
                  checked={formData.sendWhatsAppNotification}
                  onChange={handleChange}
                  style={{ width: "20px", height: "20px", cursor: "pointer", accentColor: "#f97316" }}
                />
              </label>
            </div>
            
            <textarea
              name="notes"
              placeholder="Order Notes (Optional)"
              value={formData.notes}
              onChange={handleChange}
              style={{...inputStyle, ...fullWidthStyle}}
              rows="2"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            style={{
              background: "#f97316",
              color: "#fff",
              border: "none",
              padding: "15px 30px",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "17px",
              height: "55px",
              marginTop: "20px",
              width: "100%",
              transition: "all 0.3s ease",
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.background = "#ea580c";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.background = "#f97316";
              }
            }}
          >
            {loading ? "Creating Order..." : "Create Order"}
          </button>
        </form>
      </div>
    </div>
  );
};

const sectionTitle = { 
  fontSize: "16px", 
  color: "#f1f5f9", 
  margin: "12px 0 6px 0",
  fontWeight: "700",
};

const labelStyle = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#94a3b8",
  marginBottom: "6px",
  display: "block",
};

const inputStyle = { 
  width: "100%", 
  padding: "12px", 
  borderRadius: "10px", 
  border: "1px solid #2a3a52", 
  fontSize: "14px",
  boxSizing: "border-box",
  transition: "border-color 0.3s ease",
  background: "#151c2c",
  color: "#e8edf5",
};

export default CreateOrder;