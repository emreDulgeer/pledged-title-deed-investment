// server/app.js

require("./models");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const http = require("http");
const path = require("path");
const helmet = require("helmet"); // npm install helmet
const compression = require("compression"); // npm install compression
const connectDB = require("./config/db");
const errorHandler = require("./middlewares/errorHandler");
const { initializeSocket } = require("./utils/socket");
// Security middleware imports
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

// ===== Basic MIDDLEWARES =====

// Compression middleware - For performance
app.use(compression());

// Body parser middleware - Updated file upload limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ===== SECURITY MIDDLEWARES =====

// Helmet - Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Dosya önizleme için
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  }),
);

// security middlewares
app.use(securityHeaders);
app.use(deviceDetection);
app.use(ipGeolocation);

// CORS middlewares
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
        "http://localhost:5173",
        "http://localhost:3000",
      ];
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes("*")
      ) {
        callback(null, true);
      } else {
        callback(new Error("CORS policy violation"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-2FA-Token",
    ],
    exposedHeaders: [
      "X-Request-Id",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
    ],
  }),
);

// Rate limiting (global)
app.use(rateLimiter.light);

// Request ID middleware
app.use((req, res, next) => {
  req.id = require("crypto").randomBytes(8).toString("hex");
  res.setHeader("X-Request-Id", req.id);
  next();
});

// ===== STATIC FILES - Upload folder =====
// Uploads folder static serve
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"), {
    maxAge: "7d", // Cache süresi
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // cache settings
      if (filePath.endsWith(".pdf")) {
        res.setHeader("Cache-Control", "public, max-age=604800"); // 7 gün
      } else if (filePath.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        res.setHeader("Cache-Control", "public, max-age=2592000"); // 30 gün
      }

      // Security headers
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
    },
  }),
);

// Dev logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  // Production logging middleware - for error logging
  app.use(
    morgan("combined", {
      skip: (req, res) => res.statusCode < 400, // just logging errors
    }),
  );
}

// ===== API ROUTES =====

// Health check route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Pledged Title Deed Investment Platform API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    features: {
      fileUpload: true,
      maxFileSize: "100MB",
      supportedFormats: ["images", "documents", "archives"],
    },
  });
});

// API versions and documentation
app.get("/api/v1", (req, res) => {
  res.json({
    version: "1.0.0",
    endpoints: {
      auth: "/api/v1/auth",
      properties: "/api/v1/properties",
      investments: "/api/v1/investments",
      notifications: "/api/v1/notifications",
      membershipPlans: "/api/v1/membership-plans",
      files: "/api/v1/files", // Yeni eklenen
    },
    documentation: process.env.API_DOCS_URL || "/api-docs",
  });
});

// Routes

app.use("/api/v1/auth", require("./routes/authRoutes"));
app.use("/api/v1/geocoding", require("./routes/geocodingRoutes"));
app.use("/api/v1/properties", require("./routes/propertyRoutes"));
app.use("/api/v1/investments", require("./routes/investmentRoutes"));
app.use("/api/v1/notifications", require("./routes/notificationRoutes"));
app.use("/api/v1/membership-plans", require("./routes/membershipPlanRoutes"));
app.use("/api/v1/membership", require("./routes/membershipRoutes"));
// ===== New: File Management Routes =====
app.use("/api/v1/files", require("./routes/fileRoutesV2"));

// ===== ERROR HANDLING =====

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// Error handler middleware (en sonda olmalı)
app.use(errorHandler);

// ===== SERVER CONFIGURATION =====

const PORT = process.env.PORT || 5001;
const server = http.createServer(app);
initializeSocket(server);
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║     🏢 Pledged Title Deed Investment Platform     ║
║                                                    ║
║     🚀 Server Status: RUNNING                      ║
║     🌍 Environment: ${
    process.env.NODE_ENV || "development"
  }                  ║
║     🔌 Port: ${PORT}                              ║
║     📁 File Upload: ENABLED                       ║
║     🔒 Security: ACTIVE                           ║
║                                                    ║
╚════════════════════════════════════════════════════╝
    `);

  // Security jobs başlatma
  if (process.env.NODE_ENV !== "test") {
    const securityJobs = require("./jobs/securityJobs");
    securityJobs.init();
    console.log("⏰ Security cron jobs initialized");
  }

  // File storage service initialization
  const fileStorageService = require("./services/FileUploadManager");
  console.log("📁 File storage service initialized");
});

// ===== PROCESS ERROR HANDLING =====

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`❌ Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received. Performing graceful shutdown...");
  server.close(() => {
    console.log("💤 Process terminated");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\n👋 SIGINT received. Performing graceful shutdown...");
  server.close(() => {
    console.log("💤 Process terminated");
    process.exit(0);
  });
});

module.exports = app; // export for testing
