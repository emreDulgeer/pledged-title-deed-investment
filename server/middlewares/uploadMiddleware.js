const fileUpload = require("./fileUploadMiddleware");

module.exports = {
  singleImage: fileUpload({
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ["image/*"],
  }).single("image"),
  multipleImages: fileUpload({
    maxSize: 10 * 1024 * 1024,
    maxFiles: 5,
    allowedTypes: ["image/*"],
  }).array("images", 5),
  singleDocument: fileUpload({
    maxSize: 50 * 1024 * 1024,
    allowedTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  }).single("document"),
  genericFile: fileUpload({ maxSize: 100 * 1024 * 1024 }).single("file"),
  genericFiles: fileUpload({ maxSize: 100 * 1024 * 1024, maxFiles: 10 }).array(
    "files",
    10
  ),
  propertyDocuments: fileUpload({
    maxSize: 50 * 1024 * 1024,
    maxFiles: 10,
    allowedTypes: ["application/pdf", "image/*"],
  }).array("documents", 10),
};
