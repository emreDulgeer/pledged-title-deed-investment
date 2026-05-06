const { APP_CURRENCY } = require("../../../utils/currency");

class StubPaymentProvider {
  getProviderInfo() {
    return {
      key: "stub_manual_transfer",
      name: "Manual Transfer Adapter",
      mode: "stub",
    };
  }

  getSupportedMethods() {
    return [
      {
        key: "bank_transfer",
        label: "Bank Transfer",
        description: "Manual bank transfer with payment reference tracking.",
      },
      {
        key: "wise_transfer",
        label: "Wise Transfer",
        description: "Cross-border transfer flow with receipt upload.",
      },
      {
        key: "escrow_transfer",
        label: "Escrow Transfer",
        description: "Manual escrow or pooled account settlement flow.",
      },
    ];
  }

  async initializeInvestmentPayment({
    investment,
    property,
    propertyOwner,
    method = "bank_transfer",
  }) {
    const normalizedMethod = this.getSupportedMethods().some(
      (item) => item.key === method,
    )
      ? method
      : "bank_transfer";

    const ownerBank = propertyOwner?.bankAccountInfo || {};
    const referenceCode = `INV-${String(investment._id).slice(-8).toUpperCase()}`;
    const amount = Number(investment.amountInvested || 0);
    const currency = investment.currency || APP_CURRENCY;
    const countryLabel = property?.country || "Platform";

    const commonInstructions = {
      summary: `Transfer ${amount.toLocaleString("en-US")} ${currency} using the reference code below.`,
      recipientName:
        ownerBank.bankName && propertyOwner?.fullName
          ? propertyOwner.fullName
          : `${countryLabel} Settlement Account`,
      bankName: ownerBank.bankName || `${countryLabel} Settlement Bank`,
      iban: ownerBank.iban || "TO_BE_DEFINED",
      swiftCode: ownerBank.swiftCode || "",
      accountNumber: ownerBank.accountNumber || "",
      transferNote: `Reference: ${referenceCode}`,
      steps: [
        "Review the transfer details and reference code.",
        "Send the principal amount using your selected transfer method.",
        "Upload the receipt so the property owner can confirm the transfer.",
      ],
    };

    if (normalizedMethod === "wise_transfer") {
      commonInstructions.summary = `Send ${amount.toLocaleString("en-US")} ${currency} with Wise or an equivalent provider and keep the transfer reference visible on the receipt.`;
      commonInstructions.transferNote = `Wise reference: ${referenceCode}`;
    }

    if (normalizedMethod === "escrow_transfer") {
      commonInstructions.summary = `Send ${amount.toLocaleString("en-US")} ${currency} to the platform escrow/pool account. Funds will be treated as manually released until a live provider is integrated.`;
      commonInstructions.recipientName = "Platform Escrow Account";
      commonInstructions.transferNote = `Escrow reference: ${referenceCode}`;
    }

    return {
      providerKey: this.getProviderInfo().key,
      providerLabel: this.getProviderInfo().name,
      method: normalizedMethod,
      amount,
      currency,
      externalPaymentId: `stub-${investment._id}-${Date.now()}`,
      referenceCode,
      instructions: commonInstructions,
    };
  }
}

module.exports = StubPaymentProvider;
