const axios = require("axios");

// Ensure the URL does not end with a trailing slash to avoid CORS issues
const SHIPMOZO_BASE_URL =
  process.env.SHIPMOZO_BASE_URL || "https://api.shipmozo.com/v1";

function getAuthHeaders() {
  const publicKey = process.env.SHIPMOZO_PUBLIC_KEY;
  const privateKey = process.env.SHIPMOZO_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error(
      "Shipmozo API keys are missing. Please add SHIPMOZO_PUBLIC_KEY and SHIPMOZO_PRIVATE_KEY to your .env file.",
    );
  }

  return {
    "public-key": publicKey,
    "private-key": privateKey,
    "Content-Type": "application/json",
  };
}

// Example usage for fetching couriers
async function getCourierList() {
  try {
    const headers = getAuthHeaders();
    // Notice there is no trailing slash on the base URL
    const response = await axios.get(`${SHIPMOZO_BASE_URL}/courier`, {
      headers,
      timeout: 10000,
    });

    return {
      success: true,
      couriers: response.data.data || [], // Adjust based on actual Shipmozo response format
    };
  } catch (error) {
    console.error(
      "[Shipmozo] getCourierList error:",
      error.response?.data || error.message,
    );
    return { success: false, message: error.message };
  }
}

/**
 * 4. CREATE SHIPMENT: Push-Order API (Shipmozo)
 * Endpoint: /push-order
 */
async function createShipment(shipmentData) {
    try {
      const headers = getAuthHeaders();
      
      // Shipmozo requires weight in grams. If your frontend sends KG, this converts it.
      const rawWeight = Number(shipmentData.weight || 0.5);
      const weightInGrams = rawWeight < 100 ? rawWeight * 1000 : rawWeight;
  
      const payload = {
        order_id: String(shipmentData.orderNumber || shipmentData.orderId),
        order_date: new Date().toISOString().split('T')[0], // Formats to YYYY-MM-DD
        consignee_name: shipmentData.consigneeName,
        consignee_phone: Number(shipmentData.consigneePhone),
        consignee_email: shipmentData.consigneeEmail || "",
        consignee_address_line_one: shipmentData.consigneeAddress,
        consignee_address_line_two: shipmentData.consigneeAddress2 || "",
        consignee_pin_code: Number(shipmentData.consigneePincode),
        consignee_city: shipmentData.consigneeCity,
        consignee_state: shipmentData.consigneeState,
        product_detail: shipmentData.items ? shipmentData.items.map(item => ({
          name: item.productName || item.name || "Product",
          sku_number: item.sku || "SKU-DEFAULT",
          quantity: Number(item.quantity || 1),
          unit_price: Number(item.price || item.unit_price || 100),
          product_category: item.category || "Other"
        })) : [
          {
            name: shipmentData.productName || "Product",
            sku_number: shipmentData.sku || "SKU-DEFAULT",
            quantity: Number(shipmentData.quantity || 1),
            unit_price: Number(shipmentData.orderAmount || 100),
            product_category: "Other"
          }
        ],
        payment_type: (shipmentData.paymentType || "PREPAID").toUpperCase(),
        cod_amount: shipmentData.paymentType?.toLowerCase() === "cod" ? String(shipmentData.codCharges || shipmentData.orderAmount || "") : "",
        weight: weightInGrams,
        length: Number(shipmentData.length || 10),
        width: Number(shipmentData.breadth || shipmentData.width || 10),
        height: Number(shipmentData.height || 10),
        warehouse_id: String(shipmentData.pickupWarehouseId || shipmentData.warehouseId || ""),
        gst_ewaybill_number: "",
        gstin_number: ""
      };
  
      // Note: The Shipmozo docs specify a different base URL than standard
      const SHIPMOZO_API_URL = process.env.SHIPMOZO_BASE_URL || "https://shipping-api.com/app/api/v1";
  
      const response = await axios.post(`${SHIPMOZO_API_URL}/push-order`, payload, { 
        headers, 
        timeout: 15000 
      });
  
      // Shipmozo uses "result": "0" for failure instead of standard HTTP error codes
      if (response.data && response.data.result === "0") {
        throw new Error(response.data.message || "Failed to create shipment on Shipmozo");
      }
  
      const data = response.data.data || {};
      
      // Returning standard LogiTrack/MyParcelPoint format
      return {
        success: true,
        orderId: data.order_id,
        referenceId: data.reference_id,
        status: "booked",
        rawResponse: response.data,
      };
    } catch (error) {
      console.error("[Shipmozo] createShipment error:", error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }

/**
 * 12. GET WAREHOUSES: Get-Warehouses API
 * Endpoint: /get-warehouses
 */
async function getWarehouses() {
    try {
      const headers = getAuthHeaders();
      const SHIPMOZO_API_URL = process.env.SHIPMOZO_BASE_URL || "https://shipping-api.com/app/api/v1";
  
      const response = await axios.get(`${SHIPMOZO_API_URL}/get-warehouses`, { headers, timeout: 10000 });
  
      if (response.data && response.data.result === "0") {
        throw new Error(response.data.message || "Failed to fetch warehouses from Shipmozo");
      }
  
      return {
        success: true,
        warehouses: response.data.data || [],
      };
    } catch (error) {
      console.error("[Shipmozo] getWarehouses error:", error.response?.data || error.message);
      return { success: false, message: error.message, warehouses: [] };
    }
  }
  
  /**
   * 13. CREATE WAREHOUSE: Create-Warehouse API
   * Endpoint: /create-warehouse
   */
  async function createWarehouse(warehouseData) {
    try {
      const headers = getAuthHeaders();
      const SHIPMOZO_API_URL = process.env.SHIPMOZO_BASE_URL || "https://shipping-api.com/app/api/v1";
  
      const payload = {
        address_title: warehouseData.title || `WH-${Date.now()}`,
        name: warehouseData.name || "",
        phone: Number(warehouseData.phone) || "",
        alternate_phone: warehouseData.alternatePhone ? Number(warehouseData.alternatePhone) : "",
        email: warehouseData.email || "",
        address_line_one: warehouseData.addressLine1,
        address_line_two: warehouseData.addressLine2 || "",
        pin_code: Number(warehouseData.pincode)
      };
  
      const response = await axios.post(`${SHIPMOZO_API_URL}/create-warehouse`, payload, { headers, timeout: 12000 });
  
      if (response.data && response.data.result === "0") {
        throw new Error(response.data.message || "Failed to create warehouse");
      }
  
      return {
        success: true,
        warehouseId: response.data.data?.warehouse_id,
        message: response.data.message,
      };
    } catch (error) {
      console.error("[Shipmozo] createWarehouse error:", error.response?.data || error.message);
      return { success: false, message: error.message };
    }
  }
  
  /**
   * 14. RATE CALCULATOR: Rate-Calculator API
   * Endpoint: /rate-calculator
   */
  async function checkRateAndServiceability(params) {
    try {
      const headers = getAuthHeaders();
      const SHIPMOZO_API_URL = process.env.SHIPMOZO_BASE_URL || "https://shipping-api.com/app/api/v1";
  
      const {
        origin,
        destination,
        paymentType = "prepaid",
        orderAmount = 0,
        weight = 0.5,
        length = 10,
        breadth = 10,
        height = 10,
        codAmount = 0
      } = params;
  
      // Convert weight to grams
      const rawWeight = Number(weight);
      const weightInGrams = rawWeight < 100 ? rawWeight * 1000 : rawWeight;
  
      const payload = {
        order_id: "", // Left blank for pre-shipment rate calculation
        pickup_pincode: Number(origin),
        delivery_pincode: Number(destination),
        payment_type: paymentType.toUpperCase() === "COD" ? "COD" : "PREPAID",
        shipment_type: "FORWARD",
        order_amount: Number(orderAmount),
        type_of_package: "SPS",
        rov_type: "ROV_OWNER",
        cod_amount: paymentType.toUpperCase() === "COD" ? String(codAmount || orderAmount) : "",
        weight: weightInGrams,
        dimensions: [
          {
            no_of_box: "1",
            length: String(length),
            width: String(breadth), // Shipmozo uses 'width' instead of 'breadth'
            height: String(height)
          }
        ]
      };
  
      const response = await axios.post(`${SHIPMOZO_API_URL}/rate-calculator`, payload, { headers, timeout: 15000 });
  
      if (response.data && response.data.result === "0") {
        throw new Error(response.data.message || "Rate calculation failed");
      }
  
      // Adapt to LogiTrack standard array format
      const rawRates = response.data.data || [];
      const formattedRates = Array.isArray(rawRates) ? rawRates.map(rate => ({
        courierId: rate.courier_id || rate.id,
        courierName: rate.courier_name || rate.name,
        buyRate: Number(rate.total_charges || rate.rate || 0),
        freightCharge: Number(rate.freight_charges || 0),
        codCharge: Number(rate.cod_charges || 0),
        estimatedDays: rate.estimated_delivery_days || 3,
      })) : [response.data.data]; // Fallback if Shipmozo returns a single object instead of array
  
      return {
        success: true,
        rates: formattedRates.sort((a, b) => a.buyRate - b.buyRate), // Cheapest first
        rawResponse: response.data
      };
    } catch (error) {
      console.error("[Shipmozo] checkRateAndServiceability error:", error.response?.data || error.message);
      return { success: false, message: error.message, rates: [] };
    }
  }
  
  /**
   * 15. PINCODE SERVICEABILITY: Pincode-Serviceability API
   * Endpoint: /pincode-serviceability
   */
  async function checkPincodeServiceability(pickupPincode, deliveryPincode) {
    try {
      const headers = getAuthHeaders();
      const SHIPMOZO_API_URL = process.env.SHIPMOZO_BASE_URL || "https://shipping-api.com/app/api/v1";
  
      const response = await axios.post(`${SHIPMOZO_API_URL}/pincode-serviceability`, {
        pickup_pincode: Number(pickupPincode),
        delivery_pincode: Number(deliveryPincode)
      }, { headers, timeout: 10000 });
  
      if (response.data && response.data.result === "0") {
        throw new Error(response.data.message || "Pincode serviceability check failed");
      }
  
      return {
        success: true,
        serviceable: response.data.data?.serviceable || false,
      };
    } catch (error) {
      console.error("[Shipmozo] checkPincodeServiceability error:", error.response?.data || error.message);
      return { success: false, message: error.message, serviceable: false };
    }
  }
  
/**
 * Helper: Status Code Mapper (Shipmozo -> LogiTrack Standard)
 */
function mapShipmozoStatus(status) {
    if (!status) return "IN_TRANSIT";
    const code = status.toLowerCase().trim();
    if (code.includes("pending")) return "PICKUP_PENDING";
    if (code.includes("delivered")) return "DELIVERED";
    if (code.includes("rto") || code.includes("return")) return "RTO";
    if (code.includes("out for delivery")) return "OUT_FOR_DELIVERY";
    if (code.includes("exception") || code.includes("cancel")) return "EXCEPTION";
    return "IN_TRANSIT";
  }
  
  /**
   * 16. TRACK SHIPMENT: Track-Order API
   * Endpoint: /track-order
   */
  async function trackShipment(awbNumber) {
    try {
      const headers = getAuthHeaders();
      const SHIPMOZO_API_URL = process.env.SHIPMOZO_BASE_URL || "https://shipping-api.com/app/api/v1";
  
      const response = await axios.get(`${SHIPMOZO_API_URL}/track-order`, {
        headers,
        params: { awb_number: awbNumber },
        timeout: 10000
      });
  
      if (response.data && response.data.result === "0") {
        throw new Error(response.data.message || "Tracking info not found on Shipmozo");
      }
  
      const data = response.data.data || {};
      // Map scan_detail to standard history array format
      const history = (data.scan_detail || []).map((h) => ({
        status: mapShipmozoStatus(h.status || data.current_status),
        location: h.location || h.city || "In Transit",
        remarks: h.remark || h.activity || "Shipment updated",
        eventTime: h.date || h.scan_datetime || new Date().toISOString(),
      }));
  
      return {
        success: true,
        awb: data.awb_number || awbNumber,
        status: mapShipmozoStatus(data.current_status),
        rawStatus: data.current_status,
        expectedDelivery: data.expected_delivery_date,
        history,
        data,
      };
    } catch (error) {
      console.error("[Shipmozo] trackShipment error:", error.response?.data || error.message);
      return { success: false, message: error.message, history: [] };
    }
  }
  
  /**
   * 17. CANCEL SHIPMENT: Cancel-Order API
   * Endpoint: /cancel-order
   */
  async function cancelShipment(orderId, awbNumber) {
    try {
      const headers = getAuthHeaders();
      const SHIPMOZO_API_URL = process.env.SHIPMOZO_BASE_URL || "https://shipping-api.com/app/api/v1";
  
      const payload = {
        order_id: String(orderId),
        awb_number: Number(awbNumber) // Shipmozo strictly requires this as a number
      };
  
      const response = await axios.post(`${SHIPMOZO_API_URL}/cancel-order`, payload, { 
        headers, 
        timeout: 10000 
      });
  
      if (response.data && response.data.result === "0") {
        throw new Error(response.data.message || "Unable to cancel shipment on Shipmozo");
      }
  
      return {
        success: true,
        message: `Shipment AWB ${awbNumber} cancelled successfully on Shipmozo.`,
        data: response.data.data,
      };
    } catch (error) {
      console.error("[Shipmozo] cancelShipment error:", error.response?.data || error.message);
      return { success: false, message: error.message || "Failed to cancel shipment." };
    }
  }

module.exports = {
  getAuthHeaders,
  getCourierList,
  getAuthHeaders,
  createShipment,
  getWarehouses,
  createWarehouse,
  checkRateAndServiceability,
  checkPincodeServiceability,
  mapShipmozoStatus,
  trackShipment,
  cancelShipment,
};
