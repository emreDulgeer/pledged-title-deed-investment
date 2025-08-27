const auth = require("./auth");

module.exports = function optionalAuth(req, res, next) {
  const h = req.headers?.authorization || "";
  if (h.startsWith("Bearer ")) {
    // Token varsa normal auth çalışsın
    return auth(req, res, next);
  }
  // Token yoksa user'ı boş bırak, devam et
  return next();
};
