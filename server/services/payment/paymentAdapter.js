const StubPaymentProvider = require("./providers/StubPaymentProvider");

class PaymentAdapter {
  constructor() {
    this.provider = new StubPaymentProvider();
  }

  getProviderInfo() {
    return this.provider.getProviderInfo();
  }

  getSupportedMethods(context = {}) {
    return this.provider.getSupportedMethods(context);
  }

  async initializeInvestmentPayment(context = {}) {
    return this.provider.initializeInvestmentPayment(context);
  }
}

module.exports = new PaymentAdapter();
module.exports.PaymentAdapter = PaymentAdapter;
module.exports.StubPaymentProvider = StubPaymentProvider;
