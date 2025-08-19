const multer = require("multer");
const path = require("path");

const fileUploadMiddleware = (options = {}) => {
  const {
    maxSize = 100 * 1024 * 1024,
    maxFiles = 10,
    allowedTypes = null,
  } = options;

  const storage = multer.memoryStorage();

  const fileFilter = (req, file, cb) => {
    const original = file.originalname;

    // Path traversal & null byte
    if (
      original.includes("..") ||
      original.includes("/") ||
      original.includes("\\") ||
      /\0/.test(original)
    ) {
      return cb(new Error("Güvenlik: Geçersiz dosya adı"), false);
    }

    // Tehlikeli uzantılar
    const dangerous = [
      "exe",
      "dll",
      "bat",
      "cmd",
      "sh",
      "ps1",
      "vbs",
      "jar",
      "app",
      "deb",
      "rpm",
      "msi",
      "com",
      "scr",
      "hta",
      "cpl",
      "msc",
      "js",
      "jse",
      "ws",
      "wsf",
      "scf",
      "lnk",
      "inf",
      "reg",
    ];
    const ext = path.extname(original).toLowerCase().slice(1);
    if (dangerous.includes(ext)) {
      return cb(new Error(`Güvenlik: ${ext} dosyaları engellenmiştir`), false);
    }

    // allowedTypes kontrolü (varsa)
    if (allowedTypes?.length) {
      const ok = allowedTypes.some((t) =>
        t.includes("*")
          ? file.mimetype.startsWith(t.split("/")[0])
          : file.mimetype === t
      );
      if (!ok)
        return cb(
          new Error(`Dosya tipi desteklenmiyor: ${file.mimetype}`),
          false
        );
    }

    cb(null, true);
  };

  return multer({
    storage,
    limits: {
      fileSize: maxSize,
      files: maxFiles,
      fieldSize: 10 * 1024 * 1024,
      fieldNameSize: 100,
    },
    fileFilter,
  });
};

module.exports = fileUploadMiddleware;
