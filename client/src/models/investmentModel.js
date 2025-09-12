// src/models/investmentModel.js
import PropTypes from "prop-types";

export const FileInfoPropTypes = {
  fileId: PropTypes.string.isRequired,
  url: PropTypes.string,
  name: PropTypes.string,
  size: PropTypes.number,
  uploadedAt: PropTypes.string,
  uploadedBy: PropTypes.string,
};

export const RentalPaymentPropTypes = {
  _id: PropTypes.string,
  month: PropTypes.string.isRequired,
  year: PropTypes.number.isRequired,
  amount: PropTypes.number.isRequired,
  currency: PropTypes.string,
  status: PropTypes.oneOf([
    "paid",
    "pending",
    "delayed",
    "cancelled",
    "refunded",
  ]),
  paidAt: PropTypes.string,
  dueDate: PropTypes.string,
  delayDays: PropTypes.number,
  paymentMethod: PropTypes.string,
  paymentReceipt: PropTypes.shape(FileInfoPropTypes),
  notes: PropTypes.string,
};

export const PaymentStatisticsPropTypes = {
  totalPayments: PropTypes.number,
  paidPayments: PropTypes.number,
  pendingPayments: PropTypes.number,
  delayedPayments: PropTypes.number,
  cancelledPayments: PropTypes.number,
  totalPaidAmount: PropTypes.number,
  totalPendingAmount: PropTypes.number,
  totalDelayedAmount: PropTypes.number,
  paymentComplianceRate: PropTypes.string,
  averageDelayDays: PropTypes.number,
};

export const RiskIndicatorsPropTypes = {
  overallRiskScore: PropTypes.number,
  investorRiskScore: PropTypes.number,
  propertyOwnerRiskScore: PropTypes.number,
  propertyRiskScore: PropTypes.number,
  paymentDelayCount: PropTypes.number,
  contractCompletionRate: PropTypes.number,
  hasAllDocuments: PropTypes.bool,
  kycCompliant: PropTypes.bool,
  ownerVerified: PropTypes.bool,
  propertyVerified: PropTypes.bool,
  riskFactors: PropTypes.arrayOf(PropTypes.string),
};

export const InvestmentMetadataPropTypes = {
  lastPaymentDate: PropTypes.string,
  nextPaymentDue: PropTypes.string,
  daysUntilContractEnd: PropTypes.number,
  totalReturnAmount: PropTypes.number,
  currentROI: PropTypes.number,
  projectedROI: PropTypes.number,
  contractStartDate: PropTypes.string,
  contractEndDate: PropTypes.string,
};

export const InvestmentPropTypes = {
  id: PropTypes.string.isRequired,

  // Financial Details
  amountInvested: PropTypes.number.isRequired,
  currency: PropTypes.oneOf(["EUR", "USD", "GBP", "TRY"]),
  exchangeRate: PropTypes.number,
  localCurrencyAmount: PropTypes.number,

  // Status
  status: PropTypes.oneOf([
    "draft",
    "pending_payment",
    "payment_received",
    "contract_pending",
    "contract_signed",
    "title_deed_pending",
    "title_deed_received",
    "active",
    "completed",
    "cancelled",
    "refunded",
    "transferred",
  ]),
  statusHistory: PropTypes.arrayOf(
    PropTypes.shape({
      status: PropTypes.string,
      date: PropTypes.string,
      note: PropTypes.string,
      updatedBy: PropTypes.string,
    })
  ),

  // Documents
  contractFile: PropTypes.shape(FileInfoPropTypes),
  paymentReceipt: PropTypes.shape(FileInfoPropTypes),
  titleDeedDocument: PropTypes.shape(FileInfoPropTypes),
  otherDocuments: PropTypes.arrayOf(
    PropTypes.shape({
      ...FileInfoPropTypes,
      type: PropTypes.string,
    })
  ),

  // Relations
  propertyId: PropTypes.string.isRequired,
  property: PropTypes.object, // PropertyPropTypes when populated
  investorId: PropTypes.string.isRequired,
  investor: PropTypes.object, // InvestorPropTypes when populated
  propertyOwnerId: PropTypes.string.isRequired,
  propertyOwner: PropTypes.object, // PropertyOwnerPropTypes when populated

  // Payments
  rentalPayments: PropTypes.arrayOf(PropTypes.shape(RentalPaymentPropTypes)),
  paymentStatistics: PropTypes.shape(PaymentStatisticsPropTypes),

  // Refund (if applicable)
  refund: PropTypes.shape({
    reason: PropTypes.string,
    amount: PropTypes.number,
    requestedAt: PropTypes.string,
    approvedAt: PropTypes.string,
    processedAt: PropTypes.string,
    refundReceipt: PropTypes.shape(FileInfoPropTypes),
  }),

  // Transfer (if applicable)
  transferOfProperty: PropTypes.shape({
    transferredTo: PropTypes.string,
    transferDate: PropTypes.string,
    transferDocument: PropTypes.shape(FileInfoPropTypes),
    notaryDetails: PropTypes.object,
  }),

  // Risk & Metadata
  riskIndicators: PropTypes.shape(RiskIndicatorsPropTypes),
  metadata: PropTypes.shape(InvestmentMetadataPropTypes),

  // Notes & Communications
  internalNotes: PropTypes.arrayOf(
    PropTypes.shape({
      note: PropTypes.string,
      createdBy: PropTypes.string,
      createdAt: PropTypes.string,
    })
  ),

  // Timestamps
  createdAt: PropTypes.string,
  updatedAt: PropTypes.string,
  activatedAt: PropTypes.string,
  completedAt: PropTypes.string,
};

export const InvestmentFilterPropTypes = {
  status: PropTypes.string,
  propertyCountry: PropTypes.string,
  propertyCity: PropTypes.string,
  investorCountry: PropTypes.string,
  minAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  maxAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  dateRange: PropTypes.shape({
    start: PropTypes.string,
    end: PropTypes.string,
  }),
  riskScore: PropTypes.string,
  hasDelayedPayments: PropTypes.bool,
  search: PropTypes.string,
  sortBy: PropTypes.string,
  sortOrder: PropTypes.oneOf(["asc", "desc"]),
};

export const InvestmentStatisticsPropTypes = {
  totalInvestments: PropTypes.number,
  activeInvestments: PropTypes.number,
  completedInvestments: PropTypes.number,
  totalAmountInvested: PropTypes.number,
  totalRentalIncome: PropTypes.number,
  averageROI: PropTypes.number,
  investmentsByStatus: PropTypes.objectOf(PropTypes.number),
  investmentsByCountry: PropTypes.objectOf(PropTypes.number),
  monthlyInvestmentTrend: PropTypes.arrayOf(
    PropTypes.shape({
      month: PropTypes.string,
      count: PropTypes.number,
      amount: PropTypes.number,
    })
  ),
};
