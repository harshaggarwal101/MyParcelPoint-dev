import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import api from "../../services/api";
import { FaBox, FaTruck, FaArrowLeft, FaCheckCircle, FaShippingFast, FaStar, FaSortAmountUp, FaChevronDown, FaSearch } from "react-icons/fa";
import "./CreateShipment.css"; 

const CreateShipment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedOrder = location.state?.order;
  
  // bulk shipment support
  const bulkOrderIds = location.state?.orderIds || [];
  const isBulk = location.state?.isBulk || false;

  const [orders, setOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]); // Added warehouses state
  const [formData, setFormData] = useState({
    orderId: selectedOrder?._id || "",
    courier: "",
    warehouseId: "", // Added warehouseId
  });

  // Custom Searchable Order Picker States
  const [orderDropdownOpen, setOrderDropdownOpen] = useState(false);
  const [orderSearchTerm, setOrderSearchTerm] = useState("");
  const orderDropdownRef = useRef(null);
  const calcTimeoutRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (orderDropdownRef.current && !orderDropdownRef.current.contains(e.target)) {
        setOrderDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter orders for searchable dropdown
  const filteredOrdersList = useMemo(() => {
    if (!orderSearchTerm.trim()) return orders;
    const term = orderSearchTerm.toLowerCase();
    return orders.filter(
      (o) =>
        (o.orderNumber || "").toLowerCase().includes(term) ||
        (o.customerName || "").toLowerCase().includes(term) ||
        (o._id || "").toLowerCase().includes(term)
    );
  }, [orders, orderSearchTerm]);

  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  
  const [pricing, setPricing] = useState({
    shippingCharge: 0,
    codCharge: 0,
    fuelCharge: 0,
    totalCharge: 0
  });

  // States for recommendations
  const [surfaceRates, setSurfaceRates] = useState([]);
  const [airRates, setAirRates] = useState([]);
  const [recommendedSurface, setRecommendedSurface] = useState(null);
  const [recommendedAir, setRecommendedAir] = useState(null);
  const [activeTab, setActiveTab] = useState("Surface"); // Surface or Air
  const [recommendationLoading, setRecommendationLoading] = useState(false);

  // Insurance toggle state
  const [insuranceEnabled, setInsuranceEnabled] = useState(false);
  const [insuranceAmount, setInsuranceAmount] = useState(0);

  // WhatsApp notification toggle state
  const [sendWhatsAppNotification, setSendWhatsAppNotification] = useState(true);

  // Active Order object memoized
  const currentOrder = useMemo(() => {
    return orders.find((o) => o._id === formData.orderId) || selectedOrder || null;
  }, [orders, formData.orderId, selectedOrder]);

  // Insurance charge calculation
  const INSURANCE_CHARGE = 12;

  // Get merchantId from user object
  const getMerchantId = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return user?.id || user?.merchantId || user?._id || "me";
    } catch {
      return "me";
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchWallet();
    fetchWarehouses();
    fetchActiveCouriers();
  }, []);

  // Bulk order auto-select effect
  useEffect(() => {
    if (isBulk && bulkOrderIds.length > 0 && orders.length > 0) {
      setFormData((prev) => ({
        ...prev,
        orderId: bulkOrderIds[0], 
      }));
    }
  }, [orders, isBulk, bulkOrderIds]);

  useEffect(() => {
    if (formData.orderId && formData.courier) {
      clearTimeout(calcTimeoutRef.current);
      calcTimeoutRef.current = setTimeout(() => {
        calculatePricing(activeTab);
      }, 150);
    }
    return () => clearTimeout(calcTimeoutRef.current);
  }, [formData.orderId, formData.courier, activeTab]);

  // Fetch recommendations when order or warehouse is selected/loaded
  useEffect(() => {
    if (formData.orderId && currentOrder) {
      fetchRecommendations();
    } else if (!formData.orderId) {
      fetchActiveCouriers();
    }
  }, [formData.orderId, formData.warehouseId, currentOrder, warehouses]);

  // Auto-sync warehouse, insurance, and notification options when order changes
  useEffect(() => {
    if (currentOrder) {
      if (currentOrder.warehouseId) {
        const wId = typeof currentOrder.warehouseId === 'object' ? currentOrder.warehouseId._id : currentOrder.warehouseId;
        if (wId) {
          setFormData((prev) => ({ ...prev, warehouseId: wId }));
        }
      }
      if (currentOrder.insuranceEnabled !== undefined) {
        setInsuranceEnabled(!!currentOrder.insuranceEnabled);
      }
      if (currentOrder.sendWhatsAppNotification !== undefined) {
        setSendWhatsAppNotification(!!currentOrder.sendWhatsAppNotification);
      }
      setInsuranceAmount(currentOrder.insuranceAmount || 0);
    }
  }, [currentOrder]);

  const fetchActiveCouriers = async () => {
    try {
      const res = await api.get("/couriers/active/list");
      if (res.data.success && res.data.couriers && res.data.couriers.length > 0) {
        // Do not seed total: 0 placeholders if order is selected
      }
    } catch {
      // Fallback silent handle
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get("/orders");
      setOrders(res.data.orders || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await api.get("/warehouses");
      const activeW = (res.data.warehouses || []).filter((w) => w.isActive);
      setWarehouses(activeW);
      if (activeW.length > 0) {
        setFormData((prev) => (prev.warehouseId ? prev : { ...prev, warehouseId: activeW[0]._id }));
      }
    } catch {
      setWarehouses([]);
    }
  };

  const fetchWallet = async () => {
    try {
      const res = await api.get("/wallet");
      setWalletBalance(res.data.wallet?.balance || 0);
    } catch {
      setWalletBalance(0);
    }
  };

  const calculatePricing = async (serviceTypeOverride) => {
    const resolvedServiceType = serviceTypeOverride ?? activeTab;
    try {
      const res = await api.post("/ratecards/calculate", {
        orderId: formData.orderId,
        courierId: formData.courier,
        serviceType: resolvedServiceType,
      });
      
      if (res.data.success) {
        setPricing({
          shippingCharge: res.data.shippingCharge || 0,
          codCharge: res.data.codCharge || 0,
          fuelCharge: res.data.fuelCharge || 0,
          totalCharge: res.data.totalCharge || 0
        });
      } else {
        applyStaticPricing();
      }
    } catch {
      applyStaticPricing();
    }
  };

  const applyStaticPricing = () => {
    const baseCharge = 45;
    const codCharge = currentOrder?.paymentMode === "COD" ? 30 : 0;
    const fuelCharge = 5;
    
    setPricing({
      shippingCharge: baseCharge,
      codCharge: codCharge,
      fuelCharge: fuelCharge,
      totalCharge: baseCharge + codCharge + fuelCharge
    });
  };

  // Fetch Recommendations for both Surface and Air concurrently
  const fetchRecommendations = async () => {
    try {
      setRecommendationLoading(true);

      if (!currentOrder) {
        setRecommendationLoading(false);
        return;
      }

      const merchantId = getMerchantId() || "me";

      const weight = currentOrder.weight || currentOrder.packageWeight || 0.5;
      const selectedWarehouse = warehouses.find(w => w._id === formData.warehouseId) || (warehouses.length > 0 ? warehouses[0] : null);
      const pickup = selectedWarehouse ? selectedWarehouse.pincode : "";
      const destination = currentOrder.customerPincode || currentOrder.pincode || currentOrder.deliveryPincode || currentOrder.shippingAddress?.pincode || "";
      const amount = currentOrder.amount || currentOrder.totalAmount || 0;
      const paymentMode = currentOrder.paymentMode || currentOrder.paymentMethod || "PREPAID";

      let surfaceUrl = `/ratecards/recommendation?merchantId=${merchantId}&weight=${weight}&serviceType=Surface&amount=${amount}&paymentMode=${paymentMode}`;
      if (pickup) surfaceUrl += `&pickup=${pickup}`;
      if (destination) surfaceUrl += `&destination=${destination}`;

      let airUrl = `/ratecards/recommendation?merchantId=${merchantId}&weight=${weight}&serviceType=Air&amount=${amount}&paymentMode=${paymentMode}`;
      if (pickup) airUrl += `&pickup=${pickup}`;
      if (destination) airUrl += `&destination=${destination}`;

      const [surfaceRes, airRes] = await Promise.allSettled([
        api.get(surfaceUrl),
        api.get(airUrl)
      ]);

      let surfaceRatesList = [];
      let airRatesList = [];
      let recSurface = null;
      let recAir = null;

      if (surfaceRes.status === "fulfilled" && surfaceRes.value.data.success) {
        surfaceRatesList = surfaceRes.value.data.couriers || [];
        recSurface = surfaceRes.value.data.recommended || null;
      }

      if (airRes.status === "fulfilled" && airRes.value.data.success) {
        airRatesList = airRes.value.data.couriers || [];
        recAir = airRes.value.data.recommended || null;
      }

      if (surfaceRes.status === "fulfilled") {
        setSurfaceRates(surfaceRatesList);
      }
      if (airRes.status === "fulfilled") {
        setAirRates(airRatesList);
      }
      setRecommendedSurface(recSurface);
      setRecommendedAir(recAir);

      // Auto-select preferred service type or fallback to available
      const preferredServiceType = currentOrder.serviceType || "Surface";
      const targetRatesList = preferredServiceType === "Air" ? airRatesList : surfaceRatesList;
      const targetRecommended = preferredServiceType === "Air" ? recAir : recSurface;

      if (targetRatesList.length > 0) {
        setActiveTab(preferredServiceType);
        if (targetRecommended?.courierId) {
          setFormData((prev) => ({ ...prev, courier: targetRecommended.courierId }));
        } else {
          setFormData((prev) => ({ ...prev, courier: targetRatesList[0].courierId }));
        }
      } else {
        const otherRatesList = preferredServiceType === "Air" ? surfaceRatesList : airRatesList;
        const otherRecommended = preferredServiceType === "Air" ? recSurface : recAir;
        const otherType = preferredServiceType === "Air" ? "Surface" : "Air";

        if (otherRatesList.length > 0) {
          setActiveTab(otherType);
          if (otherRecommended?.courierId) {
            setFormData((prev) => ({ ...prev, courier: otherRecommended.courierId }));
          } else {
            setFormData((prev) => ({ ...prev, courier: otherRatesList[0].courierId }));
          }
        } else {
          setActiveTab(preferredServiceType);
          setFormData((prev) => ({ ...prev, courier: "" }));
        }
      }

    } catch (error) {
      console.error("Recommendation failed:", error);
      setSurfaceRates([]);
      setAirRates([]);
      setRecommendedSurface(null);
      setRecommendedAir(null);
    } finally {
      setRecommendationLoading(false);
    }
  };

  // Calculate total with insurance
  const baseTotalCharge = pricing.totalCharge || 0;
  const insuranceCost = insuranceEnabled ? INSURANCE_CHARGE : 0;
  const totalCharge = baseTotalCharge + insuranceCost;
  
  // Balance calculations
  const shortfall = Math.max(0, totalCharge - walletBalance);
  const balanceAfterShipment = Math.max(0, walletBalance - totalCharge);
  const isInsufficientBalance = walletBalance < totalCharge;

  const effectiveWarehouseId = formData.warehouseId || (typeof currentOrder?.warehouseId === 'object' ? currentOrder?.warehouseId?._id : currentOrder?.warehouseId) || (warehouses.length > 0 ? warehouses[0]._id : "");

  // Updated form validation
  const isFormValid = 
    (formData.orderId || isBulk) && 
    effectiveWarehouseId &&
    formData.courier && 
    !isInsufficientBalance &&
    !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isFormValid) return;

    setLoading(true);
    try {
      if (isBulk && bulkOrderIds.length > 0) {
        const bulkPayload = {
          orderIds: bulkOrderIds,
          courierId: formData.courier,
          warehouseId: effectiveWarehouseId,
          serviceType: activeTab,
          isInsured: insuranceEnabled,
          sendNotification: sendWhatsAppNotification,
        };
        const res = await api.post("/shipments/bulk-create", bulkPayload);
        if (res.data.success) {
          alert(`Successfully created ${bulkOrderIds.length} shipments!`);
          navigate("/merchant/shipments");
        } else {
          alert(res.data.message || "Failed to create bulk shipments");
        }
      } else {
        const payload = {
          orderId: formData.orderId,
          courierId: formData.courier,
          warehouseId: effectiveWarehouseId,
          serviceType: activeTab,
          isInsured: insuranceEnabled,
          sendNotification: sendWhatsAppNotification,
          insuranceAmount: insuranceEnabled ? insuranceAmount : 0,
          sendWhatsAppNotification: sendWhatsAppNotification
        };
        
        await api.post("/shipments", payload);
        alert("Shipment Created Successfully");
        navigate("/merchant/shipments");
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to create shipment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="create-shipment-container">
        <div className="sidebar-wrapper">
          <Sidebar />
        </div>

        <main className="create-shipment-main">
          <div className="shipment-form-container">
            {/* Header with Gradient */}
            <div className="shipment-form-header">
              <div className="header-icon">
                <FaShippingFast />
              </div>
              <h2 className="header-title">
                {isBulk ? `Bulk Shipment (${bulkOrderIds.length} Orders)` : "Create Shipment"}
              </h2>
              <p className="header-subtitle">
                {isBulk 
                  ? `Creating shipments for ${bulkOrderIds.length} selected orders` 
                  : "Generate new shipment for order"}
              </p>
            </div>

            {/* Form Body */}
            <div className="shipment-form-body">
              <button 
                onClick={() => navigate(-1)} 
                className="back-button"
              >
                <FaArrowLeft size={12} /> Back
              </button>

              <form onSubmit={handleSubmit}>
                {/* Bulk Order Count Display */}
                {isBulk && bulkOrderIds.length > 0 && (
                  <div className="selected-order-card bulk-card">
                    <div className="selected-order-header">
                      <div className="selected-order-icon bulk-icon">
                        <FaBox />
                      </div>
                      <div className="selected-order-content">
                        <div className="selected-order-label bulk-label">
                          Bulk Shipment
                        </div>
                        <div className="selected-order-value bulk-value">
                          {bulkOrderIds.length} orders selected for bulk shipment
                        </div>
                      </div>
                      <FaCheckCircle className="check-icon" />
                    </div>
                  </div>
                )}

                {/* Selected Order Display for Single */}
                {!isBulk && currentOrder && (
                  <div className="selected-order-card">
                    <div className="selected-order-header">
                      <div className="selected-order-icon">
                        <FaBox />
                      </div>
                      <div className="selected-order-content">
                        <div className="selected-order-label">Selected Order</div>
                        <div className="selected-order-value">
                          {currentOrder.orderNumber || currentOrder._id?.slice(-6) || "N/A"} - {currentOrder.customerName || "N/A"}
                        </div>
                      </div>
                      <FaCheckCircle className="check-icon" />
                    </div>

                    {/* Order Details Card */}
                    <div className="order-details-card">
                      <div className="order-detail-row">
                        <span className="order-detail-label">Product</span>
                        <span className="order-detail-value">{currentOrder?.productName || "N/A"}</span>
                      </div>
                      <div className="order-detail-row">
                        <span className="order-detail-label">Weight</span>
                        <span className="order-detail-value">{currentOrder?.weight || 0} KG</span>
                      </div>
                      <div className="order-detail-row">
                        <span className="order-detail-label">Payment</span>
                        <span className="order-detail-value">{currentOrder?.paymentMode || "N/A"}</span>
                      </div>
                      <div className="order-detail-row">
                        <span className="order-detail-label">Amount</span>
                        <span className="order-detail-value">₹{currentOrder?.amount || 0}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Selection - Custom Searchable Dropdown */}
                {!isBulk && (
                  <div className="form-group custom-order-select-container" ref={orderDropdownRef}>
                    <div className="form-label">
                      <FaBox className="label-icon" />
                      <span>Select Order <span className="required-star">*</span></span>
                    </div>
                    
                    <div 
                      className={`custom-order-trigger ${orderDropdownOpen ? 'open' : ''}`}
                      onClick={() => setOrderDropdownOpen((prev) => !prev)}
                    >
                      <span className={formData.orderId ? "selected-text" : "placeholder-text"}>
                        {formData.orderId ? (
                          (() => {
                            const found = orders.find((o) => o._id === formData.orderId);
                            return found ? `${found.orderNumber || found._id.slice(-6)} - ${found.customerName}` : "Choose an order";
                          })()
                        ) : (
                          "Choose an order"
                        )}
                      </span>
                      <FaChevronDown className={`chevron-icon ${orderDropdownOpen ? 'rotate' : ''}`} />
                    </div>

                    {orderDropdownOpen && (
                      <div className="custom-order-menu">
                        <div className="custom-order-search-box">
                          <FaSearch className="search-icon" />
                          <input
                            type="text"
                            placeholder="Search by Order # or Customer..."
                            value={orderSearchTerm}
                            onChange={(e) => setOrderSearchTerm(e.target.value)}
                            className="custom-order-search-input"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        <div className="custom-order-options-list">
                          <div 
                            className={`custom-order-option ${!formData.orderId ? 'selected' : ''}`}
                            onClick={() => {
                              setFormData({ ...formData, orderId: "" });
                              setOrderDropdownOpen(false);
                            }}
                          >
                            Choose an order
                          </div>

                          {filteredOrdersList.length === 0 ? (
                            <div className="custom-order-no-results">No orders matching "{orderSearchTerm}"</div>
                          ) : (
                            filteredOrdersList.map((o) => (
                              <div
                                key={o._id}
                                className={`custom-order-option ${formData.orderId === o._id ? 'selected' : ''}`}
                                onClick={() => {
                                  setFormData({ ...formData, orderId: o._id });
                                  setOrderDropdownOpen(false);
                                }}
                              >
                                <div className="option-main-info">
                                  <span className="option-order-num">{o.orderNumber || o._id.slice(-6)}</span>
                                  <span className="option-cust-name">- {o.customerName}</span>
                                </div>
                                {o.amount ? <span className="option-amount">₹{o.amount}</span> : null}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}


                {/* For bulk: Show selected orders count and first order for recommendations */}
                {isBulk && (
                  <div className="form-group">
                    <div className="form-label">
                      <FaBox className="label-icon" />
                      <span>Bulk Orders <span className="required-star">*</span></span>
                    </div>
                    <div className="bulk-orders-display">
                      {bulkOrderIds.length} orders selected
                      <span className="bulk-subtext">
                        Using first order for rate calculation
                      </span>
                    </div>
                  </div>
                )}

                {/* Pickup Warehouse Info Badge (Configured during Create Order) */}
                {formData.warehouseId && (
                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <div style={{
                      padding: "10px 14px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      fontSize: "13px",
                      color: "#334155",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <span style={{ fontSize: "16px" }}>🏭</span>
                      <div>
                        <strong style={{ color: "#0f172a" }}>Pickup Warehouse: </strong>
                        {warehouses.find(w => w._id === formData.warehouseId)?.name || 'Default Warehouse'}
                        {warehouses.find(w => w._id === formData.warehouseId)?.city && ` (${warehouses.find(w => w._id === formData.warehouseId)?.city})`}
                      </div>
                    </div>
                  </div>
                )}

                {/* Surface / Air Tab Switcher */}
                {!recommendationLoading && (surfaceRates.length > 0 || airRates.length > 0) && (
                  <div style={{ display: "flex", gap: "6px", marginBottom: "20px", background: "#f1f5f9", borderRadius: "10px", padding: "4px" }}>
                    {["Surface", "Air"].map((tab) => {
                      const isActive = activeTab === tab;
                      const count = tab === "Surface" ? surfaceRates.length : airRates.length;
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => {
                            setActiveTab(tab);
                            const rec = tab === "Air" ? recommendedAir : recommendedSurface;
                            if (rec?.courierId) {
                              setFormData(prev => ({ ...prev, courier: rec.courierId }));
                            } else {
                              const list = tab === "Air" ? airRates : surfaceRates;
                              if (list.length > 0) {
                                setFormData(prev => ({ ...prev, courier: list[0].courierId }));
                              } else {
                                setFormData(prev => ({ ...prev, courier: "" }));
                              }
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: "8px 16px",
                            borderRadius: "8px",
                            border: "none",
                            cursor: "pointer",
                            background: isActive ? "#fff" : "transparent",
                            color: isActive ? "#0f172a" : "#64748b",
                            fontWeight: isActive ? "700" : "500",
                            fontSize: "13px",
                            boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                            transition: "all 0.2s",
                          }}
                        >
                          {tab === "Surface" ? "🚛 Surface" : "✈️ Air"} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Top 3 Recommended Couriers Card */}
                {recommendationLoading ? (
                  <div className="loading-text">⏳ Finding best couriers...</div>
                ) : (activeTab === "Air" ? airRates : surfaceRates).length > 0 ? (
                  <>
                    <div className="recommended-card">
                      <div className="recommended-badge">🏆 Top 3</div>
                      <div className="recommended-title">
                        <FaStar className="star-icon" />
                        Recommended Couriers (Cheapest) - {activeTab}
                      </div>
                      
                      {(activeTab === "Air" ? airRates : surfaceRates).slice(0, 3).map((c, index) => {
                        const total = Number(c.total || 0);
                        const isCheapest = index === 0;
                        
                        return (
                          <div
                            key={c.courierId}
                            className={`recommended-item ${isCheapest ? 'cheapest' : ''}`}
                          >
                            <span className="recommended-left">
                              <span className={`rank-number ${isCheapest ? 'rank-cheapest' : ''}`}>
                                #{index + 1}
                              </span>
                              <span className="courier-name">{c.courierName}</span>
                              {isCheapest && (
                                <span className="cheapest-badge">Cheapest</span>
                              )}
                            </span>
                            <span className={`rate-amount ${isCheapest ? 'rate-cheapest' : ''}`}>
                              ₹{total}
                            </span>
                          </div>
                        );
                      })}
                      
                      {(activeTab === "Air" ? airRates : surfaceRates).length > 3 && (
                        <div className="more-couriers-text">
                          +{(activeTab === "Air" ? airRates : surfaceRates).length - 3} more couriers available
                        </div>
                      )}
                    </div>

                    {/* Courier Comparison Table */}
                    {(activeTab === "Air" ? airRates : surfaceRates).length > 0 && (
                      <div className="comparison-card">
                        <div className="comparison-title">
                          <FaSortAmountUp className="comparison-icon" />
                          All Courier Comparison ({activeTab})
                        </div>

                        <table className="comparison-table">
                          <thead>
                            <tr>
                              <th className="comparison-th">Courier</th>
                              <th className="comparison-th-center">Forward</th>
                              <th className="comparison-th-center">COD</th>
                              <th className="comparison-th-center">ETA</th>
                              <th className="comparison-th-right">Total</th>
                            </tr>
                          </thead>

                          <tbody>
                            {(activeTab === "Air" ? airRates : surfaceRates).slice(0, 5).map((c, index) => {
                              const total = Number(c.total || 0);
                              const isCheapest = index === 0;
                              const eta = c.estimatedDays ? `${c.estimatedDays} Days` : "N/A";

                              return (
                                <tr
                                  key={c.courierId}
                                  className={`comparison-row ${isCheapest ? 'cheapest-row' : ''}`}
                                >
                                  <td className="comparison-td">
                                    {c.courierName}
                                    {isCheapest && (
                                      <span className="cheapest-tag">⭐ Cheapest</span>
                                    )}
                                  </td>

                                  <td className="comparison-td-center">
                                    ₹{c.forwardRate || 0}
                                  </td>

                                  <td className="comparison-td-center">
                                    ₹{c.codCharge || 0}
                                  </td>

                                  <td className="comparison-td-center eta-text">
                                    {eta}
                                  </td>

                                  <td className={`comparison-td-right ${isCheapest ? 'total-cheapest' : 'total-normal'}`}>
                                    ₹{total}
                                  </td>
                                </tr>
                              );
                            })}
                            
                            {(activeTab === "Air" ? airRates : surfaceRates).length > 5 && (
                              <tr>
                                <td colSpan="5" className="more-couriers-row">
                                  +{(activeTab === "Air" ? airRates : surfaceRates).length - 5} more couriers
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : formData.orderId || isBulk ? (
                  <div className="no-rates-text">
                    No rate cards found for {activeTab}. Please contact admin.
                  </div>
                ) : null}

                {/* Dynamic Courier Dropdown */}
                <div className="form-group">
                  <div className="form-label">
                    <FaTruck className="label-icon" />
                    <span>Select Courier <span className="required-star">*</span></span>
                    {(activeTab === "Air" ? recommendedAir : recommendedSurface) && (
                      <span className="recommended-tag">
                        ⭐ Best: {(activeTab === "Air" ? recommendedAir : recommendedSurface).courierName || (activeTab === "Air" ? recommendedAir : recommendedSurface).courierId}
                      </span>
                    )}
                  </div>
                  <select
                    name="courier"
                    value={formData.courier}
                    onChange={(e) => setFormData({ ...formData, courier: e.target.value })}
                    className={`form-select courier-select ${(activeTab === "Air" ? recommendedAir : recommendedSurface) && formData.courier === (activeTab === "Air" ? recommendedAir : recommendedSurface).courierId ? 'recommended-select' : ''}`}
                    required
                  >
                    <option value="">Choose a courier partner</option>
                    {(activeTab === "Air" ? airRates : surfaceRates).map((c) => (
                      <option
                        key={c.courierId}
                        value={c.courierId}
                      >
                        {c.courierName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cost Preview */}
                <div className="cost-preview-card">
                  <h4 className="cost-preview-title">
                    {isBulk ? `💰 Bulk Cost Preview (per order)` : `💰 Shipment Cost Preview`}
                  </h4>
                  <div className="cost-row">
                    <span>Shipping Charge</span>
                    <span>₹{pricing.shippingCharge}</span>
                  </div>
                  <div className="cost-row">
                    <span>COD Charge</span>
                    <span>₹{pricing.codCharge}</span>
                  </div>
                  <div className="cost-row">
                    <span>Fuel Charge</span>
                    <span>₹{pricing.fuelCharge}</span>
                  </div>
                  
                  {insuranceEnabled && (
                    <div className="cost-row">
                      <span>🛡️ Insurance Charge</span>
                      <span>₹{INSURANCE_CHARGE}</span>
                    </div>
                  )}
                  
                  <hr className="cost-divider" />
                  <div className="cost-total">
                    <span>Total per Order</span>
                    <span className="total-amount">₹{totalCharge}</span>
                  </div>
                  
                  {isBulk && bulkOrderIds.length > 0 && (
                    <div className="cost-grand-total">
                      <span>Total for {bulkOrderIds.length} Orders</span>
                      <span className="grand-total-amount">
                        ₹{totalCharge * bulkOrderIds.length}
                      </span>
                    </div>
                  )}
                </div>

                {/* Wallet Preview */}
                <div className="wallet-card">
                  <div className="wallet-row">
                    <span>💰 Wallet Balance</span>
                    <span className="wallet-balance">₹{walletBalance}</span>
                  </div>
                  <div className="wallet-row">
                    <span>Required Amount</span>
                    <span className="wallet-required">
                      {isBulk ? `₹${totalCharge * bulkOrderIds.length}` : `₹${totalCharge}`}
                    </span>
                  </div>
                  
                  {isInsufficientBalance ? (
                    <>
                      <div className="wallet-row">
                        <span>Shortfall</span>
                        <span className="shortfall-text">
                          ₹{isBulk ? shortfall * bulkOrderIds.length : shortfall}
                        </span>
                      </div>
                      <div className="insufficient-text">
                        ⚠️ Please recharge ₹{isBulk ? shortfall * bulkOrderIds.length : shortfall} to proceed
                      </div>
                    </>
                  ) : (
                    <div className="wallet-row">
                      <span>Balance After Shipment</span>
                      <span className={`wallet-after ${isInsufficientBalance ? 'wallet-insufficient' : 'wallet-sufficient'}`}>
                        ₹{isBulk ? Math.max(0, walletBalance - (totalCharge * bulkOrderIds.length)) : balanceAfterShipment}
                      </span>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="button-wrapper">
                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className={`submit-btn ${!isFormValid ? 'submit-disabled' : ''}`}
                  >
                    {loading ? (
                      <>⏳ Creating Shipment{isBulk ? 's' : ''}...</>
                    ) : !formData.orderId && !isBulk ? (
                      <>📋 Select an Order</>
                    ) : !formData.warehouseId ? ( // Added warehouse check
                      <>🏭 Select a Warehouse</>
                    ) : !formData.courier ? (
                      <>🚚 Select a Courier</>
                    ) : isInsufficientBalance ? (
                      <>💳 Recharge Wallet First</>
                    ) : isBulk ? (
                      <>🚀 Create {bulkOrderIds.length} Shipments</>
                    ) : (
                      <>🚀 Create Shipment</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};
    
export default CreateShipment;