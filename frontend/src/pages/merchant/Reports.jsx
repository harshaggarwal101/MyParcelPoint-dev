import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import api from "../../services/api";
import { FaBox, FaRupeeSign, FaTruck, FaWallet, FaSync, FaExclamationTriangle, FaCheckCircle, FaUndoAlt, FaCalendarAlt, FaChartBar, FaFileCsv } from "react-icons/fa";
import "./Reports.css";

const DATE_FILTERS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7days", label: "Last 7 Days" },
  { value: "last30days", label: "Last 30 Days" },
  { value: "thismonth", label: "This Month" },
  { value: "custom", label: "Custom Range" },
];

const Reports = () => {
  const [dateFilter, setDateFilter] = useState("last30days");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    orders: { totalOrders: 0, pendingOrders: 0, deliveredOrders: 0 },
    shipments: { totalShipments: 0, pickupPending: 0, inTransit: 0, deliveredShipments: 0, cancelledShipments: 0 },
    ndr: { totalNDR: 0 },
    rto: { totalRTO: 0 },
    wallet: { balance: 0 },
    revenue: { totalShippingCharges: 0, codTotalAmount: 0, codDeliveredAmount: 0 },
    couriers: [],
  });

  useEffect(() => {
    fetchReports();
  }, [dateFilter, customRange]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = {
        filter: dateFilter,
        ...(dateFilter === "custom" && {
          startDate: customRange.start,
          endDate: customRange.end,
        }),
      };

      const res = await api.get("/reports/dashboard", { params });
      if (res.data.success) {
        setStats({
          orders: res.data.orders || { totalOrders: 0, pendingOrders: 0, deliveredOrders: 0 },
          shipments: res.data.shipments || { totalShipments: 0, pickupPending: 0, inTransit: 0, deliveredShipments: 0, cancelledShipments: 0 },
          ndr: res.data.ndr || { totalNDR: 0 },
          rto: res.data.rto || { totalRTO: 0 },
          wallet: res.data.wallet || { balance: 0 },
          revenue: res.data.revenue || { totalShippingCharges: 0, codTotalAmount: 0, codDeliveredAmount: 0 },
          couriers: res.data.couriers || [],
        });
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const rows = [
      ["MYPARCELPOINT MERCHANT PERFORMANCE REPORT"],
      ["Generated At", new Date().toLocaleString()],
      ["Filter Period", dateFilter],
      [""],
      ["METRIC", "VALUE"],
      ["Total Orders", stats.orders.totalOrders],
      ["Total Shipments Booked", stats.shipments.totalShipments],
      ["Delivered Shipments", stats.shipments.deliveredShipments],
      ["In-Transit Shipments", stats.shipments.inTransit],
      ["Pickup Pending", stats.shipments.pickupPending],
      ["NDR Cases", stats.ndr.totalNDR],
      ["RTO Cases", stats.rto.totalRTO],
      ["Total Freight Spend (₹)", stats.revenue.totalShippingCharges],
      ["Total COD Order Value (₹)", stats.revenue.codTotalAmount],
      ["Delivered COD Collected (₹)", stats.revenue.codDeliveredAmount],
      ["Available Wallet Balance (₹)", stats.wallet.balance],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MyParcelPoint_Report_${dateFilter}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deliverySuccessRate = stats.shipments.totalShipments
    ? Math.round((stats.shipments.deliveredShipments / stats.shipments.totalShipments) * 100)
    : 0;

  return (
    <div className="reports-container">
      <div className="reports-sidebar">
        <Sidebar />
      </div>

      <main className="reports-main">
        {/* HEADER */}
        <div className="reports-header">
          <div>
            <h1 className="reports-title">Logistics Reports & Analytics</h1>
            <p className="reports-subtitle">
              Monitor shipment performance, delivery success rates, and freight expenditure.
            </p>
          </div>

          <div className="header-actions">
            <button onClick={fetchReports} className="btn-refresh" title="Refresh data">
              <FaSync className={loading ? "spin-icon" : ""} /> Refresh
            </button>
            <button onClick={exportCSV} className="btn-export">
              <FaFileCsv /> Export CSV
            </button>
          </div>
        </div>

        {/* DATE FILTER PILLS */}
        <div className="date-filter-bar">
          <span className="filter-label">
            <FaCalendarAlt /> Time Period:
          </span>
          <div className="filter-pills">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setDateFilter(f.value)}
                className={`pill-btn ${dateFilter === f.value ? "active" : ""}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {dateFilter === "custom" && (
            <div className="custom-date-inputs">
              <input
                type="date"
                value={customRange.start}
                onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                className="date-picker"
              />
              <span>to</span>
              <input
                type="date"
                value={customRange.end}
                onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                className="date-picker"
              />
            </div>
          )}
        </div>

        {/* TOP METRIC CARDS */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon blue">
              <FaBox />
            </div>
            <div>
              <span className="metric-title">Total Orders</span>
              <h3 className="metric-value">{stats.orders.totalOrders}</h3>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon purple">
              <FaTruck />
            </div>
            <div>
              <span className="metric-title">Shipments Booked</span>
              <h3 className="metric-value">{stats.shipments.totalShipments}</h3>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon green">
              <FaCheckCircle />
            </div>
            <div>
              <span className="metric-title">Delivery Success Rate</span>
              <h3 className="metric-value">{deliverySuccessRate}%</h3>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon yellow">
              <FaExclamationTriangle />
            </div>
            <div>
              <span className="metric-title">NDR Cases</span>
              <h3 className="metric-value">{stats.ndr.totalNDR}</h3>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon red">
              <FaUndoAlt />
            </div>
            <div>
              <span className="metric-title">RTO Cases</span>
              <h3 className="metric-value">{stats.rto.totalRTO}</h3>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon emerald">
              <FaRupeeSign />
            </div>
            <div>
              <span className="metric-title">Total Freight Spend</span>
              <h3 className="metric-value">₹{Math.round(stats.revenue.totalShippingCharges || 0).toLocaleString("en-IN")}</h3>
            </div>
          </div>
        </div>

        {/* DETAILED STATS GRID */}
        <div className="details-grid">
          {/* SHIPMENT LIFECYCLE BREAKDOWN */}
          <div className="details-card">
            <h3>
              <FaTruck /> Shipment Status Breakdown
            </h3>
            <div className="status-rows">
              <div className="status-item">
                <span className="status-name">
                  <span className="dot yellow"></span> Pickup Pending
                </span>
                <strong>{stats.shipments.pickupPending}</strong>
              </div>
              <div className="status-item">
                <span className="status-name">
                  <span className="dot blue"></span> In-Transit / Out for Delivery
                </span>
                <strong>{stats.shipments.inTransit}</strong>
              </div>
              <div className="status-item">
                <span className="status-name">
                  <span className="dot green"></span> Delivered
                </span>
                <strong>{stats.shipments.deliveredShipments}</strong>
              </div>
              <div className="status-item">
                <span className="status-name">
                  <span className="dot orange"></span> NDR (Undelivered)
                </span>
                <strong>{stats.ndr.totalNDR}</strong>
              </div>
              <div className="status-item">
                <span className="status-name">
                  <span className="dot red"></span> Returned to Origin (RTO)
                </span>
                <strong>{stats.rto.totalRTO}</strong>
              </div>
              <div className="status-item">
                <span className="status-name">
                  <span className="dot gray"></span> Cancelled
                </span>
                <strong>{stats.shipments.cancelledShipments}</strong>
              </div>
            </div>
          </div>

          {/* FINANCIAL & COD SUMMARY */}
          <div className="details-card">
            <h3>
              <FaWallet /> Financial & COD Summary
            </h3>
            <div className="status-rows">
              <div className="status-item">
                <span className="status-name">Total COD Order Amount</span>
                <strong>₹{stats.revenue.codTotalAmount.toLocaleString("en-IN")}</strong>
              </div>
              <div className="status-item">
                <span className="status-name">Delivered COD Collected</span>
                <strong className="text-green">₹{stats.revenue.codDeliveredAmount.toLocaleString("en-IN")}</strong>
              </div>
              <div className="status-item">
                <span className="status-name">Total Freight Expenditure</span>
                <strong>₹{stats.revenue.totalShippingCharges.toLocaleString("en-IN")}</strong>
              </div>
              <div className="status-item">
                <span className="status-name">Available Wallet Balance</span>
                <strong className="text-blue">₹{stats.wallet.balance.toLocaleString("en-IN")}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* COURIER PERFORMANCE TABLE */}
        <div className="details-card table-section">
          <h3>
            <FaChartBar /> Courier Performance Analytics
          </h3>

          {stats.couriers.length > 0 ? (
            <div className="table-responsive">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Courier Partner</th>
                    <th>Total Shipments</th>
                    <th>Delivered Shipments</th>
                    <th>Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.couriers.map((c, idx) => (
                    <tr key={idx}>
                      <td className="font-bold">{c.name}</td>
                      <td>{c.total}</td>
                      <td>{c.delivered}</td>
                      <td>
                        <span className={`rate-badge ${c.successRate >= 80 ? "high" : c.successRate >= 50 ? "med" : "low"}`}>
                          {c.successRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-data">
              <FaBox className="no-data-icon" />
              <p>No courier partner data available for the selected timeframe.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Reports;