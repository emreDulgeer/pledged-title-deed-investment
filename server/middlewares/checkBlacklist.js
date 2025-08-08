const BlacklistedToken = require("../models/BlacklistedToken");
const responseWrapper = require("../utils/responseWrapper");

/**
 * Check if token is blacklisted
 */
const checkBlacklist = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return next();
    }

    const blacklisted = await BlacklistedToken.findOne({ token });

    if (blacklisted) {
      return responseWrapper.unauthorized(res, "Token has been revoked");
    }

    next();
  } catch (error) {
    console.error("Blacklist check error:", error);
    next();
  }
};

module.exports = checkBlacklist;
