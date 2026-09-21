import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../../components/admin/AdminSidebar";
import api from "../../services/api";
import { FaTruck, FaRupeeSign, FaBox, FaStore, FaEye, FaArrowRight, FaExclamationTriangle, FaUndo, FaUserCheck } from "react-icons/fa";
import "./Dashboard.css"; 

const Dashboard = () => {
  const navigate = useNavigate();

  // Stats state
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMerchants: 0,
    pendingMerchants: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalShipments: 0,
    deliveredShipments: 0,
    totalRevenue: 0,
  });

  // Lists state
  const [recentOrders, setRecentOrders] = useState([]);
  const [pendingMerchantList, setPendingMerchantList] = useState([]);
  const [ndrAlerts, setNdrAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch main stats
      const statsRes = await api.get("/admin/dashboard");
      const statData = statsRes.data.data || statsRes.data || {};
      setStats(statData);

      // 2. Fetch recent orders
      const ordersRes = await api.get("/admin/orders");
      const orders = ordersRes.data.orders || [];
      setRecentOrders(
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
      );

      // 3. Fetch pending merchants (Feature 1)
      try {
        const merchantsRes = await api.get("/admin/merchants");
        const allMerchants = merchantsRes.data.merchants || [];
        const unapproved = allMerchants.filter((m) => !m.isApproved);
        setPendingMerchantList(unapproved.slice(0, 4));
      } catch (mErr) {
        console.log("Error loading merchants:", mErr);
      }

      // 4. Fetch NDR alerts (Feature 3)
      try {
        const ndrRes = await api.get("/admin/ndr");
        const allNdrs = ndrRes.data.ndrs || ndrRes.data || [];
        const pendingNdrs = allNdrs.filter(
          (n) => n.status === "PENDING" || n.status === "REATTEMPT_REQUESTED" || n.status === "RTO_REQUESTED"
        );
        setNdrAlerts(pendingNdrs.slice(0, 5));
      } catch (nErr) {
        console.log("Error loading NDRs:", nErr);
      }

    } catch (error) {
      console.log("Error loading admin dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveMerchant = async (merchantId) => {
    try {
      setApprovingId(merchantId);
      await api.put(`/admin/merchants/${merchantId}/approve`);
      alert("Merchant Approved Successfully");
      fetchDashboardData();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to approve merchant");
    } finally {
      setApprovingId(null);
    }
  };

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatNumber = (num) => {
    return Number(num || 0).toLocaleString("en-IN");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "DELIVERED": return { bg: "#dcfce7", color: "#15803d" };
      case "SHIPPED": return { bg: "#dbeafe", color: "#1d4ed8" };
      case "IN_TRANSIT": return { bg: "#eff6ff", color: "#2563eb" };
      case "PENDING": return { bg: "#fef3c7", color: "#b45309" };
      case "CANCELLED": return { bg: "#fee2e2", color: "#b91c1c" };
      default: return { bg: "#f1f5f9", color: "#475569" };
    }
  };

  return (
    <div className="admin-dashboard-container">
      <AdminSidebar />
      <div className="dashboard-main">
        
        {/* HEADER */}
        <div style={{ marginBottom: "20px" }}>
          <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
            Welcome Back, Admin 👋
          </h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "4px 0 0" }}>
            Real-time platform monitoring, operational logs, and business performance analytics
          </p>
        </div>

        {/* FEATURE 3: CRITICAL NDR & ACTION ALERT STRIP */}
        {(ndrAlerts.length > 0 || pendingMerchantList.length > 0) && (
          <div style={{
            background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
            border: "1px solid #fde68a",
            borderRadius: "14px",
            padding: "16px 20px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            boxShadow: "0 2px 6px rgba(217, 119, 6, 0.08)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "#f59e0b",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                flexShrink: 0
              }}>
                <FaExclamationTriangle />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#92400e" }}>
                  Platform Action Required
                </h4>
                <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#b45309" }}>
                  {pendingMerchantList.length > 0 && `👥 ${pendingMerchantList.length} Pending Merchant Approvals`}
                  {pendingMerchantList.length > 0 && ndrAlerts.length > 0 && " • "}
                  {ndrAlerts.length > 0 && `⚠️ ${ndrAlerts.length} High-Priority NDR Requests`}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              {pendingMerchantList.length > 0 && (
                <button
                  onClick={() => navigate("/admin/merchants")}
                  style={{
                    padding: "7px 14px",
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                >
                  Review Merchants ({pendingMerchantList.length})
                </button>
              )}
              {ndrAlerts.length > 0 && (
                <button
                  onClick={() => navigate("/admin/ndr")}
                  style={{
                    padding: "7px 14px",
                    background: "#d97706",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                >
                  Manage NDR ({ndrAlerts.length})
                </button>
              )}
            </div>
          </div>
        )}

        {/* QUICK ACTIONS BAR */}
        <div style={{
          display: "flex",
          gap: "12px",
          marginBottom: "28px",
          flexWrap: "wrap",
          alignItems: "center"
        }}>
          <button
            onClick={() => navigate("/admin/merchants")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "11px 18px",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
              transition: "all 0.2s ease"
            }}
          >
            <FaStore size={13} />
            <span>Manage Merchants</span>
            {pendingMerchantList.length > 0 && (
              <span style={{
                background: "#ffffff",
                color: "#1e40af",
                fontSize: "11px",
                fontWeight: "800",
                padding: "2px 7px",
                borderRadius: "20px",
                lineHeight: 1
              }}>
                {pendingMerchantList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate("/admin/orders")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "11px 18px",
              background: "#ea580c",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(234, 88, 12, 0.2)",
              transition: "all 0.2s ease"
            }}
          >
            <FaBox size={13} /> All Orders
          </button>

          <button
            onClick={() => navigate("/admin/shipments")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "11px 18px",
              background: "#ffffff",
              color: "#334155",
              border: "1.5px solid #cbd5e1",
              borderRadius: "12px",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            <FaTruck size={13} color="#64748b" /> All Shipments
          </button>

          <button
            onClick={() => navigate("/admin/ndr")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "11px 18px",
              background: ndrAlerts.length > 0 ? "#fffbeb" : "#ffffff",
              color: "#b45309",
              border: ndrAlerts.length > 0 ? "1.5px solid #f59e0b" : "1.5px solid #fde68a",
              borderRadius: "12px",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            <FaExclamationTriangle size={13} color="#d97706" />
            <span>NDR Management</span>
            {ndrAlerts.length > 0 && (
              <span style={{
                background: "#dc2626",
                color: "#ffffff",
                fontSize: "11px",
                fontWeight: "800",
                padding: "2px 8px",
                borderRadius: "20px",
                lineHeight: 1
              }}>
                {ndrAlerts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate("/admin/rto")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "11px 18px",
              background: "#ffffff",
              color: "#b91c1c",
              border: "1.5px solid #fca5a5",
              borderRadius: "12px",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            <FaUndo size={13} color="#dc2626" /> RTO Management
          </button>

          <button
            onClick={() => navigate("/admin/revenue")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "11px 18px",
              background: "#ffffff",
              color: "#334155",
              border: "1.5px solid #cbd5e1",
              borderRadius: "12px",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            <FaRupeeSign size={13} color="#64748b" /> Revenue
          </button>
        </div>

        {/* CORE METRICS GRID (4 COLORED CARDS) */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
          marginBottom: "32px"
        }}>
          {/* Total Users Card */}
          <div style={{
            background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
            borderRadius: "16px",
            padding: "20px 24px",
            color: "#ffffff",
            boxShadow: "0 8px 18px rgba(37, 99, 235, 0.25)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "rgba(255,255,255,0.85)", textTransform: "uppercase" }}>Total Users</span>
              <span style={{ fontSize: "11px", padding: "3px 10px", background: "rgba(255,255,255,0.2)", color: "#ffffff", borderRadius: "10px", fontWeight: "700" }}>
                {stats.totalMerchants} Merchants
              </span>
            </div>
            <h2 style={{ fontSize: "28px", fontWeight: "800", color: "#ffffff", margin: "4px 0" }}>{formatNumber(stats.totalUsers)}</h2>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", margin: 0, fontWeight: "500" }}>
              {pendingMerchantList.length > 0 ? `⚠️ ${pendingMerchantList.length} Pending Approvals` : "✓ Active Merchants Verified"}
            </p>
          </div>

          {/* Total Orders Card */}
          <div style={{
            background: "linear-gradient(135deg, #065f46 0%, #10b981 100%)",
            borderRadius: "16px",
            padding: "20px 24px",
            color: "#ffffff",
            boxShadow: "0 8px 18px rgba(16, 185, 129, 0.25)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "rgba(255,255,255,0.85)", textTransform: "uppercase" }}>Total Orders</span>
              <span style={{ fontSize: "11px", padding: "3px 10px", background: "rgba(255,255,255,0.2)", color: "#ffffff", borderRadius: "10px", fontWeight: "700" }}>
                {stats.pendingOrders} New
              </span>
            </div>
            <h2 style={{ fontSize: "28px", fontWeight: "800", color: "#ffffff", margin: "4px 0" }}>{formatNumber(stats.totalOrders)}</h2>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", margin: 0 }}>
              Platform order volume
            </p>
          </div>

          {/* Total Shipments Card */}
          <div style={{
            background: "linear-gradient(135deg, #9a3412 0%, #ea580c 100%)",
            borderRadius: "16px",
            padding: "20px 24px",
            color: "#ffffff",
            boxShadow: "0 8px 18px rgba(234, 88, 12, 0.25)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "rgba(255,255,255,0.85)", textTransform: "uppercase" }}>Shipments</span>
              <span style={{ fontSize: "11px", padding: "3px 10px", background: "rgba(255,255,255,0.2)", color: "#ffffff", borderRadius: "10px", fontWeight: "700" }}>
                {formatNumber(stats.deliveredShipments)} Delivered
              </span>
            </div>
            <h2 style={{ fontSize: "28px", fontWeight: "800", color: "#ffffff", margin: "4px 0" }}>{formatNumber(stats.totalShipments)}</h2>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", margin: 0 }}>
              Courier dispatches tracked
            </p>
          </div>

          {/* Total Revenue Card */}
          <div style={{
            background: "linear-gradient(135deg, #6b21a8 0%, #a855f7 100%)",
            borderRadius: "16px",
            padding: "20px 24px",
            color: "#ffffff",
            boxShadow: "0 8px 18px rgba(168, 85, 247, 0.25)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "rgba(255,255,255,0.85)", textTransform: "uppercase" }}>Platform Revenue</span>
              <span style={{ fontSize: "11px", padding: "3px 10px", background: "rgba(255,255,255,0.2)", color: "#ffffff", borderRadius: "10px", fontWeight: "700" }}>
                INR
              </span>
            </div>
            <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#ffffff", margin: "4px 0 2px" }}>
              ₹{formatCurrency(stats.totalRevenue)}
            </h2>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", margin: 0 }}>
              Gross platform transactions
            </p>
          </div>
        </div>

        {/* FEATURE 1: PENDING MERCHANT APPROVALS BOX */}
        {pendingMerchantList.length > 0 && (
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            padding: "20px 24px",
            marginBottom: "32px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px"
            }}>
              <div>
                <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaUserCheck color="#2563eb" /> Pending Merchant Approvals ({pendingMerchantList.length})
                </h3>
                <p style={{ fontSize: "13px", color: "#64748b", margin: "2px 0 0" }}>
                  Newly registered merchant accounts waiting for admin verification
                </p>
              </div>

              <button
                onClick={() => navigate("/admin/merchants")}
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#2563eb",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                View All Merchants →
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                    <th style={{ padding: "10px 16px" }}>Merchant Name</th>
                    <th style={{ padding: "10px 16px" }}>Email</th>
                    <th style={{ padding: "10px 16px" }}>Company / Business</th>
                    <th style={{ padding: "10px 16px" }}>Registration Date</th>
                    <th style={{ padding: "10px 16px", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingMerchantList.map((m) => (
                    <tr key={m._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px", fontWeight: "700", color: "#0f172a" }}>
                        {m.name || "N/A"}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#475569" }}>
                        {m.email}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748b" }}>
                        {m.companyName || m.businessName || "Standard Merchant"}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748b" }}>
                        {new Date(m.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <button
                          onClick={() => handleApproveMerchant(m._id)}
                          disabled={approvingId === m._id}
                          style={{
                            padding: "6px 14px",
                            background: "#16a34a",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: "700",
                            cursor: "pointer",
                            boxShadow: "0 2px 6px rgba(22, 163, 74, 0.2)"
                          }}
                        >
                          {approvingId === m._id ? "Approving..." : "✓ Approve Merchant"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RECENT PLATFORM ORDERS TABLE */}
        <div style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
        }}>
          <div style={{
            padding: "20px 24px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div>
              <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                Recent Platform Orders
              </h3>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "2px 0 0" }}>
                Latest orders created across all registered merchant accounts
              </p>
            </div>

            <button
              onClick={() => navigate("/admin/orders")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#2563eb",
                cursor: "pointer"
              }}
            >
              View All Orders <FaArrowRight size={11} />
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            {loading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                Loading recent platform orders...
              </div>
            ) : recentOrders.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: "600" }}>
                    <th style={{ padding: "14px 24px" }}>Order Number</th>
                    <th style={{ padding: "14px 20px" }}>Merchant</th>
                    <th style={{ padding: "14px 20px" }}>Customer</th>
                    <th style={{ padding: "14px 20px" }}>Amount</th>
                    <th style={{ padding: "14px 20px" }}>Status</th>
                    <th style={{ padding: "14px 20px" }}>Date</th>
                    <th style={{ padding: "14px 24px", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => {
                    const badge = getStatusBadge(order.orderStatus || order.status || "PENDING");
                    const merchantName = order.merchantId?.name || order.merchant?.name || "Merchant";
                    const customerName = order.customerName || order.recipientName || "N/A";

                    return (
                      <tr key={order._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "16px 24px", fontWeight: "700", color: "#0f172a" }}>
                          {order.orderNumber || order._id}
                        </td>
                        <td style={{ padding: "16px 20px", fontWeight: "600", color: "#334155" }}>
                          {merchantName}
                        </td>
                        <td style={{ padding: "16px 20px", color: "#475569" }}>
                          {customerName}
                        </td>
                        <td style={{ padding: "16px 20px", fontWeight: "700", color: "#0f172a" }}>
                          ₹{formatCurrency(order.amount || order.orderAmount || 0)}
                        </td>
                        <td style={{ padding: "16px 20px" }}>
                          <span style={{
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "600",
                            background: badge.bg,
                            color: badge.color
                          }}>
                            {order.orderStatus || order.status || "PENDING"}
                          </span>
                        </td>
                        <td style={{ padding: "16px 20px", color: "#64748b" }}>
                          {new Date(order.createdAt).toLocaleDateString('en-GB')}
                        </td>
                        <td style={{ padding: "16px 24px", textAlign: "right" }}>
                          <button
                            onClick={() => navigate(`/admin/orders/${order._id}`)}
                            style={{
                              padding: "6px 14px",
                              background: "#f1f5f9",
                              color: "#334155",
                              border: "none",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px"
                            }}
                          >
                            <FaEye size={11} /> Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                No recent platform orders found.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;