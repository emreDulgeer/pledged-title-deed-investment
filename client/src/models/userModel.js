// src/models/userModel.js
import PropTypes from "prop-types";

export const UserPropTypes = {
  id: PropTypes.string.isRequired,
  fullName: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  phone: PropTypes.string,
  country: PropTypes.string,
  role: PropTypes.oneOf([
    "admin",
    "investor",
    "property_owner",
    "local_representative",
  ]),
  status: PropTypes.oneOf(["active", "inactive", "suspended"]),
  avatar: PropTypes.string,
  language: PropTypes.oneOf(["en", "pt"]),
  createdAt: PropTypes.string,
  updatedAt: PropTypes.string,
};

export const InvestorPropTypes = {
  ...UserPropTypes,
  kycStatus: PropTypes.oneOf(["Pending", "Approved", "Rejected"]),
  riskScore: PropTypes.number,
  activeInvestmentCount: PropTypes.number,
  investmentLimit: PropTypes.number,
  totalInvestedAmount: PropTypes.number,
  preferences: PropTypes.shape({
    propertyTypes: PropTypes.arrayOf(PropTypes.string),
    countries: PropTypes.arrayOf(PropTypes.string),
    minInvestment: PropTypes.number,
    maxInvestment: PropTypes.number,
  }),
};

export const PropertyOwnerPropTypes = {
  ...UserPropTypes,
  trustScore: PropTypes.number,
  verificationStatus: PropTypes.oneOf(["Pending", "Approved", "Rejected"]),
  totalProperties: PropTypes.number,
  completedContracts: PropTypes.number,
  ongoingContracts: PropTypes.number,
  bankDetails: PropTypes.shape({
    accountName: PropTypes.string,
    bankName: PropTypes.string,
    iban: PropTypes.string,
    swiftCode: PropTypes.string,
  }),
};

export const LocalRepresentativePropTypes = {
  ...UserPropTypes,
  areas: PropTypes.arrayOf(
    PropTypes.shape({
      country: PropTypes.string.isRequired,
      cities: PropTypes.arrayOf(PropTypes.string),
    })
  ),
  totalPropertiesManaged: PropTypes.number,
  activeProperties: PropTypes.number,
  commission: PropTypes.number,
};

export const UserStatisticsPropTypes = {
  totalUsers: PropTypes.number,
  activeUsers: PropTypes.number,
  newUsersThisMonth: PropTypes.number,
  usersByRole: PropTypes.shape({
    admin: PropTypes.number,
    investor: PropTypes.number,
    property_owner: PropTypes.number,
    local_representative: PropTypes.number,
  }),
  usersByCountry: PropTypes.objectOf(PropTypes.number),
};
