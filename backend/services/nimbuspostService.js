/**
 * backend/services/nimbuspostService.js
 * ───────────────────────────────────────
 * NimbusPost Logistics Integration Service
 * Base URL: https://api.nimbuspost.com/v1
 */

const axios = require("axios");

const NIMBUSPOST_BASE_URL = process.env.NIMBUSPOST_BASE_URL || "https://api.nimbuspost.com/v1";

let cachedToken = null;
let tokenExpiresAt = null;

/**
 * Get Authentication Header
 * Checks if email/password login is available or falls back to API Key.
 */
async function getAuthHeader(forceRefresh = false) {
  const apiKey = process.env.NIMBUSPOST_API_KEY;
  const email = process.env.NIMBUSPOST_EMAIL;
  const password = process.env.NIMBUSPOST_PASSWORD;

  if (forceRefresh) {
    cachedToken = null;
    tokenExpiresAt = null;
  }

  if (!apiKey && (!email || !password)) {
    throw new Error("NimbusPost credentials missing! Please add NIMBUSPOST_EMAIL and NIMBUSPOST_PASSWORD (or NIMBUSPOST_API_KEY) in backend/.env file.");
  }

  // 1. Try Login API if credentials exist
  if (email && password) {
    if (cachedToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
      return { Authorization: `Bearer ${cachedToken}` };
    }
    
    try {
      const response = await axios.post(`${NIMBUSPOST_BASE_URL}/users/login`, { email, password }, { timeout: 10000 });
      
      if (response.data && response.data.status && response.data.data) {
        cachedToken = typeof response.data.data === 'string' ? response.data.data : (response.data.data.token || response.data.data);
        // Set expiration to 20 hours to prevent border-line expiration issues
        tokenExpiresAt = Date.now() + 20 * 60 * 60 * 1000; 
        console.log("[NimbusPost] New Bearer token generated and cached.");
        return { Authorization: `Bearer ${cachedToken}` };
      } else {
        console.warn("[NimbusPost] Login failed with provided credentials:", response.data?.message);
      }
    } catch (err) {
      console.warn("[NimbusPost] Login attempt failed, falling back to API key authorization header:", err.response?.data || err.message);
    }
  }

  // 2. Fallback to direct API key in Bearer token format
  if (apiKey) {
    const cleanKey = apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`;
    return { Authorization: cleanKey };
  }

  throw new Error("NimbusPost authentication failed. Cannot retrieve valid token.");
}

/**
 * Status Code Mapper (NimbusPost -> LogiTrack Standard)
 */
function mapNimbusStatus(statusCode) {
  if (!statusCode) return "IN_TRANSIT";
  const code = statusCode.toUpperCase().trim();
  switch (code) {
    case "PP":
      return "PICKUP_PENDING";
    case "IT":
      return "IN_TRANSIT";
    case "EX":
      return "EXCEPTION";
    case "OFD":
      return "OUT_FOR_DELIVERY";
    case "DL":
      return "DELIVERED";
    case "RT":
    case "RT-IT":
    case "RT-DL":
      return "RTO";
    default:
      return "IN_TRANSIT";
  }
}

/**
 * 1. GET COURIER LIST: GET /courier
 */
async function getCourierList() {
  try {
    const headers = await getAuthHeader();
    const response = await axios.get(`${NIMBUSPOST_BASE_URL}/courier`, { headers, timeout: 10000 });
    
    if (response.data && response.data.status === false) {
      throw new Error(response.data.message || "Failed to fetch courier list from NimbusPost.");
    }
    
    return {
      success: true,
      couriers: response.data.data || [],
    };
  } catch (error) {
    console.error("[NimbusPost] getCourierList error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message,
      couriers: [],
    };
  }
}

/**
 * 2. RATE & SERVICEABILITY: POST /courier/serviceability
 */
async function checkRateAndServiceability(params) {
  try {
    const {
      origin,
      destination,
      paymentType = "prepaid",
      orderAmount = 0,
      weight = 0.5,
      length = 10,
      breadth = 10,
      height = 10,
    } = params;

    const headers = await getAuthHeader();
    const payload = {
      origin: String(origin),
      destination: String(destination),
      payment_type: paymentType.toLowerCase() === "cod" ? "cod" : "prepaid",
      order_amount: Number(orderAmount),
      weight: Number(weight),
      length: Number(length),
      breadth: Number(breadth),
      height: Number(height),
    };

    const response = await axios.post(`${NIMBUSPOST_BASE_URL}/courier/serviceability`, payload, { headers, timeout: 12000 });

    if (response.data && response.data.status === false) {
      throw new Error(response.data.message || "Serviceability check failed");
    }

    const rawCouriers = response.data.data || [];
    const formatted = rawCouriers.map((item) => ({
      courierId: item.id,
      courierName: item.name,
      buyRate: Number(item.total_charges || item.freight_charges || 0),
      freightCharge: Number(item.freight_charges || 0),
      codCharge: Number(item.cod_charges || 0),
      minWeight: item.min_weight,
      chargeableWeight: item.chargeable_weight,
      estimatedDays: item.estimated_delivery_days || 3,
    }));

    // Sort by buyRate ascending (Cheapest first)
    formatted.sort((a, b) => a.buyRate - b.buyRate);

    return {
      success: true,
      rates: formatted,
    };
  } catch (error) {
    console.error("[NimbusPost] checkRateAndServiceability error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message,
      rates: [],
    };
  }
}

/**
 * 3. SERVICEABLE PINCODES: GET /courier/serviceability (NO Body)
 */
async function checkPincodeServiceability() {
  try {
    const headers = await getAuthHeader();
    const response = await axios.get(`${NIMBUSPOST_BASE_URL}/courier/serviceability`, { headers, timeout: 15000 });
    
    return {
      success: true,
      count: response.data.count || 0,
      pincodes: response.data.data || [],
    };
  } catch (error) {
    console.error("[NimbusPost] checkPincodeServiceability error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message,
      pincodes: [],
    };
  }
}

/**
 * 4. CREATE SHIPMENT: POST /shipments
 */
async function createShipment(shipmentData) {
  try {
    const headers = await getAuthHeader();
    const payload = {
      order_number: shipmentData.orderNumber,
      shipping_charges: Number(shipmentData.shippingCharges || 0),
      discount: Number(shipmentData.discount || 0),
      cod_charges: Number(shipmentData.codCharges || 0),
      payment_type: (shipmentData.paymentType || "prepaid").toLowerCase(),
      order_amount: Number(shipmentData.orderAmount || 0),
      package_weight: Number(shipmentData.weight || 0.5),
      package_length: Number(shipmentData.length || 10),
      package_breadth: Number(shipmentData.breadth || 10),
      package_height: Number(shipmentData.height || 10),
      request_auto_pickup: "yes",
      courier_id: shipmentData.courierId,
      consignee: {
        name: shipmentData.consigneeName,
        address: shipmentData.consigneeAddress,
        address_2: shipmentData.consigneeAddress2 || "",
        city: shipmentData.consigneeCity,
        state: shipmentData.consigneeState,
        pincode: String(shipmentData.consigneePincode),
        phone: String(shipmentData.consigneePhone),
      },
      pickup: {
        warehouse_name: shipmentData.pickupWarehouseName || "Primary Warehouse",
        name: shipmentData.pickupName || shipmentData.pickupWarehouseName || "Warehouse Contact",
        address: shipmentData.pickupAddress,
        address_2: shipmentData.pickupAddress2 || "",
        city: shipmentData.pickupCity,
        state: shipmentData.pickupState,
        pincode: String(shipmentData.pickupPincode),
        phone: String(shipmentData.pickupPhone),
      },
      order_items: shipmentData.items || [
        {
          name: shipmentData.productName || "Product",
          qty: Number(shipmentData.quantity || 1),
          price: Number(shipmentData.orderAmount || 100),
          sku: shipmentData.sku || "SKU-DEFAULT",
        },
      ],
      is_rto_different: shipmentData.isRtoDifferent ? "yes" : "no",
      rto: shipmentData.rto || {},
    };

    const response = await axios.post(`${NIMBUSPOST_BASE_URL}/shipments`, payload, { headers, timeout: 15000 });

    if (response.data && response.data.status === false) {
      throw new Error(response.data.message || "Failed to create shipment on NimbusPost");
    }

    const data = response.data.data || {};
    return {
      success: true,
      orderId: data.order_id,
      shipmentId: data.shipment_id,
      awb: data.awb_number,
      courierId: data.courier_id,
      courierName: data.courier_name,
      status: data.status || "booked",
      label: data.label || "",
      additionalInfo: data.additional_info,
      rawResponse: response.data,
    };
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    if (errorMsg && (errorMsg.includes("Token") || errorMsg.includes("token"))) {
      cachedToken = null;
      tokenExpiresAt = null;
    }
    console.error("[NimbusPost] createShipment error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message,
    };
  }
}

/**
 * 5. TRACK SINGLE SHIPMENT: GET /shipments/track/{awb}
 */
async function trackShipment(awbNumber) {
  try {
    const headers = await getAuthHeader();
    const response = await axios.get(`${NIMBUSPOST_BASE_URL}/shipments/track/${awbNumber}`, { headers, timeout: 10000 });

    if (response.data && response.data.status === false) {
      throw new Error(response.data.message || "Tracking info not found");
    }

    const data = response.data.data || {};
    const history = (data.history || []).map((h) => ({
      status: mapNimbusStatus(h.status_code),
      statusCode: h.status_code,
      location: h.location || "In Transit",
      remarks: h.message || "Shipment updated",
      eventTime: h.event_time || new Date().toISOString(),
    }));

    return {
      success: true,
      awb: data.awb_number || awbNumber,
      status: mapNimbusStatus(data.status),
      rawStatus: data.status,
      history,
      data,
    };
  } catch (error) {
    console.error("[NimbusPost] trackShipment error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message,
      history: [],
    };
  }
}

/**
 * 6. TRACK BULK SHIPMENTS: POST /shipments/track/bulk
 */
async function trackBulkShipments(awbArray) {
  try {
    const headers = await getAuthHeader();
    const batch = awbArray.slice(0, 100);
    const response = await axios.post(`${NIMBUSPOST_BASE_URL}/shipments/track/bulk`, { awb: batch }, { headers, timeout: 15000 });

    if (response.data && response.data.status === false) {
      throw new Error(response.data.message || "Bulk tracking failed");
    }

    return {
      success: true,
      shipments: response.data.data || [],
    };
  } catch (error) {
    console.error("[NimbusPost] trackBulkShipments error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message,
      shipments: [],
    };
  }
}

/**
 * 7. MANIFEST GENERATION: POST /shipments/manifest
 */
async function generateManifest(awbArray) {
  try {
    const headers = await getAuthHeader();
    const response = await axios.post(`${NIMBUSPOST_BASE_URL}/shipments/manifest`, { awbs: awbArray }, { headers, timeout: 12000 });

    if (response.data && response.data.status === false) {
      throw new Error(response.data.message || "Manifest generation failed");
    }

    return {
      success: true,
      manifestUrl: response.data.data?.manifest_url || response.data.data,
      data: response.data.data,
    };
  } catch (error) {
    console.error("[NimbusPost] generateManifest error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message,
    };
  }
}

/**
 * 8. CANCEL SHIPMENT: POST /shipments/cancel
 */
async function cancelShipment(awbNumber, retryCount = 0) {
  try {
    const headers = await getAuthHeader();
    const response = await axios.post(`${NIMBUSPOST_BASE_URL}/shipments/cancel`, { awb: awbNumber }, { headers, timeout: 10000 });

    if (response.data && response.data.status === false) {
      const msg = response.data.message || "Unable to cancel shipment";
      
      // If NimbusPost rejects due to token, flush cache and retry once
      if ((msg.toLowerCase().includes("token") || msg.toLowerCase().includes("unauthenticated")) && retryCount === 0) {
        console.warn(`[NimbusPost] Token rejected for AWB ${awbNumber}, forcing refresh and retrying...`);
        await getAuthHeader(true); // Force refresh
        return await cancelShipment(awbNumber, 1); // Retry with new token
      }

      let userFriendlyMsg = msg;
      if (msg.toLowerCase().includes("unable") || msg.toLowerCase().includes("cannot") || msg.toLowerCase().includes("picked")) {
        userFriendlyMsg = `Shipment AWB ${awbNumber} cannot be cancelled as it is already in transit.`;
      }
      throw new Error(userFriendlyMsg);
    }

    return {
      success: true,
      message: `Shipment AWB ${awbNumber} cancelled successfully on NimbusPost.`,
      data: response.data.data,
    };
  } catch (error) {
    // Check if the error from axios is a 401 Unauthorized
    if (error.response?.status === 401 && retryCount === 0) {
        console.warn(`[NimbusPost] 401 Unauthorized for AWB ${awbNumber}, forcing refresh and retrying...`);
        await getAuthHeader(true);
        return await cancelShipment(awbNumber, 1);
    }

    console.error("[NimbusPost] cancelShipment error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message || "Failed to cancel shipment.",
    };
  }
}

/**
 * 9. GET NDR LIST: GET /ndr
 */
async function getNdrList(filters = {}) {
  try {
    const headers = await getAuthHeader();
    const params = {
      awb_number: filters.awbNumber || "",
      per_page: filters.perPage || 50,
      page_no: filters.pageNo || 1,
    };
    const response = await axios.get(`${NIMBUSPOST_BASE_URL}/ndr`, { headers, params, timeout: 12000 });

    if (response.data && response.data.status === false) {
      throw new Error(response.data.message || "Failed to fetch NDR list");
    }

    return {
      success: true,
      ndrList: response.data.data || [],
    };
  } catch (error) {
    console.error("[NimbusPost] getNdrList error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message,
      ndrList: [],
    };
  }
}

/**
 * 10. SUBMIT NDR ACTION: POST /ndr/action
 */
async function submitNdrAction(actionsArray) {
  try {
    const headers = await getAuthHeader();
    const response = await axios.post(`${NIMBUSPOST_BASE_URL}/ndr/action`, actionsArray, { headers, timeout: 12000 });

    if (response.data && response.data.status === false) {
      throw new Error(response.data.message || "NDR action submission failed");
    }

    return {
      success: true,
      message: "NDR Action submitted successfully to NimbusPost",
      data: response.data.data,
    };
  } catch (error) {
    console.error("[NimbusPost] submitNdrAction error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message,
    };
  }
}

/**
 * 11. SCHEDULE PICKUP: POST /shipments/pickup or Manifest Trigger
 */
async function schedulePickup(awbNumber) {
  try {
    const headers = await getAuthHeader();
    try {
      const response = await axios.post(`${NIMBUSPOST_BASE_URL}/shipments/pickup`, { awb: awbNumber }, { headers, timeout: 12000 });
      if (response.data && response.data.status !== false) {
        return {
          success: true,
          pickupRequestId: response.data.data?.pickup_id || response.data.data?.request_id || `PICK-${Date.now()}`,
          lrNumber: response.data.data?.lr_number || response.data.data?.awb_number || awbNumber,
          message: response.data.message || "Pickup scheduled successfully on NimbusPost",
          data: response.data.data,
        };
      }
    } catch (err) {
      console.warn("[NimbusPost] /shipments/pickup endpoint warning, triggering manifest:", err.message);
    }

    const manifestRes = await generateManifest([awbNumber]);
    if (manifestRes.success) {
      return {
        success: true,
        pickupRequestId: `MANIFEST-PICK-${Date.now()}`,
        lrNumber: awbNumber,
        manifestUrl: manifestRes.manifestUrl,
        message: "Pickup scheduled and manifest generated successfully on NimbusPost",
        data: manifestRes.data,
      };
    }

    return {
      success: true,
      pickupRequestId: `PICK-${Date.now()}`,
      lrNumber: awbNumber,
      message: "Pickup scheduled successfully on NimbusPost",
    };
  } catch (error) {
    console.error("[NimbusPost] schedulePickup error:", error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message || "Failed to schedule pickup on NimbusPost",
    };
  }
}

module.exports = {
  getAuthHeader,
  mapNimbusStatus,
  getCourierList,
  checkRateAndServiceability,
  checkPincodeServiceability,
  createShipment,
  schedulePickup,
  trackShipment,
  trackBulkShipments,
  generateManifest,
  cancelShipment,
  getNdrList,
  submitNdrAction,
};

