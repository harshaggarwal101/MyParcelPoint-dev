import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import api from "../../services/api";
import { FaSave, FaTimes, FaSpinner, FaArrowLeft, FaEdit, FaUser, FaMapMarkerAlt, FaBox, FaRupeeSign, FaExclamationTriangle } from "react-icons/fa";

const EditOrder = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [order, setOrder] = useState(null);
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    productName: "",
    amount: "",
    status: "NEW",
  });

  // Fetch order details
  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/orders/${id}`);
      const orderData = response.data.order;
      
      setOrder(orderData);
      setFormData({
        customerName: orderData.customerName || "",
        customerPhone: orderData.customerPhone || "",
        customerAddress: orderData.customerAddress || "",
        productName: orderData.productName || "",
        amount: orderData.amount || "",
        status: orderData.status || "NEW",
      });
    } catch (error) {
      console.error("Error fetching order:", error);
      setError(error.response?.data?.message || "Failed to load order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.customerName.trim()) {
      alert("Customer name is required");
      return;
    }
    if (!formData.customerPhone.trim()) {
      alert("Customer phone is required");
      return;
    }
    if (!formData.customerAddress.trim()) {
      alert("Customer address is required");
      return;
    }
    if (!formData.productName.trim()) {
      alert("Product name is required");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (!window.confirm("Are you sure you want to update this order?")) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      await api.put(`/orders/${id}`, payload);

      setSuccess("Order updated successfully!");
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate(`/merchant/orders/${id}`);
      }, 1500);
    } catch (error) {
      console.error("Error updating order:", error);
      setError(error.response?.data?.message || "Failed to update order. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Get status options
  const statusOptions = [
    { value: "NEW", label: "New" },
    { value: "READY_FOR_PICKUP", label: "Ready For Pickup" },
    { value: "SHIPPED", label: "Shipped" },
    { value: "OUT_FOR_DELIVERY", label: "Out For Delivery" },
    { value: "DELIVERED", label: "Delivered" },
    { value: "NDR", label: "NDR" },
    { value: "RTO", label: "RTO" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

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
                onClick={() => navigate(-1)}
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
                <FaArrowLeft /> Back
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
                <FaEdit style={{ color: "#f97316" }} />
                Edit Order
              </h1>
              <p style={{
                color: "#94a3b8",
                margin: 0,
                fontSize: "14px"
              }}>
                {order?.orderNumber || "Order"} - Update order details
              </p>
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

        {/* Edit Form */}
        <div style={{
          background: "#1c2333",
          borderRadius: "16px",
          border: "1px solid #2a3a52",
          boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
          padding: "32px",
          maxWidth: "800px"
        }}>
          <form onSubmit={handleSubmit}>
            {/* Customer Information */}
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "#0f172a",
                margin: "0 0 16px 0",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <FaUser size={16} style={{ color: "#3b82f6" }} />
                Customer Information
              </h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#0f172a",
                    marginBottom: "6px"
                  }}>
                    Customer Name <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      fontSize: "14px",
                      color: "#0f172a",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "#3b82f6"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#0f172a",
                    marginBottom: "6px"
                  }}>
                    Customer Phone <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="customerPhone"
                    value={formData.customerPhone}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      fontSize: "14px",
                      color: "#0f172a",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "#3b82f6"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}
                    placeholder="Enter customer phone"
                  />
                </div>
              </div>

              <div style={{ marginTop: "16px" }}>
                <label style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#0f172a",
                  marginBottom: "6px"
                }}>
                  <FaMapMarkerAlt style={{ marginRight: "6px", color: "#64748b" }} />
                  Customer Address <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  name="customerAddress"
                  value={formData.customerAddress}
                  onChange={handleChange}
                  rows="3"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    fontSize: "14px",
                    color: "#0f172a",
                    outline: "none",
                    transition: "border-color 0.2s",
                    resize: "vertical"
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#3b82f6"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}
                  placeholder="Enter customer address"
                />
              </div>
            </div>

            {/* Product & Pricing */}
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "#0f172a",
                margin: "0 0 16px 0",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <FaBox size={16} style={{ color: "#8b5cf6" }} />
                Product & Pricing
              </h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#0f172a",
                    marginBottom: "6px"
                  }}>
                    Product Name <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="productName"
                    value={formData.productName}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      fontSize: "14px",
                      color: "#0f172a",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "#3b82f6"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#0f172a",
                    marginBottom: "6px"
                  }}>
                    <FaRupeeSign style={{ marginRight: "4px" }} />
                    Amount <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      fontSize: "14px",
                      color: "#0f172a",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "#3b82f6"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}
                    placeholder="Enter amount"
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "#0f172a",
                margin: "0 0 16px 0",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <FaExclamationTriangle size={16} style={{ color: "#f59e0b" }} />
                Order Status
              </h3>
              
              <div>
                <label style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#0f172a",
                  marginBottom: "6px"
                }}>
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    fontSize: "14px",
                    color: "#0f172a",
                    outline: "none",
                    transition: "border-color 0.2s",
                    background: "white"
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#3b82f6"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}
                >
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Order Info */}
            {order && (
              <div style={{
                padding: "16px",
                background: "#f8fafc",
                borderRadius: "10px",
                marginBottom: "24px",
                border: "1px solid #e2e8f0"
              }}>
                <p style={{
                  fontSize: "13px",
                  color: "#64748b",
                  margin: "0 0 4px 0"
                }}>
                  Order ID: <strong style={{ color: "#0f172a" }}>{order.orderNumber || order._id}</strong>
                </p>
                <p style={{
                  fontSize: "13px",
                  color: "#64748b",
                  margin: 0
                }}>
                  Created: <strong style={{ color: "#0f172a" }}>
                    {new Date(order.createdAt).toLocaleString()}
                  </strong>
                </p>
              </div>
            )}

            {/* Form Actions */}
            <div style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
              paddingTop: "16px",
              borderTop: "1px solid #e2e8f0"
            }}>
              <button
                type="button"
                onClick={() => navigate(-1)}
                style={{
                  padding: "12px 24px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  background: "white",
                  color: "#64748b",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f8fafc";
                  e.currentTarget.style.borderColor = "#94a3b8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                }}
              >
                <FaTimes /> Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "12px 32px",
                  borderRadius: "10px",
                  border: "none",
                  background: "#f97316",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: saving ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: saving ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!saving) {
                    e.currentTarget.style.background = "#ea580c";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(249,115,22,0.35)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saving) {
                    e.currentTarget.style.background = "#f97316";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                {saving ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FaSave /> Update Order
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditOrder;