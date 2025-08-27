// server/controllers/investmentFileController.js

const responseWrapper = require("../utils/responseWrapper");
const FileUploadManager = require("../services/FileUploadManager");
const FileMetadata = require("../models/FileMetadata");
const Investment = require("../models/Investment");
const InvestmentService = require("../services/investmentService");

class InvestmentFileController {
  constructor() {
    this.fileUploadManager = new FileUploadManager();
    this.investmentService = new InvestmentService();
  }

  /**
   * Kontrat yükle
   * POST /investments/:id/contract
   */
  uploadContract = async (req, res) => {
    try {
      const userId = req.user._id;
      const userRole = req.user.role;
      const investmentId = req.params.id;

      // Investment kontrolü ve yetki kontrolü
      const investment = await Investment.findById(investmentId)
        .populate("investor", "_id")
        .populate("property", "owner");

      if (!investment) {
        return responseWrapper.notFound(res, "Investment not found");
      }

      // Yetki kontrolü
      const isInvestor =
        investment.investor._id.toString() === userId.toString();
      const isOwner =
        investment.property.owner.toString() === userId.toString();

      if (!isInvestor && !isOwner && userRole !== "admin") {
        return responseWrapper.forbidden(
          res,
          "Unauthorized to upload contract"
        );
      }

      // Status kontrolü
      if (investment.status !== "contract_signed") {
        return responseWrapper.badRequest(
          res,
          `Cannot upload contract. Current status: ${investment.status}. Expected: contract_signed`
        );
      }

      // FileUploadManager kullanarak dosyayı yükle
      const uploadConfig = {
        directory: `investments/${investmentId}/contracts`,
        metadata: {
          relatedModel: "Investment",
          relatedId: investmentId,
          documentType: "contract",
          uploadedBy: userId,
        },
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB
          allowedTypes: ["application/pdf"],
        },
      };

      // Upload middleware'i oluştur
      const uploadMiddleware = this.fileUploadManager.middleware({
        fieldConfig: { mode: "array", fieldName: "file", maxCount: 10 },
        ...uploadConfig,
      });

      // Upload işlemini gerçekleştir
      await new Promise((resolve, reject) => {
        uploadMiddleware(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Upload sonucu kontrolü
      if (
        !req.uploadResults ||
        req.uploadResults.length === 0 ||
        !req.uploadResults[0].success
      ) {
        return responseWrapper.error(
          res,
          req.uploadResults?.[0]?.error || "File upload failed"
        );
      }

      const uploadResult = req.uploadResults[0].data;

      // FileMetadata oluştur
      const fileMetadata = new FileMetadata({
        filename: uploadResult.filename,
        originalName:
          uploadResult.metadata?.originalName ?? uploadResult.filename,
        mimeType: uploadResult.mimeType || uploadResult.mimetype,
        size: uploadResult.size,
        directory: uploadConfig.directory,
        url: uploadResult.url,
        storageType: "local",
        hash: uploadResult.hash,
        uploadedBy: userId,
        relatedModel: "Investment",
        relatedId: investmentId,
        documentType: "contract",
        isPublic: false,
      });

      await fileMetadata.save();

      // Investment'ı güncelle - Service kullan
      const updatedInvestment = await this.investmentService.uploadContract(
        investmentId,
        userId,
        fileMetadata._id,
        userRole
      );

      return responseWrapper.success(
        res,
        {
          investment: updatedInvestment,
          file: {
            id: fileMetadata._id,
            url: fileMetadata.url,
            filename: fileMetadata.filename,
            uploadedAt: fileMetadata.createdAt,
          },
        },
        "Contract uploaded successfully"
      );
    } catch (error) {
      console.error("Contract upload error:", error);
      return responseWrapper.error(res, error.message);
    }
  };

  /**
   * Tapu kaydı yükle
   * POST /investments/:id/title-deed
   */
  uploadTitleDeed = async (req, res) => {
    try {
      const userId = req.user._id;
      const userRole = req.user.role;
      const investmentId = req.params.id;

      // Investment kontrolü
      const investment = await Investment.findById(investmentId).populate(
        "property",
        "owner"
      );

      if (!investment) {
        return responseWrapper.notFound(res, "Investment not found");
      }

      // Yetki kontrolü
      const isOwner =
        investment.property.owner.toString() === userId.toString();

      if (
        !isOwner &&
        userRole !== "admin" &&
        userRole !== "local_representative"
      ) {
        return responseWrapper.forbidden(
          res,
          "Unauthorized to upload title deed"
        );
      }

      // Status kontrolü
      if (investment.status !== "contract_signed") {
        return responseWrapper.badRequest(
          res,
          "Contract must be signed before title deed upload"
        );
      }

      // FileUploadManager kullanarak dosyayı yükle
      const uploadConfig = {
        directory: `investments/${investmentId}/title-deeds`,
        metadata: {
          relatedModel: "Investment",
          relatedId: investmentId,
          documentType: "title_deed",
          uploadedBy: userId,
        },
        limits: {
          fileSize: 20 * 1024 * 1024, // 20MB
          allowedTypes: [
            "application/pdf",
            "image/jpeg",
            "image/jpg",
            "image/png",
          ],
        },
      };

      const uploadMiddleware = this.fileUploadManager.middleware({
        fieldConfig: { mode: "array", fieldName: "file", maxCount: 10 },
        ...uploadConfig,
      });

      await new Promise((resolve, reject) => {
        uploadMiddleware(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      if (
        !req.uploadResults ||
        req.uploadResults.length === 0 ||
        !req.uploadResults[0].success
      ) {
        return responseWrapper.error(
          res,
          req.uploadResults?.[0]?.error || "File upload failed"
        );
      }

      const uploadResult = req.uploadResults[0].data;

      // FileMetadata oluştur
      const fileMetadata = new FileMetadata({
        filename: uploadResult.filename,
        originalName:
          uploadResult.metadata?.originalName ?? uploadResult.filename,
        mimeType: uploadResult.mimeType || uploadResult.mimetype,
        size: uploadResult.size,
        directory: uploadConfig.directory,
        url: uploadResult.url,
        path: uploadResult.path,
        storageType: "local",
        hash: uploadResult.hash,
        uploadedBy: userId,
        relatedModel: "Investment",
        relatedId: investmentId,
        documentType: "title_deed",
        isPublic: false,
        virusScanStatus: "pending", // Admin onayı için
      });

      await fileMetadata.save();

      // Investment'ı güncelle - Service kullan
      const updatedInvestment = await this.investmentService.uploadTitleDeed(
        investmentId,
        userId,
        fileMetadata._id,
        userRole
      );

      return responseWrapper.success(
        res,
        {
          investment: updatedInvestment,
          file: {
            id: fileMetadata._id,
            url: fileMetadata.url,
            filename: fileMetadata.filename,
            uploadedAt: fileMetadata.createdAt,
            needsApproval: true,
          },
        },
        "Title deed uploaded successfully. Waiting for admin approval."
      );
    } catch (error) {
      console.error("Title deed upload error:", error);
      return responseWrapper.error(res, error.message);
    }
  };

  /**
   * Payment receipt yükle
   * POST /investments/:id/payment-receipt
   */
  uploadPaymentReceipt = async (req, res) => {
    try {
      const userId = req.user._id;
      const userRole = req.user.role;
      const investmentId = req.params.id;

      // Investment kontrolü
      const investment = await Investment.findById(investmentId).populate(
        "investor",
        "_id"
      );

      if (!investment) {
        return responseWrapper.notFound(res, "Investment not found");
      }

      // Yetki kontrolü - Sadece investor yükleyebilir
      const isInvestor =
        investment.investor._id.toString() === userId.toString();

      if (!isInvestor && userRole !== "admin") {
        return responseWrapper.forbidden(
          res,
          "Unauthorized to upload payment receipt"
        );
      }

      // FileUploadManager kullanarak dosyayı yükle
      const uploadConfig = {
        directory: `investments/${investmentId}/receipts`,
        metadata: {
          relatedModel: "Investment",
          relatedId: investmentId,
          documentType: "payment_receipt",
          uploadedBy: userId,
        },
        limits: {
          fileSize: 5 * 1024 * 1024, // 5MB
          allowedTypes: [
            "application/pdf",
            "image/jpeg",
            "image/jpg",
            "image/png",
          ],
        },
      };

      const uploadMiddleware = this.fileUploadManager.middleware({
        fieldConfig: { mode: "array", fieldName: "file", maxCount: 10 },
        ...uploadConfig,
      });
      await new Promise((resolve, reject) => {
        uploadMiddleware(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      if (
        !req.uploadResults ||
        req.uploadResults.length === 0 ||
        !req.uploadResults[0].success
      ) {
        return responseWrapper.error(
          res,
          req.uploadResults?.[0]?.error || "File upload failed"
        );
      }

      const uploadResult = req.uploadResults[0].data;

      const fileMetadata = new FileMetadata({
        filename: uploadResult.filename,
        originalName: uploadResult.originalName,
        mimeType: uploadResult.mimetype,
        size: uploadResult.size,
        directory: uploadConfig.directory,
        url: uploadResult.url,
        path: uploadResult.path,
        storageType: "local",
        hash: uploadResult.hash,
        uploadedBy: userId,
        relatedModel: "Investment",
        relatedId: investmentId,
        documentType: "payment_receipt",
        isPublic: false,
      });

      await fileMetadata.save();

      // Investment'ı güncelle - Service kullan
      const updatedInvestment =
        await this.investmentService.uploadPaymentReceipt(
          investmentId,
          userId,
          fileMetadata._id,
          userRole
        );

      return responseWrapper.success(
        res,
        {
          investment: updatedInvestment,
          file: {
            id: fileMetadata._id,
            url: fileMetadata.url,
            filename: fileMetadata.filename,
            uploadedAt: fileMetadata.createdAt,
          },
        },
        "Payment receipt uploaded successfully"
      );
    } catch (error) {
      console.error("Payment receipt upload error:", error);
      return responseWrapper.error(res, error.message);
    }
  };

  /**
   * Rental payment receipt yükle
   * POST /investments/:id/rental-receipt
   */
  uploadRentalReceipt = async (req, res) => {
    try {
      const userId = req.user._id;
      const userRole = req.user.role;
      const investmentId = req.params.id;
      const { month } = req.body; // "2025-01" formatında

      if (!month) {
        return responseWrapper.badRequest(res, "Month is required");
      }

      // Investment kontrolü
      const investment = await Investment.findById(investmentId).populate(
        "property",
        "owner"
      );

      if (!investment) {
        return responseWrapper.notFound(res, "Investment not found");
      }

      // Yetki kontrolü - Property owner yükleyebilir
      const isOwner =
        investment.property.owner.toString() === userId.toString();

      if (!isOwner && userRole !== "admin") {
        return responseWrapper.forbidden(
          res,
          "Unauthorized to upload rental receipt"
        );
      }

      // İlgili ayın ödemesini kontrol et
      const payment = investment.rentalPayments.find((p) => p.month === month);
      if (!payment) {
        return responseWrapper.notFound(
          res,
          `No rental payment found for month: ${month}`
        );
      }

      // FileUploadManager kullanarak dosyayı yükle
      const uploadConfig = {
        directory: `investments/${investmentId}/rental-receipts/${month}`,
        metadata: {
          relatedModel: "Investment",
          relatedId: investmentId,
          documentType: "rental_receipt",
          uploadedBy: userId,
          month: month,
        },
        limits: {
          fileSize: 5 * 1024 * 1024, // 5MB
          allowedTypes: [
            "application/pdf",
            "image/jpeg",
            "image/jpg",
            "image/png",
          ],
        },
      };

      const uploadMiddleware = this.fileUploadManager.middleware({
        fieldConfig: { mode: "array", fieldName: "file", maxCount: 10 },
        ...uploadConfig,
      });

      await new Promise((resolve, reject) => {
        uploadMiddleware(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      if (
        !req.uploadResults ||
        req.uploadResults.length === 0 ||
        !req.uploadResults[0].success
      ) {
        return responseWrapper.error(
          res,
          req.uploadResults?.[0]?.error || "File upload failed"
        );
      }

      const uploadResult = req.uploadResults[0].data;

      const fileMetadata = new FileMetadata({
        filename: uploadResult.filename,
        originalName: uploadResult.originalName,
        mimeType: uploadResult.mimetype,
        size: uploadResult.size,
        directory: uploadConfig.directory,
        url: uploadResult.url,
        path: uploadResult.path,
        storageType: "local",
        hash: uploadResult.hash,
        uploadedBy: userId,
        relatedModel: "Investment",
        relatedId: investmentId,
        documentType: "rental_receipt",
        isPublic: false,
      });

      await fileMetadata.save();

      // Rental payment'ı güncelle
      payment.paymentReceipt = {
        fileId: fileMetadata._id,
        url: fileMetadata.url,
      };
      payment.status = "paid";
      payment.paidAt = new Date();

      await investment.save();

      return responseWrapper.success(
        res,
        {
          month: month,
          file: {
            id: fileMetadata._id,
            url: fileMetadata.url,
            filename: fileMetadata.filename,
            uploadedAt: fileMetadata.createdAt,
          },
        },
        "Rental receipt uploaded successfully"
      );
    } catch (error) {
      console.error("Rental receipt upload error:", error);
      return responseWrapper.error(res, error.message);
    }
  };

  /**
   * Additional document yükle
   * POST /investments/:id/documents
   */
  uploadAdditionalDocument = async (req, res) => {
    try {
      const userId = req.user._id;
      const userRole = req.user.role;
      const investmentId = req.params.id;

      // Document type kontrolü
      const validTypes = [
        "notary_document",
        "power_of_attorney",
        "tax_receipt",
        "other",
      ];
      if (!validTypes.includes(documentType)) {
        return responseWrapper.badRequest(res, "Invalid document type");
      }

      // Investment kontrolü
      const investment = await Investment.findById(investmentId)
        .populate("investor", "_id")
        .populate("property", "owner");

      if (!investment) {
        return responseWrapper.notFound(res, "Investment not found");
      }

      // Yetki kontrolü
      const isInvestor =
        investment.investor._id.toString() === userId.toString();
      const isOwner =
        investment.property.owner.toString() === userId.toString();

      if (
        !isInvestor &&
        !isOwner &&
        userRole !== "admin" &&
        userRole !== "local_representative"
      ) {
        return responseWrapper.forbidden(
          res,
          "Unauthorized to upload documents"
        );
      }

      // FileUploadManager kullanarak dosyayı yükle
      const uploadConfig = {
        directory: `investments/${investmentId}/documents`,
        metadata: {
          relatedModel: "Investment",
          relatedId: investmentId,
          documentType: documentType,
          uploadedBy: userId,
        },
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB
          allowedTypes: [
            "application/pdf",
            "image/jpeg",
            "image/jpg",
            "image/png",
          ],
        },
      };

      const uploadMiddleware = this.fileUploadManager.middleware({
        fieldConfig: { mode: "array", fieldName: "file", maxCount: 10 },
        ...uploadConfig,
      });

      await new Promise((resolve, reject) => {
        uploadMiddleware(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      const { documentType, description } = req.body;
      if (!documentType || !validTypes.includes(documentType)) {
        return responseWrapper.badRequest(
          res,
          "Invalid or missing document type"
        );
      }
      if (
        !req.uploadResults ||
        req.uploadResults.length === 0 ||
        !req.uploadResults[0].success
      ) {
        return responseWrapper.error(
          res,
          req.uploadResults?.[0]?.error || "File upload failed"
        );
      }

      const uploadResult = req.uploadResults[0].data;

      const fileMetadata = new FileMetadata({
        filename: uploadResult.filename,
        originalName: uploadResult.originalName,
        mimeType: uploadResult.mimetype,
        size: uploadResult.size,
        directory: uploadConfig.directory,
        url: uploadResult.url,
        path: uploadResult.path,
        storageType: "local",
        hash: uploadResult.hash,
        uploadedBy: userId,
        relatedModel: "Investment",
        relatedId: investmentId,
        documentType: documentType,
        isPublic: false,
      });

      await fileMetadata.save();

      // Investment'a dökümanı ekle
      investment.additionalDocuments.push({
        type: documentType,
        fileId: fileMetadata._id,
        url: fileMetadata.url,
        description: description || "",
        uploadedAt: new Date(),
        uploadedBy: userId,
      });

      await investment.save();

      return responseWrapper.success(
        res,
        {
          file: {
            id: fileMetadata._id,
            type: documentType,
            url: fileMetadata.url,
            filename: fileMetadata.filename,
            description: description,
            uploadedAt: fileMetadata.createdAt,
          },
        },
        "Document uploaded successfully"
      );
    } catch (error) {
      console.error("Additional document upload error:", error);
      return responseWrapper.error(res, error.message);
    }
  };

  /**
   * Investment dökümanlarını listele
   * GET /investments/:id/documents
   */
  getInvestmentDocuments = async (req, res) => {
    try {
      const userId = req.user._id;
      const userRole = req.user.role;
      const investmentId = req.params.id;

      const documents = await this.investmentService.getInvestmentDocuments(
        investmentId,
        userId,
        userRole
      );

      return responseWrapper.success(
        res,
        documents,
        "Documents retrieved successfully"
      );
    } catch (error) {
      if (error.message === "Investment not found") {
        return responseWrapper.notFound(res, "Investment not found");
      }
      if (error.message.includes("Unauthorized")) {
        return responseWrapper.forbidden(res, error.message);
      }
      return responseWrapper.error(res, error.message);
    }
  };

  /**
   * Investment dökümanını indir
   * GET /investments/:investmentId/documents/:fileId/download
   */
  downloadInvestmentDocument = async (req, res) => {
    try {
      const userId = req.user._id;
      const userRole = req.user.role;
      const { investmentId, fileId } = req.params;

      // Investment kontrolü
      const investment = await Investment.findById(investmentId)
        .populate("investor", "_id")
        .populate("property", "owner");

      if (!investment) {
        return responseWrapper.notFound(res, "Investment not found");
      }

      // Yetki kontrolü
      const isInvestor =
        investment.investor._id.toString() === userId.toString();
      const isOwner =
        investment.property.owner.toString() === userId.toString();

      if (
        !isInvestor &&
        !isOwner &&
        userRole !== "admin" &&
        userRole !== "local_representative"
      ) {
        return responseWrapper.forbidden(
          res,
          "Unauthorized to download this document"
        );
      }

      // FileMetadata'yı al
      const fileMetadata = await FileMetadata.findById(fileId);

      if (!fileMetadata) {
        return responseWrapper.notFound(res, "File not found");
      }

      // Dosyanın bu investment'a ait olduğunu kontrol et
      if (fileMetadata.relatedId.toString() !== investmentId) {
        return responseWrapper.forbidden(
          res,
          "This file does not belong to this investment"
        );
      }

      // Download işlemi için FileController'ı kullan
      const fileController = require("./fileControllerV2");

      // Dosya indirme isteğini FileController'a yönlendir
      req.params.fileId = fileId;
      return fileController.download(req, res);
    } catch (error) {
      console.error("Document download error:", error);
      return responseWrapper.error(res, error.message);
    }
  };

  /**
   * Investment dökümanını sil
   * DELETE /investments/:investmentId/documents/:fileId
   */
  deleteInvestmentDocument = async (req, res) => {
    try {
      const userId = req.user._id;
      const userRole = req.user.role;
      const { investmentId, fileId } = req.params;

      // Investment kontrolü
      const investment = await Investment.findById(investmentId);

      if (!investment) {
        return responseWrapper.notFound(res, "Investment not found");
      }

      // Admin değilse silme yetkisi yok
      if (userRole !== "admin") {
        return responseWrapper.forbidden(
          res,
          "Only admin can delete investment documents"
        );
      }

      // FileMetadata'yı soft delete yap
      await FileMetadata.findByIdAndUpdate(fileId, {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
      });

      // Investment'tan referansı kaldır
      // Contract
      if (investment.contractFile?.fileId?.toString() === fileId) {
        investment.contractFile = undefined;
      }
      // Title deed
      else if (investment.titleDeedDocument?.fileId?.toString() === fileId) {
        investment.titleDeedDocument = undefined;
      }
      // Payment receipt
      else if (investment.paymentReceipt?.fileId?.toString() === fileId) {
        investment.paymentReceipt = undefined;
      }
      // Additional documents
      else {
        investment.additionalDocuments = investment.additionalDocuments.filter(
          (doc) => doc.fileId.toString() !== fileId
        );
      }

      await investment.save();

      return responseWrapper.success(
        res,
        {
          deletedFileId: fileId,
          investmentId: investmentId,
        },
        "Document deleted successfully"
      );
    } catch (error) {
      console.error("Document delete error:", error);
      return responseWrapper.error(res, error.message);
    }
  };
}

module.exports = new InvestmentFileController();
