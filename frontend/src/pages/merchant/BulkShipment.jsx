import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import api from "../../services/api";
import { FaTruck, FaTimes, FaSpinner, FaArrowLeft } from "react-icons/fa";

const BulkShipment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [sendWhatsAppNotification, setSendWhatsAppNotification] = useState(true);

  // Get selected order IDs from navigation state
  const orderIds = location.state?.orderIds || [];

  useEffect(() => {
    if (orderIds.length === 0) {
      setError("No orders selected for bulk shipment.");
      return;
    }
    fetchSelectedOrders();
  }, [orderIds]);

  const fetchSelectedOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all orders and filter selected ones
      const response = await api.get("/orders");
      const allOrders = response.data.orders || [];
      const filteredOrders = allOrders.filter(order => 
        orderIds.includes(order._id)
      );
      
      setOrders(filteredOrders);
      setSelectedOrders(filteredOrders.map(order => order._id));
      
      if (filteredOrders.length === 0) {
        setError("Selected orders not found.");
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setError("Failed to load selected orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedOrders(orders.map(order => order._id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (orderId) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  const handleBulkShipment = async () => {
    if (selectedOrders.length === 0) {
      alert("Please select at least one order for shipment.");
      return;
    }

    if (!window.confirm(`Create shipments for ${selectedOrders.length} selected orders?`)) {
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      setSuccess(null);

      const payload = {
        orderIds: selectedOrders,
        sendWhatsAppNotification: sendWhatsAppNotification,
      };

      const response = await api.post("/shipments/bulk", payload);

      setSuccess(`${response.data.shipments?.length || selectedOrders.length} shipments created successfully!`);
      
      // Redirect to shipments page after 2 seconds
      setTimeout(() => {
        navigate("/merchant/shipments");
      }, 2000);
    } catch (error) {
      console.error("Bulk shipment error:", error);
      setError(error.response?.data?.message || "Failed to create bulk shipments. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      NEW: "#fef3c7",
      READY_FOR_PICKUP: "#fef3c7",
      SHIPPED: "#e0e7ff",
      DELIVERED: "#dcfce7",
      CANCELLED: "#fee2e2",
    };
    return colors[status] || "#f1f5f9";
  };

  const getStatusTextColor = (status) => {
    const colors = {
      NEW: "#92400e",
      READY_FOR_PICKUP: "#92400e",
      SHIPPED: "#3730a3",
      DELIVERED: "#166534",
      CANCELLED: "#991b1b",
    };
    return colors[status] || "#475569";
  };

  if (loading) {
    return (
      <div className="merchant-page-container" style={{ display: "flex", minHeight: "100vh", background: "#111827" }}>
        <div className="merchant-sidebar-container" style={{ width: "280px", flexShrink: 0 }}>
          <Sidebar />
        </div>
        <div className="merchant-main-container" style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <FaSpinner className="animate-spin" size={40} color="#f97316" />
        </div>
      </div>
    );
  }

  return (
    <div className="merchant-page-container" style={{
      display: "flex",
      minHeight: "100vh",
      background: "#111827",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      <div className="merchant-sidebar-container" style={{ width: "280px", flexShrink: 0 }}>
        <Sidebar />
      </div>

      <div className="merchant-main-container" style={{ flex: 1, padding: "24px 32px", overflowX: "hidden" }}>
        {/* Header */}
        <div style={{ marginBottom: "25px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <button
                onClick={() => navigate("/merchant/orders")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px"
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#f1f5f9"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#94a3b8"}
              >
                <FaArrowLeft /> Back to Orders
              </button>
              <h1 style={{
                fontSize: "28px",
                fontWeight: "700",
                color: "#f1f5f9",
                margin: "0 0 6px 0",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}>
                <FaTruck style={{ color: "#f97316" }} />
                Bulk Shipment
              </h1>
              <p style={{
                color: "#94a3b8",
                margin: 0,
                fontSize: "14px"
              }}>
                Create shipments for multiple orders at once
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", padding: "8px 14px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", color: "#4ade80", fontWeight: "500" }}>
                <input 
                  type="checkbox" 
                  checked={sendWhatsAppNotification} 
                  onChange={(e) => setSendWhatsAppNotification(e.target.checked)} 
                  style={{ width: "16px", height: "16px", accentColor: "#25D366", cursor: "pointer" }}
                />
                <span>💬 Send WhatsApp Notification</span>
              </label>
              <button
                onClick={handleBulkShipment}
                disabled={processing || selectedOrders.length === 0}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "12px 24px",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: processing || selectedOrders.length === 0 ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: processing || selectedOrders.length === 0 ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!processing && selectedOrders.length > 0) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(37,99,235,0.35)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(37,99,235,0.25)";
                }}
              >
                {processing ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FaTruck />
                    Create Shipments ({selectedOrders.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error / Success Messages */}
        {error && (
          <div style={{
            background: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: "12px",
            padding: "12px 16px",
            marginBottom: "20px",
            color: "#991b1b",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#991b1b",
                fontSize: "18px"
              }}
            >
              <FaTimes />
            </button>
          </div>
        )}

        {success && (
          <div style={{
            background: "#dcfce7",
            border: "1px solid #bbf7d0",
            borderRadius: "12px",
            padding: "12px 16px",
            marginBottom: "20px",
            color: "#166534",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span>{success}</span>
            <button
              onClick={() => setSuccess(null)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#166534",
                fontSize: "18px"
              }}
            >
              <FaTimes />
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
          marginBottom: "24px"
        }}>
          <div style={{
            background: "#1c2333",
            padding: "20px",
            borderRadius: "16px",
            border: "1px solid #2a3a52",
            boxShadow: "0 2px 10px rgba(0,0,0,0.3)"
          }}>
            <p style={{ fontSize: "12px", color: "#8896b0", margin: "0 0 8px 0" }}>Total Orders</p>
            <h3 style={{ fontSize: "24px", fontWeight: "700", color: "#f1f5f9", margin: 0 }}>{orders.length}</h3>
          </div>
          <div style={{
            background: "#1c2333",
            padding: "20px",
            borderRadius: "16px",
            border: "1px solid #2a3a52",
            boxShadow: "0 2px 10px rgba(0,0,0,0.3)"
          }}>
            <p style={{ fontSize: "12px", color: "#8896b0", margin: "0 0 8px 0" }}>Selected for Shipment</p>
            <h3 style={{ fontSize: "24px", fontWeight: "700", color: "#f97316", margin: 0 }}>{selectedOrders.length}</h3>
          </div>
          <div style={{
            background: "#1c2333",
            padding: "20px",
            borderRadius: "16px",
            border: "1px solid #2a3a52",
            boxShadow: "0 2px 10px rgba(0,0,0,0.3)"
          }}>
            <p style={{ fontSize: "12px", color: "#8896b0", margin: "0 0 8px 0" }}>Total Amount</p>
            <h3 style={{ fontSize: "24px", fontWeight: "700", color: "#f1f5f9", margin: 0 }}>
              ₹{orders.reduce((sum, order) => sum + (order.amount || 0), 0).toFixed(2)}
            </h3>
          </div>
        </div>

        {/* Orders Table */}
        <div style={{
          background: "#1c2333",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid #2a3a52",
          boxShadow: "0 2px 10px rgba(0,0,0,0.3)"
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
              <thead>
                <tr style={{
                  background: "#1e2640",
                  borderBottom: "1px solid #2a3a52"
                }}>
                  <th style={{
                    textAlign: "left",
                    padding: "16px 20px",
                    color: "#8896b0",
                    fontSize: "12px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    <input
                      type="checkbox"
                      checked={orders.length > 0 && selectedOrders.length === orders.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th style={{
                    textAlign: "left",
                    padding: "16px 20px",
                    color: "#8896b0",
                    fontSize: "12px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>Order ID</th>
                  <th style={{
                    textAlign: "left",
                    padding: "16px 20px",
                    color: "#8896b0",
                    fontSize: "12px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>Customer</th>
                  <th style={{
                    textAlign: "left",
                    padding: "16px 20px",
                    color: "#8896b0",
                    fontSize: "12px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>Amount</th>
                  <th style={{
                    textAlign: "left",
                    padding: "16px 20px",
                    color: "#8896b0",
                    fontSize: "12px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <tr
                      key={order._id}
                      style={{
                        borderBottom: "1px solid #1e2a3a",
                        transition: "background 0.2s",
                        background: selectedOrders.includes(order._id) ? "#243049" : "#1c2333"
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = selectedOrders.includes(order._id) ? "#2d3f5e" : "#243049")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = selectedOrders.includes(order._id) ? "#243049" : "#1c2333")
                      }
                    >
                      <td style={{
                        padding: "16px 20px"
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order._id)}
                          onChange={() => handleSelectOrder(order._id)}
                        />
                      </td>
                      <td style={{
                        padding: "16px 20px",
                        fontSize: "14px",
                        color: "#0f172a",
                        fontWeight: "500"
                      }}>
                        {order.orderNumber || order._id.slice(-6)}
                      </td>
                      <td style={{
                        padding: "16px 20px"
                      }}>
                        <div>
                          <div style={{
                            fontSize: "14px",
                            color: "#0f172a",
                            fontWeight: "500"
                          }}>
                            {order.customerName || "N/A"}
                          </div>
                          <div style={{
                            fontSize: "12px",
                            color: "#64748b",
                            marginTop: "2px"
                          }}>
                            {order.customerPhone || "N/A"}
                          </div>
                        </div>
                      </td>
                      <td style={{
                        padding: "16px 20px",
                        fontSize: "14px",
                        color: "#0f172a",
                        fontWeight: "600"
                      }}>
                        ₹{order.amount?.toFixed(2) || "0.00"}
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <span style={{
                          background: getStatusColor(order.status),
                          color: getStatusTextColor(order.status),
                          padding: "6px 12px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: "600",
                          display: "inline-block"
                        }}>
                          {order.status || "NEW"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      color: "#94a3b8",
                      fontSize: "14px"
                    }}>
                      No orders found for bulk shipment
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        {orders.length > 0 && (
          <div style={{
            marginTop: "16px",
            color: "#64748b",
            fontSize: "14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span>
              {selectedOrders.length > 0 && (
                <span style={{ fontWeight: "500", color: "#0f172a" }}>
                  {`${selectedOrders.length} order${selectedOrders.length !== 1 ? "s" : ""} selected for shipment`}
                </span>
              )}
            </span>
            <span>
              {`Total: ${orders.length} order${orders.length !== 1 ? "s" : ""}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkShipment;