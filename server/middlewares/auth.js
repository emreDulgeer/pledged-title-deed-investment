// server/middlewares/auth.js

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const responseWrapper = require("../utils/responseWrapper");

const auth = async (req, res, next) => {
  try {
    // Token'ı header'dan al
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return responseWrapper.unauthorized(res, "Lütfen giriş yapın");
    }

    // Token'ı doğrula
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    // Kullanıcıyı bul
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return responseWrapper.unauthorized(res, "Geçersiz token");
    }

    // KYC kontrolü (opsiyonel - ihtiyaca göre kaldırabilirsiniz)
    if (user.kycStatus !== "Approved" && !["admin"].includes(user.role)) {
      return responseWrapper.forbidden(res, "KYC onayı bekleniyor");
    }

    // User bilgisini request'e ekle
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      membershipPlan: user.membershipPlan,
      kycStatus: user.kycStatus,
    };

    // Role'e göre discriminator model'ini yükle
    switch (user.role) {
      case "investor":
        const Investor = require("../models/Investor");
        req.userDetails = await Investor.findById(user._id).select("-password");
        break;
      case "property_owner":
        const PropertyOwner = require("../models/PropertyOwner");
        req.userDetails = await PropertyOwner.findById(user._id).select(
          "-password"
        );
        break;
      case "local_representative":
        const LocalRepresentative = require("../models/LocalRepresentative");
        req.userDetails = await LocalRepresentative.findById(user._id).select(
          "-password"
        );
        break;
      case "admin":
        const Admin = require("../models/Admin");
        req.userDetails = await Admin.findById(user._id).select("-password");
        break;
    }

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return responseWrapper.unauthorized(res, "Geçersiz token");
    }
    if (error.name === "TokenExpiredError") {
      return responseWrapper.unauthorized(res, "Token süresi dolmuş");
    }
    return responseWrapper.error(res, "Authentication hatası");
  }
};

module.exports = auth;
