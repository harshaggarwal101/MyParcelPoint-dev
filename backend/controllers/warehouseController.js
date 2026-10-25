const Warehouse = require("../models/Warehouse");

// ================================
// Create Warehouse
// ================================
exports.createWarehouse = async (req, res) => {
  try {
    const merchantId = req.user.id;

    const {
      warehouseName,
      companyName,
      contactPerson,
      phone,
      alternatePhone,
      email,
      gstNumber,
      panNumber,
      addressLine1,
      addressLine2,
      landmark,
      city,
      state,
      pincode,
      country,
      pickupStartTime,
      pickupEndTime,
      workingDays,
      warehouseType,
      pickupInstructions,
      latitude,
      longitude,
      dailyCapacity,
      allowCOD,
      allowReversePickup,
      isDefault,
    } = req.body;

    // Validate required fields
    if (
      !warehouseName ||
      !companyName ||
      !contactPerson ||
      !phone ||
      !addressLine1 ||
      !city ||
      !state ||
      !pincode
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields.",
      });
    }

    // Check for duplicate warehouse names (case-insensitive)
    const escapedName = warehouseName
      .trim()
      .replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

    const duplicate = await Warehouse.findOne({
      merchantId,
      warehouseName: {
        $regex: `^${escapedName}$`,
        $options: "i",
      },
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "Warehouse already exists (case-insensitive duplicate check).",
      });
    }

    // If this is the default warehouse, unset other defaults
    if (isDefault) {
      await Warehouse.updateMany(
        { merchantId },
        { $set: { isDefault: false } },
      );
    }

    // Generate a unique warehouse code
    const warehouseCode = `WH-${Date.now()}-${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")}`;

    // Create warehouse
    const warehouse = await Warehouse.create({
      merchantId,
      warehouseCode,
      warehouseName,
      companyName,
      contactPerson,
      phone,
      alternatePhone,
      email,
      gstNumber,
      panNumber,
      addressLine1,
      addressLine2,
      landmark,
      city,
      state,
      pincode,
      country,
      pickupStartTime,
      pickupEndTime,
      workingDays,
      warehouseType,
      pickupInstructions,
      latitude,
      longitude,
      dailyCapacity,
      allowCOD,
      allowReversePickup,
      isDefault,
    });

    return res.status(201).json({
      success: true,
      message: "Warehouse created successfully.",
      warehouse,
    });
  } catch (error) {
    // Log the complete error on the backend
    console.error("Create Warehouse Error:", error);

    // Handle Mongoose schema validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Warehouse validation failed.",
        errors: validationErrors,
      });
    }

    // Handle duplicate database key errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A warehouse with this unique value already exists.",
      });
    }

    // Handle invalid field types, such as a non-numeric value
    // supplied for a numeric field
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: `Invalid value for field: ${error.path}.`,
      });
    }

    // Keep unexpected internal errors generic for the client
    return res.status(500).json({
      success: false,
      message: "Failed to create warehouse.",
    });
  }
};

// ================================
// Get All Warehouses
// ================================
exports.getWarehouses = async (req, res) => {
  try {
    const merchantId = req.user.id;

    const { search = "", status, page = 1, limit = 10 } = req.query;

    const query = {
      merchantId,
    };

    if (search) {
      query.$or = [
        {
          warehouseName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          city: {
            $regex: search,
            $options: "i",
          },
        },
        {
          state: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    if (status === "active") {
      query.isActive = true;
    }

    if (status === "inactive") {
      query.isActive = false;
    }

    const warehouses = await Warehouse.find(query)
      .sort({
        isDefault: -1,
        createdAt: -1,
      })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Warehouse.countDocuments(query);

    return res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      warehouses,
    });
  } catch (error) {
    console.error("Get Warehouses Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch warehouses.",
    });
  }
};

// ================================
// Get Warehouse By Id
// ================================
exports.getWarehouseById = async (req, res) => {
  try {
    const warehouse = await Warehouse.findOne({
      _id: req.params.id,
      merchantId: req.user.id,
    });

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found.",
      });
    }

    return res.json({
      success: true,
      warehouse,
    });
  } catch (error) {
    console.error("Get Warehouse By Id Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch warehouse.",
    });
  }
};

// ================================
// Update Warehouse
// ================================
exports.updateWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findOne({
      _id: req.params.id,
      merchantId: req.user.id,
    });

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found.",
      });
    }

    if (req.body.isDefault) {
      await Warehouse.updateMany(
        {
          merchantId: req.user.id,
        },
        {
          $set: {
            isDefault: false,
          },
        },
      );
    }

    // Whitelist updatable fields
    const ALLOWED_UPDATE_FIELDS = [
      "warehouseName",
      "companyName",
      "contactPerson",
      "phone",
      "alternatePhone",
      "email",
      "gstNumber",
      "panNumber",
      "addressLine1",
      "addressLine2",
      "landmark",
      "city",
      "state",
      "pincode",
      "country",
      "pickupStartTime",
      "pickupEndTime",
      "workingDays",
      "warehouseType",
      "pickupInstructions",
      "latitude",
      "longitude",
      "dailyCapacity",
      "allowCOD",
      "allowReversePickup",
      "isDefault",
      "isActive",
    ];

    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (req.body[field] !== undefined) {
        warehouse[field] = req.body[field];
      }
    }

    await warehouse.save();

    return res.json({
      success: true,
      message: "Warehouse updated successfully.",
      warehouse,
    });
  } catch (error) {
    console.error("Update Warehouse Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update warehouse.",
    });
  }
};

// ================================
// Delete Warehouse
// ================================
exports.deleteWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findOne({
      _id: req.params.id,
      merchantId: req.user.id,
    });

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found.",
      });
    }

    if (warehouse.isDefault) {
      return res.status(400).json({
        success: false,
        message: "Default warehouse cannot be deleted.",
      });
    }

    // Check for active shipments using this warehouse
    const Shipment = require("../models/Shipment");

    const activeShipments = await Shipment.countDocuments({
      warehouseId: warehouse._id,
      status: {
        $nin: ["DELIVERED", "CANCELLED", "RTO_COMPLETED"],
      },
    });

    if (activeShipments > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete warehouse. It is linked to ${activeShipments} active shipment(s).`,
      });
    }

    await warehouse.deleteOne();

    return res.json({
      success: true,
      message: "Warehouse deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Warehouse Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete warehouse.",
    });
  }
};

// ================================
// Set Default Warehouse
// ================================
exports.setDefaultWarehouse = async (req, res) => {
  try {
    const merchantId = req.user.id;

    const warehouse = await Warehouse.findOne({
      _id: req.params.id,
      merchantId,
    });

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found.",
      });
    }

    await Warehouse.updateMany(
      { merchantId },
      {
        $set: {
          isDefault: false,
        },
      },
    );

    warehouse.isDefault = true;

    await warehouse.save();

    return res.json({
      success: true,
      message: "Default warehouse updated successfully.",
      warehouse,
    });
  } catch (error) {
    console.error("Set Default Warehouse Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update default warehouse.",
    });
  }
};
