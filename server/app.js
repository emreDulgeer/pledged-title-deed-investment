// server/app.js

require("./models");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const connectDB = require("./config/db");
const errorHandler = require("./middlewares/errorHandler");

// ===== YENİ: Security middleware imports =====
const securityHeaders = require("./middlewares/securityHeaders");
const deviceDetection = require("./middlewares/deviceDetection");
const ipGeolocation = require("./middlewares/ipGeolocation");
const rateLimiter = require("./middlewares/rateLimiter");

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Initialize express app
const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== YENİ: Security middlewares (CORS'tan önce olmalı) =====
app.use(securityHeaders);
app.use(deviceDetection);
app.use(ipGeolocation);

// CORS middleware
app.use(cors());

// ===== YENİ: Rate limiting (global) =====
app.use(rateLimiter.light); // Genel API rate limit

// Dev logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Health check route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Pledged Title Deed Investment Platform API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
// ===== YENİ: Auth routes aktif ediliyor =====
app.use("/api/v1/auth", require("./routes/authRoutes"));
app.use("/api/v1/properties", require("./routes/propertyRoutes"));
app.use("/api/v1/investments", require("./routes/investmentRoutes"));
app.use("/api/v1/notifications", require("./routes/notificationRoutes"));
app.use("/api/v1/membership-plans", require("./routes/membershipPlanRoutes"));
// app.use("/api/v1/users", require("./routes/userRoutes")); // Sonra eklenecek

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler middleware (en sonda olmalı)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(
    `🚀 Server running in ${
      process.env.NODE_ENV || "development"
    } mode on port ${PORT}`
  );

  // ===== YENİ: Security jobs başlatılıyor =====
  if (process.env.NODE_ENV !== "test") {
    const securityJobs = require("./jobs/securityJobs");
    securityJobs.init();
    console.log("⏰ Security cron jobs initialized");
  }
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`❌ Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// ===== YENİ: Graceful shutdown =====
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received. Performing graceful shutdown...");
  server.close(() => {
    console.log("💤 Process terminated");
  });
});

module.exports = app; // Test için export
