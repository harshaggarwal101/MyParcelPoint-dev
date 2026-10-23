import SuperAdminLayout from "./SuperAdminLayout";
import { useEffect, useState } from "react";
import api from "../../services/api";
import {
  FaTruck,
  FaPlus,
  FaEye,
  FaEdit,
  FaPowerOff,
  FaTrash,
  FaSearch,
  FaGlobe,
  FaUsers,
  FaUserSlash,
  FaPlane,
  FaSync,
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Couriers.css";

const Couriers = () => {
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "DOMESTIC",
    estimatedDays: 3,
    priority: 1,
    trackingUrl: "",
    logo: "",
    isActive: true,
  });

  // Stats
  const [stats, setStats] = useState({
    totalCouriers: 0,
    active: 0,
    inactive: 0,
    domestic: 0,
    international: 0,
  });

  useEffect(() => {
    fetchCouriers();
  }, []);

  const fetchCouriers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/couriers/all");
      if (res.data.success) {
        setCouriers(res.data.couriers);
        calculateStats(res.data.couriers);
      }
    } catch (err) {
      console.error("Error fetching couriers:", err);
      toast.error(err.response?.data?.message || "Failed to fetch couriers");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNimbus = async () => {
    try {
      setLoading(true);
      const res = await api.post("/couriers/sync-nimbus");
      if (res.data.success) {
        toast.success(
          res.data.message || "Synced couriers from NimbusPost successfully!",
        );
        fetchCouriers();
      }
    } catch (err) {
      console.error("Sync Nimbus error:", err);
      toast.error(
        err.response?.data?.message ||
          "Failed to sync couriers from NimbusPost",
      );
    } finally {
      setLoading(false);
    }
  };

  // ADDED: Shipmozo Sync Handler
  const handleSyncShipmozo = async () => {
    try {
      setLoading(true);
      const res = await api.post("/couriers/sync-shipmozo");
      if (res.data.success) {
        toast.success(
          res.data.message || "Synced couriers from Shipmozo successfully!",
        );
        fetchCouriers();
      }
    } catch (err) {
      console.error("Sync Shipmozo error:", err);
      toast.error(
        err.response?.data?.message || "Failed to sync couriers from Shipmozo",
      );
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (courierList) => {
    const total = courierList.length;
    const active = courierList.filter((c) => c.isActive).length;
    const inactive = courierList.filter((c) => !c.isActive).length;
    const domestic = courierList.filter((c) => c.type === "DOMESTIC").length;
    const international = courierList.filter(
      (c) => c.type === "INTERNATIONAL",
    ).length;

    setStats({
      totalCouriers: total,
      active,
      inactive,
      domestic,
      international,
    });
  };

  // Filter couriers
  const filteredCouriers = couriers.filter((courier) => {
    const matchesSearch =
      courier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      courier.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && courier.isActive) ||
      (statusFilter === "INACTIVE" && !courier.isActive);
    const matchesType = typeFilter === "ALL" || courier.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Handle Add/Edit Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedCourier) {
        const res = await api.put(`/couriers/${selectedCourier._id}`, formData);
        if (res.data.success) {
          toast.success("Courier updated successfully!");
          await fetchCouriers();
          setShowEditModal(false);
          setSelectedCourier(null);
          resetForm();
        }
      } else {
        const res = await api.post("/couriers", formData);
        if (res.data.success) {
          toast.success("Courier added successfully!");
          await fetchCouriers();
          setShowAddModal(false);
          resetForm();
        }
      }
    } catch (err) {
      console.error("Error saving courier:", err);
      toast.error(err.response?.data?.message || "Error saving courier");
    }
  };

  // Toggle Active Status (Soft Delete/Enable)
  const toggleStatus = async (courierId, currentStatus) => {
    const action = currentStatus ? "disable" : "enable";
    setConfirmMessage(`Are you sure you want to ${action} this courier?`);
    setConfirmAction(() => async () => {
      try {
        const res = await api.patch(`/couriers/${courierId}/status`);
        if (res.data.success) {
          toast.success(
            `Courier ${currentStatus ? "disabled" : "enabled"} successfully!`,
          );
          await fetchCouriers();
        }
      } catch (err) {
        console.error("Error toggling status:", err);
        toast.error(
          err.response?.data?.message || "Error updating courier status",
        );
      }
    });
    setShowConfirmModal(true);
  };

  // Delete Courier (Soft Delete - sets isActive = false)
  const deleteCourier = async (courierId) => {
    setConfirmMessage(
      "Are you sure you want to delete this courier? This will soft delete the courier.",
    );
    setConfirmAction(() => async () => {
      try {
        const res = await api.delete(`/couriers/${courierId}`);
        if (res.data.success) {
          toast.success("Courier deleted successfully!");
          await fetchCouriers();
        }
      } catch (err) {
        console.error("Error deleting courier:", err);
        toast.error(err.response?.data?.message || "Error deleting courier");
      }
    });
    setShowConfirmModal(true);
  };

  // Reset Form
  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      type: "DOMESTIC",
      estimatedDays: 3,
      priority: 1,
      trackingUrl: "",
      logo: "",
      isActive: true,
    });
    setSelectedCourier(null);
  };

  // Open Edit Modal
  const openEditModal = (courier) => {
    setSelectedCourier(courier);
    setFormData({
      name: courier.name,
      code: courier.code,
      type: courier.type,
      estimatedDays: courier.estimatedDays,
      priority: courier.priority,
      trackingUrl: courier.trackingUrl || "",
      logo: courier.logo || "",
      isActive: courier.isActive,
    });
    setShowEditModal(true);
  };

  // Open View Modal
  const openViewModal = (courier) => {
    setSelectedCourier(courier);
    setShowViewModal(true);
  };

  // Execute confirm action
  const executeConfirmAction = async () => {
    if (confirmAction) {
      await confirmAction();
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
    setConfirmMessage("");
  };

  // Styles
  const styles = {
    mainContent: {
      flex: 1,
      padding: "20px 30px",
      overflowX: "auto",
    },
    headerBlock: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "25px",
    },
    headerLeft: {
      flex: 1,
    },
    headerTitle: {
      fontSize: "22px",
      fontWeight: "700",
      color: "#0f172a",
      margin: "0 0 6px 0",
    },
    headerSubtitle: {
      fontSize: "13px",
      color: "#64748b",
      margin: 0,
    },
    addButton: {
      background: "linear-gradient(135deg, #f59e0b, #ea580c)",
      color: "white",
      border: "none",
      padding: "10px 20px",
      borderRadius: "10px",
      fontWeight: "600",
      fontSize: "14px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
      transition: "all 0.2s ease",
      whiteSpace: "nowrap",
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gap: "16px",
      marginBottom: "24px",
    },
    statCard: {
      background: "white",
      padding: "16px 20px",
      borderRadius: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
      border: "1px solid #eef2f6",
    },
    statInfo: {
      flex: 1,
    },
    statLabel: {
      fontSize: "11px",
      fontWeight: "600",
      textTransform: "uppercase",
      color: "#64748b",
      marginBottom: "4px",
      letterSpacing: "0.5px",
    },
    statValue: {
      fontSize: "22px",
      fontWeight: "800",
      color: "#0f172a",
      margin: 0,
    },
    statIconWrapper: {
      width: "40px",
      height: "40px",
      borderRadius: "10px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    filterSection: {
      background: "white",
      padding: "16px 20px",
      borderRadius: "12px",
      marginBottom: "20px",
      border: "1px solid #eef2f6",
      display: "flex",
      gap: "16px",
      alignItems: "center",
      flexWrap: "wrap",
    },
    searchWrapper: {
      flex: 1,
      minWidth: "200px",
      position: "relative",
    },
    searchInput: {
      width: "100%",
      padding: "8px 16px 8px 36px",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      fontSize: "13px",
      outline: "none",
      background: "#f8fafc",
      transition: "all 0.2s ease",
    },
    searchIcon: {
      position: "absolute",
      left: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#94a3b8",
    },
    filterSelect: {
      padding: "8px 14px",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      fontSize: "13px",
      background: "#f8fafc",
      outline: "none",
      cursor: "pointer",
      minWidth: "140px",
    },
    tableContainer: {
      background: "white",
      borderRadius: "12px",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
      overflow: "hidden",
      border: "1px solid #eef2f6",
    },
    tableHeader: {
      padding: "16px 20px",
      borderBottom: "1px solid #eef2f6",
      background: "white",
    },
    tableTitle: {
      fontSize: "16px",
      fontWeight: "700",
      color: "#0f172a",
      margin: 0,
    },
    tableWrapper: {
      overflowX: "auto",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      background: "white",
    },
    th: {
      textAlign: "left",
      padding: "12px 16px",
      background: "#f8fafc",
      color: "#475569",
      fontSize: "11px",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      borderBottom: "1px solid #eef2f6",
      whiteSpace: "nowrap",
    },
    td: {
      padding: "14px 16px",
      borderBottom: "1px solid #f1f5f9",
      color: "#1e293b",
      fontSize: "13px",
      background: "white",
      verticalAlign: "middle",
    },
    courierInfo: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    courierAvatar: {
      width: "36px",
      height: "36px",
      background: "linear-gradient(135deg, #f59e0b, #ea580c)",
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontSize: "12px",
      fontWeight: "700",
      flexShrink: 0,
    },
    courierLogo: {
      width: "36px",
      height: "36px",
      borderRadius: "8px",
      objectFit: "contain",
      background: "#f8fafc",
      border: "1px solid #eef2f6",
    },
    courierName: {
      fontWeight: "600",
      color: "#0f172a",
    },
    courierCode: {
      fontSize: "11px",
      color: "#94a3b8",
      display: "block",
    },
    statusBadge: {
      display: "inline-block",
      padding: "4px 12px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: "600",
    },
    typeBadge: {
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: "6px",
      fontSize: "11px",
      fontWeight: "600",
      background: "#dbeafe",
      color: "#1e40af",
    },
    priorityBadge: {
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: "6px",
      fontSize: "11px",
      fontWeight: "600",
      background: "#f1f5f9",
      color: "#475569",
    },
    actionGroup: {
      display: "flex",
      gap: "6px",
      flexWrap: "wrap",
    },
    actionBtn: {
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      padding: "6px 10px",
      borderRadius: "6px",
      cursor: "pointer",
      color: "#475569",
      transition: "all 0.2s ease",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      fontSize: "12px",
    },
    // Modal Styles
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 999,
      padding: "20px",
    },
    modalContent: {
      background: "white",
      borderRadius: "16px",
      padding: "30px",
      width: "100%",
      maxWidth: "560px",
      maxHeight: "90vh",
      overflowY: "auto",
      boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
    },
    modalHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "24px",
    },
    modalTitle: {
      fontSize: "20px",
      fontWeight: "700",
      color: "#0f172a",
      margin: 0,
    },
    closeBtn: {
      background: "none",
      border: "none",
      fontSize: "24px",
      cursor: "pointer",
      color: "#94a3b8",
      padding: "4px",
    },
    formGroup: {
      marginBottom: "16px",
    },
    formLabel: {
      display: "block",
      fontSize: "13px",
      fontWeight: "600",
      color: "#334155",
      marginBottom: "6px",
    },
    formInput: {
      width: "100%",
      padding: "10px 14px",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      fontSize: "13px",
      outline: "none",
      transition: "border-color 0.2s ease",
    },
    formSelect: {
      width: "100%",
      padding: "10px 14px",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      fontSize: "13px",
      outline: "none",
      background: "white",
      cursor: "pointer",
    },
    formCheckbox: {
      width: "18px",
      height: "18px",
      cursor: "pointer",
    },
    modalFooter: {
      display: "flex",
      gap: "12px",
      marginTop: "24px",
      justifyContent: "flex-end",
    },
    submitBtn: {
      background: "linear-gradient(135deg, #f59e0b, #ea580c)",
      color: "white",
      border: "none",
      padding: "10px 24px",
      borderRadius: "8px",
      fontWeight: "600",
      fontSize: "14px",
      cursor: "pointer",
    },
    cancelBtn: {
      background: "#f1f5f9",
      color: "#475569",
      border: "none",
      padding: "10px 24px",
      borderRadius: "8px",
      fontWeight: "600",
      fontSize: "14px",
      cursor: "pointer",
    },
    // View Modal
    viewField: {
      display: "flex",
      justifyContent: "space-between",
      padding: "12px 0",
      borderBottom: "1px solid #f1f5f9",
    },
    viewLabel: {
      fontWeight: "600",
      color: "#64748b",
      fontSize: "13px",
    },
    viewValue: {
      color: "#0f172a",
      fontSize: "13px",
      fontWeight: "500",
    },
    // Confirm Modal
    confirmModalContent: {
      background: "white",
      borderRadius: "16px",
      padding: "30px",
      width: "100%",
      maxWidth: "420px",
      textAlign: "center",
      boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
    },
    confirmIcon: {
      fontSize: "48px",
      color: "#f59e0b",
      marginBottom: "16px",
    },
    confirmTitle: {
      fontSize: "20px",
      fontWeight: "700",
      color: "#0f172a",
      margin: "0 0 8px 0",
    },
    confirmMessage: {
      fontSize: "14px",
      color: "#64748b",
      margin: "0 0 24px 0",
      lineHeight: "1.6",
    },
    confirmActions: {
      display: "flex",
      gap: "12px",
      justifyContent: "center",
    },
    confirmCancelBtn: {
      background: "#f1f5f9",
      color: "#475569",
      border: "none",
      padding: "10px 24px",
      borderRadius: "8px",
      fontWeight: "600",
      fontSize: "14px",
      cursor: "pointer",
    },
    confirmDeleteBtn: {
      background: "#ef4444",
      color: "white",
      border: "none",
      padding: "10px 24px",
      borderRadius: "8px",
      fontWeight: "600",
      fontSize: "14px",
      cursor: "pointer",
    },
    confirmEnableBtn: {
      background: "#10b981",
      color: "white",
      border: "none",
      padding: "10px 24px",
      borderRadius: "8px",
      fontWeight: "600",
      fontSize: "14px",
      cursor: "pointer",
    },
  };

  // Status badge helper
  const getStatusStyle = (isActive) => {
    if (isActive) {
      return { ...styles.statusBadge, background: "#dcfce7", color: "#166534" };
    }
    return { ...styles.statusBadge, background: "#fee2e2", color: "#991b1b" };
  };

  // Type badge helper
  const getTypeStyle = (type) => {
    if (type === "DOMESTIC") {
      return { ...styles.typeBadge, background: "#dbeafe", color: "#1e40af" };
    }
    return { ...styles.typeBadge, background: "#fef3c7", color: "#92400e" };
  };

  return (
    <SuperAdminLayout>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <div style={styles.mainContent}>
        {/* Header */}
        <div style={styles.headerBlock}>
          <div style={styles.headerLeft}>
            <h1 style={styles.headerTitle}>🚚 Courier Management</h1>
            <p style={styles.headerSubtitle}>
              Manage all courier partners and their configurations
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {/* ADDED: Shipmozo Button */}
            <button
              style={{
                ...styles.addButton,
                background: "linear-gradient(135deg, #4f46e5, #4338ca)",
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
              }}
              onClick={handleSyncShipmozo}
              disabled={loading}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 6px 20px rgba(79, 70, 229, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(79, 70, 229, 0.3)";
              }}
            >
              <FaSync size={14} className={loading ? "spin" : ""} /> Sync
              Shipmozo Couriers
            </button>

            {/* Existing Nimbus Button */}
            <button
              style={{
                ...styles.addButton,
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
              }}
              onClick={handleSyncNimbus}
              disabled={loading}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 6px 20px rgba(37, 99, 235, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(37, 99, 235, 0.3)";
              }}
            >
              <FaSync size={14} className={loading ? "spin" : ""} /> Sync Nimbus
              Couriers
            </button>

            {/* Existing Add Courier Button */}
            <button
              style={styles.addButton}
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 6px 20px rgba(245, 158, 11, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(245, 158, 11, 0.3)";
              }}
            >
              <FaPlus size={14} /> Add Courier
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>Total Couriers</div>
              <h2 style={styles.statValue}>{stats.totalCouriers}</h2>
            </div>
            <div style={{ ...styles.statIconWrapper, background: "#fef3c7" }}>
              <FaTruck color="#f59e0b" size={18} />
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>Active</div>
              <h2 style={styles.statValue}>{stats.active}</h2>
            </div>
            <div style={{ ...styles.statIconWrapper, background: "#dcfce7" }}>
              <FaUsers color="#10b981" size={18} />
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>Inactive</div>
              <h2 style={styles.statValue}>{stats.inactive}</h2>
            </div>
            <div style={{ ...styles.statIconWrapper, background: "#fee2e2" }}>
              <FaUserSlash color="#ef4444" size={18} />
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>Domestic</div>
              <h2 style={styles.statValue}>{stats.domestic}</h2>
            </div>
            <div style={{ ...styles.statIconWrapper, background: "#dbeafe" }}>
              <FaGlobe color="#3b82f6" size={18} />
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>International</div>
              <h2 style={styles.statValue}>{stats.international}</h2>
            </div>
            <div style={{ ...styles.statIconWrapper, background: "#fef3c7" }}>
              <FaPlane color="#f59e0b" size={18} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filterSection}>
          <div style={styles.searchWrapper}>
            <FaSearch style={styles.searchIcon} size={14} />
            <input
              type="text"
              placeholder="Search courier..."
              style={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>

          <select
            style={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <select
            style={styles.filterSelect}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="DOMESTIC">Domestic</option>
            <option value="INTERNATIONAL">International</option>
          </select>
        </div>

        {/* Table */}
        <div style={styles.tableContainer}>
          <div style={styles.tableHeader}>
            <h3 style={styles.tableTitle}>Courier Partners</h3>
          </div>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Logo</th>
                  <th style={styles.th}>Courier</th>
                  <th style={styles.th}>Code</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>ETA</th>
                  <th style={styles.th}>Priority</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="8"
                      style={{
                        ...styles.td,
                        textAlign: "center",
                        padding: "40px",
                      }}
                    >
                      Loading couriers...
                    </td>
                  </tr>
                ) : filteredCouriers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      style={{
                        ...styles.td,
                        textAlign: "center",
                        padding: "40px",
                        color: "#94a3b8",
                      }}
                    >
                      No couriers found
                    </td>
                  </tr>
                ) : (
                  filteredCouriers.map((courier) => (
                    <tr
                      key={courier._id}
                      style={{ background: "#ffffff" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#f8fafc")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "#ffffff")
                      }
                    >
                      <td style={styles.td}>
                        {courier.logo ? (
                          <img
                            src={courier.logo}
                            alt={courier.name}
                            style={styles.courierLogo}
                          />
                        ) : (
                          <div style={styles.courierAvatar}>
                            {courier.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.courierInfo}>
                          <div>
                            <div style={styles.courierName}>{courier.name}</div>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            fontWeight: "500",
                            fontSize: "12px",
                            color: "#475569",
                          }}
                        >
                          {courier.code}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={getTypeStyle(courier.type)}>
                          {courier.type}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span>{courier.estimatedDays} days</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.priorityBadge}>
                          #{courier.priority}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={getStatusStyle(courier.isActive)}>
                          {courier.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionGroup}>
                          <button
                            style={styles.actionBtn}
                            onClick={() => openViewModal(courier)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#f1f5f9";
                              e.currentTarget.style.borderColor = "#cbd5e1";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#ffffff";
                              e.currentTarget.style.borderColor = "#e2e8f0";
                            }}
                          >
                            <FaEye size={12} /> View
                          </button>
                          <button
                            style={styles.actionBtn}
                            onClick={() => openEditModal(courier)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#f1f5f9";
                              e.currentTarget.style.borderColor = "#cbd5e1";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#ffffff";
                              e.currentTarget.style.borderColor = "#e2e8f0";
                            }}
                          >
                            <FaEdit size={12} /> Edit
                          </button>
                          <button
                            style={{
                              ...styles.actionBtn,
                              color: courier.isActive ? "#ef4444" : "#10b981",
                            }}
                            onClick={() =>
                              toggleStatus(courier._id, courier.isActive)
                            }
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                courier.isActive ? "#fee2e2" : "#dcfce7";
                              e.currentTarget.style.borderColor =
                                courier.isActive ? "#fecaca" : "#bbf7d0";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#ffffff";
                              e.currentTarget.style.borderColor = "#e2e8f0";
                            }}
                          >
                            <FaPowerOff size={12} />{" "}
                            {courier.isActive ? "Disable" : "Enable"}
                          </button>
                          <button
                            style={{ ...styles.actionBtn, color: "#ef4444" }}
                            onClick={() => deleteCourier(courier._id)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#fee2e2";
                              e.currentTarget.style.borderColor = "#fecaca";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#ffffff";
                              e.currentTarget.style.borderColor = "#e2e8f0";
                            }}
                          >
                            <FaTrash size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Add New Courier</h2>
              <button
                style={styles.closeBtn}
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Courier Name *</label>
                <input
                  type="text"
                  style={styles.formInput}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Courier Code *</label>
                <input
                  type="text"
                  style={styles.formInput}
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  required
                  placeholder="e.g., DTDC, DELHIVERY"
                  onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Courier Type *</label>
                <select
                  style={styles.formSelect}
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  required
                >
                  <option value="DOMESTIC">Domestic</option>
                  <option value="INTERNATIONAL">International</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Estimated Days *</label>
                <input
                  type="number"
                  style={styles.formInput}
                  value={formData.estimatedDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estimatedDays: parseInt(e.target.value),
                    })
                  }
                  required
                  min="1"
                  onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Priority *</label>
                <input
                  type="number"
                  style={styles.formInput}
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: parseInt(e.target.value),
                    })
                  }
                  required
                  min="1"
                  onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Tracking URL</label>
                <input
                  type="url"
                  style={styles.formInput}
                  value={formData.trackingUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, trackingUrl: e.target.value })
                  }
                  placeholder="https://example.com/track/{awb}"
                  onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Logo URL</label>
                <input
                  type="url"
                  style={styles.formInput}
                  value={formData.logo}
                  onChange={(e) =>
                    setFormData({ ...formData, logo: e.target.value })
                  }
                  placeholder="https://example.com/logo.png"
                  onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              <div style={styles.formGroup}>
                <label
                  style={{
                    ...styles.formLabel,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <input
                    type="checkbox"
                    style={styles.formCheckbox}
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                  />
                  Active
                </label>
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn}>
                  Add Courier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div
          style={styles.modalOverlay}
          onClick={() => setShowEditModal(false)}
        >
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Edit Courier</h2>
              <button
                style={styles.closeBtn}
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Courier Name *</label>
                <input
                  type="text"
                  style={styles.formInput}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Courier Code *</label>
                <input
                  type="text"
                  style={styles.formInput}
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  required
                  onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Courier Type *</label>
                <select
                  style={styles.formSelect}
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  required
                >
                  <option value="DOMESTIC">Domestic</option>
                  <option value="INTERNATIONAL">International</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Estimated Days *</label>
                <input
                  type="number"
                  style={styles.formInput}
                  value={formData.estimatedDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estimatedDays: parseInt(e.target.value),
                    })
                  }
                  required
                  min="1"
                  onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Priority *</label>
                <input
                  type="number"
                  style={styles.formInput}
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: parseInt(e.target.value),
                    })
                  }
                  required
                  min="1"
                  onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Tracking URL</label>
                <input
                  type="url"
                  style={styles.formInput}
                  value={formData.trackingUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, trackingUrl: e.target.value })
                  }
                  onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Logo URL</label>
                <input
                  type="url"
                  style={styles.formInput}
                  value={formData.logo}
                  onChange={(e) =>
                    setFormData({ ...formData, logo: e.target.value })
                  }
                  onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              <div style={styles.formGroup}>
                <label
                  style={{
                    ...styles.formLabel,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <input
                    type="checkbox"
                    style={styles.formCheckbox}
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                  />
                  Active
                </label>
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn}>
                  Update Courier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedCourier && (
        <div
          style={styles.modalOverlay}
          onClick={() => setShowViewModal(false)}
        >
          <div
            style={{ ...styles.modalContent, maxWidth: "480px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Courier Details</h2>
              <button
                style={styles.closeBtn}
                onClick={() => setShowViewModal(false)}
              >
                ✕
              </button>
            </div>

            {selectedCourier.logo && (
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <img
                  src={selectedCourier.logo}
                  alt={selectedCourier.name}
                  style={{
                    maxWidth: "100px",
                    maxHeight: "60px",
                    objectFit: "contain",
                    border: "1px solid #eef2f6",
                    borderRadius: "8px",
                    padding: "8px",
                  }}
                />
              </div>
            )}

            <div style={styles.viewField}>
              <span style={styles.viewLabel}>Courier Name</span>
              <span style={styles.viewValue}>{selectedCourier.name}</span>
            </div>
            <div style={styles.viewField}>
              <span style={styles.viewLabel}>Courier Code</span>
              <span style={styles.viewValue}>{selectedCourier.code}</span>
            </div>
            <div style={styles.viewField}>
              <span style={styles.viewLabel}>Courier Type</span>
              <span style={styles.viewValue}>{selectedCourier.type}</span>
            </div>
            <div style={styles.viewField}>
              <span style={styles.viewLabel}>Estimated Days</span>
              <span style={styles.viewValue}>
                {selectedCourier.estimatedDays} days
              </span>
            </div>
            <div style={styles.viewField}>
              <span style={styles.viewLabel}>Priority</span>
              <span style={styles.viewValue}>#{selectedCourier.priority}</span>
            </div>
            {selectedCourier.trackingUrl && (
              <div style={styles.viewField}>
                <span style={styles.viewLabel}>Tracking URL</span>
                <span style={styles.viewValue}>
                  <a
                    href={selectedCourier.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#f59e0b" }}
                  >
                    {selectedCourier.trackingUrl}
                  </a>
                </span>
              </div>
            )}
            <div style={styles.viewField}>
              <span style={styles.viewLabel}>Status</span>
              <span style={getStatusStyle(selectedCourier.isActive)}>
                {selectedCourier.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div style={{ ...styles.modalFooter, justifyContent: "center" }}>
              <button
                style={styles.cancelBtn}
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div
          style={styles.modalOverlay}
          onClick={() => {
            setShowConfirmModal(false);
            setConfirmAction(null);
            setConfirmMessage("");
          }}
        >
          <div
            style={styles.confirmModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.confirmIcon}>⚠️</div>
            <h2 style={styles.confirmTitle}>Confirm Action</h2>
            <p style={styles.confirmMessage}>{confirmMessage}</p>
            <div style={styles.confirmActions}>
              <button
                style={styles.confirmCancelBtn}
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                  setConfirmMessage("");
                }}
              >
                Cancel
              </button>
              <button
                style={
                  confirmMessage.includes("delete")
                    ? styles.confirmDeleteBtn
                    : styles.confirmEnableBtn
                }
                onClick={executeConfirmAction}
              >
                {confirmMessage.includes("delete")
                  ? "Delete"
                  : confirmMessage.includes("enable")
                    ? "Enable"
                    : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
};

export default Couriers;
