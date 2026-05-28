const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const helmet = require("helmet");
const compression = require("compression");
const errorHandler = require("./middlewares/errorHandler");
const securityHeaders = require("./middlewares/securityHeaders");
const deviceDetection = require("./middlewares/deviceDetection");
const ipGeolocation = require("./middlewares/ipGeolocation");
const rateLimiter = require("./middlewares/rateLimiter");

const createApp = () => {
  const app = express();

  app.use(compression());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: {
        policy: "cross-origin",
      },
    }),
  );

  app.use(securityHeaders);
  app.use(deviceDetection);
  app.use(ipGeolocation);

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

  app.use(rateLimiter.light);

  app.use((req, res, next) => {
    req.id = require("crypto").randomBytes(8).toString("hex");
    res.setHeader("X-Request-Id", req.id);
    next();
  });

  app.use(
    "/uploads",
    express.static(path.join(__dirname, "../uploads"), {
      maxAge: "7d",
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".pdf")) {
          res.setHeader("Cache-Control", "public, max-age=604800");
        } else if (filePath.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          res.setHeader("Cache-Control", "public, max-age=2592000");
        }

        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "DENY");
      },
    }),
  );

  if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
  } else {
    app.use(
      morgan("combined", {
        skip: (req, res) => res.statusCode < 400,
      }),
    );
  }

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

  app.get("/api/v1", (req, res) => {
    res.json({
      version: "1.0.0",
      endpoints: {
        auth: "/api/v1/auth",
        properties: "/api/v1/properties",
        investments: "/api/v1/investments",
        notifications: "/api/v1/notifications",
        membershipPlans: "/api/v1/membership-plans",
        files: "/api/v1/files",
      },
      documentation: process.env.API_DOCS_URL || "/api-docs",
    });
  });

  app.use("/api/v1/auth", require("./routes/authRoutes"));
  app.use("/api/v1/geocoding", require("./routes/geocodingRoutes"));
  app.use("/api/v1/properties", require("./routes/propertyRoutes"));
  app.use("/api/v1/investments", require("./routes/investmentRoutes"));
  app.use("/api/v1/notifications", require("./routes/notificationRoutes"));
  app.use("/api/v1/membership-plans", require("./routes/membershipPlanRoutes"));
  app.use("/api/v1/membership", require("./routes/membershipRoutes"));
  app.use("/api/v1/files", require("./routes/fileRoutesV2"));

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: "Route not found",
      path: req.originalUrl,
      method: req.method,
    });
  });

  app.use(errorHandler);

  return app;
};

module.exports = createApp;
