const Order = require("../models/Order");
const Shipment = require("../models/Shipment");
const fs = require("fs");
const csv = require("csv-parser");
const XLSX = require("xlsx");
const {
  cancelShipment: cancelShipmozoShipment,
} = require("../services/shipmozoService");
const {
  cancelShipment: cancelNimbusShipment,
} = require("../services/nimbuspostService");

// ================================
// HELPER FUNCTION
// ================================
const generateOrderNumber = () => {
  return `ORD${Date.now()}${Math.floor(100000 + Math.random() * 900000)}`;
};

// ================================
// CREATE ORDER (DEBUG VERSION)
// ================================
const createOrder = async (req, res) => {
  try {

    // Auto-generate order number if not provided
    //  Map frontend field names to model field names
    const customerCity = req.body.customerCity || req.body.city;
    const customerState = req.body.customerState || req.body.state;
    const customerPincode = req.body.customerPincode || req.body.pincode;
    const serviceType = req.body.serviceType || req.body.shippingMode || "Surface";

    // Validate required address fields
    if (!customerCity || !customerState || !customerPincode) {
      const missing = [];
      if (!customerCity) missing.push("City");
      if (!customerState) missing.push("State");
      if (!customerPincode) missing.push("Pincode");
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    // Validate package dimensions (length, breadth, height) and weight
    const length = Number(req.body.length || (req.body.dimensions && req.body.dimensions.length));
    const breadth = Number(req.body.breadth || (req.body.dimensions && req.body.dimensions.breadth));
    const height = Number(req.body.height || (req.body.dimensions && req.body.dimensions.height));
    const weight = Number(req.body.weight);

    if (!length || length <= 0 || !breadth || breadth <= 0 || !height || height <= 0) {
      const missing = [];
      if (!length || length <= 0) missing.push("Length");
      if (!breadth || breadth <= 0) missing.push("Breadth");
      if (!height || height <= 0) missing.push("Height");
      return res.status(400).json({
        success: false,
        message: `Missing or invalid required dimensions: ${missing.join(", ")}. Dimensions (length, breadth, height) are compulsory and must be > 0.`,
      });
    }

    if (!weight || weight <= 0) {
      return res.status(400).json({
        success: false,
        message: "Weight is compulsory and must be greater than 0.",
      });
    }

    const orderData = {
      ...req.body,
      merchantId: req.user.id,
      orderNumber: req.body.orderNumber || generateOrderNumber(),
      customerCity,
      customerState,
      customerPincode,
      serviceType,
      length,
      breadth,
      height,
      weight,
      dimensions: { length, breadth, height },
    };

    const order = await Order.create(orderData);

    return res.status(201).json({
      success: true,
      message: "Order Created Successfully",
      order,
    });
  } catch (error) {
    console.log("CREATE ORDER ERROR =>", error);

    return res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// ================================
// GET ALL ORDERS (UPDATED WITH POPULATE)
// ================================
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      merchantId: req.user.id,
    })
    .populate("shipmentId")
    .populate("invoiceId")
    .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.log("ERROR =>", error);

    return res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// ================================
// GET SINGLE ORDER
// ================================
const getOrderById = async (req, res) => {
  try {
    let order;

    if (
      req.user.role === "ADMIN" ||
      req.user.role === "SUPER_ADMIN"
    ) {
      order = await Order.findById(req.params.id)
        .populate("shipmentId")
        .populate("invoiceId");
    } else {
      order = await Order.findOne({
        _id: req.params.id,
        merchantId: req.user.id,
      })
      .populate("shipmentId")
      .populate("invoiceId");
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================================
// UPDATE ORDER
// ================================
const updateOrder = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({
      orderId: req.params.id,
    });

    if (shipment) {
      return res.status(400).json({
        success: false,
        message: "Shipment already created. Order cannot be edited.",
      });
    }

    // Whitelist only safe-to-edit fields to prevent mass assignment vulnerability
    const allowedUpdates = {
      customerName: req.body.customerName,
      customerPhone: req.body.customerPhone,
      customerEmail: req.body.customerEmail,
      customerAddress: req.body.customerAddress,
      customerCity: req.body.customerCity || req.body.city,
      customerState: req.body.customerState || req.body.state,
      customerPincode: req.body.customerPincode || req.body.pincode,
      productName: req.body.productName,
      sku: req.body.sku,
      quantity: req.body.quantity,
      items: req.body.items,
      dimensions: req.body.dimensions,
      length: req.body.length,
      breadth: req.body.breadth,
      height: req.body.height,
      weight: req.body.weight,
      serviceType: req.body.serviceType || req.body.shippingMode,
      paymentMode: req.body.paymentMode,
      amount: req.body.amount,
      insuranceEnabled: req.body.insuranceEnabled,
      insuranceAmount: req.body.insuranceAmount,
      notes: req.body.notes
    };

    // Remove undefined properties
    Object.keys(allowedUpdates).forEach(
      key => allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );

    const order = await Order.findOneAndUpdate(
      {
        _id: req.params.id,
        merchantId: req.user.id,
      },
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    )
    .populate("shipmentId")
    .populate("invoiceId");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Order Updated Successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================================
// DELETE ORDER (UPDATED WITH SHIPMENT CHECK)
// ================================
const deleteOrder = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({
      orderId: req.params.id,
    });

    if (shipment) {
      return res.status(400).json({
        success: false,
        message: "Shipment already created. Order cannot be deleted.",
      });
    }

    const order = await Order.findOneAndDelete({
      _id: req.params.id,
      merchantId: req.user.id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Order Deleted Successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================================
// UPDATE ORDER STATUS
// ================================
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
      merchantId: req.user.id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.status = status;
    await order.save();

    res.status(200).json({
      success: true,
      message: "Status Updated Successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================================
// SEARCH ORDERS
// ================================
const searchOrders = async (req, res) => {
  try {
    const { keyword } = req.query;

    const orders = await Order.find({
      merchantId: req.user.id,
      $or: [
        { customerName: { $regex: keyword || "", $options: "i" } },
        { orderNumber: { $regex: keyword || "", $options: "i" } },
        { customerPhone: { $regex: keyword || "", $options: "i" } },
      ],
    })
    .populate("shipmentId")
    .populate("invoiceId");

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ====================================
// FLEXIBLE ROW NORMALIZATION HELPER
// ====================================
const normalizeOrderRow = (row) => {
  if (!row) return {};
  const getVal = (...keys) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
        return String(row[k]).trim();
      }
    }
    return "";
  };

  return {
    customerName: getVal("customerName", "Customer Name", "customer_name", "name", "Name"),
    customerPhone: getVal("customerPhone", "Customer Phone", "customer_phone", "phone", "Phone", "contact", "Contact"),
    customerEmail: getVal("customerEmail", "Customer Email", "customer_email", "email", "Email"),
    customerAddress: getVal("customerAddress", "Customer Address", "customer_address", "address", "Address"),
    customerCity: getVal("customerCity", "Customer City", "customer_city", "city", "City"),
    customerState: getVal("customerState", "Customer State", "customer_state", "state", "State"),
    customerPincode: getVal("customerPincode", "Customer Pincode", "customer_pincode", "pincode", "Pincode", "zip", "Zip"),
    productName: getVal("productName", "Product Name", "product_name", "product", "Product") || "General Cargo",
    quantity: Number(getVal("quantity", "Quantity", "qty", "Qty")) || 1,
    weight: Number(getVal("weight", "Weight", "weight_kg")) || 0.5,
    length: Number(getVal("length", "Length", "len")) || 10,
    breadth: Number(getVal("breadth", "Breadth", "width", "Width")) || 10,
    height: Number(getVal("height", "Height", "hgt")) || 10,
    amount: Number(getVal("amount", "Amount", "price", "Price", "order_amount")) || 0,
    paymentMode: getVal("paymentMode", "Payment Mode", "payment_mode", "payment_type") || "COD",
    serviceType: getVal("serviceType", "Service Type", "shippingMode", "service_type") || "Surface",
    sku: getVal("sku", "SKU", "sku_code") || "",
    notes: getVal("notes", "Notes", "remark", "Remark") || "",
  };
};

// ================================
// UPLOAD CSV ORDERS
// ================================
const uploadCSVOrders = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No CSV file uploaded",
      });
    }

    const results = [];
    const errors = [];
    let rowCount = 0;

    fs.createReadStream(req.file.path)
      .on("error", (err) => {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        if (!res.headersSent) {
          return res.status(400).json({
            success: false,
            message: "Failed to read CSV file",
            error: err.message,
          });
        }
      })
      .pipe(csv())
      .on("error", (err) => {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        if (!res.headersSent) {
          return res.status(400).json({
            success: false,
            message: "Failed to parse CSV",
            error: err.message,
          });
        }
      })
      .on("data", (rawRow) => {
        rowCount++;
        const data = normalizeOrderRow(rawRow);

        if (!data.customerName || !data.customerPhone || !data.customerAddress) {
          const missing = [];
          if (!data.customerName) missing.push("customerName");
          if (!data.customerPhone) missing.push("customerPhone");
          if (!data.customerAddress) missing.push("customerAddress");
          errors.push({
            row: rowCount,
            message: `Missing required fields: ${missing.join(", ")}`,
          });
          return;
        }

        if (!data.customerCity || !data.customerState || !data.customerPincode) {
          const missing = [];
          if (!data.customerCity) missing.push("customerCity");
          if (!data.customerState) missing.push("customerState");
          if (!data.customerPincode) missing.push("customerPincode");
          errors.push({
            row: rowCount,
            message: `Missing required address fields: ${missing.join(", ")}`,
          });
          return;
        }

        results.push(data);
      })
      .on("end", async () => {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        if (errors.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Validation failed for ${errors.length} rows`,
            errors,
          });
        }

        if (results.length === 0) {
          return res.status(400).json({
            success: false,
            message: "No valid data found in CSV file",
          });
        }

        const orders = results.map((row) => ({
          merchantId: req.user.id,
          orderNumber: generateOrderNumber(),
          customerName: row.customerName,
          customerPhone: row.customerPhone,
          customerAddress: row.customerAddress,
          customerEmail: row.customerEmail,
          customerCity: row.customerCity,
          customerState: row.customerState,
          customerPincode: row.customerPincode,
          productName: row.productName,
          quantity: row.quantity,
          weight: row.weight,
          length: row.length,
          breadth: row.breadth,
          height: row.height,
          sku: row.sku,
          amount: row.amount,
          paymentMode: row.paymentMode.toUpperCase() === "PREPAID" ? "PREPAID" : "COD",
          insuranceEnabled: false,
          serviceType: row.serviceType,
          notes: row.notes,
          status: "NEW",
        }));

        const insertedOrders = await Order.insertMany(orders);

        res.status(200).json({
          success: true,
          message: "CSV Uploaded Successfully",
          totalOrders: insertedOrders.length,
          orders: insertedOrders,
        });
      });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (err) {}
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================================
// UPLOAD EXCEL ORDERS
// ================================
const uploadExcelOrders = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No Excel file uploaded",
      });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet);

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    if (rawData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No data found in Excel file",
      });
    }

    const errors = [];
    const validData = [];

    rawData.forEach((rawRow, index) => {
      const row = normalizeOrderRow(rawRow);

      if (!row.customerName || !row.customerPhone || !row.customerAddress) {
        const missing = [];
        if (!row.customerName) missing.push("customerName");
        if (!row.customerPhone) missing.push("customerPhone");
        if (!row.customerAddress) missing.push("customerAddress");
        errors.push({
          row: index + 1,
          message: `Missing required fields: ${missing.join(", ")}`,
        });
        return;
      }

      if (!row.customerCity || !row.customerState || !row.customerPincode) {
        const missing = [];
        if (!row.customerCity) missing.push("customerCity");
        if (!row.customerState) missing.push("customerState");
        if (!row.customerPincode) missing.push("customerPincode");
        errors.push({
          row: index + 1,
          message: `Missing required address fields: ${missing.join(", ")}`,
        });
        return;
      }

      validData.push(row);
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Validation failed for ${errors.length} rows`,
        errors,
      });
    }

    const orders = validData.map((row) => ({
      merchantId: req.user.id,
      orderNumber: generateOrderNumber(),
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      customerAddress: row.customerAddress,
      customerEmail: row.customerEmail,
      customerCity: row.customerCity,
      customerState: row.customerState,
      customerPincode: row.customerPincode,
      productName: row.productName,
      quantity: row.quantity,
      weight: row.weight,
      length: row.length,
      breadth: row.breadth,
      height: row.height,
      sku: row.sku,
      amount: row.amount,
      paymentMode: row.paymentMode.toUpperCase() === "PREPAID" ? "PREPAID" : "COD",
      insuranceEnabled: false,
      serviceType: row.serviceType,
      notes: row.notes,
      status: "NEW",
    }));

    const insertedOrders = await Order.insertMany(orders);

    res.status(200).json({
      success: true,
      message: "Excel Uploaded Successfully",
      totalOrders: insertedOrders.length,
      orders: insertedOrders,
    });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (err) {}
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================================
// CANCEL ORDER 
// ================================
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      merchantId: req.user.id,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status === "CANCELLED") {
      return res.status(400).json({ success: false, message: "Order is already cancelled" });
    }

    if (["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Order cannot be cancelled as it is already in transit or delivered."
      });
    }

    if (order.awb || order.status === "READY_FOR_PICKUP" || order.shipmentId) {
      let courierRes;
      const courierPartner = (order.courierPartner || "").toLowerCase();

      // Route based on whether "shipmozo" is present in the courier name
      if (courierPartner.includes("shipmozo")) {
        courierRes = await cancelShipmozoShipment(order.orderNumber, order.awb);
      } else {
        // If it doesn't contain ShipMozo, it defaults to your NimbusPost shipments
        courierRes = await cancelNimbusShipment(order.awb);
      }
      
      if (!courierRes.success) {
        // If the courier has no record of it, it's safe to force cancel locally
        if (courierRes.message && courierRes.message.toLowerCase().includes("no records found")) {
          console.warn(`[API] Courier has no record of AWB ${order.awb}. Bypassing and cancelling locally.`);
        } else {
          return res.status(400).json({
            success: false,
            message: `Courier rejection: ${courierRes.message}`
          });
        }
      }

      if (order.shipmentId) {
        await Shipment.findByIdAndUpdate(order.shipmentId, { status: "CANCELLED" });
      }
    }

    order.status = "CANCELLED";
    order.timeline.push({
      status: "CANCELLED",
      message: order.awb ? "Shipment voided and order cancelled" : "Order cancelled",
      timestamp: new Date(),
      updatedBy: req.user.id
    });
    
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully"
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ================================
// BULK CANCEL ORDERS 
// ================================
const bulkCancelOrders = async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: "No order IDs provided" });
    }

    const orders = await Order.find({
      _id: { $in: orderIds },
      merchantId: req.user.id,
    });

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: "No eligible orders found." });
    }

    let successCount = 0;
    let errors = [];

    for (const order of orders) {
      if (order.status === "CANCELLED") continue;

      if (["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status)) {
        errors.push(`Order ${order.orderNumber}: Already in transit/delivered.`);
        continue;
      }

      if (order.awb || order.status === "READY_FOR_PICKUP" || order.shipmentId) {
        let courierRes;
        const courierPartner = (order.courierPartner || "").toLowerCase();

        // Route based on whether "shipmozo" is present in the courier name
        if (courierPartner.includes("shipmozo")) {
          courierRes = await cancelShipmozoShipment(order.orderNumber, order.awb);
        } else {
          // If it doesn't contain ShipMozo, it defaults to your NimbusPost shipments
          courierRes = await cancelNimbusShipment(order.awb);
        }
        
        if (!courierRes.success) {
          // If the courier has no record of it, bypass the error and allow local cancellation
          if (courierRes.message && courierRes.message.toLowerCase().includes("no records found")) {
            console.warn(`[API] Courier has no record of AWB ${order.awb} for Order ${order.orderNumber}. Bypassing.`);
          } else {
            errors.push(`Order ${order.orderNumber}: ${courierRes.message}`);
            continue; // Skip local DB update if it's a legitimate courier rejection
          }
        }

        if (order.shipmentId) {
          await Shipment.findByIdAndUpdate(order.shipmentId, { status: "CANCELLED" });
        }
      }

      order.status = "CANCELLED";
      order.timeline.push({
        status: "CANCELLED",
        message: order.awb ? "Bulk action: Shipment voided and order cancelled" : "Bulk action: Order cancelled",
        timestamp: new Date(),
        updatedBy: req.user.id
      });
      
      await order.save();
      successCount++;
    }

    res.status(200).json({
      success: true,
      message: `Successfully cancelled ${successCount} orders.`,
      matchedCount: orders.length,
      modifiedCount: successCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================================
// EXPORTS
// ================================
module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  updateOrderStatus,
  searchOrders,
  uploadCSVOrders,
  uploadExcelOrders,
  cancelOrder,
  bulkCancelOrders,
};