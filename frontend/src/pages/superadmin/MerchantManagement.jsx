import { useEffect, useState } from "react";
import api from "../../services/api";
import SuperAdminLayout from "./SuperAdminLayout";
import { FaEye, FaBox, FaTruck, FaWallet, FaBuilding, FaCheckCircle, FaTimesCircle, FaClock } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import "./MerchantManagement.css";

const MerchantManagement = () => {
  const [merchants, setMerchants] = useState([]);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    try {
      const res = await api.get("/admin/merchants");
      setMerchants(res.data.merchants || []);
    } catch (error) {
      console.error("Error retrieving merchant data directory:", error);
    }
  };

  const viewMerchant = async (id) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/merchant/${id}`);
      setSelectedMerchant(res.data);
      setShowModal(true);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const approveMerchant = async (id) => {
    const ok = window.confirm("Approve this merchant?");
    if (!ok) return;

    try {
      await api.put(`/admin/merchants/${id}/approve`);
      fetchMerchants();
    } catch (error) {
      console.log(error);
    }
  };

  const rejectMerchant = async (id) => {
    try {
      await api.put(`/admin/merchants/${id}/reject`);
      fetchMerchants();
    } catch (error) {
      console.log(error);
    }
  };

  const blockMerchant = async (id) => {
    const ok = window.confirm("Block this merchant?");
    if (!ok) return;

    try {
      await api.put(`/admin/merchants/${id}/block`);
      fetchMerchants();
    } catch (error) {
      console.log(error);
    }
  };

  const unblockMerchant = async (id) => {
    try {
      await api.put(`/admin/merchants/${id}/unblock`);
      fetchMerchants();
    } catch (error) {
      console.log(error);
    }
  };

  // Navigate to Rate Card Management
  const openRateCard = (merchantId) => {
    window.location.href = `/superadmin/ratecard/${merchantId}`;
  };

  // Status badge helper
  const getStatusBadge = (isBlocked, isApproved) => {
    if (isBlocked) {
      return { label: "Blocked", bg: "#fef2f2", color: "#dc2626", icon: FaTimesCircle };
    } else if (isApproved) {
      return { label: "Approved", bg: "#f0fdf4", color: "#16a34a", icon: FaCheckCircle };
    } else {
      return { label: "Pending", bg: "#fffbeb", color: "#d97706", icon: FaClock };
    }
  };

  return (
    <SuperAdminLayout>
      <div className="merchant-mgmt-container">
        
        {/* HEADER SECTION */}
        <div className="page-header">
          <div>
            <h1 className="page-title">
              Merchant Management
            </h1>
            <p className="page-subtitle">
              Manage registered merchants and business accounts
            </p>
          </div>
          <button className="add-btn">
            + Add Merchant
          </button>
        </div>

        {/* STATS CARDS */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-label">
              Total Merchants
            </div>
            <div className="stat-card-value total">
              {merchants.length}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">
              Approved
            </div>
            <div className="stat-card-value approved">
              {merchants.filter(m => m.isApproved && !m.isBlocked).length}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">
              Pending
            </div>
            <div className="stat-card-value pending">
              {merchants.filter(m => !m.isApproved && !m.isBlocked).length}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">
              Blocked
            </div>
            <div className="stat-card-value blocked">
              {merchants.filter(m => m.isBlocked).length}
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="table-card">
          <div className="table-header">
            <h2 className="table-title">
              Merchant Directory
            </h2>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Merchant</th>
                  <th>GST</th>
                  <th>PAN</th>
                  <th style={{ minWidth: "200px" }}>Address</th>
                  <th>Status</th>
                  <th style={{ minWidth: "340px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {merchants.length > 0 ? (
                  merchants.map((merchant) => {
                    const status = getStatusBadge(merchant.isBlocked, merchant.isApproved);
                    const StatusIcon = status.icon;
                    
                    return (
                      <tr key={merchant._id} style={{ 
                        background: "#ffffff",
                        transition: "background 0.15s",
                        cursor: "default"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "#ffffff"}
                      >
                        <td style={{ ...tdStyle, fontWeight: "500", color: "#0f172a" }}>
                          {merchant.companyName || "—"}
                        </td>
                        <td style={tdStyle}>
                          <span style={{ 
                            background: "#f1f5f9", 
                            color: "#334155", 
                            padding: "4px 12px", 
                            borderRadius: "6px", 
                            fontWeight: "500", 
                            fontSize: "13px", 
                            display: "inline-block" 
                          }}>
                            {merchant.userId?.name || merchant.name || "N/A"}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "13px", color: "#475569" }}>
                          {merchant.gstNumber || "—"}
                        </td>
                        <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "13px", color: "#475569" }}>
                          {merchant.panNumber || "—"}
                        </td>
                        <td style={{ 
                          ...tdStyle, 
                          color: "#64748b", 
                          maxWidth: "220px", 
                          whiteSpace: "nowrap", 
                          overflow: "hidden", 
                          textOverflow: "ellipsis",
                          fontSize: "13px"
                        }} 
                        title={merchant.address}>
                          {merchant.address || "—"}
                        </td>
                        <td style={tdStyle}>
                          <span style={{ 
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 12px", 
                            borderRadius: "6px", 
                            fontSize: "12px", 
                            fontWeight: "500", 
                            background: status.bg, 
                            color: status.color 
                          }}>
                            <StatusIcon size={12} />
                            {status.label}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                            {/* View Button */}
                            <button
                              onClick={() => viewMerchant(merchant._id)}
                              style={{
                                minWidth: "85px",
                                height: "36px",
                                padding: "0 14px",
                                border: "1px solid #e2e8f0",
                                borderRadius: "6px",
                                background: "#fff",
                                color: "#475569",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                                fontSize: "13px",
                                fontWeight: "500",
                                transition: "all 0.15s"
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#f1f5f9";
                                e.currentTarget.style.borderColor = "#cbd5e1";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#fff";
                                e.currentTarget.style.borderColor = "#e2e8f0";
                              }}
                            >
                              <FaEye size={14} /> View
                            </button>

                            {/* Rates Button */}
                            <button
                              onClick={() => openRateCard(merchant._id)}
                              style={{
                                minWidth: "85px",
                                height: "36px",
                                padding: "0 14px",
                                border: "none",
                                borderRadius: "6px",
                                background: "#f1f5f9",
                                color: "#475569",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "13px",
                                fontWeight: "500",
                                transition: "all 0.15s"
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#e2e8f0";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#f1f5f9";
                              }}
                            >
                              Rates
                            </button>

                            {!merchant.isApproved && (
                              <>
                                <button
                                  onClick={() => approveMerchant(merchant._id)}
                                  style={{
                                    minWidth: "85px",
                                    height: "36px",
                                    padding: "0 14px",
                                    border: "none",
                                    borderRadius: "6px",
                                    background: "#dcfce7",
                                    color: "#15803d",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    fontWeight: "500",
                                    transition: "all 0.15s",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "#bbf7d0";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "#dcfce7";
                                  }}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => rejectMerchant(merchant._id)}
                                  style={{
                                    minWidth: "85px",
                                    height: "36px",
                                    padding: "0 14px",
                                    border: "none",
                                    borderRadius: "6px",
                                    background: "#fee2e2",
                                    color: "#dc2626",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    fontWeight: "500",
                                    transition: "all 0.15s",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "#fecaca";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "#fee2e2";
                                  }}
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {merchant.isApproved && !merchant.isBlocked && (
                              <button
                                onClick={() => blockMerchant(merchant._id)}
                                style={{
                                  minWidth: "85px",
                                  height: "36px",
                                  padding: "0 14px",
                                  border: "none",
                                  borderRadius: "6px",
                                  background: "#fee2e2",
                                  color: "#dc2626",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  fontWeight: "500",
                                  transition: "all 0.15s",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#fecaca";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "#fee2e2";
                                }}
                              >
                                Block
                              </button>
                            )}

                            {merchant.isBlocked && (
                              <button
                                onClick={() => unblockMerchant(merchant._id)}
                                style={{
                                  minWidth: "85px",
                                  height: "36px",
                                  padding: "0 14px",
                                  border: "none",
                                  borderRadius: "6px",
                                  background: "#dcfce7",
                                  color: "#15803d",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  fontWeight: "500",
                                  transition: "all 0.15s",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#bbf7d0";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "#dcfce7";
                                }}
                              >
                                Unblock
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8", fontSize: "14px" }}>
                      No merchants found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MERCHANT DETAILS MODAL - Merchant Info Only */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: "20px"
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              width: "100%",
              maxWidth: "880px",
              maxHeight: "90vh",
              overflowY: "auto",
              borderRadius: "16px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              animation: "slideUp 0.3s ease-out",
            }}
          >
            {loading ? (
              <div style={{ padding: "60px 40px", textAlign: "center" }}>
                <div style={{ 
                  fontSize: "16px", 
                  color: "#64748b",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px"
                }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    border: "3px solid #e2e8f0",
                    borderTop: "3px solid #0f172a",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite"
                  }} />
                  Loading Merchant Details...
                </div>
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div style={{
                  padding: "24px 28px",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#fafafa",
                  borderRadius: "16px 16px 0 0"
                }}>
                  <div>
                    <h2 style={{ 
                      fontSize: "20px", 
                      fontWeight: "700", 
                      color: "#0f172a", 
                      margin: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: "10px"
                    }}>
                      <FaBuilding size={20} style={{ color: "#64748b" }} />
                      Merchant Details
                    </h2>
                    <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>
                      {selectedMerchant?.merchant?.companyName || "Business"}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    style={{
                      width: "36px",
                      height: "36px",
                      border: "none",
                      borderRadius: "8px",
                      background: "#f1f5f9",
                      color: "#475569",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s",
                      fontSize: "18px"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#e2e8f0";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#f1f5f9";
                    }}
                  >
                    <IoClose />
                  </button>
                </div>

                {/* Modal Body - Merchant Info Only */}
                <div style={{ padding: "28px" }}>
                  {/* Stats Cards */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "12px",
                    marginBottom: "28px"
                  }}>
                    <div style={{
                      background: "#f8fafc",
                      padding: "16px 20px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      textAlign: "center"
                    }}>
                      <FaBox size={18} style={{ color: "#64748b", marginBottom: "4px" }} />
                      <div style={{ fontSize: "11px", fontWeight: "500", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Orders
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a" }}>
                        {selectedMerchant?.totalOrders || 0}
                      </div>
                    </div>
                    <div style={{
                      background: "#f8fafc",
                      padding: "16px 20px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      textAlign: "center"
                    }}>
                      <FaTruck size={18} style={{ color: "#64748b", marginBottom: "4px" }} />
                      <div style={{ fontSize: "11px", fontWeight: "500", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Shipments
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a" }}>
                        {selectedMerchant?.totalShipments || 0}
                      </div>
                    </div>
                    <div style={{
                      background: "#f8fafc",
                      padding: "16px 20px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      textAlign: "center"
                    }}>
                      <FaWallet size={18} style={{ color: "#64748b", marginBottom: "4px" }} />
                      <div style={{ fontSize: "11px", fontWeight: "500", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Wallet
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a" }}>
                        ₹{(() => {
                          const num = Number(selectedMerchant?.walletBalance);
                          if (!selectedMerchant?.walletBalance || isNaN(num) || !isFinite(num) || num > 1e11 || num < -1e11) return "0.00";
                          return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        })()}
                      </div>
                    </div>
                    <div style={{
                      background: "#f8fafc",
                      padding: "16px 20px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      textAlign: "center"
                    }}>
                      <FaBuilding size={18} style={{ color: "#64748b", marginBottom: "4px" }} />
                      <div style={{ fontSize: "11px", fontWeight: "500", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Rate Cards
                      </div>
                      <div style={{ fontSize: "24px", fontWeight: "700", color: "#ea580c" }}>
                        {selectedMerchant?.rateCards?.length || 0}
                      </div>
                    </div>
                  </div>

                  {/* Merchant Info Grid */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px"
                  }}>
                    <div style={infoCardStyle}>
                      <div style={{ fontSize: "11px", fontWeight: "500", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                        Company Name
                      </div>
                      <div style={{ fontSize: "15px", fontWeight: "500", color: "#0f172a" }}>
                        {selectedMerchant?.merchant?.companyName || "—"}
                      </div>
                    </div>
                    <div style={infoCardStyle}>
                      <div style={{ fontSize: "11px", fontWeight: "500", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                        Contact Person
                      </div>
                      <div style={{ fontSize: "15px", fontWeight: "500", color: "#0f172a" }}>
                        {selectedMerchant?.merchant?.merchantName || selectedMerchant?.merchant?.name || "—"}
                      </div>
                    </div>
                    <div style={infoCardStyle}>
                      <div style={{ fontSize: "11px", fontWeight: "500", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                        Email Address
                      </div>
                      <div style={{ fontSize: "15px", fontWeight: "500", color: "#0f172a", wordBreak: "break-all" }}>
                        {selectedMerchant?.merchant?.email || "—"}
                      </div>
                    </div>
                    <div style={infoCardStyle}>
                      <div style={{ fontSize: "11px", fontWeight: "500", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                        Phone Number
                      </div>
                      <div style={{ fontSize: "15px", fontWeight: "500", color: "#0f172a" }}>
                        {selectedMerchant?.merchant?.phone || "—"}
                      </div>
                    </div>
                    <div style={infoCardStyle}>
                      <div style={{ fontSize: "11px", fontWeight: "500", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                        GST Number
                      </div>
                      <div style={{ fontSize: "15px", fontWeight: "500", color: "#0f172a", fontFamily: "monospace" }}>
                        {selectedMerchant?.merchant?.gstNumber || "—"}
                      </div>
                    </div>
                    <div style={infoCardStyle}>
                      <div style={{ fontSize: "11px", fontWeight: "500", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                        PAN Number
                      </div>
                      <div style={{ fontSize: "15px", fontWeight: "500", color: "#0f172a", fontFamily: "monospace" }}>
                        {selectedMerchant?.merchant?.panNumber || "—"}
                      </div>
                    </div>
                    <div style={{ ...infoCardStyle, gridColumn: "1 / -1" }}>
                      <div style={{ fontSize: "11px", fontWeight: "500", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                        Address
                      </div>
                      <div style={{ fontSize: "15px", fontWeight: "400", color: "#334155" }}>
                        {[
                          selectedMerchant?.merchant?.address,
                          selectedMerchant?.merchant?.city,
                          selectedMerchant?.merchant?.state
                        ]
                        .filter(Boolean)
                        .join(", ")}
                        {selectedMerchant?.merchant?.pincode
                          ? ` - ${selectedMerchant.merchant.pincode}`
                          : ""}
                      </div>
                    </div>
                    <div style={{ ...infoCardStyle, gridColumn: "1 / -1" }}>
                      <div style={{ fontSize: "11px", fontWeight: "500", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                        KYC Status
                      </div>
                      <div>
                        <span style={{
                          padding: "4px 14px",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: "500",
                          background: selectedMerchant?.merchant?.kycStatus === "VERIFIED" ? "#dcfce7" : 
                                     selectedMerchant?.merchant?.kycStatus === "REJECTED" ? "#fee2e2" : "#fef3c7",
                          color: selectedMerchant?.merchant?.kycStatus === "VERIFIED" ? "#15803d" : 
                                 selectedMerchant?.merchant?.kycStatus === "REJECTED" ? "#dc2626" : "#d97706"
                        }}>
                          {selectedMerchant?.merchant?.kycStatus || "PENDING"}
                        </span>
                      </div>
                    </div>

                    {/* Uploaded KYC Documents Section */}
                    <div style={{ ...infoCardStyle, gridColumn: "1 / -1", background: "#f8fafc" }}>
                      <div style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                        Uploaded KYC Documents
                      </div>
                      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        {selectedMerchant?.merchant?.kycDocuments?.gstCertificate ? (
                          <a
                            href={`${import.meta.env.VITE_API_URL || ""}${selectedMerchant.merchant.kycDocuments.gstCertificate}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "8px 14px",
                              background: "#eff6ff",
                              color: "#2563eb",
                              border: "1px solid #bfdbfe",
                              borderRadius: "6px",
                              fontSize: "12.5px",
                              fontWeight: "600",
                              textDecoration: "none"
                            }}
                          >
                            📄 View GST Certificate
                          </a>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>
                            No GST Certificate attached
                          </span>
                        )}

                        {selectedMerchant?.merchant?.kycDocuments?.panCard ? (
                          <a
                            href={`${import.meta.env.VITE_API_URL || ""}${selectedMerchant.merchant.kycDocuments.panCard}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "8px 14px",
                              background: "#f0fdf4",
                              color: "#16a34a",
                              border: "1px solid #bbf7d0",
                              borderRadius: "6px",
                              fontSize: "12.5px",
                              fontWeight: "600",
                              textDecoration: "none"
                            }}
                          >
                            🪪 View PAN Card Document
                          </a>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>
                            No PAN Card attached
                          </span>
                        )}

                        {selectedMerchant?.merchant?.kycDocuments?.aadhaarFront && (
                          <a
                            href={`${import.meta.env.VITE_API_URL || ""}${selectedMerchant.merchant.kycDocuments.aadhaarFront}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "8px 14px",
                              background: "#fef3c7",
                              color: "#b45309",
                              border: "1px solid #fde68a",
                              borderRadius: "6px",
                              fontSize: "12.5px",
                              fontWeight: "600",
                              textDecoration: "none"
                            }}
                          >
                            🆔 View Aadhaar Front
                          </a>
                        )}

                        {selectedMerchant?.merchant?.kycDocuments?.aadhaarBack && (
                          <a
                            href={`${import.meta.env.VITE_API_URL || ""}${selectedMerchant.merchant.kycDocuments.aadhaarBack}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "8px 14px",
                              background: "#fef3c7",
                              color: "#b45309",
                              border: "1px solid #fde68a",
                              borderRadius: "6px",
                              fontSize: "12.5px",
                              fontWeight: "600",
                              textDecoration: "none"
                            }}
                          >
                            🆔 View Aadhaar Back
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div style={{
                  padding: "16px 28px",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "flex-end",
                  background: "#fafafa",
                  borderRadius: "0 0 16px 16px"
                }}>
                  <button
                    onClick={() => setShowModal(false)}
                    style={{
                      padding: "8px 24px",
                      background: "#0f172a",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      transition: "all 0.15s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#1e293b";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#0f172a";
                    }}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </SuperAdminLayout>
  );
};

const thStyle = {
  padding: "12px 16px",
  textAlign: "left",
  color: "#64748b",
  fontWeight: "600",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
  whiteSpace: "nowrap"
};

const tdStyle = {
  padding: "12px 16px",
  color: "#334155",
  fontSize: "14px",
  fontWeight: "400",
  borderBottom: "1px solid #f1f5f9"
};

const infoCardStyle = {
  background: "#fafafa",
  padding: "12px 16px",
  borderRadius: "8px",
  border: "1px solid #f1f5f9"
};

export default MerchantManagement;