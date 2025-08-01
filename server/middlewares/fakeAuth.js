const mongoose = require("mongoose");
require("dotenv").config();
require("../models"); // User modellerini yükle
const User = require("../models/User");

mongoose.connect(
  process.env.MONGO_URI || "mongodb://localhost:27017/pledged_platform",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

module.exports = (role = "property_owner") => {
  return async (req, res, next) => {
    try {
      const user = await User.findOne({ role });

      if (!user) {
        return res.status(403).json({
          success: false,
          message: `No ${role} user found in database.`,
        });
      }

      req.user = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        country: user.country,
        membershipPlan: user.membershipPlan || "Basic",
        kycStatus: user.kycStatus || "Pending",
        region: user.region || undefined,
        assignedCountry: user.assignedCountry || undefined,
      };

      next();
    } catch (error) {
      console.error("❌ fakeAuth error:", error);
      res.status(500).json({
        success: false,
        message: "Fake authentication failed.",
      });
    }
  };
};
