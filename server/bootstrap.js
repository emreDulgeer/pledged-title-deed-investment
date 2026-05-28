require("./models");
const dotenv = require("dotenv");
const http = require("http");
const connectDB = require("./config/db");
const createApp = require("./app");
const { initializeSocket } = require("./utils/socket");

dotenv.config();

const printStartupBanner = (port) => {
  console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║     🏢 Pledged Title Deed Investment Platform     ║
║                                                    ║
║     🚀 Server Status: RUNNING                      ║
║     🌍 Environment: ${
    process.env.NODE_ENV || "development"
  }                  ║
║     🔌 Port: ${port}                              ║
║     📁 File Upload: ENABLED                       ║
║     🔒 Security: ACTIVE                           ║
║                                                    ║
╚════════════════════════════════════════════════════╝
  `);
};

const registerProcessHandlers = (server) => {
  process.on("unhandledRejection", (err) => {
    console.log(`❌ Error: ${err.message}`);
    server.close(() => process.exit(1));
  });

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
};

const startServer = async () => {
  await connectDB();

  const app = createApp();
  const port = process.env.PORT || 5001;
  const server = http.createServer(app);

  initializeSocket(server);
  registerProcessHandlers(server);

  await new Promise((resolve) => {
    server.listen(port, resolve);
  });

  printStartupBanner(port);

  if (process.env.NODE_ENV !== "test") {
    const securityJobs = require("./jobs/securityJobs");
    securityJobs.init();
    console.log("⏰ Security cron jobs initialized");
  }

  require("./services/FileUploadManager");
  console.log("📁 File storage service initialized");

  return { app, server, port };
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error("❌ Server startup error:", error.message);
    process.exit(1);
  });
}

module.exports = {
  startServer,
};
