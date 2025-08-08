const geoip = require("geoip-lite");

/**
 * Get geolocation from IP address
 */
const ipGeolocation = (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const geo = geoip.lookup(ip);

    if (geo) {
      req.location = {
        country: geo.country,
        region: geo.region,
        city: geo.city,
        coordinates: {
          lat: geo.ll[0],
          lng: geo.ll[1],
        },
        timezone: geo.timezone,
      };
    } else {
      req.location = null;
    }

    next();
  } catch (error) {
    console.error("IP geolocation error:", error);
    req.location = null;
    next();
  }
};

module.exports = ipGeolocation;
