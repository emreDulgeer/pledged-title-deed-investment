const express = require("express");

const buildNoopMiddleware = () => (req, res, next) => next();

const buildTestUser = (role) => ({
  _id: "507f1f77bcf86cd799439011",
  id: "507f1f77bcf86cd799439011",
  email: `${role}@test.local`,
  role,
  fullName: `Test ${role}`,
  membershipPlan: "Pro",
  membershipStatus: "active",
  kycStatus: "Approved",
  country: "Portugal",
});

const buildAuthMock = () => {
  const auth = (req, res, next) => {
    const role = req.header("x-test-role");

    if (!role) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized Access",
        statusCode: 401,
      });
    }

    req.user = buildTestUser(role);
    req.userDetails =
      role === "admin"
        ? { accessLevel: "super_admin" }
        : { role, country: req.user.country };

    next();
  };

  auth.optional = (req, res, next) => {
    const role = req.header("x-test-role");

    if (role) {
      req.user = buildTestUser(role);
      req.userDetails =
        role === "admin"
          ? { accessLevel: "super_admin" }
          : { role, country: req.user.country };
    } else {
      req.user = null;
      req.userDetails = null;
    }

    next();
  };

  auth.skipKYC = (req, res, next) => {
    req.skipKYCCheck = true;
    return auth(req, res, next);
  };

  return auth;
};

const buildRateLimiterMock = () => {
  const noop = buildNoopMiddleware();

  return {
    light: noop,
    moderate: noop,
    strict: noop,
    uploadLimiter: noop,
    downloadLimiter: noop,
    heavyOperation: noop,
    passwordReset: noop,
    emailVerification: noop,
    dynamicRoleLimiter: noop,
    createCustomLimiter: () => noop,
  };
};

const buildControllerDouble = (moduleName, statusOverrides = {}) => {
  const handlers = {};

  const controller = new Proxy(
    {},
    {
      get(target, prop) {
        if (typeof prop !== "string") {
          return target[prop];
        }

        if (!handlers[prop]) {
          const statusCode =
            statusOverrides[prop] ||
            (/^(create|upload|register|activate)/i.test(prop) ? 201 : 200);

          handlers[prop] = jest.fn((req, res) => {
            res.status(statusCode).json({
              success: true,
              data: {
                module: moduleName,
                action: prop,
                params: req.params,
                query: req.query,
                body: req.body,
                user: req.user
                  ? {
                      id: req.user.id,
                      role: req.user.role,
                    }
                  : null,
              },
              message: `${moduleName}.${prop} handled`,
              statusCode,
            });
          });
        }

        return handlers[prop];
      },
    },
  );

  return { controller, handlers };
};

const buildEmptyRouter = () => express.Router();

const buildModelMock = () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
});

const createIntegrationApp = () => {
  let app;
  let doubles;

  jest.resetModules();

  jest.isolateModules(() => {
    process.env.NODE_ENV = "test";

    const authController = buildControllerDouble("auth", { register: 201 });
    const profileController = buildControllerDouble("profile");
    const propertyController = buildControllerDouble("property", {
      createProperty: 201,
    });
    const propertyFileController = buildControllerDouble("propertyFile", {
      uploadPropertyImage: 201,
      uploadPropertyDocument: 201,
    });
    const investmentController = buildControllerDouble("investment", {
      createInvestmentOffer: 201,
    });
    const investmentFileController = buildControllerDouble("investmentFile", {
      uploadContract: 201,
      uploadTitleDeed: 201,
      uploadPaymentReceipt: 201,
      uploadRentalReceipt: 201,
      uploadAdditionalDocument: 201,
    });
    const membershipController = buildControllerDouble("membership");
    const fileController = buildControllerDouble("file", {
      uploadSingle: 201,
      uploadMultiple: 201,
      uploadPropertyDocument: 201,
    });

    doubles = {
      auth: authController.handlers,
      profile: profileController.handlers,
      property: propertyController.handlers,
      propertyFile: propertyFileController.handlers,
      investment: investmentController.handlers,
      investmentFile: investmentFileController.handlers,
      membership: membershipController.handlers,
      file: fileController.handlers,
    };

    jest.doMock("morgan", () => () => buildNoopMiddleware());
    jest.doMock("../../middlewares/auth", () => buildAuthMock());
    jest.doMock("../../middlewares/rateLimiter", () => buildRateLimiterMock());

    jest.doMock("../../controllers/authController", () => authController.controller);
    jest.doMock(
      "../../controllers/profileController",
      () => profileController.controller,
    );
    jest.doMock(
      "../../controllers/propertyController",
      () => propertyController.controller,
    );
    jest.doMock(
      "../../controllers/propertyFileController",
      () => propertyFileController.controller,
    );
    jest.doMock(
      "../../controllers/investmentController",
      () => investmentController.controller,
    );
    jest.doMock(
      "../../controllers/investmentFileController",
      () => investmentFileController.controller,
    );
    jest.doMock(
      "../../controllers/membershipController",
      () => membershipController.controller,
    );
    jest.doMock("../../controllers/fileControllerV2", () => fileController.controller);

    jest.doMock("../../routes/geocodingRoutes", () => buildEmptyRouter());
    jest.doMock("../../routes/notificationRoutes", () => buildEmptyRouter());
    jest.doMock("../../routes/membershipPlanRoutes", () => buildEmptyRouter());

    jest.doMock("../../models/User", () => buildModelMock());
    jest.doMock("../../services/notificationService", () => ({}));
    jest.doMock("../../services/membershipService", () => ({}));

    const createApp = require("../../app");
    app = createApp();
  });

  return {
    app,
    doubles,
  };
};

module.exports = {
  createIntegrationApp,
};
