// server/controllers/propertyFileController.js

const responseWrapper = require("../utils/responseWrapper");
const FileUploadManager = require("../services/FileUploadManager");
const FileMetadata = require("../models/FileMetadata");
const Property = require("../models/Property");
const {
  clampPercentage,
  normalizePropertyImagePresentation,
} = require("../utils/propertyImages");

const toRequestArray = (value) =>
  Array.isArray(value) ? value : value !== undefined ? [value] : [];

const parseImageWarnings = (value) => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch (error) {
    return [];
  }
};

class PropertyFileController {
  constructor() {
    this.fileUploadManager = new FileUploadManager();
  }

  buildPendingPreviewUrl() {
    return `/api/v1/files/preview/pending`;
  }

  buildPreviewUrl(fileId) {
    return `/api/v1/files/preview/${fileId}`;
  }

  createPropertyUploadManager({
    maxFileSize,
    allowedExtensions,
    generateThumbnails = false,
  }) {
    return new FileUploadManager({
      maxFileSize,
      allowedExtensions,
      enableSecurityValidation: false,
      enableMagicNumberCheck: false,
      enableContentValidation: false,
      generateThumbnails,
      extractMetadata: false,
      uploadStrategy: "multer",
      storageType: process.env.STORAGE_TYPE || "local",
      cloudConfig: {
        endPoint: process.env.MINIO_ENDPOINT,
        port: process.env.MINIO_PORT,
        useSSL: process.env.MINIO_USE_SSL,
        accessKey: process.env.MINIO_ACCESS_KEY,
        secretKey: process.env.MINIO_SECRET_KEY,
        bucket: process.env.MINIO_BUCKET,
        publicBaseUrl: process.env.MINIO_PUBLIC_URL,
      },
    });
  }

  // Property görseli yükle
  uploadPropertyImage = async (req, res) => {
    try {
      const userId = req.user._id;
      const userRole = req.user.role;
      const propertyId = req.params.id;

      // Property kontrolü
      const property = await Property.findById(propertyId);
      if (!property) {
        return responseWrapper.notFound(res, "Property not found");
      }

      // Yetki kontrolü
      const isOwner = property.owner.toString() === userId.toString();
      if (!isOwner && userRole !== "admin") {
        return responseWrapper.forbidden(
          res,
          "Unauthorized to upload images for this property"
        );
      }

      // FileUploadManager kullanarak dosyaları yükle
      const uploadConfig = {
        directory: `properties/${propertyId}/Images`,
        metadata: {
          relatedModel: "Property",
          relatedId: propertyId,
          documentType: "property_image",
          uploadedBy: userId,
        },
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB
          allowedExtensions: ["jpg", "jpeg", "png", "webp"],
        },
      };

      // Multiple upload middleware
      const uploadManager = this.createPropertyUploadManager({
        maxFileSize: 10 * 1024 * 1024,
        allowedExtensions: ["jpg", "jpeg", "png", "webp"],
        generateThumbnails: true,
      });

      const uploadMiddleware = uploadManager.middleware({
        fieldConfig: { mode: "array", fieldName: "images", maxCount: 10 },
        ...uploadConfig,
      });

      // Upload işlemini gerçekleştir
      await new Promise((resolve, reject) => {
        uploadMiddleware(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Upload sonuçlarını kontrol et
      if (!req.uploadResults || req.uploadResults.length === 0) {
        return responseWrapper.error(res, "No files uploaded");
      }

      const uploadedImages = [];
      const currentImageCount = property.images?.length || 0;
      const imageFocusX = toRequestArray(req.body?.imageFocusX);
      const imageFocusY = toRequestArray(req.body?.imageFocusY);
      const imageCropPreset = toRequestArray(req.body?.imageCropPreset);
      const imageWidth = toRequestArray(req.body?.imageWidth);
      const imageHeight = toRequestArray(req.body?.imageHeight);
      const imageWarnings = toRequestArray(req.body?.imageWarnings);
      const requestedPrimaryIndex = Number.parseInt(req.body?.primaryImageIndex, 10);
      const hasRequestedPrimary =
        Number.isInteger(requestedPrimaryIndex) &&
        requestedPrimaryIndex >= 0 &&
        requestedPrimaryIndex < req.uploadResults.length;

      if (hasRequestedPrimary) {
        property.images.forEach((image) => {
          image.isPrimary = false;
          image.presentation = normalizePropertyImagePresentation(image, {
            role: "gallery",
          });
        });
      }

      // Her resim için FileMetadata oluştur ve Property'ye ekle
      let primaryAssigned = property.images.some((image) => image?.isPrimary);

      for (let i = 0; i < req.uploadResults.length; i++) {
        const result = req.uploadResults[i];

        if (!result.success) {
          console.error(`Image upload failed: ${result.error}`);
          continue;
        }

        const uploadData = result.data;

        // FileMetadata oluştur
        const fileMetadata = new FileMetadata({
          filename: uploadData.filename,
          originalName:
            uploadData.originalName ||
            uploadData.originalname ||
            uploadData.metadata?.originalName ||
            uploadData.filename,
          mimeType: uploadData.mimeType,
          size: uploadData.size,
          directory: uploadData.directory || uploadConfig.directory,
          url: this.buildPendingPreviewUrl(),
          path: uploadData.path,
          storageType: process.env.STORAGE_TYPE || "local",
          bucket: uploadData.bucket,
          hash: uploadData.hash,
          uploadedBy: userId,
          relatedModel: "Property",
          relatedId: propertyId,
          documentType: "property_image",
          isPublic: true,
          metadata: {
            dimensions: uploadData.metadata?.dimensions,
            format: uploadData.metadata?.format,
          },
        });

        await fileMetadata.save();
        fileMetadata.url = this.buildPreviewUrl(fileMetadata._id);
        await fileMetadata.save();

        const qualityWidth = Number.parseInt(imageWidth[i], 10);
        const qualityHeight = Number.parseInt(imageHeight[i], 10);
        const isSelectedPrimary =
          hasRequestedPrimary && i === requestedPrimaryIndex;
        const shouldBePrimary =
          isSelectedPrimary || (!primaryAssigned && !hasRequestedPrimary);
        const presentation = normalizePropertyImagePresentation(null, {
          role: shouldBePrimary ? "cover" : "gallery",
          focusX: imageFocusX[i],
          focusY: imageFocusY[i],
          cropPreset: imageCropPreset[i],
        });

        // Property'ye ekle
        const imageData = {
          fileId: fileMetadata._id,
          url: this.buildPreviewUrl(fileMetadata._id),
          isPrimary: shouldBePrimary,
          presentation,
          quality: {
            width:
              Number.isFinite(qualityWidth) && qualityWidth > 0
                ? qualityWidth
                : uploadData.metadata?.dimensions?.width,
            height:
              Number.isFinite(qualityHeight) && qualityHeight > 0
                ? qualityHeight
                : uploadData.metadata?.dimensions?.height,
            aspectRatio:
              Number.isFinite(qualityWidth) &&
              Number.isFinite(qualityHeight) &&
              qualityWidth > 0 &&
              qualityHeight > 0
                ? Number((qualityWidth / qualityHeight).toFixed(3))
                : undefined,
            sizeBytes: uploadData.size,
            warnings: parseImageWarnings(imageWarnings[i]),
          },
          order: currentImageCount + i,
          uploadedAt: new Date(),
        };

        property.images.push(imageData);
        primaryAssigned = primaryAssigned || shouldBePrimary;
        uploadedImages.push({
          id: fileMetadata._id,
          url: this.buildPreviewUrl(fileMetadata._id),
          filename: fileMetadata.filename,
          isPrimary: imageData.isPrimary,
          presentation: imageData.presentation,
          quality: imageData.quality,
        });
      }

      if (!property.images.some((image) => image?.isPrimary) && property.images.length) {
        property.images[0].isPrimary = true;
        property.images[0].presentation = normalizePropertyImagePresentation(
          property.images[0],
          { role: "cover" },
        );
      }

      // Property'yi kaydet
      await property.save();

      return responseWrapper.success(
        res,
        {
          propertyId: property._id,
          images: uploadedImages,
          totalImages: property.images.length,
        },
        `${uploadedImages.length} images uploaded successfully`
      );
    } catch (error) {
      console.error("Property image upload error:", error);
      return responseWrapper.error(res, error.message);
    }
  };

  // Property dökümanı yükle (title deed, valuation report, etc.)
  uploadPropertyDocument = async (req, res) => {
    try {
      const userId = req.user._id;
      const userRole = req.user.role;
      const propertyId = req.params.id;

      // Property kontrolü
      const property = await Property.findById(propertyId);
      if (!property) {
        return responseWrapper.notFound(res, "Property not found");
      }

      // Yetki kontrolü
      const isOwner = property.owner.toString() === userId.toString();
      if (
        !isOwner &&
        userRole !== "admin" &&
        userRole !== "local_representative"
      ) {
        return responseWrapper.forbidden(
          res,
          "Unauthorized to upload documents for this property"
        );
      }

      // Döküman tipi kontrolü

      // FileUploadManager kullanarak dosyayı yükle
      const uploadConfig = {
        directory: `properties/${propertyId}/Documents`,
        metadata: {
          relatedModel: "Property",
          relatedId: propertyId,
          uploadedBy: userId,
        },
        limits: {
          fileSize: 50 * 1024 * 1024, // 50MB for documents
          allowedExtensions: ["pdf", "jpg", "jpeg", "png"],
        },
      };

      const uploadManager = this.createPropertyUploadManager({
        maxFileSize: 50 * 1024 * 1024,
        allowedExtensions: ["pdf", "jpg", "jpeg", "png"],
      });

      const uploadMiddleware = uploadManager.middleware({
        fieldConfig: { mode: "array", fieldName: "documents", maxCount: 20 },
        ...uploadConfig,
      });

      // Upload işlemini gerçekleştir
      await new Promise((resolve, reject) => {
        uploadMiddleware(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      const { documentType, description } = req.body || {};
      const documentTypes = Array.isArray(req.body?.documentTypes)
        ? req.body.documentTypes
        : req.body?.documentTypes
          ? [req.body.documentTypes]
          : documentType
            ? [documentType]
            : [];
      const descriptions = Array.isArray(req.body?.documentDescriptions)
        ? req.body.documentDescriptions
        : req.body?.documentDescriptions
          ? [req.body.documentDescriptions]
          : description
            ? [description]
            : [];
      const validTypes = [
        "title_deed",
        "annotation",
        "valuation_report",
        "tax_document",
        "floor_plan",
        "other",
      ];
      if (
        documentTypes.length === 0 ||
        documentTypes.some((type) => !validTypes.includes(type))
      ) {
        return responseWrapper.badRequest(
          res,
          "Invalid or missing document type"
        );
      }

      if (!req.uploadResults || req.uploadResults.length === 0) {
        return responseWrapper.error(res, "File upload failed");
      }

      const successfulResults = req.uploadResults.filter((item) => item.success);
      if (successfulResults.length === 0) {
        return responseWrapper.error(res, "File upload failed");
      }

      if (successfulResults.length !== documentTypes.length) {
        return responseWrapper.badRequest(
          res,
          "Each uploaded file must have a matching document type"
        );
      }

      const uploadedDocuments = [];

      for (let i = 0; i < successfulResults.length; i++) {
        const uploadResult = successfulResults[i].data;
        const currentType = documentTypes[i];
        const currentDescription = descriptions[i] || "";

        const fileMetadata = new FileMetadata({
          filename: uploadResult.filename,
          originalName:
            uploadResult.originalName ||
            uploadResult.originalname ||
            uploadResult.metadata?.originalName ||
            uploadResult.filename,
          mimeType: uploadResult.mimeType || uploadResult.mimetype,
          size: uploadResult.size,
          directory: uploadResult.directory || uploadConfig.directory,
          url: this.buildPendingPreviewUrl(),
          path: uploadResult.path,
          storageType: process.env.STORAGE_TYPE || "local",
          bucket: uploadResult.bucket,
          hash: uploadResult.hash,
          uploadedBy: userId,
          relatedModel: "Property",
          relatedId: propertyId,
          documentType: currentType,
          isPublic: false,
        });

        await fileMetadata.save();
        fileMetadata.url = this.buildPreviewUrl(fileMetadata._id);
        await fileMetadata.save();

        const documentData = {
          type: currentType,
          fileId: fileMetadata._id,
          url: this.buildPreviewUrl(fileMetadata._id),
          fileName: fileMetadata.originalName,
          description: currentDescription,
          uploadedAt: new Date(),
          uploadedBy: userId,
        };

        property.documents.push(documentData);

        if (currentType === "title_deed") {
          property.titleDeedDocument = {
            fileId: fileMetadata._id,
            url: this.buildPreviewUrl(fileMetadata._id),
            verified: false,
          };
        } else if (currentType === "annotation") {
          property.annotationDocument = {
            fileId: fileMetadata._id,
            url: this.buildPreviewUrl(fileMetadata._id),
            hasAnnotation: true,
          };
        }

        uploadedDocuments.push({
          id: fileMetadata._id,
          type: currentType,
          url: this.buildPreviewUrl(fileMetadata._id),
          filename: fileMetadata.filename,
          description: currentDescription,
        });
      }

      await property.save();

      return responseWrapper.success(
        res,
        {
          propertyId: property._id,
          documents: uploadedDocuments,
        },
        `${uploadedDocuments.length} documents uploaded successfully`
      );
    } catch (error) {
      console.error("Property document upload error:", error);
      return responseWrapper.error(res, error.message);
    }
  };

  // Property görselini sil
  deletePropertyImage = async (req, res) => {
    try {
      const userId = req.user._id;
      const userRole = req.user.role;
      const { propertyId, imageId } = req.params;

      // Property kontrolü
      const property = await Property.findById(propertyId);
      if (!property) {
        return responseWrapper.notFound(res, "Property not found");
      }

      // Yetki kontrolü
      const isOwner = property.owner.toString() === userId.toString();
      if (!isOwner && userRole !== "admin") {
        return responseWrapper.forbidden(
          res,
          "Unauthorized to delete images for this property"
        );
      }

      // Görseli bul
      const imageIndex = property.images.findIndex(
        (img) => img.fileId.toString() === imageId
      );

      if (imageIndex === -1) {
        return responseWrapper.notFound(res, "Image not found");
      }

      const wasPrivate = property.images[imageIndex].isPrimary;

      // Property'den görseli kaldır
      property.images.splice(imageIndex, 1);

      // Eğer silinen görsel primary ise ve başka görsel varsa, ilkini primary yap
      if (wasPrivate && property.images.length > 0) {
        property.images[0].isPrimary = true;
      }

      // Görsel sıralamalarını yeniden düzenle
      property.images.forEach((img, index) => {
        img.order = index;
      });

      await property.save();

      // FileMetadata'yı soft delete yap
      await FileMetadata.findByIdAndUpdate(imageId, {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
      });

      return responseWrapper.success(
        res,
        {
          propertyId: property._id,
          deletedImageId: imageId,
          remainingImages: property.images.length,
        },
        "Image deleted successfully"
      );
    } catch (error) {
      console.error("Property image delete error:", error);
      return responseWrapper.error(res, error.message);
    }
  };

  // Property dökümanını sil
  deletePropertyDocument = async (req, res) => {
    try {
      const userId = req.user._id;
      const userRole = req.user.role;
      const { propertyId, documentId } = req.params;

      // Property kontrolü
      const property = await Property.findById(propertyId);
      if (!property) {
        return responseWrapper.notFound(res, "Property not found");
      }

      // Yetki kontrolü
      const isOwner = property.owner.toString() === userId.toString();
      if (!isOwner && userRole !== "admin") {
        return responseWrapper.forbidden(
          res,
          "Unauthorized to delete documents for this property"
        );
      }

      // Dökümanı bul
      const documentIndex = property.documents.findIndex(
        (doc) => doc.fileId.toString() === documentId
      );

      if (documentIndex === -1) {
        return responseWrapper.notFound(res, "Document not found");
      }

      const documentType = property.documents[documentIndex].type;

      // Property'den dökümanı kaldır
      property.documents.splice(documentIndex, 1);

      // Hızlı erişim alanlarını temizle
      if (
        documentType === "title_deed" &&
        property.titleDeedDocument?.fileId?.toString() === documentId
      ) {
        property.titleDeedDocument = undefined;
      } else if (
        documentType === "annotation" &&
        property.annotationDocument?.fileId?.toString() === documentId
      ) {
        property.annotationDocument = undefined;
      }

      await property.save();

      // FileMetadata'yı soft delete yap
      await FileMetadata.findByIdAndUpdate(documentId, {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
      });

      return responseWrapper.success(
        res,
        {
          propertyId: property._id,
          deletedDocumentId: documentId,
          documentType: documentType,
        },
        "Document deleted successfully"
      );
    } catch (error) {
      console.error("Property document delete error:", error);
      return responseWrapper.error(res, error.message);
    }
  };

  // Property dosyalarını listele

  getPropertyFiles = async (req, res) => {
    try {
      // Public çağrıda req.user olmayabilir
      const userId = req.user?._id || null;
      const userRole = req.user?.role || "guest";
      const propertyId = req.params.propertyId || req.params.id;

      const property = await Property.findById(propertyId)
        .populate("images.fileId", "_id filename originalName mimeType size createdAt")
        .populate(
          "documents.fileId",
          "_id filename originalName mimeType size createdAt"
        );

      if (!property) {
        return responseWrapper.notFound(res, "Property not found");
      }

      // ---- OWNER KONTROLÜ (discriminator yapısı ile uyumlu) ----
      let isOwner = false;
      if (userId) {
        if (userRole === "property_owner") {
          // PropertyOwner, User discriminator'ı olduğundan _id aynıdır:
          isOwner =
            property.owner && property.owner.toString() === userId.toString();
        } else {
          // İleride farklı senaryolar için bırakıldı (örn. admin değilken başka bağ)
          isOwner = false;
        }
      }

      const isPublicView = property.status === "published";

      if (
        !isOwner &&
        !isPublicView &&
        userRole !== "admin" &&
        userRole !== "local_representative"
      ) {
        return responseWrapper.forbidden(
          res,
          "Unauthorized to view property files"
        );
      }

      // fileId null/populate edilmemiş olabilir → güvenli map
      const images = (property.images || [])
        .map((img) => {
          const fid = img.fileId?._id || img.fileId || null;
          if (!fid) return null;
          return {
            id: String(fid),
            url: img.url,
            isPrimary: !!img.isPrimary,
            presentation: img.presentation || null,
            quality: img.quality || null,
            order: img.order ?? 0,
            uploadedAt: img.uploadedAt || img.fileId?.createdAt || null,
          };
        })
        .filter(Boolean);

      const canSeeDocs =
        isOwner || userRole === "admin" || userRole === "local_representative";

      const documents = canSeeDocs
        ? (property.documents || [])
            .map((d) => {
              const fid = d.fileId?._id || d.fileId || null;
              if (!fid) return null;
              return {
                id: String(fid),
                type: d.type,
                fileName: d.fileName || d.fileId?.originalName,
                description: d.description,
                url: d.url,
                uploadedAt: d.uploadedAt || d.fileId?.createdAt || null,
                verified: !!d.verifiedAt,
              };
            })
            .filter(Boolean)
        : [];

      return responseWrapper.success(
        res,
        { propertyId: property._id, images, documents },
        "Property files retrieved successfully"
      );
    } catch (error) {
      console.error("Get property files error:", error);
      return responseWrapper.error(res, error.message);
    }
  };

  // Primary görseli ayarla
  setPrimaryImage = async (req, res) => {
    try {
      const userId = req.user._id;
      const userRole = req.user.role;
      const { propertyId, imageId } = req.params;

      // Property kontrolü
      const property = await Property.findById(propertyId);
      if (!property) {
        return responseWrapper.notFound(res, "Property not found");
      }

      // Yetki kontrolü
      const isOwner = property.owner.toString() === userId.toString();
      if (!isOwner && userRole !== "admin") {
        return responseWrapper.forbidden(
          res,
          "Unauthorized to modify images for this property"
        );
      }

      // Görseli bul
      const imageIndex = property.images.findIndex(
        (img) => img.fileId.toString() === imageId
      );

      if (imageIndex === -1) {
        return responseWrapper.notFound(res, "Image not found");
      }

      // Tüm görsellerin isPrimary değerini false yap
      property.images.forEach((img) => {
        img.isPrimary = false;
        img.presentation = normalizePropertyImagePresentation(img, {
          role: "gallery",
        });
      });

      // Seçilen görseli primary yap
      property.images[imageIndex].isPrimary = true;
      property.images[imageIndex].presentation = normalizePropertyImagePresentation(
        property.images[imageIndex],
        { role: "cover" },
      );

      await property.save();

      return responseWrapper.success(
        res,
        {
          propertyId: property._id,
          primaryImageId: imageId,
        },
        "Primary image set successfully"
      );
    } catch (error) {
      console.error("Set primary image error:", error);
      return responseWrapper.error(res, error.message);
    }
  };
}

module.exports = new PropertyFileController();
