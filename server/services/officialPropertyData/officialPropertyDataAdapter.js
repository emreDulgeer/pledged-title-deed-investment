const logger = require("../../utils/logger");
const {
  SUPPORTED_PROPERTY_COUNTRIES,
  normalizeSupportedPropertyCountry,
} = require("../../utils/propertyCountries");
const StubOfficialPropertyDataProvider = require("./providers/StubOfficialPropertyDataProvider");

class OfficialPropertyDataAdapter {
  constructor() {
    this.providers = new Map();
    this._initializeProviders();
  }

  _initializeProviders() {
    SUPPORTED_PROPERTY_COUNTRIES.forEach(({ name, code }) => {
      this.registerProvider(
        name,
        new StubOfficialPropertyDataProvider({
          countryName: name,
          countryCode: code,
          providerKey: `${code}-official-registry-stub`,
          providerName: `${name} Official Property Registry (Stub)`,
        }),
      );
    });

    logger.info(
      `🏛️  Official property data providers initialized for: ${Array.from(
        this.providers.keys(),
      ).join(", ")}`,
    );
  }

  registerProvider(countryName, providerInstance) {
    const normalizedCountry = normalizeSupportedPropertyCountry(countryName);

    if (!normalizedCountry) {
      throw new Error(`Cannot register provider for unsupported country: ${countryName}`);
    }

    this.providers.set(normalizedCountry, providerInstance);
  }

  getProvider(countryName) {
    const normalizedCountry = normalizeSupportedPropertyCountry(countryName);
    return normalizedCountry ? this.providers.get(normalizedCountry) || null : null;
  }

  getProviderInfo(countryName) {
    return this.getProvider(countryName)?.getProviderInfo() || null;
  }

  getSupportedCountries() {
    return Array.from(this.providers.keys());
  }

  async checkProperty(property) {
    if (!property) {
      throw new Error("Property is required");
    }

    const provider = this.getProvider(property.country);

    if (!provider) {
      throw new Error(
        `No official property data provider configured for ${property.country}`,
      );
    }

    return provider.checkProperty(property);
  }
}

module.exports = new OfficialPropertyDataAdapter();
module.exports.OfficialPropertyDataAdapter = OfficialPropertyDataAdapter;
module.exports.StubOfficialPropertyDataProvider = StubOfficialPropertyDataProvider;
