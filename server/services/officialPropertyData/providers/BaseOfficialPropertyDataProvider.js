class BaseOfficialPropertyDataProvider {
  constructor({
    countryName,
    countryCode,
    providerKey,
    providerName,
    mode = "live",
  }) {
    this.countryName = countryName;
    this.countryCode = countryCode;
    this.providerKey = providerKey;
    this.providerName = providerName;
    this.mode = mode;
  }

  getProviderInfo() {
    return {
      key: this.providerKey,
      name: this.providerName,
      country: this.countryName,
      countryCode: this.countryCode,
      mode: this.mode,
    };
  }

  // Subclasses should implement this once a live or stub integration exists.
  async checkProperty() {
    throw new Error("Official property data provider is not implemented");
  }
}

module.exports = BaseOfficialPropertyDataProvider;
