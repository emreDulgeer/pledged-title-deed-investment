const UAParser = require("ua-parser-js");

/**
 * Detect device information from user agent
 */
const deviceDetection = (req, res, next) => {
  const parser = new UAParser();
  const ua = req.get("user-agent");
  const result = parser.setUA(ua).getResult();

  req.device = {
    browser: result.browser.name || "unknown",
    browserVersion: result.browser.version || "unknown",
    os: result.os.name || "unknown",
    osVersion: result.os.version || "unknown",
    device: result.device.type || "desktop",
    deviceVendor: result.device.vendor || "unknown",
    deviceModel: result.device.model || "unknown",
  };

  next();
};

module.exports = deviceDetection;
