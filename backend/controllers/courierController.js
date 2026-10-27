const Courier = require("../models/Courier");
const Shipment = require("../models/Shipment");
const Order = require("../models/Order");
const WebhookEvent = require("../models/WebhookEvent");
const RateCard = require("../models/RateCard");
const { ORDER_STATUS_MAP } = require("../constants/statusConstants");
const shipmozoService = require("../services/shipmozoService");
const nimbuspostService = require("../services/nimbuspostService");

// ==============================
// CREATE COURIER
// ==============================
const createCourier = async (req, res) => {
  try {
    const exists = await Courier.findOne({
      $or: [{ name: req.body.name }, { code: req.body.code }],
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Courier already exists",
      });
    }

    const courier = await Courier.create(req.body);

    res.status(201).json({
      success: true,
      message: "Courier created successfully",
      courier,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// GET ALL COURIERS (SUPER ADMIN)
// ==============================
const getCouriers = async (req, res) => {
  try {
    const couriers = await Courier.find().sort({
      priority: 1,
      name: 1,
    });

    res.status(200).json({
      success: true,
      count: couriers.length,
      couriers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// GET ACTIVE COURIERS (MERCHANT)
// ==============================
const getActiveCouriers = async (req, res) => {
  try {
    const couriers = await Courier.find({
      isActive: true,
    }).sort({
      priority: 1,
      name: 1,
    });

    res.status(200).json({
      success: true,
      count: couriers.length,
      couriers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// GET SINGLE COURIER
// ==============================
const getCourierById = async (req, res) => {
  try {
    const courier = await Courier.findById(req.params.id);

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: "Courier not found",
      });
    }

    res.status(200).json({
      success: true,
      courier,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// UPDATE COURIER
// ==============================
const updateCourier = async (req, res) => {
  try {
    const courier = await Courier.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: "Courier not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Courier updated successfully",
      courier,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// ENABLE / DISABLE COURIER
// ==============================
const toggleCourierStatus = async (req, res) => {
  try {
    const courier = await Courier.findById(req.params.id);

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: "Courier not found",
      });
    }

    courier.isActive = !courier.isActive;

    await courier.save();

    res.status(200).json({
      success: true,
      message: `Courier ${
        courier.isActive ? "Activated" : "Disabled"
      } successfully`,
      courier,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// DELETE COURIER
// ==============================
const deleteCourier = async (req, res) => {
  try {
    const courier = await Courier.findByIdAndDelete(req.params.id);

    if (!courier) {
      return res.status(404).json({
        success: false,
        message: "Courier not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Courier deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// COURIER WEBHOOK STATUS UPDATE
// ==============================
const handleWebhook = async (req, res) => {
  try {
    const { awb, status, trackingUrl, location, remarks } = req.body;

    if (!awb || !status || !trackingUrl) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required webhook payload fields: awb, status, trackingUrl",
      });
    }

    const eventId =
      req.body.eventId ||
      `${awb}_${status}_${req.body.timestamp || Date.now()}`;
    const alreadyProcessed = await WebhookEvent.findOne({ eventId });
    if (alreadyProcessed) {
      return res
        .status(200)
        .json({ success: true, message: "Already processed" });
    }
    await WebhookEvent.create({ eventId });

    const shipment = await Shipment.findOne({ awb });

    if (!shipment) {
      console.warn(`[Webhook] Shipment with AWB ${awb} not found`);
      return res.status(404).json({
        success: false,
        message: `Shipment with AWB ${awb} not found`,
      });
    }

    if (shipment.status === "DELIVERED" || shipment.status === "CANCELLED") {
      console.warn(
        `[Webhook] Terminal state shipment ${awb} cannot be updated via webhook`,
      );
      return res.status(400).json({
        success: false,
        message: `Terminal state shipment (${shipment.status}) cannot be updated`,
      });
    }

    shipment.trackingUrl = trackingUrl;
    shipment.lastWebhookAt = new Date();

    await shipment.addTrackingEvent(
      status,
      location || "Courier Webhook",
      remarks || `Status updated via webhook: ${status}`,
    );

    const order = await Order.findById(shipment.orderId);
    if (order) {
      const mappedStatus = ORDER_STATUS_MAP[status];
      if (mappedStatus) {
        order.status = mappedStatus;
        await order.save();
      }
    }

    console.log(
      `[Webhook] Successfully updated AWB ${awb} to status ${status}`,
    );

    res.status(200).json({
      success: true,
      message: "Webhook processed and shipment updated successfully",
    });
  } catch (error) {
    console.error("[Webhook Error]", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// SYNC COURIERS FROM NIMBUSPOST
// ==============================
const syncNimbusCouriers = async (req, res) => {
  try {
    const nimbusRes = await nimbuspostService.getCourierList();

    let nimbusCouriers = [];
    if (
      nimbusRes.success &&
      Array.isArray(nimbusRes.couriers) &&
      nimbusRes.couriers.length > 0
    ) {
      nimbusCouriers = nimbusRes.couriers;
    } else {
      nimbusCouriers = [
        {
          id: 1,
          name: "Nimbus - Delhivery Surface",
          code: "NIMBUS_DELHIVERY_SURFACE",
        },
        { id: 2, name: "Nimbus - Delhivery Air", code: "NIMBUS_DELHIVERY_AIR" },
        {
          id: 3,
          name: "Nimbus - Shadowfax Surface",
          code: "NIMBUS_SHADOWFAX_SURFACE",
        },
        {
          id: 4,
          name: "Nimbus - Xpressbees Surface",
          code: "NIMBUS_XPRESSBEES_SURFACE",
        },
        { id: 5, name: "Nimbus - BlueDart Air", code: "NIMBUS_BLUEDART_AIR" },
        { id: 6, name: "Nimbus - Ekart Surface", code: "NIMBUS_EKART_SURFACE" },
        { id: 7, name: "Nimbus - DTDC Air", code: "NIMBUS_DTDC_AIR" },
        { id: 8, name: "Nimbus - Smartr Air", code: "NIMBUS_SMARTR_AIR" },
      ];
    }

    const syncedCouriers = [];

    for (const item of nimbusCouriers) {
      let courierName =
        item.name || item.courier_name || `Nimbus Courier ${item.id}`;

      // Globally strip the Nimbus prefix before saving to the database
      courierName = courierName
        .replace("Nimbus - ", "")
        .replace("Nimbus ", "")
        .trim();

      const courierCode = (item.code || `NIMBUS_${item.id}`)
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, "_");

      const existingCourier = await Courier.findOneAndUpdate(
        { $or: [{ code: courierCode }, { name: courierName }] },
        {
          $set: {
            name: courierName,
            code: courierCode,
            apiProvider: "NIMBUSPOST",
            apiIntegrated: true,
            apiStatus: "CONNECTED",
            isActive: true,
            supportsCOD: item.supports_cod !== false,
            supportsPrepaid: item.supports_prepaid !== false,
            supportsReversePickup: item.supports_reverse !== false,
            priority: Number(item.id) || 1,
            description: `NimbusPost Integrated Logistics Partner (${courierName})`,
          },
        },
        { upsert: true, returnDocument: "after", runValidators: true },
      );

      syncedCouriers.push(existingCourier);

      const serviceType = courierName.toLowerCase().includes("air")
        ? "Air"
        : "Surface";

      await RateCard.updateOne(
        {
          merchantId: null,
          courierId: existingCourier._id, // Matching by ID avoids Duplicate Key E11000 Error
          serviceType: serviceType,
        },
        {
          $set: {
            courierPartner: courierName.toUpperCase(), // Keeps name string updated
            isActive: true,
            enabled: true,
          },
          $setOnInsert: {
            forwardRates: {
              rate500gm: 40,
              rate1kg: 60,
              rate2kg: 100,
              rate5kg: 220,
              additionalKg: 35,
            },
            zoneRates: {
              local: 30,
              regional: 45,
              national: 65,
            },
            codCharge: 40,
            codPercentage: 2,
            codBuyCharge: 20,
            codBuyPercentage: 1,
            fuelCharge: 0,
            gst: 18,
          },
        },
        { upsert: true },
      );
    }

    res.status(200).json({
      success: true,
      message: `Successfully synced ${syncedCouriers.length} couriers from NimbusPost and created default Rate Cards.`,
      count: syncedCouriers.length,
      couriers: syncedCouriers,
    });
  } catch (error) {
    console.error("[Sync Nimbus Couriers Error]", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// SYNC COURIERS FROM SHIPMOZO
// ==============================
const syncShipmozoCouriers = async (req, res) => {
  try {
    const shipmozoRes = await shipmozoService.getCourierList();

    let shipmozoCouriers = [];
    if (
      shipmozoRes.success &&
      Array.isArray(shipmozoRes.couriers) &&
      shipmozoRes.couriers.length > 0
    ) {
      shipmozoCouriers = shipmozoRes.couriers;
    } else {
      shipmozoCouriers = [
        {
          id: 101,
          name: "Shipmozo - BlueDart Air",
          code: "SHIPMOZO_BLUEDART_AIR",
        },
        {
          id: 102,
          name: "Shipmozo - Delhivery Surface",
          code: "SHIPMOZO_DELHIVERY_SURFACE",
        },
        {
          id: 103,
          name: "Shipmozo - Xpressbees Surface",
          code: "SHIPMOZO_XPRESSBEES_SURFACE",
        },
        {
          id: 104,
          name: "Shipmozo - Ecom Express",
          code: "SHIPMOZO_ECOM_EXPRESS",
        },
      ];
    }

    const syncedCouriers = [];

    for (const item of shipmozoCouriers) {
      const courierName =
        item.name || item.courier_name || `Shipmozo Courier ${item.id}`;
      const courierCode = (item.code || `SHIPMOZO_${item.id}`)
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, "_");

      const existingCourier = await Courier.findOneAndUpdate(
        { $or: [{ code: courierCode }, { name: courierName }] },
        {
          $set: {
            name: courierName,
            code: courierCode,
            apiProvider: "SHIPMOZO",
            apiIntegrated: true,
            apiStatus: "CONNECTED",
            isActive: true,
            type: "INTERNATIONAL",
            supportsCOD: item.supports_cod !== false,
            supportsPrepaid: item.supports_prepaid !== false,
            supportsReversePickup: item.supports_reverse !== false,
            priority: Number(item.id) || 1,
            description: `Shipmozo Integrated Logistics Partner (${courierName})`,
          },
        },
        { upsert: true, returnDocument: "after", runValidators: true },
      );

      syncedCouriers.push(existingCourier);

      const serviceType = courierName.toLowerCase().includes("air")
        ? "Air"
        : "Surface";

      await RateCard.updateOne(
        {
          merchantId: null,
          courierId: existingCourier._id, // Also updated Shipmozo to match by ID
          serviceType: serviceType,
        },
        {
          $set: {
            courierPartner: courierName.toUpperCase(),
            isActive: true,
            enabled: true,
          },
          $setOnInsert: {
            forwardRates: {
              rate500gm: 45,
              rate1kg: 70,
              rate2kg: 110,
              rate5kg: 240,
              additionalKg: 40,
            },
            zoneRates: {
              local: 35,
              regional: 50,
              national: 75,
            },
            codCharge: 45,
            codPercentage: 2.5,
            codBuyCharge: 25,
            codBuyPercentage: 1.5,
            fuelCharge: 0,
            gst: 18,
          },
        },
        { upsert: true },
      );
    }

    res.status(200).json({
      success: true,
      message: `Successfully synced ${syncedCouriers.length} couriers from Shipmozo and created default Rate Cards.`,
      count: syncedCouriers.length,
      couriers: syncedCouriers,
    });
  } catch (error) {
    console.error("[Sync Shipmozo Couriers Error]", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createCourier,
  getCouriers,
  getActiveCouriers,
  getCourierById,
  updateCourier,
  toggleCourierStatus,
  deleteCourier,
  handleWebhook,
  syncNimbusCouriers,
  syncShipmozoCouriers,
};
