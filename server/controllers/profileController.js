const ProfileService = require("../services/profileService");
const responseWrapper = require("../utils/responseWrapper");

class ProfileController {
  constructor() {
    this.profileService = new ProfileService();
  }

  getProfileById = async (req, res) => {
    try {
      const profile = await this.profileService.getProfileById(
        req.params.userId,
        req.user || null,
      );

      return responseWrapper.success(
        res,
        profile,
        "Profile fetched successfully",
      );
    } catch (error) {
      if (error.message === "Profile not found") {
        return responseWrapper.notFound(res, "Profile not found");
      }

      return responseWrapper.error(res, error.message);
    }
  };
}

module.exports = new ProfileController();
