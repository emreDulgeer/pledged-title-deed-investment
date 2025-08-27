// server/controllers/propertyFileController.js

const responseWrapper = require("../utils/responseWrapper");
const FileUploadManager = require("../services/FileUploadManager");
const FileMetadata = require("../models/FileMetadata");
const Property = require("../models/Property");

class PropertyFileController {
  constructor() {
    this.fileUploadManager = new FileUploadManager();
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
        directory: `properties/${propertyId}/images`,
        metadata: {
          relatedModel: "Property",
          relatedId: propertyId,
          documentType: "property_image",
          uploadedBy: userId,
        },
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB
          allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
        },
      };

      // Multiple upload middleware
      const uploadMiddleware = this.fileUploadManager.middleware({
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

      // Her resim için FileMetadata oluştur ve Property'ye ekle
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
            uploadData.metadata?.originalName ?? uploadData.filename, // <<<
          mimeType: uploadData.mimeType, // <<<
          size: uploadData.size,
          directory: uploadConfig.directory,
          url: uploadData.url,
          // path: uploadData.path, // çoğu storage’da yok, gerekirse bırakılabilir
          storageType: "local",
          hash: uploadData.hash,
          uploadedBy: userId,
          relatedModel: "Property",
          relatedId: propertyId,
          documentType: "property_image",
          isPublic: true,
        });

        await fileMetadata.save();

        // Property'ye ekle
        const imageData = {
          fileId: fileMetadata._id,
          url: fileMetadata.url,
          isPrimary: currentImageCount === 0 && i === 0, // İlk resim primary
          order: currentImageCount + i,
          uploadedAt: new Date(),
        };

        property.images.push(imageData);
        uploadedImages.push({
          id: fileMetadata._id,
          url: fileMetadata.url,
          filename: fileMetadata.filename,
          isPrimary: imageData.isPrimary,
        });
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
        directory: `properties/${propertyId}/documents`,
        metadata: {
          relatedModel: "Property",
          relatedId: propertyId,
          uploadedBy: userId,
        },
        limits: {
          fileSize: 50 * 1024 * 1024, // 50MB for documents
          allowedTypes: [
            "application/pdf",
            "image/jpeg",
            "image/jpg",
            "image/png",
          ],
        },
      };

      const uploadMiddleware = this.fileUploadManager.middleware({
        fieldConfig: { mode: "single", fieldName: "document" },
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
      const validTypes = [
        "title_deed",
        "annotation",
        "valuation_report",
        "tax_document",
        "floor_plan",
        "other",
      ];
      if (!documentType || !validTypes.includes(documentType)) {
        return responseWrapper.badRequest(
          res,
          "Invalid or missing document type"
        );
      }
      // Kaydedilecek metadata'ya documentType'ı da yaz
      uploadConfig.metadata.documentType = documentType;
      // Upload sonucu kontrolü
      if (
        !req.uploadResults ||
        req.uploadResults.length === 0 ||
        !req.uploadResults[0].success
      ) {
        return responseWrapper.error(res, "File upload failed");
      }

      const uploadResult = req.uploadResults[0].data;

      // FileMetadata oluştur
      const fileMetadata = new FileMetadata({
        filename: uploadResult.filename,
        originalName:
          uploadResult.metadata?.originalName ?? uploadResult.filename, // <<<
        mimeType: uploadResult.mimeType, // <<<
        size: uploadResult.size,
        directory: uploadConfig.directory,
        url: uploadResult.url,
        mimeType: uploadResult.mimeType || uploadResult.mimetype,
        storageType: "local",
        hash: uploadResult.hash,
        uploadedBy: userId,
        relatedModel: "Property",
        relatedId: propertyId,
        documentType: documentType,
        isPublic: false,
      });

      await fileMetadata.save();

      // Property'ye dökümanı ekle
      const documentData = {
        type: documentType,
        fileId: fileMetadata._id,
        url: fileMetadata.url,
        fileName: fileMetadata.originalName,
        description: description || "",
        uploadedAt: new Date(),
        uploadedBy: userId,
      };

      property.documents.push(documentData);

      // Eğer title deed veya annotation ise hızlı erişim alanlarını güncelle
      if (documentType === "title_deed") {
        property.titleDeedDocument = {
          fileId: fileMetadata._id,
          url: fileMetadata.url,
          verified: false,
        };
      } else if (documentType === "annotation") {
        property.annotationDocument = {
          fileId: fileMetadata._id,
          url: fileMetadata.url,
          hasAnnotation: true,
        };
      }

      await property.save();

      return responseWrapper.success(
        res,
        {
          propertyId: property._id,
          document: {
            id: fileMetadata._id,
            type: documentType,
            url: fileMetadata.url,
            filename: fileMetadata.filename,
            description: description,
          },
        },
        "Document uploaded successfully"
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
        .populate("images.fileId", "_id filename size createdAt")
        .populate("documents.fileId", "_id filename size createdAt");

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
      });

      // Seçilen görseli primary yap
      property.images[imageIndex].isPrimary = true;

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
