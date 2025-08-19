const express = require("express");
const router = express.Router();
const fileController = require("../controllers/fileController");
const auth = require("../middlewares/auth");
const authorize = require("../middlewares/authorize");
const rateLimiter = require("../middlewares/rateLimiter");
const upload = require("../middlewares/uploadMiddleware");

// ===== PUBLIC ROUTES =====

// Dosya önizleme (public)
router.get("/preview/:fileName", fileController.previewFile);

// ===== AUTHENTICATED ROUTES =====

// Tek dosya yükleme
router.post(
  "/upload",
  auth,
  rateLimiter.uploadLimiter,
  upload.genericFile,
  fileController.uploadFile
);

// Çoklu dosya yükleme
router.post(
  "/upload-multiple",
  auth,
  rateLimiter.uploadLimiter,
  upload.genericFiles, // çoklu için kendi middleware’inde array versiyonunu da ekleyebilirsin
  fileController.uploadMultipleFiles
);

// Property dökümanı yükleme
router.post(
  "/property-document",
  auth,
  authorize(["property_owner", "admin"]),
  rateLimiter.uploadLimiter,
  upload.singleDocument, // çoklu için kendi middleware’inde array versiyonunu da ekleyebilirsin
  fileController.uploadPropertyDocument
);

// Dosya indirme
router.get(
  "/download/:fileName",
  rateLimiter.downloadLimiter,
  fileController.downloadFile
);

// Dosya silme
router.delete(
  "/delete/:fileName",
  auth,
  rateLimiter.moderate,
  fileController.deleteFile
);

// Dosyaları listeleme
router.get("/list", auth, fileController.listFiles);
// Dosya bilgisi
router.get("/info/:fileName", auth, fileController.getFileInfo);

module.exports = router;
