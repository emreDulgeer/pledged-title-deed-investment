// src/models/propertyModel.js
import PropTypes from "prop-types";

export const LocationPinPropTypes = {
  lat: PropTypes.number.isRequired,
  lng: PropTypes.number.isRequired,
};

export const PropertyImagePropTypes = {
  fileId: PropTypes.string.isRequired,
  url: PropTypes.string,
  isPrimary: PropTypes.bool,
  order: PropTypes.number,
  uploadedAt: PropTypes.string,
  _id: PropTypes.string,
};

export const PropertyDocumentPropTypes = {
  type: PropTypes.oneOf([
    "title_deed",
    "valuation_report",
    "insurance",
    "tax_document",
    "other",
  ]),
  fileId: PropTypes.string.isRequired,
  name: PropTypes.string,
  uploadedAt: PropTypes.string,
  _id: PropTypes.string,
};

export const PropertyFeaturesPropTypes = {
  bedrooms: PropTypes.number,
  bathrooms: PropTypes.number,
  parking: PropTypes.number,
  hasGarden: PropTypes.bool,
  hasPool: PropTypes.bool,
  hasSecurity: PropTypes.bool,
  hasElevator: PropTypes.bool,
  hasBalcony: PropTypes.bool,
  hasTerrace: PropTypes.bool,
  hasGarage: PropTypes.bool,
  hasAirConditioning: PropTypes.bool,
  hasCentralHeating: PropTypes.bool,
  hasStorage: PropTypes.bool,
  floorNumber: PropTypes.number,
  totalFloors: PropTypes.number,
  yearBuilt: PropTypes.number,
  lastRenovation: PropTypes.number,
};

export const PropertyMetadataPropTypes = {
  flaggedIssues: PropTypes.arrayOf(PropTypes.string),
  totalViews: PropTypes.number,
  totalFavorites: PropTypes.number,
  totalOffers: PropTypes.number,
  averageOfferAmount: PropTypes.number,
  lastViewedAt: PropTypes.string,
};

export const PropertyFeaturedInfoPropTypes = {
  isFeatured: PropTypes.bool,
  featuredAt: PropTypes.string,
  featuredUntil: PropTypes.string,
  featuredWeeks: PropTypes.number,
};

export const PropertyPropTypes = {
  id: PropTypes.string.isRequired,
  // Location
  country: PropTypes.string.isRequired,
  city: PropTypes.string.isRequired,
  district: PropTypes.string,
  fullAddress: PropTypes.string.isRequired,
  locationPin: PropTypes.shape(LocationPinPropTypes),

  // Basic Info
  title: PropTypes.string,
  description: PropTypes.string,
  propertyType: PropTypes.oneOf([
    "apartment",
    "house",
    "villa",
    "commercial",
    "land",
    "office",
    "retail",
  ]),
  size: PropTypes.number,
  rooms: PropTypes.number,

  // Financial
  estimatedValue: PropTypes.number.isRequired,
  requestedInvestment: PropTypes.number.isRequired,
  rentOffered: PropTypes.number,
  annualYieldPercent: PropTypes.number,
  currency: PropTypes.oneOf(["EUR", "USD", "GBP", "TRY"]),
  contractPeriodMonths: PropTypes.number,

  // Media
  images: PropTypes.arrayOf(PropTypes.shape(PropertyImagePropTypes)),
  documents: PropTypes.arrayOf(PropTypes.shape(PropertyDocumentPropTypes)),
  virtualTourUrl: PropTypes.string,
  videoUrl: PropTypes.string,

  // Features
  features: PropTypes.shape(PropertyFeaturesPropTypes),

  // Status
  status: PropTypes.oneOf([
    "draft",
    "published",
    "in_contract",
    "sold",
    "suspended",
    "archived",
  ]),
  trustScore: PropTypes.number,

  // Ownership
  ownerId: PropTypes.string,
  owner: PropTypes.object, // Can be PropertyOwnerPropTypes when populated

  // Metadata
  metadata: PropTypes.shape(PropertyMetadataPropTypes),
  featuredInfo: PropTypes.shape(PropertyFeaturedInfoPropTypes),

  // Timestamps
  createdAt: PropTypes.string,
  updatedAt: PropTypes.string,
  publishedAt: PropTypes.string,
};

export const PropertyFilterPropTypes = {
  country: PropTypes.string,
  city: PropTypes.string,
  propertyType: PropTypes.string,
  status: PropTypes.string,
  minValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  maxValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  minSize: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  maxSize: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  minYield: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  maxYield: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  rooms: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  search: PropTypes.string,
  sortBy: PropTypes.string,
  sortOrder: PropTypes.oneOf(["asc", "desc"]),
};

export const PropertyStatisticsPropTypes = {
  totalProperties: PropTypes.number,
  publishedProperties: PropTypes.number,
  propertiesInContract: PropTypes.number,
  soldProperties: PropTypes.number,
  totalValue: PropTypes.number,
  totalInvestmentRequested: PropTypes.number,
  averageYield: PropTypes.number,
  propertiesByCountry: PropTypes.objectOf(PropTypes.number),
  propertiesByType: PropTypes.objectOf(PropTypes.number),
};
