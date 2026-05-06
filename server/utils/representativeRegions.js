const {
  normalizeSupportedPropertyCountry,
} = require("./propertyCountries");

const toArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null || value === "") {
    return [];
  }

  return [value];
};

const normalizeRepresentativeRegions = (value) => {
  const normalized = toArray(value)
    .map((entry) => normalizeSupportedPropertyCountry(entry))
    .filter(Boolean);

  return [...new Set(normalized)];
};

const getRepresentativeRegions = (representative) => {
  if (!representative) {
    return [];
  }

  const combined = [
    ...toArray(representative.regions),
    ...toArray(representative.region),
  ];

  return normalizeRepresentativeRegions(combined);
};

const getPrimaryRepresentativeRegion = (representative) =>
  getRepresentativeRegions(representative)[0] || null;

const representativeHasRegion = (representative, region) => {
  const normalizedRegion = normalizeSupportedPropertyCountry(region);
  if (!normalizedRegion) {
    return false;
  }

  return getRepresentativeRegions(representative).includes(normalizedRegion);
};

module.exports = {
  normalizeRepresentativeRegions,
  getRepresentativeRegions,
  getPrimaryRepresentativeRegion,
  representativeHasRegion,
};
