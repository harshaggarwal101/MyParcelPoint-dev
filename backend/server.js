const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const morgan = require("morgan");

// Routes
const authRoutes = require("./routes/authRoutes");
const merchantRoutes = require("./routes/merchantRoutes");
const orderRoutes = require("./routes/orderRoutes");
const shipmentRoutes = require("./routes/shipmentRoutes");
const trackingRoutes = require("./routes/trackingRoutes");
const walletRoutes = require("./routes/walletRoutes");
const billingRoutes = require("./routes/billingRoutes");
const reportRoutes = require("./routes/reportRoutes");
const adminRoutes = require("./routes/adminRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const courierRoutes = require("./routes/courierRoutes");
const codRoutes = require("./routes/codRoutes");
const ndrRoutes = require("./routes/ndrRoutes");
const rtoRoutes = require("./routes/rtoRoutes");
const rateCardRoutes = require("./routes/rateCardRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const warehouseRoutes = require("./routes/warehouseRoutes");
const remittanceRoutes = require("./routes/remittanceRoutes");
const channelRoutes = require("./routes/channelRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const { startChannelPolling } = require("./services/channelPollingService");
const app = express();

// ====================================
// CORS
// ====================================

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://myparcelpoint-dev-frontend.onrender.com",
];

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : defaultAllowedOrigins
)
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without an Origin header, such as server-to-server calls.
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        (process.env.NODE_ENV !== "production" &&
          origin.startsWith("http://localhost:"))
      ) {
        return callback(null, true);
      }

      console.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// ====================================
// SECURITY HEADERS & RATE LIMITING
// ====================================
app.set("trust proxy", 1);
app.use(helmet());

// Rate Limiter disabled to prevent IP blocking during development & merchant operations
// const apiLimiter = rateLimit({ ... });
// app.use("/api", apiLimiter);

// ====================================
// MIDDLEWARE
// ====================================
if (process.env.NODE_ENV !== "production") {
  console.warn(
    "⚠️  WARNING: NODE_ENV is not 'production' — verify this is intentional.",
  );
}
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(
  ["/api/couriers/webhook", "/api/wallet/webhook"],
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

// Serve Uploaded Files Statically (KYC Documents, Labels, Profile Pics, Tickets, etc.)
// Security headers attached strictly for this directory to bypass Helmet Same-Origin blocks
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, path, stat) => {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Cross-Origin-Resource-Policy", "cross-origin");
    },
  }),
);

// Ensure database connection for requests (vital for Vercel serverless functions)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB connection error in middleware:", err);
    next(err);
  }
});

// ====================================
// HEALTH CHECK
// ====================================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "MyParcelPoint Backend Running ",
  });
});

// ====================================
// API ROUTES
// ====================================
app.use("/api/auth", authRoutes);
app.use("/api/merchant", merchantRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/shipments", shipmentRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/couriers", courierRoutes);
app.use("/api/cod", codRoutes);
app.use("/api/ndr", ndrRoutes);
app.use("/api/rto", rtoRoutes);
app.use("/api/ratecards", rateCardRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/remittance", remittanceRoutes);
app.use("/api/channels", channelRoutes);
// Webhook receivers (Shopify & WooCommerce real-time order events)
// Must use raw body parser — registered BEFORE express.json() middleware
app.use("/api/webhooks", webhookRoutes);

// ====================================
// 404 HANDLER
// ====================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found",
  });
});

// ====================================
// GLOBAL ERROR HANDLER
// ====================================
app.use((err, req, res, next) => {
  console.error("ERROR =>", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ====================================
// SERVER
// ====================================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    // Start channel auto-polling cron jobs (15-min poll + 1-hr retry)
    startChannelPolling();
    const server = app.listen(PORT, () => {
      console.log(` Server Running On Port ${PORT}`);
    });

    const mongoose = require("mongoose");
    const gracefulShutdown = async (signal) => {
      console.log(`${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        try {
          await mongoose.connection.close();
          console.log("MongoDB connection closed.");
          process.exit(0);
        } catch (error) {
          console.error("Error closing MongoDB connection:", error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        console.error("Forced shutdown after timeout.");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

if (!process.env.VERCEL) {
  startServer();
}

// ====================================
// PROCESS CRASH GUARDS
// ====================================
process.on("unhandledRejection", (err) => {
  console.error("[UnhandledRejection]", err);
});

process.on("uncaughtException", (err) => {
  console.error("[UncaughtException]", err);
  process.exit(1);
});

module.exports = app;
