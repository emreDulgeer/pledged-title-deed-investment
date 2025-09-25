// src/models/Investment.js
import PropTypes from "prop-types";

// Investment model tanımı
export const InvestmentModel = {
  _id: PropTypes.string.isRequired,
  investor: PropTypes.shape({
    _id: PropTypes.string,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
  }),
  property: PropTypes.shape({
    _id: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    price: PropTypes.number,
    location: PropTypes.shape({
      country: PropTypes.string,
      city: PropTypes.string,
      district: PropTypes.string,
      address: PropTypes.string,
    }),
    type: PropTypes.oneOf([
      "apartment",
      "house",
      "land",
      "commercial",
      "villa",
    ]),
    images: PropTypes.arrayOf(PropTypes.string),
  }),
  amount: PropTypes.number.isRequired,
  investmentDate: PropTypes.string.isRequired,
  shares: PropTypes.number,
  status: PropTypes.oneOf([
    "pending",
    "approved",
    "rejected",
    "completed",
    "cancelled",
  ]),
  paymentMethod: PropTypes.oneOf(["credit_card", "bank_transfer", "cash"]),
  paymentStatus: PropTypes.oneOf([
    "pending",
    "completed",
    "failed",
    "refunded",
  ]),
  returns: PropTypes.arrayOf(
    PropTypes.shape({
      amount: PropTypes.number,
      date: PropTypes.string,
      type: PropTypes.oneOf(["rental", "sale", "dividend"]),
    })
  ),
  notes: PropTypes.string,
  createdAt: PropTypes.string,
  updatedAt: PropTypes.string,
};

// Liste için özet investment modeli
export const InvestmentSummaryModel = {
  _id: PropTypes.string.isRequired,
  investorName: PropTypes.string,
  propertyTitle: PropTypes.string,
  amount: PropTypes.number.isRequired,
  investmentDate: PropTypes.string.isRequired,
  status: PropTypes.oneOf([
    "pending",
    "approved",
    "rejected",
    "completed",
    "cancelled",
  ]),
  paymentStatus: PropTypes.oneOf([
    "pending",
    "completed",
    "failed",
    "refunded",
  ]),
};

// Filtre modeli
export const InvestmentFilterModel = {
  status: PropTypes.oneOf([
    "",
    "pending",
    "approved",
    "rejected",
    "completed",
    "cancelled",
  ]),
  paymentStatus: PropTypes.oneOf([
    "",
    "pending",
    "completed",
    "failed",
    "refunded",
  ]),
  dateFrom: PropTypes.string,
  dateTo: PropTypes.string,
  minAmount: PropTypes.number,
  maxAmount: PropTypes.number,
  propertyId: PropTypes.string,
  investorId: PropTypes.string,
};
