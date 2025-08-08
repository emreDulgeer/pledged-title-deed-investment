const ActivityLog = require("../models/ActivityLog");

/**
 * Log critical actions
 */
const auditLog = (action, severity = "low") => {
  return async (req, res, next) => {
    try {
      // Store original send function
      const originalSend = res.send;

      // Override send function
      res.send = function (data) {
        // Log only if response is successful
        if (res.statusCode >= 200 && res.statusCode < 300) {
          ActivityLog.create({
            user: req.user?.id,
            action,
            details: {
              method: req.method,
              path: req.path,
              query: req.query,
              ip: req.ip,
              userAgent: req.get("user-agent"),
            },
            ip: req.ip,
            severity,
            performedBy: req.user?.id,
          }).catch(console.error);
        }

        // Call original send
        originalSend.call(this, data);
      };

      next();
    } catch (error) {
      console.error("Audit log error:", error);
      next();
    }
  };
};

module.exports = auditLog;
