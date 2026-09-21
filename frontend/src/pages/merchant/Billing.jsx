import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import api from "../../services/api";
import { FaDownload, FaSearch, FaFilter, FaWallet, FaFileInvoice, FaCheckCircle, FaClock, FaRupeeSign } from "react-icons/fa";
import "./Billing.css"; 

const Billing = () => {
  const [invoices, setInvoices] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("NEWEST");
  const [dateFilter, setDateFilter] = useState("ALL_TIME");
  const [downloading, setDownloading] = useState(null);
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState({
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchInvoices(), fetchSummary(), fetchWallet()]);
    } catch (error) {
      console.error("Error fetching billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await api.get("/invoices");
      setInvoices(res.data.invoices || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get("/invoices/summary");
      setSummary({
        totalInvoices: res.data.totalInvoices || 0,
        paidInvoices: res.data.paidInvoices || 0,
        pendingInvoices: res.data.pendingInvoices || 0,
        totalRevenue: res.data.totalRevenue || 0,
      });
    } catch (error) {
      console.error("Error fetching billing summary:", error);
    }
  };

  const fetchWallet = async () => {
    try {
      const res = await api.get("/wallet");
      setWalletBalance(res.data.wallet?.balance || 0);
    } catch (error) {
      console.error("Error fetching wallet:", error);
      setWalletBalance(0);
    }
  };

  const getDateFilteredInvoices = (invoiceList) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return invoiceList.filter((inv) => {
      const invDate = new Date(inv.createdAt);
      
      switch (dateFilter) {
        case "TODAY":
          return invDate >= today;
        case "LAST_7_DAYS": {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return invDate >= sevenDaysAgo;
        }
        case "THIS_MONTH":
          return invDate.getMonth() === now.getMonth() && 
                 invDate.getFullYear() === now.getFullYear();
        case "ALL_TIME":
        default:
          return true;
      }
    });
  };

  const getSortedInvoices = (invoiceList) => {
    const sorted = [...invoiceList];
    if (sortOrder === "NEWEST") {
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }
    return sorted;
  };

  const filteredInvoices = getSortedInvoices(
    getDateFilteredInvoices(
      invoices.filter((invoice) => {
        const matchesSearch =
          invoice.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
          invoice.shipmentId?.awb?.toLowerCase().includes(search.toLowerCase()) ||
          invoice._id?.toLowerCase().includes(search.toLowerCase());

        const matchesStatus =
          statusFilter === "ALL"
            ? true
            : invoice.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
    )
  );

  const copyInvoiceNumber = (invoiceNumber) => {
    navigator.clipboard.writeText(invoiceNumber);
    
  };

  const downloadInvoice = async (id) => {
    try {
      setDownloading(id);
      
      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

      const response = await fetch(
        `${baseUrl}/invoices/${id}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading invoice:", error);
      alert("Failed to download invoice. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="billing-container">
      <div className="billing-sidebar">
        <Sidebar />
      </div>

      <div className="billing-content">
        <h1 className="billing-title">Billing & Invoices</h1>
        <p className="billing-subtitle">Manage your invoices and payment history</p>

        {/* Statistics Cards */}
        <div className="billing-stats-grid">
          <div className="billing-stat-card billing-stat-wallet">
            <FaWallet className="billing-stat-icon billing-stat-icon-wallet" />
            <div className="billing-stat-value billing-stat-value-wallet">₹{walletBalance.toLocaleString()}</div>
            <div className="billing-stat-label">Wallet Balance</div>
          </div>

          <div className="billing-stat-card billing-stat-revenue">
            <FaRupeeSign className="billing-stat-icon billing-stat-icon-revenue" />
            <div className="billing-stat-value billing-stat-value-revenue">₹{summary.totalRevenue.toLocaleString()}</div>
            <div className="billing-stat-label">Total Billing</div>
          </div>

          <div className="billing-stat-card billing-stat-total">
            <FaFileInvoice className="billing-stat-icon billing-stat-icon-total" />
            <div className="billing-stat-value">{summary.totalInvoices}</div>
            <div className="billing-stat-label">Total Invoices</div>
          </div>

          <div className="billing-stat-card billing-stat-paid">
            <FaCheckCircle className="billing-stat-icon billing-stat-icon-paid" />
            <div className="billing-stat-value billing-stat-value-paid">{summary.paidInvoices}</div>
            <div className="billing-stat-label">Paid</div>
          </div>

          <div className="billing-stat-card billing-stat-pending">
            <FaClock className="billing-stat-icon billing-stat-icon-pending" />
            <div className="billing-stat-value billing-stat-value-pending">{summary.pendingInvoices}</div>
            <div className="billing-stat-label">Pending</div>
          </div>
        </div>

        {/* Search + Filter Bar */}
        <div className="billing-search-wrapper">
          <FaSearch className="billing-search-icon" />
          <input
            type="text"
            placeholder="Search Invoice No / AWB / Transaction ID..."
            className="billing-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          
          <div className="billing-filter-wrapper">
            <FaFilter className="billing-filter-icon" />
            <select
              className="billing-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
            </select>

            <select
              className="billing-filter-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="NEWEST">Newest First</option>
              <option value="OLDEST">Oldest First</option>
            </select>

            <select
              className="billing-filter-select"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="ALL_TIME">All Time</option>
              <option value="TODAY">Today</option>
              <option value="LAST_7_DAYS">Last 7 Days</option>
              <option value="THIS_MONTH">This Month</option>
            </select>
          </div>
        </div>

        {/* Invoice Table */}
        <div className="billing-table-card">
          <div className="billing-table-header">
            <h3 className="billing-table-title">
              Invoice History
              <span className="billing-table-count">
                ({filteredInvoices.length} {filteredInvoices.length === 1 ? 'invoice' : 'invoices'})
              </span>
            </h3>
          </div>

          <div className="billing-table-wrapper">
            <table className="billing-table">
              <thead>
                <tr>
                  <th className="billing-th">Invoice No</th>
                  <th className="billing-th">AWB</th>
                  <th className="billing-th">Amount</th>
                  <th className="billing-th">Payment</th>
                  <th className="billing-th">Status</th>
                  <th className="billing-th">Date</th>
                  <th className="billing-th">Download</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="billing-loading">
                      <div>Loading invoices...</div>
                    </td>
                  </tr>
                ) : filteredInvoices.length > 0 ? (
                  filteredInvoices.map((invoice) => (
                    <tr key={invoice._id} className="billing-row">
                      <td className="billing-td">
                        <span
                          className="billing-invoice-number"
                          onClick={() => copyInvoiceNumber(invoice.invoiceNumber)}
                          title="Click to copy invoice number"
                        >
                          {invoice.invoiceNumber || invoice._id.slice(-8)}
                        </span>
                      </td>

                      <td className="billing-td">
                        <span className="billing-awb">
                          {invoice.shipmentId?.awb || "-"}
                        </span>
                      </td>

                      <td className="billing-td">
                        <span className="billing-amount">
                          ₹{Number(invoice.totalAmount || invoice.amount || 0).toLocaleString()}
                        </span>
                      </td>

                      <td className="billing-td">
                        <span className="billing-payment-method">
                          {invoice.paymentMethod || "Wallet"}
                        </span>
                      </td>

                      <td className="billing-td">
                        <span className={`billing-status-badge ${invoice.status === "PAID" ? "billing-status-paid" : "billing-status-pending"}`}>
                          {invoice.status === "PAID" ? "Paid" : "Pending"}
                        </span>
                      </td>

                      <td className="billing-td billing-date">
                        {new Date(invoice.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>

                      <td className="billing-td">
                        <button
                          title="Download Invoice"
                          className={`billing-download-btn ${downloading === invoice._id ? 'billing-download-btn-disabled' : ''}`}
                          onClick={() => downloadInvoice(invoice._id)}
                          disabled={downloading === invoice._id}
                        >
                          <FaDownload size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="billing-empty">
                      <div className="billing-empty-title">
                        {search || statusFilter !== "ALL" || dateFilter !== "ALL_TIME" 
                          ? "No matching invoices found" 
                          : "No invoices yet"}
                      </div>
                      <div className="billing-empty-text">
                        {search || statusFilter !== "ALL" || dateFilter !== "ALL_TIME"
                          ? "Try adjusting your search or filters"
                          : "Create shipments to generate invoices automatically"}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="billing-pagination">
            <span>
              Showing {filteredInvoices.length} {filteredInvoices.length === 1 ? 'invoice' : 'invoices'}
            </span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Billing;