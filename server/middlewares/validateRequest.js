const { validationResult } = require("express-validator");
const responseWrapper = require("../utils/responseWrapper");

/**
 * Validate request based on express-validator rules
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.param,
      message: error.msg,
    }));

    return responseWrapper.badRequest(res, "Validation hatası", {
      errors: errorMessages,
    });
  }

  next();
};

module.exports = validateRequest;
