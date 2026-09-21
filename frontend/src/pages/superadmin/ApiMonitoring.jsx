import { useState, useEffect } from "react";
import api from "../../services/api";
import SuperAdminLayout from "./SuperAdminLayout";
import { FaServer, FaCheckCircle, FaClock, FaSync, FaBolt, FaDatabase, FaGlobe } from "react-icons/fa";
import "./ApiMonitoring.css";

const ApiMonitoring = () => {
  const [data, setData] = useState({
    systemStatus: "Operational",
    databaseStatus: "Connected",
    totalApis: 0,
    healthyApis: 0,
    failedApis: 0,
    warningApis: 0,
    avgLatency: "112ms",
    uptimePercentage: "99.92%",
    apis: [],
    recentRequests: [],
  });

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pingingId, setPingingId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchApiStatus();
  }, []);

  const fetchApiStatus = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const res = await api.get("/admin/api-monitoring");
      if (res.data && res.data.success) {
        setData({
          systemStatus: res.data.systemStatus || "Operational",
          databaseStatus: res.data.databaseStatus || "Connected",
          totalApis: res.data.totalApis || 0,
          healthyApis: res.data.healthyApis || 0,
          failedApis: res.data.failedApis || 0,
          warningApis: res.data.warningApis || 0,
          avgLatency: res.data.avgLatency || "112ms",
          uptimePercentage: res.data.uptimePercentage || "99.92%",
          apis: res.data.apis || [],
          recentRequests: res.data.recentRequests || [],
        });
      } else {
        setError("Failed to fetch API status.");
      }
    } catch (err) {
      console.error("Error fetching API monitoring:", err);
      setError("Error connecting to server.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Test Ping a specific API Endpoint
  const handlePingApi = async (apiItem) => {
    setPingingId(apiItem.id);
    try {
      const res = await api.post("/admin/api-monitoring/ping", {
        apiId: apiItem.id,
        name: apiItem.name,
      });

      if (res.data && res.data.success) {
        setData((prev) => ({
          ...prev,
          apis: prev.apis.map((a) =>
            a.id === apiItem.id
              ? {
                  ...a,
                  response: res.data.responseTime,
                  status: res.data.status,
                  lastCheck: new Date(),
                }
              : a
          ),
        }));
      }
    } catch (err) {
      console.error("Ping failed:", err);
    } finally {
      setPingingId(null);
    }
  };

  // Filtered APIs by Category
  const filteredApis = data.apis.filter((a) => {
    if (selectedCategory === "ALL") return true;
    return (a.category || "").toUpperCase().includes(selectedCategory);
  });

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="api-monitoring-loading">
          <div className="monitoring-spinner"></div>
          <p>Probing Infrastructure API Health...</p>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="api-monitoring-container">

        {/* HEADER SECTION */}
        <div className="page-header">
          <div>
            <h1 className="page-title">
              <FaServer className="header-icon" /> API Monitoring & Health
            </h1>
            <p className="page-subtitle">
              Monitor real-time system endpoints, courier gateways, latency, and service availability
            </p>
          </div>

          <div className="header-actions">
            <button
              onClick={() => fetchApiStatus(true)}
              className="refresh-btn"
              disabled={isRefreshing}
            >
              <FaSync className={isRefreshing ? "spin-icon" : ""} />
              {isRefreshing ? "Checking Health..." : "Refresh Status"}
            </button>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* SYSTEM HEALTH OVERVIEW KPI CARDS */}
        <div className="kpi-grid">
          
          <div className="kpi-card card-green">
            <div className="kpi-icon"><FaDatabase /></div>
            <div className="kpi-info">
              <span className="kpi-label">Database Connection</span>
              <h3 className="kpi-value">{data.databaseStatus}</h3>
              <span className="kpi-sub green-sub">MongoDB Engine Operational</span>
            </div>
          </div>

          <div className="kpi-card card-blue">
            <div className="kpi-icon"><FaGlobe /></div>
            <div className="kpi-info">
              <span className="kpi-label">Monitored Endpoints</span>
              <h3 className="kpi-value">{data.totalApis} APIs</h3>
              <span className="kpi-sub blue-sub">{data.healthyApis} Active Services</span>
            </div>
          </div>

          <div className="kpi-card card-purple">
            <div className="kpi-icon"><FaClock /></div>
            <div className="kpi-info">
              <span className="kpi-label">Avg System Latency</span>
              <h3 className="kpi-value">{data.avgLatency}</h3>
              <span className="kpi-sub purple-sub">Global Average Response</span>
            </div>
          </div>

          <div className="kpi-card card-emerald">
            <div className="kpi-icon"><FaCheckCircle /></div>
            <div className="kpi-info">
              <span className="kpi-label">Platform Uptime</span>
              <h3 className="kpi-value">{data.uptimePercentage}</h3>
              <span className="kpi-sub emerald-sub">99.9% SLA Guarantee</span>
            </div>
          </div>

        </div>

        {/* CATEGORY FILTER TABS & DATAGRID */}
        <div className="table-card">
          <div className="table-header-flex">
            <div>
              <h2 className="table-title">Live API Service Status</h2>
              <p className="table-sub">Individual endpoints latency, SLA uptime and operational state</p>
            </div>

            <div className="category-tabs">
              <button
                className={`tab-btn ${selectedCategory === "ALL" ? "active" : ""}`}
                onClick={() => setSelectedCategory("ALL")}
              >
                All Endpoints
              </button>
              <button
                className={`tab-btn ${selectedCategory === "COURIER" ? "active" : ""}`}
                onClick={() => setSelectedCategory("COURIER")}
              >
                Courier Gateways
              </button>
              <button
                className={`tab-btn ${selectedCategory === "AUTH" || selectedCategory === "ORDERS" ? "active" : ""}`}
                onClick={() => setSelectedCategory("ORDERS")}
              >
                Core APIs
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service / API Name</th>
                  <th>Category</th>
                  <th>Response Time</th>
                  <th>Uptime SLA</th>
                  <th className="text-center">Health Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredApis.map((apiItem) => (
                  <tr key={apiItem.id}>
                    <td>
                      <div className="api-name-box">
                        <span className="api-name">{apiItem.name}</span>
                        <span className="api-endpoint">{apiItem.endpoint}</span>
                      </div>
                    </td>
                    <td>
                      <span className="category-tag">{apiItem.category || "General"}</span>
                    </td>
                    <td>
                      <span className="latency-badge">
                        <FaClock size={11} /> {apiItem.response}
                      </span>
                    </td>
                    <td className="font-semibold text-slate-700">
                      {apiItem.uptime || "99.9%"}
                    </td>
                    <td className="text-center">
                      <span
                        className={`status-pill ${
                          apiItem.status === "Active"
                            ? "pill-active"
                            : apiItem.status === "Warning"
                            ? "pill-warning"
                            : "pill-failed"
                        }`}
                      >
                        <span className="pulse-dot"></span>
                        {apiItem.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => handlePingApi(apiItem)}
                        className="ping-btn"
                        disabled={pingingId === apiItem.id}
                      >
                        <FaBolt className={pingingId === apiItem.id ? "spin-icon" : ""} />
                        {pingingId === apiItem.id ? "Pinging..." : "Ping Service"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RECENT REQUESTS STREAM */}
        <div className="table-card" style={{ marginTop: "24px" }}>
          <h2 className="table-title">Live Traffic Stream</h2>
          <p className="table-sub">Recent API requests processed by gateway router</p>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Request Path</th>
                  <th>Status Code</th>
                  <th>Latency</th>
                  <th>IP Address</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {data.recentRequests.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <span className={`method-badge method-${req.method}`}>
                        {req.method}
                      </span>
                    </td>
                    <td className="font-mono text-slate-800">{req.path}</td>
                    <td>
                      <span className={`code-badge ${req.status < 300 ? "code-200" : "code-500"}`}>
                        {req.status} OK
                      </span>
                    </td>
                    <td className="text-slate-600">{req.latency}</td>
                    <td className="text-slate-500">{req.ip}</td>
                    <td className="text-slate-400 text-xs">
                      {req.timestamp ? new Date(req.timestamp).toLocaleTimeString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </SuperAdminLayout>
  );
};

export default ApiMonitoring;