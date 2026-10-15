const Shipment = require("../models/Shipment");
const Order = require("../models/Order");
const Invoice = require("../models/Invoice");
const Wallet = require("../models/Wallet");
const RateCard = require("../models/RateCard");
const { ORDER_STATUS_MAP, SHIPMENT_STATUSES } = require("../constants/statusConstants");
const Courier = require("../models/Courier");
const QRCode = require("qrcode");
const PDFDocument = require("pdfkit");
const bwipjs = require("bwip-js");
const NDR = require("../models/NDR");
const RTO = require("../models/RTO");
const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Warehouse = require("../models/Warehouse"); 
const { determineZone, calculateShippingRates } = require("./rateCardController");
const whatsappService = require("../services/whatsappService");
const { triggerChannelSync } = require("../services/channelSyncService");
const nimbuspostService = require("../services/nimbuspostService");

// Helper to check replica set for Mongoose transactions
const checkReplicaSet = async () => {
  try {
    if (!mongoose.connection || !mongoose.connection.db) return false;
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    return !!hello.setName;
  } catch (err) {
    return false;
  }
};

// ===============================
// LOGGER (Simple Structured Logger)
// ===============================
const logger = {
  info: (message, meta = {}) => {
    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      message,
      ...meta
    }));
  },
  error: (message, meta = {}) => {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      ...meta
    }));
  },
  warn: (message, meta = {}) => {
    console.warn(JSON.stringify({
      level: 'warn',
      timestamp: new Date().toISOString(),
      message,
      ...meta
    }));
  },
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify({
        level: 'debug',
        timestamp: new Date().toISOString(),
        message,
        ...meta
      }));
    }
  }
};

// ===============================
// HELPER: Build Shipment Payload (DRY)
// ===============================
function buildShipmentPayload(order) {
  return {
    order_id: order._id.toString(),
    order_number: order.orderNumber || `ORD${Date.now()}`,
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    customer_address: order.customerAddress,
    customer_city: order.customerCity,
    customer_state: order.customerState,
    customer_pincode: order.customerPincode,
    weight: order.weight || 0.5,
    length: order.dimensions?.length || 0,
    breadth: order.dimensions?.breadth || 0,
    height: order.dimensions?.height || 0,
    amount: order.amount || 0,
    payment_mode: order.paymentMode || "PREPAID",
    cod_amount: order.paymentMode === "COD" ? order.amount : 0,
    items: order.items || [],
    created_at: new Date().toISOString()
  };
}

// ===============================
// GENERIC FAKE PROVIDER FACTORY (DRY)
// ===============================
function createFakeProvider(providerName, prefix, deliveryDays) {
  return async function(order) {
    const payload = buildShipmentPayload(order);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);

    return {
      success: true,
      statusCode: 200,
      provider: providerName.toUpperCase(),
      request: payload,
      response: {
        shipment_id: `${prefix}${timestamp}${random}`,
        awb: `AWB${timestamp}${random}`,
        awb_number: `AWB${timestamp}${random}`,
        lr_number: `LR${timestamp}${random}`,
        pickups_automatically_scheduled: "NO",
        pickup_request_id: `PICK${timestamp}${random}`,
        tracking_id: `TRK${timestamp}${random}`,
        label_url: "",
        manifest_url: "",
        tracking_url: "",
        status: "PICKUP_PENDING",
        estimated_delivery: new Date(Date.now() + deliveryDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    };
  };
}

// ===============================
// FAKE PROVIDER IMPLEMENTATIONS (Using Factory)
// ===============================
const FakeDelhivery = createFakeProvider("Delhivery", "DLV", 5);
const FakeBlueDart = createFakeProvider("BlueDart", "BD", 3);
const FakeDTDC = createFakeProvider("DTDC", "DT", 4);
const FakeXpressbees = createFakeProvider("Xpressbees", "XB", 4);
const FakeShadowfax = createFakeProvider("Shadowfax", "SF", 2);
const FakeEcomExpress = createFakeProvider("EcomExpress", "EC", 4);

// ===============================
// PROVIDER REGISTRY (Production Ready - FIX for XPB)
// ===============================
const PROVIDER_REGISTRY = {
  // Standard codes (as per Courier model)
  DELHIVERY: FakeDelhivery,
  BLUEDART: FakeBlueDart,
  DTDC: FakeDTDC,
  XPRESSBEES: FakeXpressbees,
  SHADOWFAX: FakeShadowfax,
  ECOMEXPRESS: FakeEcomExpress,
  
  // Aliases (for backward compatibility / different codes)
  XPB: FakeXpressbees,
  XB: FakeXpressbees,
  // NimbusPost Integration (Production Ready)
  NIMBUSPOST: async function(order, warehouse, courier) {
    const payload = buildNimbusShipmentPayload(order, warehouse, courier);
    const res = await nimbuspostService.createShipment(payload);
    if (!res.success) {
      const fallbackCode = (courier?.code || "").toUpperCase();
      const fallbackProvider = PROVIDER_REGISTRY[fallbackCode];
      if (process.env.NODE_ENV !== "production" && fallbackProvider && fallbackProvider !== PROVIDER_REGISTRY.NIMBUSPOST) {
        logger.warn(`[NimbusPost] Live creation failed (${res.message}). Falling back to simulated provider for ${fallbackCode}`);
        return await fallbackProvider(order, warehouse, courier);
      }
      throw new Error(res.message || "NimbusPost Shipment Creation Failed");
    }
    return {
      success: true,
      provider: "NIMBUSPOST",
      response: {
        shipment_id: res.shipmentId || res.orderId,
        tracking_id: res.awb,
        awb: res.awb,
        status: res.status || "MANIFESTED",
        label_url: res.label,
        manifest_url: "",
        tracking_url: `https://nimbuspost.com/tracking?awb=${res.awb}`,
        estimated_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        rawResponse: res.rawResponse
      }
    };
  },
  NIMBUS: async function(order, warehouse, courier) {
    return await PROVIDER_REGISTRY.NIMBUSPOST(order, warehouse, courier);
  },
  NIMBUS_POST: async function(order, warehouse, courier) {
    return await PROVIDER_REGISTRY.NIMBUSPOST(order, warehouse, courier);
  },
};

/**
 * Helper to build live NimbusPost shipment payload from LogiTrack Order & Warehouse
 */
function buildNimbusShipmentPayload(order, warehouse, courier) {
  return {
    orderNumber: order.orderId || order.orderNumber || String(order._id),
    shippingCharges: Number(order.shippingCharge || 0),
    discount: Number(order.discount || 0),
    codCharges: Number(order.codCharge || 0),
    paymentType: order.paymentMode === "COD" ? "cod" : "prepaid",
    orderAmount: Number(order.amount || 0),
    weight: Number(order.weight || 0.5),
    length: Number(order.dimensions?.length || order.length || 10),
    breadth: Number(order.dimensions?.breadth || order.breadth || 10),
    height: Number(order.dimensions?.height || order.height || 10),
    request_auto_pickup: "yes",
    courierId: courier?.nimbusCourierId || courier?.courierId || undefined,
    consigneeName: order.customerName,
    consigneeAddress: order.customerAddress || order.address,
    consigneeAddress2: order.customerAddress2 || "",
    consigneeCity: order.customerCity || order.city,
    consigneeState: order.customerState || order.state,
    consigneePincode: String(order.customerPincode || order.pincode),
    consigneePhone: String(order.customerPhone || order.phone),
    pickupWarehouseName: warehouse?.warehouseName || "Primary Warehouse",
    pickupName: warehouse?.contactPerson || warehouse?.warehouseName || "Warehouse Contact",
    pickupAddress: warehouse?.addressLine1 || "",
    pickupAddress2: warehouse?.addressLine2 || "",
    pickupCity: warehouse?.city || "",
    pickupState: warehouse?.state || "",
    pickupPincode: String(warehouse?.pincode || ""),
    pickupPhone: String(warehouse?.phone || ""),
    productName: order.productName || order.items?.[0]?.name || "Package",
    quantity: Number(order.quantity || order.items?.[0]?.quantity || 1),
    sku: order.sku || order.items?.[0]?.sku || "SKU-DEFAULT",
    items: (order.items && order.items.length > 0)
      ? order.items.map(item => ({
          name: item.name || "Product",
          qty: Number(item.quantity || 1),
          price: Number(item.price || order.amount || 100),
          sku: item.sku || "SKU-DEFAULT"
        }))
      : undefined
  };
}


// ===============================
// GENERIC TRACKING RESPONSE FACTORY
// ===============================
function createTrackingResponse(providerName, awb, deliveryDays) {
  const timeline = [
    {
      status: "PICKUP_PENDING",
      location: "Origin",
      remarks: "Shipment created",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      status: "PICKUP_SCHEDULED",
      location: "Origin",
      remarks: "Pickup scheduled",
      timestamp: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      status: "PICKED_UP",
      location: "Origin Hub",
      remarks: "Shipment picked up",
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      status: "IN_TRANSIT",
      location: "Sorting Hub",
      remarks: "Shipment in transit",
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    }
  ];

  return {
    success: true,
    statusCode: 200,
    provider: providerName.toUpperCase(),
    response: {
      awb: awb,
      status: "IN_TRANSIT",
      timeline: timeline,
      estimated_delivery: new Date(Date.now() + deliveryDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      last_updated: new Date().toISOString()
    }
  };
}

// ===============================
// GENERIC SERVICEABILITY RESPONSE FACTORY
// ===============================
function createServiceabilityResponse(providerName, pincode, isServiceable = true) {
  const daysMap = {
    "DELHIVERY": 4,
    "BLUEDART": 2,
    "DTDC": 4,
    "XPRESSBEES": 4,
    "SHADOWFAX": 1,
    "ECOMEXPRESS": 4
  };

  return {
    success: isServiceable,
    statusCode: isServiceable ? 200 : 404,
    provider: providerName.toUpperCase(),
    response: {
      serviceable: isServiceable,
      pickupAvailable: isServiceable,
      codAvailable: isServiceable,
      prepaidAvailable: isServiceable,
      estimatedDays: daysMap[providerName.toUpperCase()] || 4,
      pincode: pincode || "110001",
      message: isServiceable ? "Service available for this pincode" : "Service not available for this pincode"
    }
  };
}

// ===============================
// GENERIC RATES RESPONSE FACTORY
// ===============================
function createRatesResponse(providerName, order) {
  const rateMap = {
    "DELHIVERY": { forward: 68, cod: 40, fuel: 12, insurance: 10 },
    "BLUEDART": { forward: 85, cod: 50, fuel: 15, insurance: 12 },
    "DTDC": { forward: 72, cod: 42, fuel: 13, insurance: 10 },
    "XPRESSBEES": { forward: 65, cod: 38, fuel: 11, insurance: 9 },
    "SHADOWFAX": { forward: 55, cod: 35, fuel: 10, insurance: 8 },
    "ECOMEXPRESS": { forward: 70, cod: 40, fuel: 12, insurance: 10 }
  };

  const rates = rateMap[providerName.toUpperCase()] || rateMap["DELHIVERY"];
  const weight = order.weight || 0.5;
  let weightCharge = rates.forward;
  
  if (weight > 0.5) {
    weightCharge = rates.forward + Math.ceil((weight - 0.5) * 0.5) * 15;
  }

  const isCOD = order.paymentMode === "COD";
  const orderAmt = Number(order.amount) || 0;
  const calculatedInsurance = order.insuranceEnabled && orderAmt > 0 ? Number((orderAmt / 30).toFixed(2)) : 0;
  const total = weightCharge + (isCOD ? rates.cod : 0) + rates.fuel + calculatedInsurance;

  return {
    success: true,
    statusCode: 200,
    provider: providerName.toUpperCase(),
    response: {
      rates: {
        forward: Math.round(weightCharge),
        cod: isCOD ? rates.cod : 0,
        fuel: rates.fuel,
        insurance: calculatedInsurance,
        total: Math.round(total)
      },
      weight: weight,
      payment_mode: order.paymentMode || "PREPAID",
      currency: "INR",
      message: "Rates calculated successfully"
    }
  };
}

// ===============================
// GENERIC PICKUP RESPONSE FACTORY
// ===============================
function createPickupResponse(providerName, shipmentId) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return {
    success: true,
    statusCode: 200,
    provider: providerName.toUpperCase(),
    response: {
      pickup_request_id: `PICK${timestamp}`,
      shipment_id: shipmentId,
      awb_number: `AWB${timestamp}`,
      lr_number: `LR${timestamp}${random}`,
      status: "SCHEDULED",
      scheduled_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      message: "Pickup scheduled successfully"
    }
  };
}

// ===============================
// GENERIC CANCEL RESPONSE FACTORY
// ===============================
function createCancelResponse(providerName, shipmentId) {
  return {
    success: true,
    statusCode: 200,
    provider: providerName.toUpperCase(),
    response: {
      shipment_id: shipmentId,
      status: "CANCELLED",
      message: `${providerName} shipment cancelled successfully`,
      cancelled_at: new Date().toISOString()
    }
  };
}

/**
 * Helper to determine if a courier partner should route via NimbusPost API
 */
function isNimbusCourier(courier) {
  if (!courier) return false;
  const code = (courier.code || "").toUpperCase();
  const name = (courier.name || "").toUpperCase();
  const apiProvider = (courier.apiProvider || "").toUpperCase();

  if (code.includes("NIMBUS") || apiProvider.includes("NIMBUS") || name.includes("NIMBUS")) {
    return true;
  }

  const hasNimbusCreds = !!(process.env.NIMBUSPOST_API_KEY || (process.env.NIMBUSPOST_EMAIL && process.env.NIMBUSPOST_PASSWORD));
  if (hasNimbusCreds && (apiProvider === "NIMBUSPOST" || apiProvider === "NIMBUS" || apiProvider === "" || courier.apiIntegrated === true)) {
    return true;
  }

  return false;
}

// ===============================
// COURIER SERVICE (PROVIDER SWITCH - FIXED)
// ===============================
const CourierService = {
  async createShipment(courier, order, warehouse) {
    logger.info(`Creating shipment for courier: ${courier.code}`, { 
      orderId: order._id,
      courierCode: courier.code 
    });

    const providerKey = courier.code?.toUpperCase();
    let provider = PROVIDER_REGISTRY[providerKey];
    
    if (isNimbusCourier(courier)) {
      provider = PROVIDER_REGISTRY.NIMBUSPOST;
    }

    if (!provider) {
      logger.error(`Unsupported courier: ${courier.code}`, { 
        courierCode: courier.code,
        availableCodes: Object.keys(PROVIDER_REGISTRY) 
      });
      throw new Error(`Courier ${courier.code} is not supported`);
    }

    const result = await provider(order, warehouse, courier);

    logger.info(`Shipment created successfully`, { 
      awb: result.response.awb,
      provider: result.provider 
    });

    return {
      success: result.success,
      provider: result.provider,
      providerShipmentId: result.response.shipment_id,
      providerTrackingId: result.response.tracking_id,
      awb: result.response.awb || result.response.awb_number,
      pickupsAutomaticallyScheduled: result.response.pickups_automatically_scheduled || result.response.pickupsAutomaticallyScheduled || "NO",
      lrNumber: result.response.lr_number || result.response.lrNumber || "",
      pickupRequestId: result.response.pickup_request_id || "",
      labelUrl: result.response.label_url,
      manifestUrl: result.response.manifest_url,
      trackingUrl: result.response.tracking_url,
      status: result.response.status,
      estimatedDeliveryDate: new Date(result.response.estimated_delivery),
      rawResponse: result
    };
  },

  async cancelShipment(courier, shipmentId, awb) {
    logger.info(`Cancelling shipment for courier: ${courier.code}`, { shipmentId, awb });

    if (isNimbusCourier(courier)) {
      const targetAwb = awb || shipmentId;
      const res = await nimbuspostService.cancelShipment(targetAwb);
      if (!res.success) {
        throw new Error(res.message || "NimbusPost Cancellation failed");
      }
      return {
        success: true,
        provider: "NIMBUSPOST",
        response: {
          shipment_id: shipmentId,
          awb: targetAwb,
          status: "CANCELLED",
          message: res.message,
          cancelled_at: new Date().toISOString()
        }
      };
    }

    await new Promise(resolve => setTimeout(resolve, 100));
    const providerKey = courier.code?.toUpperCase() || "";
    const providerName = Object.keys(PROVIDER_REGISTRY).find(key => key === providerKey) || courier.code;
    
    if (!PROVIDER_REGISTRY[providerKey]) {
      logger.error(`Unsupported courier for cancellation: ${courier.code}`);
      throw new Error(`Courier ${courier.code} is not supported`);
    }

    const result = createCancelResponse(providerName, shipmentId);
    logger.info(`Shipment cancelled successfully`, { shipmentId });
    return result;
  },

  async trackShipment(courier, awb) {
    logger.info(`Tracking shipment for courier: ${courier.code}`, { awb });

    if (isNimbusCourier(courier)) {
      const res = await nimbuspostService.trackShipment(awb);
      if (res.success) {
        return {
          success: true,
          provider: "NIMBUSPOST",
          response: {
            awb: res.awb,
            status: res.status,
            rawStatus: res.rawStatus,
            history: res.history,
            rawResponse: res.data
          }
        };
      }
    }

    await new Promise(resolve => setTimeout(resolve, 100));
    const providerKey = courier.code?.toUpperCase() || "";
    if (!PROVIDER_REGISTRY[providerKey]) {
      logger.error(`Unsupported courier for tracking: ${courier.code}`);
      throw new Error(`Courier ${courier.code} is not supported`);
    }

    const deliveryDaysMap = {
      "DELHIVERY": 3,
      "BLUEDART": 2,
      "DTDC": 3,
      "XPRESSBEES": 3,
      "XPB": 3,
      "SHADOWFAX": 1,
      "ECOMEXPRESS": 3
    };

    const deliveryDays = deliveryDaysMap[providerKey] || 3;
    const providerName = Object.keys(PROVIDER_REGISTRY).find(key => key === providerKey) || courier.code;
    
    const result = createTrackingResponse(providerName, awb, deliveryDays);
    logger.info(`Tracking retrieved successfully`, { awb, status: result.response.status });
    return result;
  },

  async serviceability(courier, pincode) {
    logger.info(`Checking serviceability for courier: ${courier.code}`, { pincode });

    await new Promise(resolve => setTimeout(resolve, 100));

    const providerKey = courier.code?.toUpperCase();
    const isSupported = !!PROVIDER_REGISTRY[providerKey];
    
    const result = createServiceabilityResponse(
      isSupported ? providerKey : courier.code, 
      pincode, 
      isSupported
    );

    logger.info(`Serviceability check completed`, { 
      courier: courier.code, 
      serviceable: result.response.serviceable 
    });
    return result;
  },

  async getRates(courier, order) {
    logger.info(`Getting rates for courier: ${courier.code}`, { 
      orderId: order._id,
      weight: order.weight 
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    const providerKey = courier.code?.toUpperCase();
    
    if (!PROVIDER_REGISTRY[providerKey]) {
      logger.error(`Unsupported courier for rates: ${courier.code}`);
      throw new Error(`Courier ${courier.code} is not supported`);
    }

    const result = createRatesResponse(providerKey, order);
    
    logger.info(`Rates calculated successfully`, { 
      courier: courier.code,
      total: result.response.rates.total 
    });
    return result;
  },

  async schedulePickup(courier, shipmentId, shipmentObj) {
    logger.info(`Scheduling pickup for courier: ${courier.code}`, { shipmentId });

    if (isNimbusCourier(courier)) {
      const awb = shipmentObj?.awb || shipmentId;
      const liveRes = await nimbuspostService.schedulePickup(awb);
      if (!liveRes.success) {
        throw new Error(liveRes.message || "NimbusPost schedule pickup failed");
      }
      return {
        success: true,
        provider: "NIMBUSPOST",
        response: {
          pickup_request_id: liveRes.pickupRequestId || `PICK-${Date.now()}`,
          shipment_id: shipmentId,
          awb_number: awb,
          lr_number: liveRes.lrNumber || awb,
          manifest_url: liveRes.manifestUrl || "",
          status: "SCHEDULED",
          scheduled_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          message: liveRes.message || "Pickup scheduled successfully on NimbusPost"
        }
      };
    }

    await new Promise(resolve => setTimeout(resolve, 100));
    const providerKey = courier.code?.toUpperCase() || "";
    if (!PROVIDER_REGISTRY[providerKey]) {
      logger.error(`Unsupported courier for pickup: ${courier.code}`);
      throw new Error(`Courier ${courier.code} is not supported`);
    }

    const providerName = Object.keys(PROVIDER_REGISTRY).find(key => key === providerKey) || courier.code;
    const result = createPickupResponse(providerName, shipmentId);

    logger.info(`Pickup scheduled successfully`, { shipmentId });
    return result;
  }
};

// ===============================
// GENERATE UNIQUE INVOICE NUMBER
// ===============================
const generateInvoiceNumber = () => {
  return "INV" + Date.now() + Math.floor(Math.random() * 1000);
};

// ===============================
// HELPER: Get Logo Image
// ===============================
const getLogoBuffer = (logoPath) => {
  if (!logoPath) return null;
  
  try {
    if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
      return logoPath;
    }
    
    if (logoPath.startsWith('data:image')) {
      return logoPath;
    }
    
    const fullPath = path.join(__dirname, '..', logoPath);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
    
    return null;
  } catch (error) {
    logger.error("Logo loading error", { error: error.message, logoPath });
    return null;
  }
};

// ===============================
// HELPER: Render Label V2 (Professional - Premium)
// ===============================
async function renderLabelV2(
  doc,
  shipment,
  settings = {},
  labelWidth = null,
  labelHeight = null,
  x = 0,
  y = 0,
) {
  const {
    logo = true,
    customerPhone = true,
    weight = true,
    paymentType = true,
    useMerchantLogo = true,
    uploadedLogo = null,
    qrCode = true,
  } = settings;

  const hasPosition = x !== 0 || y !== 0;
  if (hasPosition) {
    doc.save();
    doc.translate(x, y);
  }

  const maxWidth =
    labelWidth || doc.page.width - (doc.page.margins?.left || 40) * 2;
  const contentX = hasPosition ? 0 : doc.page.margins?.left || 40;
  const contentY = hasPosition ? 0 : doc.page.margins?.top || 40;

  let currentY = contentY;
  const padding = 10;
  const fontSize = 7.5;
  const headerFontSize = 8.5;
  const boldFont = "Helvetica-Bold";
  const regularFont = "Helvetica";

  const totalHeight = labelHeight || 420;

  const section1Y = currentY;

  // Draw the outer bounding box for the entire label
  doc
    .strokeColor("#000000")
    .lineWidth(0.3)
    .rect(contentX, section1Y, maxWidth, totalHeight)
    .stroke();

  const rightWidth = 85;
  const rightX = contentX + maxWidth - rightWidth - 10;
  const leftWidth = maxWidth - rightWidth - padding - 15;
  const leftX = contentX + padding;

  // ==========================================
  // PRE-CALCULATE TEXT POSITIONS TO DETERMINE SECTION 1 HEIGHT
  // ==========================================
  const nameY = section1Y + padding + 16;
  const phoneY = nameY + 15;
  const addressY =
    customerPhone && shipment.orderId?.customerPhone ? phoneY + 13 : nameY + 13;

  let addressText = shipment.orderId?.customerAddress || "N/A";
  if (shipment.orderId?.customerCity && shipment.orderId?.customerState) {
    addressText = `${shipment.orderId?.customerAddress || ""}, ${shipment.orderId?.customerCity || ""}, ${shipment.orderId?.customerState || ""}`;
  }

  // Set the font before measuring
  doc.font(regularFont).fontSize(7).fillColor("#333333");

  const addressHeight = doc.heightOfString(addressText, {
    width: leftWidth - padding,
  });

  const pincodeY = addressY + addressHeight + 2;

  let locationText = "";
  if (shipment.orderId?.customerCity)
    locationText += shipment.orderId.customerCity;
  if (shipment.orderId?.customerState)
    locationText += ` • ${shipment.orderId.customerState}`;
  if (shipment.orderId?.customerPincode)
    locationText += ` • ${shipment.orderId.customerPincode}`;

  const locationHeight = locationText
    ? doc.heightOfString(locationText, { width: leftWidth - padding })
    : 0;

  // Calculate dynamic section height based on the text
  const minSection1Height = pincodeY + locationHeight - section1Y + padding;
  const section1Height = Math.max(totalHeight * 0.18, minSection1Height);

  // ==========================================
  // DRAW SECTION 1 CONTENT
  // ==========================================
  doc
    .font(boldFont)
    .fontSize(headerFontSize)
    .fillColor("#000000")
    .text("SHIP TO", leftX, section1Y + padding, {
      width: leftWidth - padding,
      align: "left",
    });

  doc
    .font(boldFont)
    .fontSize(9)
    .fillColor("#000000")
    .text(shipment.orderId?.customerName || "N/A", leftX, nameY, {
      width: leftWidth - padding,
      align: "left",
    });

  if (customerPhone && shipment.orderId?.customerPhone) {
    doc
      .font(regularFont)
      .fontSize(fontSize)
      .fillColor("#000000")
      .text(`Phone: ${shipment.orderId.customerPhone}`, leftX, phoneY, {
        width: leftWidth - padding,
        align: "left",
      });
  }

  doc
    .font(regularFont)
    .fontSize(7)
    .fillColor("#333333")
    .text(addressText, leftX, addressY, {
      width: leftWidth - padding,
      align: "left",
    });

  if (locationText) {
    doc.text(locationText, leftX, pincodeY, {
      width: leftWidth - padding,
      align: "left",
    });
  }

  if (logo) {
    let logoImage = null;
    if (useMerchantLogo && shipment.merchantId?.logo) {
      logoImage = getLogoBuffer(shipment.merchantId.logo);
    } else if (uploadedLogo) {
      logoImage = uploadedLogo;
    }

    if (logoImage) {
      try {
        const logoX = rightX + 10;
        const logoY = section1Y + (section1Height - 40) / 2;
        doc.image(logoImage, logoX, logoY, {
          fit: [65, 40],
          align: "center",
          valign: "center",
        });
      } catch (err) {
        logger.error("Logo rendering error", { error: err.message });
        doc
          .strokeColor("#E0E0E0")
          .lineWidth(0.5)
          .rect(
            rightX + 10,
            section1Y + section1Height / 2 - 15,
            rightWidth - 20,
            30,
          )
          .stroke();
      }
    }
  }

  currentY = section1Y + section1Height;
  doc
    .moveTo(contentX, currentY)
    .lineTo(contentX + maxWidth, currentY)
    .stroke();

  // ==========================================
  // SECTION 2: SHIPMENT INFO (LEFT) + BARCODE (RIGHT)
  // ==========================================
  const section2Height = totalHeight * 0.25;
  const section2Y = currentY;

  // FIX: Force to exactly 50% width to match Section 3
  const dividerX = contentX + maxWidth * 0.5;

  doc
    .moveTo(dividerX, section2Y)
    .lineTo(dividerX, section2Y + section2Height)
    .stroke();

  // SHIPMENT INFO LEFT
  const infoX = contentX + padding;
  const infoWidth = maxWidth * 0.5 - padding * 2; // Aligned to 50%
  const infoStartY = section2Y + padding + 5;
  const infoLineHeight = 16;
  const labelWidth_ = 50;
  const valueWidth = infoWidth - labelWidth_ - 5;

  doc
    .font(regularFont)
    .fontSize(6.5)
    .fillColor("#666666")
    .text("Courier", infoX, infoStartY, { width: labelWidth_, align: "left" });

  let courierName = shipment.courier || "N/A";
  const courierAbbreviations = {
    Xpressbees: "XBEE",
    "Xpressbees Surface": "XBEE",
    Delhivery: "DLVRY",
    "Blue Dart": "BLDART",
    DTDC: "DTDC",
    "Amazon Shipping": "AMZN",
    Flipkart: "FLPK",
    "Ecom Express": "ECOM",
    Shadowfax: "SHDW",
    Porter: "PRTR",
  };

  for (const [key, short] of Object.entries(courierAbbreviations)) {
    if (courierName.includes(key)) {
      courierName = short;
      break;
    }
  }

  if (courierName.length > 10) {
    courierName = courierName.substring(0, 10) + "...";
  }

  doc
    .font(boldFont)
    .fontSize(7)
    .fillColor("#000000")
    .text(courierName, infoX + labelWidth_, infoStartY, {
      width: valueWidth,
      align: "left",
      ellipsis: true,
    });

  const awbY = infoStartY + infoLineHeight;
  doc
    .font(regularFont)
    .fontSize(6.5)
    .fillColor("#666666")
    .text("AWB", infoX, awbY, { width: labelWidth_, align: "left" });

  let shortAwb = shipment.awb || "N/A";
  if (shortAwb.length > 14) {
    shortAwb = "..." + shortAwb.slice(-10);
  }

  doc
    .font(boldFont)
    .fontSize(7)
    .fillColor("#000000")
    .text(shortAwb, infoX + labelWidth_, awbY, {
      width: valueWidth,
      align: "left",
      lineBreak: false,
    });

  if (weight) {
    const weightY = awbY + infoLineHeight;
    doc
      .font(regularFont)
      .fontSize(6.5)
      .fillColor("#666666")
      .text("Weight", infoX, weightY, { width: labelWidth_, align: "left" });
    doc
      .font(boldFont)
      .fontSize(7)
      .fillColor("#000000")
      .text(
        `${shipment.orderId?.weight || 0} Kg`,
        infoX + labelWidth_,
        weightY,
        {
          width: valueWidth,
          align: "left",
        },
      );
  }

  const paymentY = awbY + infoLineHeight * 2;
  const paymentMode = shipment.orderId?.paymentMode || "N/A";
  const isCOD = paymentMode.toUpperCase() === "COD";

  doc
    .font(regularFont)
    .fontSize(6.5)
    .fillColor("#666666")
    .text("Payment", infoX, paymentY, { width: labelWidth_, align: "left" });

  doc
    .font(boldFont)
    .fontSize(7)
    .fillColor("#000000")
    .text(
      `${isCOD ? "COD" : "PREPAID"}${isCOD ? ` ₹${shipment.orderId?.amount || 0}` : ""}`,
      infoX + labelWidth_,
      paymentY,
      {
        width: valueWidth,
        align: "left",
      },
    );

  // BARCODE RIGHT
  const rightBarcodeWidth = maxWidth * 0.5 - padding * 2; // Aligned to 50%
  const barcodeCenterX = dividerX + (maxWidth * 0.5) / 2; // Aligned to 50%

  const barcodeWidth = Math.min(rightBarcodeWidth - 20, 128);
  const barcodeHeight = section2Height - 35;

  let barcodeValue = shipment.awb || "N/A";

  try {
    const barcodeBuffer = await bwipjs.toBuffer({
      bcid: "code128",
      text: barcodeValue,
      scale: 3,
      height: 9,
      includetext: false,
    });

    const renderedBarcodeHeight = Math.max(30, barcodeHeight - 30);
    const barcodeX = barcodeCenterX - barcodeWidth / 2;
    const barcodeY = section2Y + 8;

    doc.image(barcodeBuffer, barcodeX, barcodeY, {
      width: barcodeWidth,
      height: renderedBarcodeHeight,
    });

    const awbTextY = section2Y + section2Height - 16;
    const awbTextWidth = maxWidth * 0.48 - padding * 2;
    const isThermal = maxWidth < 300;
    const awbFontSize = isThermal ? 6.5 : 8;

    doc
      .font(boldFont)
      .fontSize(awbFontSize)
      .fillColor("#000000")
      .text(barcodeValue, dividerX + padding, awbTextY, {
        width: awbTextWidth,
        align: "center",
        lineBreak: false,
      });
  } catch (err) {
    logger.error("Barcode generation error", { error: err.message });
    doc
      .font(boldFont)
      .fontSize(10)
      .fillColor("#000000")
      .text(
        barcodeValue,
        dividerX + padding,
        section2Y + section2Height / 2 - 6,
        {
          width: rightBarcodeWidth,
          align: "center",
        },
      );
  }

  currentY = section2Y + section2Height;
  doc
    .moveTo(contentX, currentY)
    .lineTo(contentX + maxWidth, currentY)
    .stroke();

  // ==========================================
  // SECTION 3: SHIP FROM + ORDER DETAILS
  // ==========================================
  const section3Y = currentY;
  const leftFromX = contentX + padding;
  const leftFromWidth = maxWidth * 0.5 - padding * 2;

  doc
    .font(boldFont)
    .fontSize(headerFontSize)
    .fillColor("#000000")
    .text("SHIP FROM", leftFromX, section3Y + padding, {
      width: leftFromWidth,
      align: "left",
    });

  const companyY = section3Y + padding + 14;
  doc
    .font(boldFont)
    .fontSize(7.5)
    .fillColor("#000000")
    .text(
      shipment.merchantId?.companyName || "MyParcelPoint",
      leftFromX,
      companyY,
      {
        width: leftFromWidth,
        align: "left",
      },
    );

  const pickup = shipment.pickupAddress || {};
  let currentFromY = companyY + 11;

  doc.font(regularFont).fontSize(6.5).fillColor("#333333");

  if (pickup.warehouseName) {
    doc.text(pickup.warehouseName, leftFromX, currentFromY, {
      width: leftFromWidth,
      height: 10,
      lineBreak: false,
    });
    currentFromY += 9.5;
  }

  const addrStr =
    `${pickup.addressLine1 || ""} ${pickup.addressLine2 || ""}`.trim();
  if (addrStr) {
    doc.text(addrStr, leftFromX, currentFromY, {
      width: leftFromWidth,
      height: 10,
      lineBreak: false,
    });
    currentFromY += 9.5;
  }

  const cityStr =
    `${pickup.city || ""}, ${pickup.state || ""} - ${pickup.pincode || ""}`.trim();
  if (cityStr && cityStr !== "-") {
    doc.text(cityStr, leftFromX, currentFromY, {
      width: leftFromWidth,
      height: 10,
      lineBreak: false,
    });
    currentFromY += 9.5;
  }

  const contactList = [];
  if (pickup.contactPerson)
    contactList.push(`Contact: ${pickup.contactPerson}`);
  if (pickup.phone) contactList.push(`Phone: ${pickup.phone}`);

  if (contactList.length > 0) {
    doc.text(contactList.join(" | "), leftFromX, currentFromY, {
      width: leftFromWidth,
      height: 10,
      lineBreak: false,
    });
    currentFromY += 9.5;
  }

  if (shipment.merchantId?.gst) {
    doc.text(`GST: ${shipment.merchantId.gst}`, leftFromX, currentFromY, {
      width: leftFromWidth,
      height: 10,
      lineBreak: false,
    });
    currentFromY += 9.5;
  }

  const rightOrderX = contentX + maxWidth * 0.5 + padding;
  const rightOrderWidth = maxWidth * 0.5 - padding * 2;

  doc
    .font(boldFont)
    .fontSize(headerFontSize)
    .fillColor("#000000")
    .text("ORDER DETAILS", rightOrderX, section3Y + padding, {
      width: rightOrderWidth,
      align: "left",
    });

  const orderNumY = section3Y + padding + 14;
  let orderNumber =
    shipment.orderId?.orderNumber ||
    shipment.orderId?._id?.toString()?.slice(-6) ||
    "N/A";

  if (orderNumber.length > 14) {
    orderNumber = "..." + orderNumber.slice(-12);
  }

  doc
    .font(regularFont)
    .fontSize(6.5)
    .fillColor("#666666")
    .text("Order No", rightOrderX, orderNumY, { width: 55, align: "left" });

  const isThermalOrder = maxWidth < 300;
  const orderFontSize = isThermalOrder ? 6.5 : 8;

  doc
    .font(boldFont)
    .fontSize(orderFontSize)
    .fillColor("#000000")
    .text(orderNumber, rightOrderX + 55, orderNumY, {
      width: rightOrderWidth - 55,
      align: "left",
      lineBreak: false,
    });

  const barcodeOrderY = orderNumY + 16;
  if (orderNumber) {
    try {
      const smallBarcode = await bwipjs.toBuffer({
        bcid: "code128",
        text: orderNumber.replace("...", ""),
        scale: 2.5,
        height: 8,
        includetext: false,
      });

      const barcodeX = rightOrderX + 10;
      const barcodeWidthSmall = Math.min(rightOrderWidth - 40, 130);
      doc.image(smallBarcode, barcodeX, barcodeOrderY, {
        width: barcodeWidthSmall,
        height: 20,
      });
    } catch (err) {
      logger.error("Order barcode error", { error: err.message });
    }
  }

  const paymentStatusY = barcodeOrderY + 23;
  doc
    .font(boldFont)
    .fontSize(9)
    .fillColor("#000000")
    .text(isCOD ? "COD" : "PREPAID", rightOrderX, paymentStatusY, {
      width: rightOrderWidth,
      align: "left",
    });

  const section3Height = Math.max(
    totalHeight * 0.2,
    currentFromY - section3Y + padding,
  );
  const dividerX3 = contentX + maxWidth * 0.5;
  doc
    .moveTo(dividerX3, section3Y)
    .lineTo(dividerX3, section3Y + section3Height)
    .stroke();

  currentY = section3Y + section3Height;
  doc
    .moveTo(contentX, currentY)
    .lineTo(contentX + maxWidth, currentY)
    .stroke();

  // ==========================================
  // SECTION 4: ITEM DETAILS
  // ==========================================
  const section4Height = totalHeight * 0.12;
  const section4Y = currentY;

  doc
    .font(boldFont)
    .fontSize(headerFontSize)
    .fillColor("#000000")
    .text("ITEM DETAILS", contentX + padding, section4Y + padding, {
      width: maxWidth - padding * 2,
      align: "left",
    });

  const tableY = section4Y + padding + 16;

  const startX = contentX + padding;
  const totalWidth = maxWidth - padding * 2;
  const descCol = totalWidth * 0.58;
  const qtyCol = totalWidth * 0.12;
  const amountCol = totalWidth * 0.3;

  doc
    .font(boldFont)
    .fontSize(7)
    .fillColor("#000000")
    .text("Description", startX, tableY, { width: descCol - 5, align: "left" })
    .text("Qty", startX + descCol, tableY, { width: qtyCol, align: "center" })
    .text("Amount", startX + descCol + qtyCol, tableY, {
      width: amountCol - 5,
      align: "right",
    });

  doc
    .strokeColor("#CCCCCC")
    .lineWidth(0.3)
    .moveTo(startX, tableY + 12)
    .lineTo(startX + descCol + qtyCol + amountCol, tableY + 12)
    .stroke();

  const items = shipment.orderId?.items || [];
  const itemY = tableY + 16;

  if (items.length > 0) {
    const item = items[0];
    const desc = item.name || item.productName || item.sku || "Product";
    const descDisplay = desc.length > 28 ? desc.substring(0, 28) + "..." : desc;
    const totalAmount = (item.price || item.amount || 0) * (item.quantity || 1);

    doc
      .font(regularFont)
      .fontSize(7.5)
      .fillColor("#000000")
      .text(descDisplay, startX + 4, itemY, {
        width: descCol - 10,
        align: "left",
      })
      .text((item.quantity || 1).toString(), startX + descCol, itemY, {
        width: qtyCol,
        align: "center",
      })
      .text(`₹${totalAmount}`, startX + descCol + qtyCol, itemY, {
        width: amountCol - 6,
        align: "right",
      });

    if (items.length > 1) {
      doc
        .font(regularFont)
        .fontSize(6)
        .fillColor("#999999")
        .text(`+ ${items.length - 1} more`, startX + descCol + 10, itemY + 14, {
          width: descCol - 20,
          align: "left",
        });
    }
  } else {
    const totalAmount = shipment.orderId?.amount || 0;
    doc
      .font(regularFont)
      .fontSize(7.5)
      .fillColor("#000000")
      .text("Product", startX + 4, itemY, {
        width: descCol - 10,
        align: "left",
      })
      .text("1", startX + descCol, itemY, {
        width: qtyCol,
        align: "center",
      })
      .text(`₹${totalAmount}`, startX + descCol + qtyCol, itemY, {
        width: amountCol - 6,
        align: "right",
      });
  }

  currentY = section4Y + section4Height;
  doc
    .moveTo(contentX, currentY)
    .lineTo(contentX + maxWidth, currentY)
    .stroke();

  // ==========================================
  // SECTION 5: QR CODE + TERMS (10%)
  // ==========================================
  const section5Height = totalHeight * 0.1;
  const section5Y = currentY;

  const dividerX5 = contentX + maxWidth * 0.25;
  doc
    .moveTo(dividerX5, section5Y)
    .lineTo(dividerX5, section5Y + section5Height)
    .stroke();

  const qrLeftX = contentX + padding;
  const qrWidth = maxWidth * 0.25 - padding * 2;

  if (qrCode) {
    try {
      const qrSize = Math.min(38, section5Height - 16);
      const qrX = qrLeftX + (qrWidth - qrSize) / 2;
      const qrY = section5Y + (section5Height - qrSize) / 2;

      const qrBuffer = await QRCode.toBuffer(shipment.awb, {
        errorCorrectionLevel: "H",
        margin: 1,
        scale: 5,
      });

      doc.image(qrBuffer, qrX, qrY, {
        width: qrSize,
        height: qrSize,
      });
    } catch (err) {
      logger.error("QR generation error", { error: err.message });
    }
  }

  const termsX = dividerX5 + 18;
  const termsWidth = maxWidth * 0.75 - padding * 2 - 8;

  doc.font(regularFont).fontSize(7).fillColor("#555555");

  const termsStartY = section5Y + padding + 8;
  const termsLineHeight = 16;

  const terms = ["Handle With Care", "Track using QR"];

  terms.forEach((term, index) => {
    doc.text(term, termsX, termsStartY + index * termsLineHeight, {
      width: termsWidth,
      align: "left",
    });
  });

  if (hasPosition) {
    doc.restore();
  }
}

// ===============================
// HELPER: Render Complete Label
// ===============================
async function renderLabel(doc, shipment, settings = {}, labelWidth = null, labelHeight = null, x = 0, y = 0) {
  return renderLabelV2(doc, shipment, settings, labelWidth, labelHeight, x, y);
}

// ===============================
// CREATE SHIPMENT WITH TRANSACTION
// ===============================
const createShipment = async (req, res) => {
  let session = null;
  try {
    const isReplSet = await checkReplicaSet();
    if (isReplSet) {
      session = await mongoose.startSession();
      session.startTransaction();
    }
    logger.info("Create shipment request received", { 
      userId: req.user?.id,
      body: req.body 
    });

    const {
      orderId,
      courierId,
      warehouseId, // Added warehouseId
      insuranceEnabled = false,
    } = req.body;

    if (!orderId || !courierId || !warehouseId) { // Updated validation
      if (session) await session.abortTransaction();
      logger.warn("Missing required fields", { orderId, courierId, warehouseId });
      return res.status(400).json({
        success: false,
        message: "Order, Courier and Warehouse are required",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      merchantId: req.user.id,
    }).session(session);

    if (!order) {
      if (session) await session.abortTransaction();
      logger.warn("Order not found", { orderId, userId: req.user.id });
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const existingShipment = await Shipment.findOne({
      orderId,
      merchantId: req.user.id,
    }).session(session);

    if (existingShipment) {
      if (session) await session.abortTransaction();
      logger.warn("Shipment already exists", { orderId });
      return res.status(400).json({
        success: false,
        message: "Shipment already exists for this order",
      });
    }

    const warehouse = await Warehouse.findOne({ // Added warehouse fetch
      _id: warehouseId,
      merchantId: req.user.id,
      isActive: true,
    }).session(session);

    if (!warehouse) {
      if (session) await session.abortTransaction();
      logger.warn("Warehouse not found", { warehouseId, userId: req.user.id });
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    const courier = await Courier.findById(courierId).session(session);

    if (!courier) {
      if (session) await session.abortTransaction();
      logger.warn("Courier not found", { courierId });
      return res.status(404).json({
        success: false,
        message: "Courier not found",
      });
    }

    const selectedServiceType = req.body.serviceType || order.serviceType || "Surface";

    let rateCard = await RateCard.findOne({
      merchantId: req.user.id,
      courierId,
      serviceType: selectedServiceType,
      isActive: true,
    }).session(session);

    if (!rateCard) {
      rateCard = await RateCard.findOne({
        merchantId: null,
        courierId,
        serviceType: selectedServiceType,
        isActive: true,
      }).session(session);
    }

    if (!rateCard || rateCard.isActive === false) {
      if (session) await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `No active rate card configured for courier '${courier.name}' with ${selectedServiceType} service mode. Please contact administrator to configure ${selectedServiceType} rates.`,
      });
    }

    const weight = Number(order.weight || 0);
    const pickup = warehouse.pincode;
    const destination = order.customerPincode;
    const zone = determineZone(pickup, destination);

    const calculated = calculateShippingRates(rateCard, {
      weight,
      length: Number(order.dimensions?.length || order.length || 0),
      breadth: Number(order.dimensions?.breadth || order.breadth || 0),
      height: Number(order.dimensions?.height || order.height || 0),
      zone,
      paymentMode: order.paymentMode,
      insuranceEnabled,
      amount: order.amount,
    });

    const sellRate = calculated.sellRate || calculated.finalCharge; // Inclusive of GST
    const buyRate = calculated.buyRate || Math.round(sellRate * ((rateCard.internalCostPercent || 70) / 100));
    const marginEarned = calculated.marginEarned !== undefined ? calculated.marginEarned : Math.round((sellRate - buyRate) * 100) / 100;
    const SHIPPING_CHARGE = sellRate;
    const subtotal = calculated.subtotal;
    const taxAmount = calculated.gstAmount;
    const insurancePremium = calculated.insuranceCharge;
    const estimatedCourierCost = buyRate;

    order.shippingCharge = SHIPPING_CHARGE;
    order.serviceType = selectedServiceType;
    await order.save({ session });

    let wallet = await Wallet.findOne({
      merchantId: req.user.id,
    }).session(session);

    if (!wallet) {
      const [newWallet] = await Wallet.create(
        [{
          merchantId: req.user.id,
          balance: 0,
        }],
        { session }
      );
      wallet = newWallet;
    }

    if (wallet.balance < SHIPPING_CHARGE) {
      if (session) await session.abortTransaction();
      logger.warn("Insufficient wallet balance", { 
        balance: wallet.balance, 
        required: SHIPPING_CHARGE 
      });
      return res.status(400).json({
        success: false,
        message: "Insufficient Wallet Balance",
        balance: wallet.balance,
        required: SHIPPING_CHARGE,
      });
    }

    const courierResponse = await CourierService.createShipment(
      courier,
      order,
      warehouse
    );

    const awb = courierResponse.awb;
    const labelUrl = courierResponse.labelUrl;

    const shipment = await Shipment.create([{
      orderId,
      merchantId: req.user.id,
      warehouseId: warehouse._id, // Added warehouseId
      pickupAddress: { // Added pickupAddress - FIXED: warehouse.warehouseName
        warehouseName: warehouse.warehouseName,
        contactPerson: warehouse.contactPerson,
        phone: warehouse.phone,
        email: warehouse.email,
        addressLine1: warehouse.addressLine1,
        addressLine2: warehouse.addressLine2,
        city: warehouse.city,
        state: warehouse.state,
        pincode: warehouse.pincode,
      },
      courier: courier.name,
      courierId: courier._id,
      awb,
      labelUrl,
      status: "PICKUP_PENDING",
      insuranceEnabled,
      insuranceAmount: order.amount || 0,
      insurancePremium,
      provider: courierResponse.provider,
      providerShipmentId: courierResponse.providerShipmentId,
      providerTrackingId: courierResponse.providerTrackingId,
      providerStatus: courierResponse.status,
      trackingUrl: courierResponse.trackingUrl,
      manifestUrl: courierResponse.manifestUrl,
      apiResponse: courierResponse.rawResponse,
      expectedDeliveryDate: courierResponse.estimatedDeliveryDate,
      weight: order.weight || 0, // Added weight
      dimensions: { // Added dimensions
        length: order.dimensions?.length || 0,
        breadth: order.dimensions?.breadth || 0,
        height: order.dimensions?.height || 0,
      },
      isCOD: order.paymentMode === "COD", // Added isCOD
      codAmount: order.paymentMode === "COD" ? order.amount : 0, // Added codAmount
      shippingCharge: SHIPPING_CHARGE, // Added shippingCharge (Inclusive of GST)
      courierCost: buyRate, // Internal courier cost
      buyRate: buyRate, // Courier Buy Rate
      sellRate: sellRate, // Merchant Sell Rate
      marginEarned: marginEarned, // Net Freight Profit Margin
      codCharge: calculated.codCharge || 0, // Added codCharge
      codBuyCharge: calculated.codBuyCharge || 0,
      codMarginEarned: calculated.codMarginEarned || 0,
      rtoBuyCharge: calculated.rtoBuyCharge || 0,
      totalNetProfit: (marginEarned || 0) + (calculated.codMarginEarned || 0),
      fuelCharge: calculated.fuelCharge, // Added fuelCharge
      serviceType: selectedServiceType, // Added serviceType
      tracking: [
        {
          status: "PICKUP_PENDING",
          location: courier.name,
          remarks: "Shipment Created",
          eventTime: new Date(),
        },
      ],
    }], { session });

    const createdShipment = shipment[0];

    wallet.balance = Math.max(0, Math.round((wallet.balance - SHIPPING_CHARGE) * 100) / 100);
    wallet.transactions.push({
      amount: SHIPPING_CHARGE,
      type: "DEBIT",
      description: `Shipment Charge - Order #${order.orderNumber || order._id.toString().slice(-6)}`,
      createdAt: new Date(),
    });
    await wallet.save({ session });

    const invoice = await Invoice.create([{
      invoiceNumber: generateInvoiceNumber(),
      merchantId: req.user.id,
      orderId: order._id,
      shipmentId: createdShipment._id,
      amount: order.amount || 0,
      taxAmount: taxAmount,
      shippingCharge: subtotal,
      insuranceCharge: insurancePremium,
      paymentMethod: order.paymentMode || "COD",
      status: "PAID",
    }], { session });

    const createdInvoice = invoice[0];

    createdShipment.invoiceId = createdInvoice._id;
    await createdShipment.save({ session });

    order.shipmentId = createdShipment._id;
    order.invoiceId = createdInvoice._id;
    order.awb = createdShipment.awb;
    
    if (order.schema.paths && order.schema.paths.courierPartner) {
      order.courierPartner = createdShipment.courier;
    }
    
    order.status = ORDER_STATUS_MAP[createdShipment.status] || "READY_FOR_PICKUP";
    await order.save({ session });

    // Shipment created in READY_FOR_PICKUP state (Merchant manually triggers pickup schedule button)
    createdShipment.pickupStatus = "PENDING";
    createdShipment.status = "READY_FOR_PICKUP";
    createdShipment.pickupDate = null;
    createdShipment.tracking.push({
      status: "READY_FOR_PICKUP",
      location: courier?.name || "Warehouse",
      remarks: "Shipment Created - Ready for Pickup",
      eventTime: new Date(),
    });
    await createdShipment.save({ session });

    order.status = "READY_FOR_PICKUP";
    await order.save({ session });

    if (session) await session.commitTransaction();

    // Trigger WhatsApp notification if option enabled
    if (req.body.sendWhatsAppNotification !== false) {
      whatsappService.sendShipmentNotification({
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        orderNumber: order.orderNumber || order._id.toString().slice(-6),
        awb: createdShipment.awb,
        courierName: courier.name,
        trackingUrl: createdShipment.trackingUrl,
      }).catch(err => console.error("Async WhatsApp error:", err));
    }

    // ── Two-Way Sync: push fulfillment back to Shopify / WooCommerce ──
    triggerChannelSync(order, createdShipment, "SHIPPED")
      .then(async () => {
        const syncStatus = (order.channelSource && order.channelSource !== "MANUAL") ? "SYNCED" : "NOT_APPLICABLE";
        await Order.findByIdAndUpdate(order._id, { channelSyncStatus: syncStatus });
      })
      .catch(err => console.error("[TwoWaySync] Single shipment sync error:", err.message));

    logger.info("Shipment created successfully", { 
      shipmentId: createdShipment._id,
      awb: createdShipment.awb,
      orderId: order._id 
    });

    const finalShipment = await Shipment.findById(createdShipment._id)
      .populate("orderId")
      .populate("invoiceId")
      .populate("merchantId", "companyName phone logo gst")
      .populate("warehouseId"); // Added warehouse population

    return res.status(201).json({
      success: true,
      message: "Shipment Created Successfully",
      shipment: finalShipment,
      shippingCharge: SHIPPING_CHARGE,
      insurancePremium,
      insuranceEnabled,
      rateCardUsed: courier.name,
      weight: order.weight,
      paymentMode: order.paymentMode,
    });
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (err) {
        // ignore abort errors on standalone/failed sessions
      }
    }
    logger.error("Shipment creation failed", { 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      userId: req.user?.id 
    });

    return res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  } finally {
    if (session) await session.endSession();
  }
};

// ===============================
// BULK CREATE SHIPMENTS WITH TRANSACTION
// ===============================
const createBulkShipments = async (req, res) => {
  let session = null;
  try {
    const isReplSet = await checkReplicaSet();
    if (isReplSet) {
      session = await mongoose.startSession();
      session.startTransaction();
    }
    logger.info("Bulk shipment request received", { 
      userId: req.user?.id,
      body: req.body 
    });

    const { orderIds, courierId, warehouseId } = req.body; // Added warehouseId

    if (!orderIds || orderIds.length === 0) {
      if (session) await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "No orders selected",
      });
    }

    if (!courierId) {
      if (session) await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "CourierId is required",
      });
    }

    if (!warehouseId) { // Added warehouse validation
      if (session) await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "WarehouseId is required",
      });
    }

    const warehouse = await Warehouse.findOne({ // Added warehouse fetch
      _id: warehouseId,
      merchantId: req.user.id,
      isActive: true,
    }).session(session);

    if (!warehouse) {
      if (session) await session.abortTransaction();
      logger.warn("Warehouse not found", { warehouseId, userId: req.user.id });
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    const courier = await Courier.findById(courierId).session(session);

    if (!courier) {
      if (session) await session.abortTransaction();
      logger.warn("Courier not found", { courierId });
      return res.status(404).json({
        success: false,
        message: "Courier not found",
      });
    }

    // Fetch Surface Rate Card
    let surfaceRateCard = await RateCard.findOne({
      merchantId: req.user.id,
      courierId,
      serviceType: "Surface",
      isActive: true,
    }).session(session);
    if (!surfaceRateCard) {
      surfaceRateCard = await RateCard.findOne({
        merchantId: null,
        courierId,
        serviceType: "Surface",
        isActive: true,
      }).session(session);
    }

    // Fetch Air Rate Card
    let airRateCard = await RateCard.findOne({
      merchantId: req.user.id,
      courierId,
      serviceType: "Air",
      isActive: true,
    }).session(session);
    if (!airRateCard) {
      airRateCard = await RateCard.findOne({
        merchantId: null,
        courierId,
        serviceType: "Air",
        isActive: true,
      }).session(session);
    }

    // Ensure fallback is null if no rate card is configured
    if (surfaceRateCard && surfaceRateCard.isActive === false) {
      surfaceRateCard = null;
    }
    if (airRateCard && airRateCard.isActive === false) {
      airRateCard = null;
    }

    let wallet = await Wallet.findOne({
      merchantId: req.user.id,
    }).session(session);

    if (!wallet) {
      const [newWallet] = await Wallet.create(
        [{
          merchantId: req.user.id,
          balance: 0,
        }],
        { session }
      );
      wallet = newWallet;
    }

    const shipments = [];
    const failedOrders = [];
    const skippedOrders = [];
    let totalCharges = 0;
    const createdShipmentIds = [];

    for (const orderId of orderIds) {
      try {
        const order = await Order.findOne({
          _id: orderId,
          merchantId: req.user.id,
        }).session(session);

        if (!order) {
          failedOrders.push({ orderId, reason: "Order not found" });
          continue;
        }

        const existingShipment = await Shipment.findOne({
          orderId,
          merchantId: req.user.id,
        }).session(session);

        if (existingShipment) {
          skippedOrders.push({ orderId, reason: "Shipment already exists" });
          continue;
        }

        const selectedServiceType = req.body.serviceType || order.serviceType || "Surface";
        const rateCard = selectedServiceType === "Air" ? airRateCard : surfaceRateCard;

        if (!rateCard) {
          failedOrders.push({ 
            orderId, 
            reason: `No rate card configured for service type: ${selectedServiceType}` 
          });
          continue;
        }

        const weight = Number(order.weight || 0);
        const pickup = warehouse.pincode;
        const destination = order.customerPincode;
        const zone = determineZone(pickup, destination);

        const calculated = calculateShippingRates(rateCard, {
          weight,
          length: Number(order.dimensions?.length || order.length || 0),
          breadth: Number(order.dimensions?.breadth || order.breadth || 0),
          height: Number(order.dimensions?.height || order.height || 0),
          zone,
          paymentMode: order.paymentMode,
          insuranceEnabled: false,
          amount: Number(order.amount || 0),
        });

        const shippingCharge = calculated.finalCharge || 0; // Inclusive of GST
        const subtotal = calculated.subtotal || 0;
        const taxAmount = calculated.gstAmount || 0;
        const buyRate = calculated.buyRate || 0;
        const sellRate = calculated.sellRate || 0;
        const marginEarned = calculated.marginEarned || 0;

        if (wallet.balance < shippingCharge) {
          failedOrders.push({ 
            orderId, 
            reason: `Insufficient wallet balance. Required: ${shippingCharge}, Available: ${wallet.balance}` 
          });
          continue;
        }

        const courierResponse = await CourierService.createShipment(
          courier,
          order
        );

        const awb = courierResponse.awb;
        const labelUrl = courierResponse.labelUrl;

        const createOpts = session ? { session } : {};

        const shipment = await Shipment.create([{
          orderId,
          merchantId: req.user.id,
          warehouseId: warehouse._id, // Added warehouseId
          pickupAddress: { // Added pickupAddress - FIXED: warehouse.warehouseName
            warehouseName: warehouse.warehouseName,
            contactPerson: warehouse.contactPerson,
            phone: warehouse.phone,
            email: warehouse.email,
            addressLine1: warehouse.addressLine1,
            addressLine2: warehouse.addressLine2,
            city: warehouse.city,
            state: warehouse.state,
            pincode: warehouse.pincode,
          },
          courier: courier.name,
          courierId: courier._id,
          awb,
          labelUrl,
          status: "PICKUP_PENDING",
          insuranceEnabled: false,
          insuranceAmount: 0,
          insurancePremium: 0,
          provider: courierResponse.provider,
          providerShipmentId: courierResponse.providerShipmentId,
          providerTrackingId: courierResponse.providerTrackingId,
          providerStatus: courierResponse.status,
          trackingUrl: courierResponse.trackingUrl,
          manifestUrl: courierResponse.manifestUrl,
          apiResponse: courierResponse.rawResponse,
          expectedDeliveryDate: courierResponse.estimatedDeliveryDate,
          weight: order.weight || 0, // Added weight
          dimensions: { // Added dimensions
            length: order.dimensions?.length || 0,
            breadth: order.dimensions?.breadth || 0,
            height: order.dimensions?.height || 0,
          },
          isCOD: order.paymentMode === "COD", // Added isCOD
          codAmount: order.paymentMode === "COD" ? order.amount : 0, // Added codAmount
          shippingCharge: shippingCharge, // Added shippingCharge (Inclusive of GST)
          buyRate: buyRate,
          sellRate: sellRate,
          marginEarned: marginEarned,
          codCharge: calculated.codCharge || 0, // Added codCharge
          codBuyCharge: calculated.codBuyCharge || 0,
          codMarginEarned: calculated.codMarginEarned || 0,
          rtoBuyCharge: calculated.rtoBuyCharge || 0,
          totalNetProfit: (marginEarned || 0) + (calculated.codMarginEarned || 0),
          fuelCharge: calculated.fuelCharge, // Added fuelCharge
          serviceType: selectedServiceType, // Added serviceType
          pickupsAutomaticallyScheduled: courierResponse.pickupsAutomaticallyScheduled || "NO",
          pickupStatus: courierResponse.pickupsAutomaticallyScheduled === "YES" ? "AUTO_SCHEDULED" : "PENDING",
          lrNumber: courierResponse.lrNumber || "",
          pickupRequestId: courierResponse.pickupRequestId || "",
          tracking: [
            {
              status: "PICKUP_PENDING",
              location: courier.name,
              remarks: "Shipment Created",
              eventTime: new Date(),
            },
          ],
        }], createOpts);

        const createdShipment = shipment[0];
        createdShipmentIds.push(createdShipment._id);

        const invoice = await Invoice.create([{
          invoiceNumber: generateInvoiceNumber(),
          merchantId: req.user.id,
          orderId: order._id,
          shipmentId: createdShipment._id,
          amount: order.amount || 0,
          taxAmount: taxAmount,
          shippingCharge: subtotal,
          insuranceCharge: 0,
          paymentMethod: order.paymentMode || "COD",
          status: "PAID",
        }], createOpts);

        const createdInvoice = invoice[0];

        createdShipment.invoiceId = createdInvoice._id;
        await createdShipment.save({ session });

        order.shipmentId = createdShipment._id;
        order.invoiceId = createdInvoice._id;
        order.awb = createdShipment.awb;
        
        if (order.schema.paths && order.schema.paths.courierPartner) {
          order.courierPartner = createdShipment.courier;
        }
        
        order.status = ORDER_STATUS_MAP[createdShipment.status] || "READY_FOR_PICKUP";
        order.shippingCharge = shippingCharge;
        order.serviceType = selectedServiceType;
        await order.save({ session });

        // Bulk Shipment created in READY_FOR_PICKUP state (Merchant manually triggers pickup schedule button)
        createdShipment.pickupStatus = "PENDING";
        createdShipment.status = "READY_FOR_PICKUP";
        createdShipment.pickupDate = null;
        createdShipment.tracking.push({
          status: "READY_FOR_PICKUP",
          location: courier?.name || "Warehouse",
          remarks: "Bulk Shipment Created - Ready for Pickup",
          eventTime: new Date(),
        });
        await createdShipment.save({ session });

        order.status = "READY_FOR_PICKUP";
        await order.save({ session });

        shipments.push(createdShipment);

        // Trigger WhatsApp notification if enabled
        if (req.body.sendWhatsAppNotification !== false) {
          whatsappService.sendShipmentNotification({
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            orderNumber: order.orderNumber || order._id.toString().slice(-6),
            awb: createdShipment.awb,
            courierName: courier.name,
            trackingUrl: createdShipment.trackingUrl,
          }).catch(err => console.error("Async WhatsApp bulk error:", err));
        }

        // ── Two-Way Sync: push fulfillment back to channel for bulk shipments ──
        triggerChannelSync(order, createdShipment, "SHIPPED")
          .then(async () => {
            const syncStatus = (order.channelSource && order.channelSource !== "MANUAL") ? "SYNCED" : "NOT_APPLICABLE";
            await Order.findByIdAndUpdate(order._id, { channelSyncStatus: syncStatus });
          })
          .catch(err => console.error("[TwoWaySync] Bulk sync error:", err.message));

        wallet.balance = Math.max(0, Math.round((wallet.balance - shippingCharge) * 100) / 100);
        totalCharges += shippingCharge;
        wallet.transactions.push({
          amount: shippingCharge,
          type: "DEBIT",
          description: `Bulk Shipment Charge - Order #${order.orderNumber || order._id.toString().slice(-6)}`,
          createdAt: new Date(),
        });

      } catch (error) {
        logger.error("Bulk shipment error for order", { 
          orderId, 
          error: error.message 
        });
        failedOrders.push({ orderId, reason: error.message });
      }
    }

    await wallet.save({ session });

    if (session) await session.commitTransaction();

    logger.info("Bulk shipments created", { 
      total: shipments.length,
      skipped: skippedOrders.length,
      failed: failedOrders.length 
    });

    const populatedShipments = await Shipment.find({
      _id: { $in: shipments.map(s => s._id) }
    })
      .populate("orderId")
      .populate("invoiceId")
      .populate("merchantId", "companyName phone logo gst")
      .populate("warehouseId"); // Added warehouse population

    return res.status(201).json({
      success: true,
      message: `${shipments.length} shipments created successfully`,
      shipments: populatedShipments,
      summary: {
        created: shipments.length,
        skipped: skippedOrders.length,
        failed: failedOrders.length,
        totalCharges,
        skippedOrders,
        failedOrders,
      },
    });
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (err) {
        // ignore abort errors
      }
    }
    logger.error("Bulk shipment creation failed", { 
      error: error.message,
      userId: req.user?.id 
    });
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    if (session) await session.endSession();
  }
};

// ===============================
// GET ALL SHIPMENTS
// ===============================
const getShipments = async (req, res) => {
  try {
    const shipments = await Shipment.find({
      merchantId: req.user.id,
    })
      .populate({
        path: "orderId",
        populate: {
          path: "invoiceId",
        },
      })
      .populate("invoiceId")
      .populate("courierId", "name code")
      .populate("warehouseId") // Added warehouse population
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: shipments.length,
      shipments,
    });
  } catch (error) {
    logger.error("Get shipments failed", { error: error.message });
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// GET SINGLE SHIPMENT
// ===============================
const getShipmentById = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
      .populate({
        path: "orderId",
        populate: {
          path: "invoiceId",
        },
      })
      .populate("invoiceId")
      .populate("courierId", "name code")
      .populate("warehouseId"); // Added warehouse population

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    return res.status(200).json({
      success: true,
      shipment,
    });
  } catch (error) {
    logger.error("Get shipment by ID failed", { 
      error: error.message,
      shipmentId: req.params.id 
    });
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// TRACK SHIPMENT BY AWB
// ===============================
const trackShipment = async (req, res) => {
  try {
    const { id } = req.params;

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const shipment = await Shipment.findOne({
      $or: [{ awb: id }, ...(isObjectId ? [{ _id: id }] : [])],
      merchantId: req.user.id,
    })
      .populate({
        path: "orderId",
        populate: {
          path: "invoiceId",
        },
      })
      .populate("invoiceId")
      .populate("courierId", "name code")
      .populate("warehouseId"); // Added warehouse population

    if (!shipment) {
      logger.warn("Shipment not found for tracking", { awbOrId: id });
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    const courier = await Courier.findById(shipment.courierId);
    const tracking = await CourierService.trackShipment(courier, shipment.awb);

    logger.info("Shipment tracked successfully", { 
      awb: shipment.awb,
      status: tracking.response.status 
    });

    return res.status(200).json({
      success: true,
      shipment,
      tracking: tracking.response.timeline || [],
      courierStatus: tracking.response.status,
      estimatedDelivery: tracking.response.estimated_delivery,
    });
  } catch (error) {
    logger.error("Track shipment failed", { 
      error: error.message,
      awb: req.params.id 
    });
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// PUBLIC TRACK SHIPMENT BY AWB (NO AUTH REQUIRED)
// ===============================
const publicTrackShipment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid AWB number",
      });
    }

    const cleanId = id.trim();
    const isObjectId = mongoose.Types.ObjectId.isValid(cleanId);
    
    const shipment = await Shipment.findOne({
      $or: [
        { awb: cleanId },
        { trackingNumber: cleanId },
        ...(isObjectId ? [{ _id: cleanId }] : [])
      ]
    })
      .populate("courierId", "name code")
      .populate("orderId")
      .populate("warehouseId");

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found with AWB: " + cleanId,
      });
    }

    // Attempt to pull live tracking if courier service available
    let timeline = shipment.tracking || [];
    let liveStatus = shipment.status || "MANIFESTED";
    let estDelivery = shipment.expectedDelivery || shipment.createdAt;

    try {
      if (shipment.courierId) {
        const courier = await Courier.findById(shipment.courierId);
        if (courier) {
          const tracking = await CourierService.trackShipment(courier, shipment.awb);
          if (tracking?.response) {
            if (tracking.response.timeline && tracking.response.timeline.length > 0) {
              timeline = tracking.response.timeline;
            }
            if (tracking.response.status) {
              liveStatus = tracking.response.status;
            }
            if (tracking.response.estimated_delivery) {
              estDelivery = tracking.response.estimated_delivery;
            }
          }
        }
      }
    } catch (e) {
      logger.warn("Live courier tracking fetch failed for public track", { awb: shipment.awb, error: e.message });
    }

    const courierName = shipment.courierName || shipment.courierId?.name || "Standard Courier";
    const origin = shipment.pickupAddress?.city || shipment.warehouseId?.city || "Origin";
    const destination = shipment.deliveryAddress?.city || shipment.orderId?.shippingAddress?.city || shipment.shippingAddress?.city || "Destination";

    return res.status(200).json({
      success: true,
      shipment: {
        awb: shipment.awb,
        status: liveStatus,
        courierName: courierName,
        origin: origin,
        destination: destination,
        expectedDelivery: estDelivery,
        createdAt: shipment.createdAt,
        trackingHistory: timeline,
      }
    });
  } catch (error) {
    logger.error("Public track shipment failed", { error: error.message, awb: req.params.id });
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// UPDATE SHIPMENT STATUS
// ===============================
const updateShipmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!SHIPMENT_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shipment status",
      });
    }

    const query = { _id: id };
    if (req.user.role === "MERCHANT") {
      query.merchantId = req.user.id;
    }

    const shipment = await Shipment.findOne(query);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    if (shipment.status === "DELIVERED" || shipment.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: `${shipment.status} shipment cannot be modified`,
      });
    }

    await shipment.addTrackingEvent(
      status,
      "Admin Panel",
      `Shipment status changed to ${status}`
    );

    const order = await Order.findById(shipment.orderId);

    if (order) {
      order.status = ORDER_STATUS_MAP[status] || order.status;
      await order.save();
    }

    if (status === "NDR") {
      logger.info("NDR hit for shipment", { shipmentId: shipment._id });

      const existingNDR = await NDR.findOne({
        shipmentId: shipment._id,
      });

      if (!existingNDR) {
        try {
          const ndr = await NDR.create({
            shipmentId: shipment._id,
            orderId: shipment.orderId,
            merchantId: shipment.merchantId,
            awb: shipment.awb,
            reason: "Delivery Failed",
          });
          logger.info("NDR created", { ndrId: ndr._id });
        } catch (err) {
          logger.error("NDR creation error", { error: err.message });
        }
      }
    }

    if (status === "RTO") {
      logger.info("RTO hit for shipment", { shipmentId: shipment._id });

      const existingRTO = await RTO.findOne({
        shipmentId: shipment._id,
      });

      if (!existingRTO) {
        try {
          const orderData = await Order.findById(shipment.orderId);

          const rto = await RTO.create({
            shipmentId: shipment._id,
            merchantId: shipment.merchantId,
            orderId: shipment.orderId,
            awb: shipment.awb,
            courier: shipment.courier,
            reason: "Returned To Origin",
            rtoReason: "Shipment marked as RTO by Admin",
            customerName: orderData?.customerName || "",
            customerPhone: orderData?.customerPhone || "",
            address: orderData?.customerAddress || "",
            pincode: orderData?.customerPincode || "",
            city: orderData?.customerCity || "",
            state: orderData?.customerState || "",
            status: "INITIATED",
            rtoRequestedAt: new Date(),
            createdBy: "admin",
            source: "manual",
            lastUpdatedBy: req.user.id,
            attemptHistory: [
              {
                date: new Date(),
                status: "INITIATED",
                remarks: "Shipment marked as RTO by Admin",
                updatedBy: req.user.id,
              },
            ],
          });

          logger.info("RTO created", { rtoId: rto._id });
        } catch (err) {
          logger.error("RTO creation error", { error: err.message });
          return res.status(500).json({
            success: false,
            message: "Failed to create RTO record",
            error: err.message,
          });
        }
      }
    }

    if (status === "DELIVERED" && order && order.paymentMode === "COD") {
      const Remittance = require("../models/Remittance");
      try {
        await Remittance.create({
          merchantId: shipment.merchantId,
          shipmentId: shipment._id,
          awb: shipment.awb,
          codAmount: order.amount,
        });
        logger.info("Remittance record created for COD delivery", { awb: shipment.awb });
      } catch (err) {
        logger.error("Remittance creation error", { error: err.message });
      }
    }

    // ── Two-Way Sync: Delivery trigger (once only) ──
    if (status === "DELIVERED" && !shipment.deliverySyncTriggered) {
      // Mark flag first so concurrent polls don't double-fire
      await Shipment.findByIdAndUpdate(shipment._id, { deliverySyncTriggered: true });
      logger.info("[TwoWaySync] Delivery trigger fired", { awb: shipment.awb, orderId: shipment.orderId });

      triggerChannelSync(order, shipment, "DELIVERED")
        .then(async () => {
          if (order && order.channelSource && order.channelSource !== "MANUAL") {
            await Order.findByIdAndUpdate(shipment.orderId, { channelSyncStatus: "SYNCED" });
            logger.info("[TwoWaySync] Delivery synced to channel", { orderId: shipment.orderId });
          }
        })
        .catch(err => logger.error("[TwoWaySync] Delivery sync error", { error: err.message }));
    }

    return res.status(200).json({
      success: true,
      message: "Status Updated Successfully",
      shipment,
    });
  } catch (error) {
    logger.error("Update shipment status failed", { 
      error: error.message,
      shipmentId: req.params.id 
    });
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// SCHEDULE PICKUP
// ===============================
const schedulePickup = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    const courier = await Courier.findById(shipment.courierId);
    const pickupResult = await CourierService.schedulePickup(courier, shipment._id, shipment);
    const pResp = pickupResult?.response || {};

    shipment.pickupDate = new Date();
    shipment.pickupStatus = "SCHEDULED";
    shipment.status = "PICKUP_SCHEDULED";
    if (pResp.pickup_request_id) shipment.pickupRequestId = pResp.pickup_request_id;
    if (pResp.lr_number || pResp.lrNumber) shipment.lrNumber = pResp.lr_number || pResp.lrNumber;
    if (pResp.manifest_url || pResp.manifestUrl) shipment.manifestUrl = pResp.manifest_url || pResp.manifestUrl;

    await shipment.addTrackingEvent(
      "PICKUP_SCHEDULED",
      shipment.courier || "Courier Partner",
      `Pickup Scheduled with courier (LR: ${shipment.lrNumber || "N/A"})`
    );
    await shipment.save();

    const order = await Order.findById(shipment.orderId);
    if (order) {
      order.status = "READY_FOR_PICKUP";
      await order.save();
    }

    logger.info("Pickup scheduled successfully", { shipmentId: shipment._id });

    res.status(200).json({
      success: true,
      message: "Pickup Scheduled Successfully",
      shipment,
    });
  } catch (error) {
    logger.error("Schedule pickup failed", { 
      error: error.message,
      shipmentId: req.params.id 
    });
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// GENERATE QR CODE (SECURED)
// ===============================
const generateShipmentQR = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({
      _id: req.params.id,
      merchantId: req.user.id,
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found or unauthorized",
      });
    }

    const qrCode = await QRCode.toDataURL(shipment.awb);
    shipment.qrCode = qrCode;
    await shipment.save();

    logger.info("QR code generated", { shipmentId: shipment._id });

    res.status(200).json({
      success: true,
      qrCode,
    });
  } catch (error) {
    logger.error("QR generation failed", { 
      error: error.message,
      shipmentId: req.params.id 
    });
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// GENERATE PDF LABEL
// ===============================
const generateLabel = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user && req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      query.merchantId = req.user.id;
    }

    const shipment = await Shipment.findOne(query)
      .populate("merchantId", "companyName phone logo gst")
      .populate("orderId")
      .populate("invoiceId")
      .populate("warehouseId");

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found or unauthorized",
      });
    }

    if (!shipment.orderId) {
      return res.status(404).json({
        success: false,
        message: "Order not found for this shipment",
      });
    }

    let settings = {};
    if (req.body && req.body.settings) {
      try {
        settings = typeof req.body.settings === "string" ? JSON.parse(req.body.settings) : req.body.settings;
      } catch (e) {
        settings = req.body;
      }
    } else {
      settings = { ...(req.query || {}), ...(req.body || {}) };
    }

    if (req.file) {
      settings.uploadedLogo = req.file.path;
    }

    const format = settings.format || "A6";

    let pageSize = "A6";
    let margin = 20;
    let labelsPerPage = 1;
    let isMultiLabel = false;

    if (format === "A4_2") {
      pageSize = "A4";
      margin = 20;
      isMultiLabel = true;
      labelsPerPage = 2;
    } else if (format === "A4_4") {
      pageSize = "A4";
      margin = 20;
      isMultiLabel = true;
      labelsPerPage = 4;
    } else if (format === "THERMAL" || format === "4x6") {
      pageSize = [288, 432];
      margin = 15;
      isMultiLabel = false;
      labelsPerPage = 1;
    }

    const doc = new PDFDocument({
      size: pageSize,
      margin,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${shipment.awb}_${format}.pdf`
    );

    doc.pipe(res);

    if (isMultiLabel) {
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      const cols = labelsPerPage === 2 ? 2 : 2;
      const rows = labelsPerPage === 2 ? 1 : 2;
      const labelWidth = (pageWidth - margin * 2) / cols;
      const labelHeight = (pageHeight - margin * 2) / rows;

      for (let i = 0; i < labelsPerPage; i++) {
        const x = (i % cols) * labelWidth;
        const y = Math.floor(i / cols) * labelHeight;

        doc.save();
        doc.translate(margin + x, margin + y);
        doc.rect(0, 0, labelWidth - 10, labelHeight - 10).stroke();
        doc.restore();

        await renderLabel(
          doc, 
          shipment, 
          settings, 
          labelWidth - 10, 
          labelHeight - 10, 
          margin + x, 
          margin + y
        );
      }
    } else {
      await renderLabel(doc, shipment, settings);
    }

    doc.end();

    logger.info("Label generated", { 
      shipmentId: shipment._id,
      format: format 
    });

  } catch (error) {
    logger.error("Label generation failed", { 
      error: error.message,
      shipmentId: req.params.id 
    });
    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    if (req.file && req.file.path) {
      try {
        const fs = require("fs");
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      } catch (err) {
        logger.error("Temp logo cleanup failed", { error: err.message });
      }
    }
  }
};

// ===============================
// BULK LABELS
// ===============================
const bulkLabels = async (req, res) => {
  try {
    let settings = {};
    if (req.body.settings) {
      settings = JSON.parse(req.body.settings);
    } else {
      settings = req.body;
    }

    if (req.file) {
      settings.uploadedLogo = req.file.path;
    }

    let shipmentIds = req.body.shipmentIds;
    if (typeof shipmentIds === "string") {
      shipmentIds = JSON.parse(shipmentIds);
    }

    const format = settings.format || "A6";

    if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No shipment IDs provided",
      });
    }

    const shipments = await Shipment.find({
      _id: { $in: shipmentIds },
      merchantId: req.user.id,
    })
      .populate("merchantId", "companyName phone logo gst")
      .populate("orderId")
      .populate("invoiceId")
      .populate("warehouseId"); // Added warehouse population

    if (shipments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No shipments found",
      });
    }

    let pageSize = "A6";
    let margin = 20;
    let labelsPerPage = 1;
    let isMultiLabel = false;

    if (format === "A4_2") {
      pageSize = "A4";
      margin = 20;
      isMultiLabel = true;
      labelsPerPage = 2;
    } else if (format === "A4_4") {
      pageSize = "A4";
      margin = 20;
      isMultiLabel = true;
      labelsPerPage = 4;
    } else if (format === "THERMAL" || format === "4x6") {
      pageSize = [288, 432];
      margin = 15;
      isMultiLabel = false;
      labelsPerPage = 1;
    }

    const doc = new PDFDocument({
      size: pageSize,
      margin,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=bulk_labels_${format}_${Date.now()}.pdf`
    );

    doc.pipe(res);

    if (isMultiLabel) {
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      const cols = labelsPerPage === 2 ? 2 : 2;
      const rows = labelsPerPage === 2 ? 1 : 2;
      const labelWidth = (pageWidth - margin * 2) / cols;
      const labelHeight = (pageHeight - margin * 2) / rows;

      let labelIndex = 0;

      for (const shipment of shipments) {
        const positionInPage = labelIndex % labelsPerPage;
        
        if (positionInPage === 0 && labelIndex > 0) {
          doc.addPage();
        }

        const x = (positionInPage % cols) * labelWidth;
        const y = Math.floor(positionInPage / cols) * labelHeight;

        doc.save();
        doc.translate(margin + x, margin + y);
        doc.rect(0, 0, labelWidth - 10, labelHeight - 10).stroke();
        doc.restore();

        await renderLabel(
          doc, 
          shipment, 
          settings, 
          labelWidth - 10, 
          labelHeight - 10, 
          margin + x, 
          margin + y
        );

        labelIndex++;
      }
    } else {
      for (let i = 0; i < shipments.length; i++) {
        if (i > 0) {
          doc.addPage();
        }
        await renderLabel(doc, shipments[i], settings);
      }
    }

    doc.end();

    logger.info("Bulk labels generated", { 
      count: shipments.length,
      format: format 
    });

  } catch (error) {
    logger.error("Bulk labels generation failed", { 
      error: error.message 
    });
    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    if (req.file && req.file.path) {
      try {
        const fs = require("fs");
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      } catch (err) {
        logger.error("Temp logo cleanup failed", { error: err.message });
      }
    }
  }
};

// ===============================
// CANCEL SHIPMENT
// ===============================
const cancelShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    // Ownership check: MERCHANT must own their shipment, ADMIN/SUPER_ADMIN is allowed.
    if (req.user.role === "MERCHANT" && shipment.merchantId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to cancel this shipment",
      });
    }

    if (shipment.status === "CANCELLED") {
      return res.status(200).json({
        success: true,
        message: "Shipment is already cancelled",
        shipment,
      });
    }

    const courier = await Courier.findById(shipment.courierId);
    await CourierService.cancelShipment(courier, shipment._id);

    // Refund merchant wallet (Atomic)
    const refundAmount = shipment.shippingCharge || 0;
    if (refundAmount > 0) {
      await Wallet.findOneAndUpdate(
        { merchantId: shipment.merchantId },
        {
          $inc: { balance: refundAmount },
          $push: {
            transactions: {
              amount: refundAmount,
              type: "CREDIT",
              description: `Refund for Cancelled Shipment AWB #${shipment.awb}`,
              createdAt: new Date(),
            },
          },
        }
      );
    }

    shipment.status = "CANCELLED";
    await shipment.save();

    const order = await Order.findById(shipment.orderId);
    if (order) {
      order.status = ORDER_STATUS_MAP["CANCELLED"] || "CANCELLED";
      await order.save();
    }

    logger.info("Shipment cancelled", { 
      shipmentId: shipment._id,
      awb: shipment.awb 
    });

    res.status(200).json({
      success: true,
      message: "Shipment cancelled successfully",
      shipment,
    });
  } catch (error) {
    logger.error("Cancel shipment failed", { 
      error: error.message,
      shipmentId: req.params.id 
    });
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// TRACKING TIMELINE
// ===============================
const getTrackingTimeline = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    res.status(200).json({
      success: true,
      tracking: shipment.tracking || [],
    });
  } catch (error) {
    logger.error("Get tracking timeline failed", { 
      error: error.message,
      shipmentId: req.params.id 
    });
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// BULK SCHEDULE PICKUP
// ===============================
const bulkSchedulePickup = async (req, res) => {
  try {
    const { shipmentIds } = req.body;

    if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No shipment IDs provided",
      });
    }

    const results = [];
    const errors = [];

    for (const shipmentId of shipmentIds) {
      try {
        const shipment = await Shipment.findOne({
          _id: shipmentId,
          merchantId: req.user.id,
        });

        if (!shipment) {
          errors.push({ shipmentId, message: "Not found or unauthorized" });
          continue;
        }

        const courier = await Courier.findById(shipment.courierId);
        const pickupResult = await CourierService.schedulePickup(courier, shipment._id, shipment);
        const pResp = pickupResult?.response || {};

        shipment.pickupDate = new Date();
        shipment.pickupStatus = "SCHEDULED";
        shipment.status = "PICKUP_SCHEDULED";
        if (pResp.pickup_request_id) shipment.pickupRequestId = pResp.pickup_request_id;
        if (pResp.lr_number || pResp.lrNumber) shipment.lrNumber = pResp.lr_number || pResp.lrNumber;
        if (pResp.manifest_url || pResp.manifestUrl) shipment.manifestUrl = pResp.manifest_url || pResp.manifestUrl;

        await shipment.addTrackingEvent(
          "PICKUP_SCHEDULED",
          shipment.courier || "Courier Partner",
          `Pickup Scheduled (LR: ${shipment.lrNumber || "N/A"})`
        );
        await shipment.save();

        const order = await Order.findById(shipment.orderId);
        if (order) {
          order.status = "READY_FOR_PICKUP";
          await order.save();
        }

        results.push({ shipmentId, awb: shipment.awb, status: "success" });
      } catch (err) {
        errors.push({ shipmentId, message: err.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `${results.length} pickup(s) scheduled, ${errors.length} failed`,
      results,
      errors,
    });
  } catch (error) {
    logger.error("Bulk schedule pickup failed", { error: error.message });
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// GENERATE MANIFEST
// ===============================
const generateManifest = async (req, res) => {
  try {
    const { shipmentIds } = req.body;

    if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No shipment IDs provided",
      });
    }

    // Selected shipments ke AWBs fetch karo
    const shipments = await Shipment.find({
      _id: { $in: shipmentIds },
      merchantId: req.user.id,
    }).select("awb");

    if (!shipments.length) {
      return res.status(404).json({
        success: false,
        message: "No shipments found",
      });
    }

    const awbArray = shipments.map((s) => s.awb).filter(Boolean);

    if (!awbArray.length) {
      return res.status(400).json({
        success: false,
        message: "No AWBs found for selected shipments",
      });
    }

    const manifestResult = await nimbuspostService.generateManifest(awbArray);

    res.status(200).json({
      success: true,
      manifestUrl: manifestResult.manifestUrl,
      awbs: awbArray,
    });
  } catch (error) {
    logger.error("Generate manifest failed", { error: error.message });
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


module.exports = {
  createShipment,
  createBulkShipments, 
  getShipments,
  getShipmentById,
  trackShipment,
  updateShipmentStatus,
  schedulePickup,
  bulkSchedulePickup,
  generateManifest,
  generateShipmentQR,
  getTrackingTimeline,
  generateLabel,
  bulkLabels,
  cancelShipment,
  publicTrackShipment,
};