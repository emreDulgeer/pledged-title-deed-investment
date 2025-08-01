const PropertyDto = require("./PropertyDto");
const PropertyListDto = require("./PropertyListDto");
const PropertyDetailDto = require("./PropertyDetailDto");
const PropertyInvestorViewDto = require("./PropertyInvestorViewDto");
const PropertyAdminViewDto = require("./PropertyAdminViewDto");
const PropertyOwnerViewDto = require("./PropertyOwnerViewDto");

module.exports = {
  toPropertyDto: (property) => new PropertyDto(property),
  toPropertyListDto: (property) => new PropertyListDto(property),
  toPropertyDetailDto: (property) => new PropertyDetailDto(property),
  toPropertyInvestorViewDto: (property, investorId) =>
    new PropertyInvestorViewDto(property, investorId),
  toPropertyAdminViewDto: (property) => new PropertyAdminViewDto(property),
  toPropertyOwnerViewDto: (property) => new PropertyOwnerViewDto(property),

  toPropertyListDtoArray: (properties) =>
    properties.map((p) => new PropertyListDto(p)),
  toPropertyInvestorViewDtoArray: (properties, investorId) =>
    properties.map((p) => new PropertyInvestorViewDto(p, investorId)),
  toPropertyAdminViewDtoArray: (properties) =>
    properties.map((p) => new PropertyAdminViewDto(p)),
  toPropertyOwnerViewDtoArray: (properties) =>
    properties.map((p) => new PropertyOwnerViewDto(p)),

  PropertyDto,
  PropertyListDto,
  PropertyDetailDto,
  PropertyInvestorViewDto,
  PropertyAdminViewDto,
  PropertyOwnerViewDto,
};
