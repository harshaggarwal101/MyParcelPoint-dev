import { useEffect, useState, useMemo } from "react";
import api from "../../services/api";
import SuperAdminLayout from "./SuperAdminLayout";
import { FaSync, FaDownload, FaSearch, FaChevronLeft, FaChevronRight, FaExclamationTriangle } from "react-icons/fa";
import DateFilterBar from "../../components/DateFilterBar";
import "./Revenue.css";

const Revenue = () => {
  const [dateFilter, setDateFilter] = useState({ filter: "all", startDate: "", endDate: "" });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [revenueData, setRevenueData] = useState({
    totalRevenue: 0,
    totalCourierCost: 0,
    profit: 0,
    profitMargin: 0,
    totalCommission: 0,
    netRevenue: 0,
    activeMerchants: 0,
    totalOrders: 0,
    totalShipments: 0,
    totalInvoices: 0,
    recentInvoices: [],
    merchantBreakdown: [],
    overallTrackedPercentage: 100,
    overallEstimationRatio: 0,
    showEstimationWarning: false,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortOption, setSortOption] = useState("netProfit-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchRevenueData(false, dateFilter);
  }, [dateFilter]);

  const fetchRevenueData = async (showRefresh = false, filterObj = dateFilter) => {
    if (showRefresh) setIsRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.append("range", filterObj.filter || "all");
      if (filterObj.startDate) params.append("startDate", filterObj.startDate);
      if (filterObj.endDate) params.append("endDate", filterObj.endDate);

      const res = await api.get(`/admin/revenue?${params.toString()}`);
      if (res.data && res.data.success) {
        setRevenueData({
          totalRevenue: res.data.totalRevenue || 0,
          totalCourierCost: res.data.totalCourierCost || 0,
          profit: res.data.profit || 0,
          profitMargin: res.data.profitMargin || 0,
          totalCommission: res.data.totalCommission || 0,
          netRevenue: res.data.netRevenue || 0,
          activeMerchants: res.data.activeMerchants || 0,
          totalOrders: res.data.totalOrders || 0,
          totalShipments: res.data.totalShipments || 0,
          totalInvoices: res.data.totalInvoices || 0,
          recentInvoices: res.data.recentInvoices || [],
          merchantBreakdown: res.data.merchantBreakdown || [],
          overallTrackedPercentage: res.data.overallTrackedPercentage !== undefined ? res.data.overallTrackedPercentage : 100,
          overallEstimationRatio: res.data.overallEstimationRatio !== undefined ? res.data.overallEstimationRatio : 0,
          showEstimationWarning: !!res.data.showEstimationWarning,
        });
      } else {
        setError("Failed to fetch revenue data.");
      }
    } catch (err) {
      console.error("Error fetching revenue analytics:", err);
      setError("Error loading revenue data.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Filtered & Sorted Merchants
  const filteredMerchants = useMemo(() => {
    let list = (revenueData.merchantBreakdown || []).filter((m) => {
      const nameMatch =
        (m.merchantName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.companyName || "").toLowerCase().includes(searchQuery.toLowerCase());

      const statusMatch =
        statusFilter === "ALL" || m.status === statusFilter;

      return nameMatch && statusMatch;
    });

    list.sort((a, b) => {
      const netA = a.netProfit !== undefined ? a.netProfit : (a.revenue || 0) - (a.courierCost || 0);
      const netB = b.netProfit !== undefined ? b.netProfit : (b.revenue || 0) - (b.courierCost || 0);

      if (sortOption === "netProfit-desc") return netB - netA;
      if (sortOption === "netProfit-asc") return netA - netB;
      if (sortOption === "revenue-desc") return (b.revenue || 0) - (a.revenue || 0);
      if (sortOption === "name-asc") return (a.merchantName || "").localeCompare(b.merchantName || "");
      return 0;
    });

    return list;
  }, [revenueData.merchantBreakdown, searchQuery, statusFilter, sortOption]);

  // Paginated Merchants
  const paginatedMerchants = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMerchants.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMerchants, currentPage]);

  const totalPages = Math.ceil(filteredMerchants.length / itemsPerPage) || 1;

  // Key Statistics
  const activeMerchantsCount = revenueData.activeMerchants || 1;
  const avgRevenuePerMerchant = revenueData.totalRevenue / activeMerchantsCount;

  // Export CSV
  const exportToCSV = () => {
    if (filteredMerchants.length === 0) return;

    const headers = [
      "Merchant Name",
      "Email",
      "Company",
      "Orders",
      "Shipments",
      "Data Quality",
      "Tracked %",
      "Revenue (INR)",
      "Courier Cost (INR)",
      "Net Profit (INR)",
      "Commission (INR)",
      "Status"
    ];
    const rows = filteredMerchants.map((m) => {
      const netProf = m.netProfit !== undefined ? m.netProfit : (m.revenue || 0) - (m.courierCost || 0);
      const qualityText = m.isEstimated || m.dataConfidence === "ESTIMATED" ? "Estimated (70% fallback)" : "Actual Data";
      const trackedPct = `${m.trackedPercentage || 0}% (${m.trackedShipments || 0}/${m.shipments || 0})`;
      return [
        `"${m.merchantName || "-"}"`,
        `"${m.email || "-"}"`,
        `"${m.companyName || "-"}"`,
        m.orders || 0,
        m.shipments || 0,
        `"${qualityText}"`,
        `"${trackedPct}"`,
        m.revenue || 0,
        m.courierCost || 0,
        netProf,
        m.commission || 0,
        m.status || "INACTIVE",
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Revenue_Data_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="revenue-loading-container" style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div style={{ width: "40px", height: "40px", border: "4px solid #3b82f6", borderTop: "4px solid transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <span style={{ color: "#64748b", fontWeight: "600", fontSize: "15px" }}>Loading Revenue Analytics...</span>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="revenue-container">

        {/* TOP ESTIMATION WARNING BANNER */}
        {revenueData.showEstimationWarning && (
          <div
            style={{
              background: "#fffbe6",
              border: "1.5px solid #ffe58f",
              borderRadius: "14px",
              padding: "16px 20px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
            }}
          >
            <FaExclamationTriangle size={22} color="#d48806" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <h4 style={{ margin: "0 0 4px 0", color: "#873800", fontSize: "15px", fontWeight: "700" }}>
                ⚠️ Data Quality Notice: High Estimation Ratio ({revenueData.overallEstimationRatio}% Estimated)
              </h4>
              <p style={{ margin: 0, color: "#a75d00", fontSize: "13px", lineHeight: "1.5" }}>
                Historical profit figures rely on a 70% cost estimation fallback due to legacy shipments without recorded courier buy rates. As new shipments are booked with explicit rate cards, tracked profit confidence will automatically improve to 100% actual data.
              </p>
            </div>
          </div>
        )}

        {/* HEADER SECTION */}
        <div className="page-header">
          <div>
            <h1 className="page-title">
              Revenue & Commission Analytics
            </h1>
            <p className="page-subtitle">
              Platform revenue tracking, cost estimation transparency, and merchant analytics
            </p>
          </div>

          <div className="header-actions">
            <button
              onClick={() => fetchRevenueData(true)}
              className="refresh-btn"
              disabled={isRefreshing}
            >
              <FaSync className={isRefreshing ? "spin-icon" : ""} />
              {isRefreshing ? "Refreshing..." : "Refresh Data"}
            </button>

            <button onClick={exportToCSV} className="export-btn">
              <FaDownload />
              Export CSV
            </button>
          </div>
        </div>

        {/* DATE FILTER BAR */}
        <DateFilterBar
          activeFilter={dateFilter.filter}
          onFilterChange={(f) => setDateFilter(f)}
        />

        {error && <div className="revenue-error">{error}</div>}

        {/* ANALYTICS KPI CARDS GRID (MATCHING COMMISSION PAGE) */}
        <div className="kpi-grid">
          <div className="card-blue">
            <div className="card-label">Total Revenue</div>
            <div className="card-value" title={`₹${(revenueData.totalRevenue || 0).toLocaleString()}`}>
              ₹{Math.round(revenueData.totalRevenue || 0).toLocaleString()}
            </div>
          </div>

          <div className="card-green">
            <div className="card-label">Net Revenue</div>
            <div className="card-value" title={`₹${(revenueData.netRevenue || 0).toLocaleString()}`}>
              ₹{Math.round(revenueData.netRevenue || 0).toLocaleString()}
            </div>
          </div>

          <div className="card-orange">
            <div className="card-label">Total Commission</div>
            <div className="card-value" title={`₹${(revenueData.totalCommission || 0).toLocaleString()}`}>
              ₹{Math.round(revenueData.totalCommission || 0).toLocaleString()}
            </div>
          </div>

          <div className="card-purple">
            <div className="card-label">Courier Cost</div>
            <div className="card-value" title={`₹${(revenueData.totalCourierCost || 0).toLocaleString()}`}>
              ₹{Math.round(revenueData.totalCourierCost || 0).toLocaleString()}
            </div>
          </div>

          <div className="card-green">
            <div className="card-label">Platform Profit</div>
            <div className="card-value" title={`₹${(revenueData.profit || 0).toLocaleString()}`}>
              ₹{Math.round(revenueData.profit || 0).toLocaleString()}
            </div>
          </div>

          <div className="card-orange">
            <div className="card-label">Active Merchants</div>
            <div className="card-value">
              {revenueData.activeMerchants || 0}
            </div>
          </div>
        </div>

        {/* MERCHANT REVENUE BREAKDOWN TABLE */}
        <div className="table-card">
          <div className="table-header-flex">
            <h2 className="table-title">
              Merchant Revenue Breakdown
            </h2>

            <div className="table-filters">
              <div className="search-box">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search merchant..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="search-input"
                />
              </div>

              <select
                value={sortOption}
                onChange={(e) => {
                  setSortOption(e.target.value);
                  setCurrentPage(1);
                }}
                className="status-select"
                title="Sort By"
              >
                <option value="netProfit-desc">Profit: High to Low</option>
                <option value="netProfit-asc">Profit: Low to High</option>
                <option value="revenue-desc">Revenue: High to Low</option>
                <option value="name-asc">Name: A to Z</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="status-select"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Merchant Name</th>
                  <th>Email</th>
                  <th>Orders</th>
                  <th>Shipments</th>
                  <th>Data Quality</th>
                  <th>Gross Revenue</th>
                  <th>Courier Cost</th>
                  <th>Freight Margin</th>
                  <th>COD Margin</th>
                  <th>RTO Margin</th>
                  <th>Net Profit</th>
                  <th>Commission</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMerchants.length > 0 ? (
                  paginatedMerchants.map((merchant) => {
                    const netProf = merchant.netProfit !== undefined ? merchant.netProfit : (merchant.revenue || 0) - (merchant.courierCost || 0);
                    const isProfitPos = netProf >= 0;
                    const isEst = merchant.isEstimated || merchant.dataConfidence === "ESTIMATED";

                    return (
                      <tr key={merchant._id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                              color: "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: "700",
                              fontSize: "13px",
                              flexShrink: 0
                            }}>
                              {(merchant.merchantName || "M").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: "700", color: "#0f172a" }}>{merchant.merchantName || "Unknown"}</div>
                              {merchant.companyName && merchant.companyName !== "-" && (
                                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "400" }}>{merchant.companyName}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ color: "#64748b" }}>{merchant.email || "-"}</td>
                        <td>{merchant.orders || 0}</td>
                        <td>{merchant.shipments || 0}</td>
                        
                        {/* Data Quality Confidence Badge */}
                        <td>
                          {merchant.shipments === 0 ? (
                            <span style={{ fontSize: "12px", color: "#94a3b8" }}>No Shipments</span>
                          ) : isEst ? (
                            <div>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "3px 8px",
                                  borderRadius: "12px",
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  background: "#fef3c7",
                                  color: "#b45309",
                                  border: "1px solid #fde68a",
                                }}
                              >
                                ⚠️ Estimated (70% fallback)
                              </span>
                              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>
                                {merchant.trackedPercentage || 0}% tracked ({merchant.trackedShipments || 0}/{merchant.shipments})
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "3px 8px",
                                  borderRadius: "12px",
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  background: "#dcfce7",
                                  color: "#15803d",
                                  border: "1px solid #86efac",
                                }}
                              >
                                Actual Data
                              </span>
                              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>
                                {merchant.trackedPercentage || 100}% tracked ({merchant.trackedShipments || merchant.shipments}/{merchant.shipments})
                              </div>
                            </div>
                          )}
                        </td>

                        <td>
                          <span style={{ color: "#059669", fontWeight: "600" }}>
                            ₹{(merchant.revenue || 0).toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: "#dc2626", fontWeight: "600" }}>
                            ₹{(merchant.courierCost || 0).toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: "#2563eb", fontWeight: "600" }}>
                            ₹{(merchant.freightMargin || 0).toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: "#d97706", fontWeight: "600" }}>
                            ₹{(merchant.codMargin || 0).toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: "#9333ea", fontWeight: "600" }}>
                            ₹{(merchant.rtoMargin || 0).toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontWeight: "700",
                              fontSize: "13px",
                              background: isProfitPos ? "#dcfce7" : "#fee2e2",
                              color: isProfitPos ? "#166534" : "#991b1b",
                              border: `1px solid ${isProfitPos ? "#86efac" : "#fca5a5"}`,
                            }}
                          >
                            {isProfitPos ? "✨ +" : "⚠️ "}₹{netProf.toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: "#7c3aed", fontWeight: "600" }}>
                            ₹{(merchant.commission || 0).toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-badge ${
                              merchant.status === "ACTIVE" ? "active" : "pending"
                            }`}
                          >
                            {merchant.status || "INACTIVE"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="13" style={{ textAlign: "center", padding: "32px 16px" }}>
                      <div style={{ color: "#94a3b8", fontSize: "14px", fontWeight: "500" }}>
                        No Revenue Data Available
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredMerchants.length > itemsPerPage && (
            <div className="pagination-wrapper">
              <span className="pagination-text">
                Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredMerchants.length)} of {filteredMerchants.length}
              </span>
              <div className="pagination-actions">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="page-btn"
                >
                  <FaChevronLeft /> Prev
                </button>
                <span className="page-num">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="page-btn"
                >
                  Next <FaChevronRight />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RECENT INVOICES SECTION */}
        <div className="table-card" style={{ marginTop: "24px" }}>
          <h2 className="table-title">Recent Invoices</h2>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Merchant</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {revenueData.recentInvoices && revenueData.recentInvoices.length > 0 ? (
                  revenueData.recentInvoices.map((inv, idx) => (
                    <tr key={inv._id || idx}>
                      <td style={{ fontWeight: "600", color: "#2563eb" }}>
                        {inv.invoiceNumber || `INV-${idx + 1}`}
                      </td>
                      <td style={{ fontWeight: "500", color: "#0f172a" }}>
                        {inv.merchantId?.name || inv.merchantId?.companyName || "Merchant"}
                      </td>
                      <td>
                        <span style={{ color: "#059669", fontWeight: "600" }}>
                          ₹{(inv.totalAmount || 0).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span className="method-tag">
                          {inv.paymentMethod || "PREPAID"}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${inv.status === "PAID" ? "active" : "pending"}`}>
                          {inv.status || "PAID"}
                        </span>
                      </td>
                      <td style={{ color: "#64748b" }}>
                        {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "24px" }}>
                      <div style={{ color: "#94a3b8", fontSize: "14px" }}>
                        No recent invoices found
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </SuperAdminLayout>
  );
};

// Simple Metric Card Component
const MetricCard = ({ label, value, color, icon, subtext }) => {
  return (
    <div className="metric-card" style={{ borderTop: `4px solid ${color}` }}>
      <div className="metric-header">
        <span className="metric-card-label">{label}</span>
        {icon && (
          <div className="metric-icon-circle" style={{ background: `${color}18`, color }}>
            {icon}
          </div>
        )}
      </div>
      <div className="metric-card-value">
        {value}
      </div>
      {subtext && <div className="metric-subtext">{subtext}</div>}
    </div>
  );
};

export default Revenue;