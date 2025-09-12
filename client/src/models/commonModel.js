// src/models/commonModel.js
import PropTypes from "prop-types";

export const PaginationPropTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  totalItems: PropTypes.number.isRequired,
  itemsPerPage: PropTypes.number.isRequired,
  hasNext: PropTypes.bool.isRequired,
  hasPrev: PropTypes.bool.isRequired,
};

export const ApiResponsePropTypes = {
  success: PropTypes.bool.isRequired,
  data: PropTypes.any,
  message: PropTypes.string,
  statusCode: PropTypes.number,
  timestamp: PropTypes.string,
  pagination: PropTypes.shape(PaginationPropTypes),
  errors: PropTypes.arrayOf(
    PropTypes.shape({
      field: PropTypes.string,
      message: PropTypes.string,
      code: PropTypes.string,
    })
  ),
};

export const AddressPropTypes = {
  street: PropTypes.string,
  city: PropTypes.string.isRequired,
  state: PropTypes.string,
  country: PropTypes.string.isRequired,
  postalCode: PropTypes.string,
  fullAddress: PropTypes.string,
};

export const ContactInfoPropTypes = {
  email: PropTypes.string.isRequired,
  phone: PropTypes.string,
  alternatePhone: PropTypes.string,
  whatsapp: PropTypes.string,
  telegram: PropTypes.string,
};

export const NotificationPropTypes = {
  id: PropTypes.string.isRequired,
  type: PropTypes.oneOf(["info", "success", "warning", "error"]),
  title: PropTypes.string,
  message: PropTypes.string.isRequired,
  read: PropTypes.bool,
  actionUrl: PropTypes.string,
  createdAt: PropTypes.string,
};

export const AuditLogPropTypes = {
  id: PropTypes.string.isRequired,
  action: PropTypes.string.isRequired,
  entityType: PropTypes.string.isRequired,
  entityId: PropTypes.string,
  userId: PropTypes.string.isRequired,
  userEmail: PropTypes.string,
  changes: PropTypes.object,
  ipAddress: PropTypes.string,
  userAgent: PropTypes.string,
  timestamp: PropTypes.string,
};

export const CurrencyPropTypes = {
  code: PropTypes.oneOf(["EUR", "USD", "GBP", "TRY"]).isRequired,
  symbol: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  exchangeRate: PropTypes.number,
};

export const DateRangePropTypes = {
  start: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  end: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
};

export const MediaFilePropTypes = {
  id: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
  thumbnailUrl: PropTypes.string,
  type: PropTypes.oneOf(["image", "video", "document"]),
  mimeType: PropTypes.string,
  size: PropTypes.number,
  width: PropTypes.number,
  height: PropTypes.number,
  duration: PropTypes.number,
  metadata: PropTypes.object,
};

export const LanguagePropTypes = {
  code: PropTypes.oneOf(["en", "pt"]).isRequired,
  name: PropTypes.string.isRequired,
  nativeName: PropTypes.string.isRequired,
  flag: PropTypes.string,
  isRTL: PropTypes.bool,
};

export const CountryPropTypes = {
  code: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  currency: PropTypes.string,
  languages: PropTypes.arrayOf(PropTypes.string),
  timezone: PropTypes.string,
  flag: PropTypes.string,
};
