import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../../components/admin/AdminSidebar";
import api from "../../services/api";
import { FaSearch, FaEllipsisV, FaEye, FaTimesCircle, FaTruck } from "react-icons/fa";
import "./Orders.css"; 

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("ALL");
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/orders");
      setOrders(response.data.orders || []);
    } catch (error) {
      console.log("ORDERS ERROR =>", error);
    } finally {
      setLoading(false);
    }
  };

  // ================================
  // CANCEL ORDER
  // ================================
  const cancelOrder = async (id) => {
    const ok = window.confirm(
      "Are you sure you want to cancel this order?"
    );

    if (!ok) return;

    try {
      await api.patch(`/admin/orders/${id}/cancel`);
      fetchOrders();
      alert("Order Cancelled Successfully");
    } catch (error) {
      alert(
        error?.response?.data?.message ||
        "Cancel Failed"
      );
    }
  };

  // ================================
  // CHECK IF SHIPMENT EXISTS
  // ================================
  const hasShipment = (order) => {
    return order.shipmentId || order.awbNumber || order.courierPartner;
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customerName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      order.orderNumber
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      order.customerPhone
        ?.toString()
        .includes(searchTerm);

    const orderStatus = order.status || "NEW";
    const matchesStatus =
      activeTab === "ALL" ? true : orderStatus === activeTab;

    return matchesSearch && matchesStatus;
  });

  // Stats
  const totalOrders = orders.length;
  const newOrders = orders.filter(o => o.status === "NEW").length;
  const readyForPickup = orders.filter(o => o.status === "READY_FOR_PICKUP").length;
  const shipped = orders.filter(o => o.status === "SHIPPED").length;
  const cancelledOrders = orders.filter(o => o.status === "CANCELLED").length;

  const getStatusBadge = (order) => {
    const status = order.status || "NEW";
    const statusMap = {
      "DELIVERED": { label: "DELIVERED", className: "orders-status-delivered" },
      "CANCELLED": { label: "CANCELLED", className: "orders-status-cancelled" },
      "NEW": { label: "NEW", className: "orders-status-new" },
      "READY_FOR_PICKUP": { label: "READY FOR PICKUP", className: "orders-status-ready" },
      "SHIPPED": { label: "SHIPPED", className: "orders-status-shipped" },
      "OUT_FOR_DELIVERY": { label: "OUT FOR DELIVERY", className: "orders-status-out" },
      "NDR": { label: "NDR", className: "orders-status-ndr" },
      "RTO": { label: "RTO", className: "orders-status-rto" }
    };
    return statusMap[status] || { label: status, className: "orders-status-default" };
  };

  // Handle select all checkbox
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedOrders(filteredOrders.map((o) => o._id));
    } else {
      setSelectedOrders([]);
    }
  };

  // Handle individual checkbox
  const handleSelectOrder = (orderId) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter((id) => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  return (
    <div className="admin-scope orders-container">
      <AdminSidebar />

      <div className="orders-main">
        <h1 className="orders-header-title">
          📦 Orders Management
        </h1>

        <p className="orders-header-subtitle">
          View and manage all platform orders
        </p>

        {/* Stats Cards */}
        <div className="orders-stats-grid">
          <div className="orders-stat-card">
            <h4 className="orders-stat-label">Total Orders</h4>
            <h2 className="orders-stat-value orders-stat-value-default">{totalOrders}</h2>
          </div>

          <div className="orders-stat-card">
            <h4 className="orders-stat-label">New Orders</h4>
            <h2 className="orders-stat-value orders-stat-value-warning">{newOrders}</h2>
          </div>

          <div className="orders-stat-card">
            <h4 className="orders-stat-label">Shipped</h4>
            <h2 className="orders-stat-value orders-stat-value-blue">{shipped}</h2>
          </div>

          <div className="orders-stat-card">
            <h4 className="orders-stat-label">Cancelled</h4>
            <h2 className="orders-stat-value orders-stat-value-gray">{cancelledOrders}</h2>
          </div>
        </div>

        {/* Search */}
        <div className="orders-search-box">
          <FaSearch color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by Order Number, Customer Name, or Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="orders-search-input"
          />
          {searchTerm && (
            <span
              onClick={() => setSearchTerm("")}
              className="orders-search-clear"
            >
              ✕
            </span>
          )}
        </div>

        {/* Status Tabs */}
        <div className="orders-tabs">
          {[
            "ALL",
            "NEW",
            "READY_FOR_PICKUP",
            "SHIPPED",
            "OUT_FOR_DELIVERY",
            "DELIVERED",
            "NDR",
            "RTO",
            "CANCELLED",
          ].map((status) => (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`orders-tab-btn ${
                activeTab === status
                  ? "orders-tab-btn-active"
                  : "orders-tab-btn-inactive"
              }`}
            >
              {status.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Table Container */}
        <div className="orders-table-container">
          {loading ? (
            <div className="orders-loading">
              Loading orders...
            </div>
          ) : (
            <div className="orders-table-wrapper">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th className="orders-th orders-th-checkbox">
                      <input
                        type="checkbox"
                        className="orders-checkbox"
                        onChange={handleSelectAll}
                        checked={filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length}
                      />
                    </th>
                    <th className="orders-th orders-th-order">Order No</th>
                    <th className="orders-th orders-th-customer">Customer</th>
                    <th className="orders-th orders-th-merchant">Merchant</th>
                    <th className="orders-th orders-th-phone">Phone</th>
                    <th className="orders-th orders-th-city">City</th>
                    <th className="orders-th orders-th-amount">Amount</th>
                    <th className="orders-th orders-th-payment">Payment</th>
                    <th className="orders-th orders-th-status">Status</th>
                    <th className="orders-th-actions">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => {
                      const statusBadge = getStatusBadge(order);
                      return (
                        <tr key={order._id} className="orders-tr">
                          <td className="orders-td orders-td-checkbox">
                            <input
                              type="checkbox"
                              className="orders-checkbox"
                              checked={selectedOrders.includes(order._id)}
                              onChange={() => handleSelectOrder(order._id)}
                            />
                          </td>
                          <td className="orders-td orders-td-order">
                            <button
                              onClick={() =>
                                navigate(`/admin/orders/${order._id}`)
                              }
                              className="orders-order-link"
                            >
                              {order.orderNumber}
                            </button>
                          </td>
                          <td className="orders-td orders-td-customer">
                            {order.customerName}
                          </td>
                          <td className="orders-td orders-td-merchant">
                            {order.merchantId?.companyName || order.merchantId?.name || "-"}
                          </td>
                          <td className="orders-td orders-td-phone">{order.customerPhone}</td>
                          <td className="orders-td orders-td-city">{order.city || "-"}</td>
                          <td className="orders-td orders-td-amount">₹{order.amount}</td>
                          <td className="orders-td orders-td-payment">{order.paymentMode || "-"}</td>
                          <td className="orders-td orders-td-status">
                            <span className={`orders-status-badge ${statusBadge.className}`}>
                              {statusBadge.label}
                            </span>
                            {hasShipment(order) && order.courierPartner && (
                              <span className="orders-courier-info">
                                {order.courierPartner}
                                {order.awbNumber && ` • ${order.awbNumber}`}
                              </span>
                            )}
                          </td>
                          <td className="orders-td-actions">
                            <div className="orders-menu-wrapper">
                              <button
                                onClick={() =>
                                  setOpenMenu(
                                    openMenu === order._id
                                      ? null
                                      : order._id
                                  )
                                }
                                className="orders-menu-btn"
                              >
                                <FaEllipsisV size={16} color="#64748b" />
                              </button>

                              {openMenu === order._id && (
                                <div className="orders-menu-dropdown">
                                  {/* View Order */}
                                  <button
                                    onClick={() => {
                                      navigate(`/admin/orders/${order._id}`);
                                      setOpenMenu(null);
                                    }}
                                    className="orders-menu-item"
                                  >
                                    <FaEye size={14} className="orders-menu-icon-blue" />
                                    <span>View Order</span>
                                  </button>

                                  {/* Open Shipment */}
                                  {hasShipment(order) && (
                                    <button
                                      onClick={() => {
                                        navigate(`/admin/shipments/${order.shipmentId || order._id}`);
                                        setOpenMenu(null);
                                      }}
                                      className="orders-menu-item"
                                    >
                                      <FaTruck size={14} className="orders-menu-icon-green" />
                                      <span>Open Shipment</span>
                                    </button>
                                  )}

                                  {/* Cancel Order */}
                                  {!hasShipment(order) && order.status !== "CANCELLED" && (
                                    <button
                                      onClick={() => {
                                        cancelOrder(order._id);
                                        setOpenMenu(null);
                                      }}
                                      className="orders-menu-item orders-menu-item-danger"
                                    >
                                      <FaTimesCircle size={14} className="orders-menu-icon-red" />
                                      <span>Cancel Order</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="10" className="orders-no-data">
                        {searchTerm ? "No orders match your search" : "No Orders Found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Orders;