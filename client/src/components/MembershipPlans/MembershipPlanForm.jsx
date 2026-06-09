// src/components/MembershipPlans/MembershipPlanForm.jsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { APP_CURRENCY } from "../../utils/currency";

const MembershipPlanForm = ({ mode, planData, onSave, onClose }) => {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    description: "",
    tier: 1,
    order: 0,
    isActive: true,
    isVisible: true,
    isDefault: false,
    isHighlighted: false,
    isFeatured: false,
    pricing: {
      monthly: { amount: 0, currency: "EUR", originalAmount: null },
      yearly: {
        amount: 0,
        currency: "EUR",
        discountPercentage: 20,
        originalAmount: null,
      },
      trial: { enabled: false, days: 7, requiresCard: true },
    },
    features: {
      investments: {
        maxActiveInvestments: 1,
        maxMonthlyInvestments: -1,
        allowBulkInvestments: false,
      },
      properties: {
        canListProperties: false,
        priorityListing: false,
        featuredListingDays: 0,
      },
      commissions: {
        platformCommissionDiscount: 0,
        rentalCommissionDiscount: 0,
        referralBonusMultiplier: 1,
      },
      support: {
        level: "email",
        responseTime: "48h",
        hasPhoneSupport: false,
        hasDedicatedManager: false,
        hasLiveChat: false,
      },
      analytics: {
        hasBasicAnalytics: true,
        hasAdvancedAnalytics: false,
        hasMarketReports: false,
        hasCustomReports: false,
      },
      api: { hasAccess: false, rateLimit: 0, webhooksEnabled: false },
      referral: {
        canEarnCommission: true,
        commissionRate: 5,
        maxReferrals: -1,
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        whatsappNotifications: false,
      },
      security: {
        twoFactorAuth: true,
        ipWhitelisting: false,
        sessionManagement: false,
        auditLogs: false,
      },
    },
  });

  const [activeTab, setActiveTab] = useState("basic");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (mode === "edit" && planData) {
      setFormData(JSON.parse(JSON.stringify(planData)));
    }
  }, [mode, planData]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name?.trim()) newErrors.name = t("errors.required_field");
    if (!formData.displayName?.trim())
      newErrors.displayName = t("errors.required_field");
    if (!formData.description?.trim())
      newErrors.description = t("errors.required_field");
    if (formData.tier < 1) newErrors.tier = "Tier must be at least 1";
    if (formData.pricing.monthly.amount < 0)
      newErrors.monthlyAmount = "Amount cannot be negative";
    if (formData.pricing.yearly.amount < 0)
      newErrors.yearlyAmount = "Amount cannot be negative";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) onSave(formData);
  };

  const handleChange = (path, value) => {
    setFormData((prev) => {
      const keys = path.split(".");
      const newData = { ...prev };
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = Array.isArray(current[keys[i]])
          ? [...current[keys[i]]]
          : { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] =
        typeof value === "number" && Number.isNaN(value) ? 0 : value;
      return newData;
    });
    if (errors[path]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[path];
        return next;
      });
    }
  };

  const tabs = [
    { id: "basic", label: t("admin.membership.tabs.basic") || "Basic Info" },
    { id: "pricing", label: t("admin.membership.tabs.pricing") || "Pricing" },
    {
      id: "features",
      label: t("admin.membership.tabs.features") || "Features",
    },
    { id: "limits", label: t("admin.membership.tabs.limits") || "Limits" },
    { id: "support", label: t("admin.membership.tabs.support") || "Support" },
    {
      id: "advanced",
      label: t("admin.membership.tabs.advanced") || "Advanced",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-night-background/70 p-4 backdrop-blur-sm">
      <div className="shell-surface w-full max-w-5xl overflow-hidden shadow-shell max-h-[92vh]">
        {/* Header */}
        <div className="relative flex items-start justify-between gap-4 border-b border-day-border/70 px-6 py-6 dark:border-night-border/70">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-day-primary/10 via-day-panel to-day-accent/10 dark:from-night-primary/10 dark:via-night-panel/40 dark:to-night-accent/10" />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-day-muted dark:text-night-muted">
              Plan studio
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-day-text dark:text-night-text">
              {mode === "create"
                ? t("admin.membership.form.create_title") || "Create New Plan"
                : t("admin.membership.form.edit_title") || "Edit Plan"}
            </h2>
            <p className="mt-2 text-sm text-day-muted dark:text-night-muted">
              Configure pricing, limits, support, and visibility without leaving
              the admin workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="relative grid h-11 w-11 place-items-center rounded-2xl border border-day-border bg-day-surface text-day-muted transition hover:bg-day-panel hover:text-day-text dark:border-night-border dark:bg-night-surface dark:text-night-muted dark:hover:bg-night-panel dark:hover:text-night-text"
            aria-label={t("common.close") || "Close"}
            title={t("common.close") || "Close"}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-day-border/70 bg-day-panel/40 dark:border-night-border/70 dark:bg-night-panel/30">
          <div className="flex gap-2 overflow-x-auto px-4 py-3 sm:px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-day-primary text-white shadow-accent dark:bg-night-primary dark:text-night-background"
                    : "text-day-muted hover:bg-day-surface hover:text-day-text dark:text-night-muted dark:hover:bg-night-surface dark:hover:text-night-text"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="max-h-[58vh] overflow-y-auto px-5 py-6 sm:px-6"
        >
          {activeTab === "basic" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  label={t("admin.membership.form.name") || "Internal Name"}
                  required
                  error={errors.name}
                >
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      handleChange("name", e.target.value.toLowerCase())
                    }
                    placeholder="e.g., basic, pro, enterprise"
                    className={INPUT_CLS(errors.name)}
                  />
                </Field>

                <Field
                  label={
                    t("admin.membership.form.displayName") || "Display Name"
                  }
                  required
                  error={errors.displayName}
                >
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) =>
                      handleChange("displayName", e.target.value)
                    }
                    placeholder="e.g., Basic, Professional, Enterprise"
                    className={INPUT_CLS(errors.displayName)}
                  />
                </Field>
              </div>

              <Field
                label={t("admin.membership.form.description") || "Description"}
                required
                error={errors.description}
              >
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={3}
                  placeholder="Brief description of the plan..."
                  className={INPUT_CLS(errors.description, true)}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  label={t("admin.membership.form.tier") || "Tier Level"}
                  error={errors.tier}
                >
                  <input
                    type="number"
                    min={1}
                    value={formData.tier}
                    onChange={(e) =>
                      handleChange("tier", parseInt(e.target.value, 10))
                    }
                    className={INPUT_CLS(errors.tier)}
                  />
                </Field>

                <Field
                  label={t("admin.membership.form.order") || "Display Order"}
                >
                  <input
                    type="number"
                    min={0}
                    value={formData.order}
                    onChange={(e) =>
                      handleChange("order", parseInt(e.target.value, 10))
                    }
                    className={INPUT_CLS()}
                  />
                </Field>
              </div>

              <div className="space-y-2">
                <CheckboxRow
                  checked={formData.isActive}
                  onChange={(v) => handleChange("isActive", v)}
                  label={t("admin.membership.form.active") || "Active"}
                />
                <CheckboxRow
                  checked={formData.isVisible}
                  onChange={(v) => handleChange("isVisible", v)}
                  label={
                    t("admin.membership.form.visible") || "Visible to Users"
                  }
                />
                <CheckboxRow
                  checked={formData.isDefault}
                  onChange={(v) => handleChange("isDefault", v)}
                  label={t("admin.membership.form.default") || "Default Plan"}
                />
                <CheckboxRow
                  checked={formData.isHighlighted}
                  onChange={(v) => handleChange("isHighlighted", v)}
                  label={
                    t("admin.membership.form.highlighted") ||
                    "Highlighted (Popular)"
                  }
                />
                <CheckboxRow
                  checked={formData.isFeatured}
                  onChange={(v) => handleChange("isFeatured", v)}
                  label={t("admin.membership.form.featured") || "Featured"}
                />
              </div>
            </div>
          )}

          {activeTab === "pricing" && (
            <div className="space-y-6">
              <SectionTitle>
                {t("admin.membership.form.monthly_pricing") ||
                  "Monthly Pricing"}
              </SectionTitle>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <NumberInput
                  label="Amount *"
                  value={formData.pricing.monthly.amount}
                  onChange={(v) =>
                    handleChange("pricing.monthly.amount", v ?? 0)
                  }
                  error={errors.monthlyAmount}
                />
                <Select
                  label="Currency"
                  value={formData.pricing.monthly.currency}
                  onChange={(v) => handleChange("pricing.monthly.currency", v)}
                  options={[{ value: APP_CURRENCY, label: APP_CURRENCY }]}
                  disabled
                />
              </div>

              <SectionTitle>
                {t("admin.membership.form.yearly_pricing") || "Yearly Pricing"}
              </SectionTitle>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <NumberInput
                  label="Amount *"
                  value={formData.pricing.yearly.amount}
                  onChange={(v) =>
                    handleChange("pricing.yearly.amount", v ?? 0)
                  }
                  error={errors.yearlyAmount}
                />
                <NumberInput
                  label="Discount %"
                  value={formData.pricing.yearly.discountPercentage}
                  onChange={(v) =>
                    handleChange("pricing.yearly.discountPercentage", v ?? 0)
                  }
                  min={0}
                  max={100}
                />
                <Select
                  label="Currency"
                  value={formData.pricing.yearly.currency}
                  onChange={(v) => handleChange("pricing.yearly.currency", v)}
                  options={[{ value: APP_CURRENCY, label: APP_CURRENCY }]}
                  disabled
                />
              </div>

              <SectionTitle>
                {t("admin.membership.form.trial") || "Trial Period"}
              </SectionTitle>
              <CheckboxRow
                checked={formData.pricing.trial.enabled}
                onChange={(v) => handleChange("pricing.trial.enabled", v)}
                label={
                  t("admin.membership.form.enable_trial") || "Enable Trial"
                }
              />
              {formData.pricing.trial.enabled && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <NumberInput
                    label={
                      t("admin.membership.form.trial_days") || "Trial Days"
                    }
                    value={formData.pricing.trial.days}
                    onChange={(v) => handleChange("pricing.trial.days", v ?? 1)}
                    min={1}
                  />
                  <CheckboxRow
                    className="mt-6"
                    checked={formData.pricing.trial.requiresCard}
                    onChange={(v) =>
                      handleChange("pricing.trial.requiresCard", v)
                    }
                    label={
                      t("admin.membership.form.trial_requires_card") ||
                      "Require Card for Trial"
                    }
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === "features" && (
            <div className="space-y-6">
              <SectionTitle>
                {t("admin.membership.form.investment_features") ||
                  "Investment Features"}
              </SectionTitle>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <NumberInput
                  label="Max Active Investments (-1 = unlimited)"
                  value={formData.features.investments.maxActiveInvestments}
                  onChange={(v) =>
                    handleChange(
                      "features.investments.maxActiveInvestments",
                      v ?? -1
                    )
                  }
                  min={-1}
                />
                <CheckboxRow
                  className="mt-6"
                  checked={
                    formData.features.investments.allowBulkInvestments || false
                  }
                  onChange={(v) =>
                    handleChange("features.investments.allowBulkInvestments", v)
                  }
                  label="Allow Bulk Investments"
                />
              </div>

              <SectionTitle>
                {t("admin.membership.form.commission_discounts") ||
                  "Commission Discounts"}
              </SectionTitle>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <NumberInput
                  label="Platform Commission Discount (%)"
                  value={
                    formData.features.commissions.platformCommissionDiscount
                  }
                  onChange={(v) =>
                    handleChange(
                      "features.commissions.platformCommissionDiscount",
                      v ?? 0
                    )
                  }
                  min={0}
                  max={100}
                  step={0.1}
                />
                <NumberInput
                  label="Rental Commission Discount (%)"
                  value={formData.features.commissions.rentalCommissionDiscount}
                  onChange={(v) =>
                    handleChange(
                      "features.commissions.rentalCommissionDiscount",
                      v ?? 0
                    )
                  }
                  min={0}
                  max={100}
                  step={0.1}
                />
              </div>

              <SectionTitle>
                {t("admin.membership.form.analytics_reporting") ||
                  "Analytics & Reporting"}
              </SectionTitle>
              <div className="space-y-2">
                <CheckboxRow
                  checked={formData.features.analytics.hasBasicAnalytics}
                  onChange={(v) =>
                    handleChange("features.analytics.hasBasicAnalytics", v)
                  }
                  label="Basic Analytics"
                />
                <CheckboxRow
                  checked={formData.features.analytics.hasAdvancedAnalytics}
                  onChange={(v) =>
                    handleChange("features.analytics.hasAdvancedAnalytics", v)
                  }
                  label="Advanced Analytics"
                />
                <CheckboxRow
                  checked={formData.features.analytics.hasMarketReports}
                  onChange={(v) =>
                    handleChange("features.analytics.hasMarketReports", v)
                  }
                  label="Market Reports"
                />
                <CheckboxRow
                  checked={formData.features.analytics.hasCustomReports}
                  onChange={(v) =>
                    handleChange("features.analytics.hasCustomReports", v)
                  }
                  label="Custom Reports"
                />
              </div>
            </div>
          )}

          {activeTab === "limits" && (
            <div className="space-y-6">
              <SectionTitle>
                {t("admin.membership.form.property_limits") ||
                  "Property Limits"}
              </SectionTitle>
              <div className="space-y-3">
                <CheckboxRow
                  checked={formData.features.properties.canListProperties}
                  onChange={(v) =>
                    handleChange("features.properties.canListProperties", v)
                  }
                  label="Can List Properties"
                />
                <CheckboxRow
                  checked={formData.features.properties.priorityListing}
                  onChange={(v) =>
                    handleChange("features.properties.priorityListing", v)
                  }
                  label="Priority Listing"
                />
                <NumberInput
                  label="Featured Listing Days"
                  value={formData.features.properties.featuredListingDays}
                  onChange={(v) =>
                    handleChange(
                      "features.properties.featuredListingDays",
                      v ?? 0
                    )
                  }
                  min={0}
                />
              </div>

              <SectionTitle>
                {t("admin.membership.form.api_access") || "API Access"}
              </SectionTitle>
              <div className="space-y-3">
                <CheckboxRow
                  checked={formData.features.api.hasAccess}
                  onChange={(v) => handleChange("features.api.hasAccess", v)}
                  label="Enable API Access"
                />
                {formData.features.api.hasAccess && (
                  <>
                    <NumberInput
                      label="Rate Limit (requests/hour)"
                      value={formData.features.api.rateLimit}
                      onChange={(v) =>
                        handleChange("features.api.rateLimit", v ?? 0)
                      }
                      min={0}
                    />
                    <CheckboxRow
                      checked={formData.features.api.webhooksEnabled}
                      onChange={(v) =>
                        handleChange("features.api.webhooksEnabled", v)
                      }
                      label="Enable Webhooks"
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === "support" && (
            <div className="space-y-6">
              <SectionTitle>
                {t("admin.membership.form.support_level") || "Support Level"}
              </SectionTitle>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Select
                  label="Support Level"
                  value={formData.features.support.level}
                  onChange={(v) => handleChange("features.support.level", v)}
                  options={[
                    { value: "email", label: "Email" },
                    { value: "priority", label: "Priority" },
                    { value: "dedicated", label: "Dedicated" },
                    { value: "vip", label: "VIP" },
                  ]}
                />
                <TextInput
                  label="Response Time"
                  value={formData.features.support.responseTime}
                  onChange={(v) =>
                    handleChange("features.support.responseTime", v)
                  }
                  placeholder="e.g., 48h, 24h, 2h"
                />
              </div>

              <div className="space-y-2">
                <CheckboxRow
                  checked={formData.features.support.hasPhoneSupport}
                  onChange={(v) =>
                    handleChange("features.support.hasPhoneSupport", v)
                  }
                  label="Phone Support"
                />
                <CheckboxRow
                  checked={formData.features.support.hasDedicatedManager}
                  onChange={(v) =>
                    handleChange("features.support.hasDedicatedManager", v)
                  }
                  label="Dedicated Manager"
                />
                <CheckboxRow
                  checked={formData.features.support.hasLiveChat}
                  onChange={(v) =>
                    handleChange("features.support.hasLiveChat", v)
                  }
                  label="Live Chat"
                />
              </div>

              <SectionTitle>
                {t("admin.membership.form.notifications") || "Notifications"}
              </SectionTitle>
              <div className="space-y-2">
                <CheckboxRow
                  checked={formData.features.notifications.emailNotifications}
                  onChange={(v) =>
                    handleChange("features.notifications.emailNotifications", v)
                  }
                  label="Email Notifications"
                />
                <CheckboxRow
                  checked={formData.features.notifications.smsNotifications}
                  onChange={(v) =>
                    handleChange("features.notifications.smsNotifications", v)
                  }
                  label="SMS Notifications"
                />
                <CheckboxRow
                  checked={formData.features.notifications.pushNotifications}
                  onChange={(v) =>
                    handleChange("features.notifications.pushNotifications", v)
                  }
                  label="Push Notifications"
                />
                <CheckboxRow
                  checked={
                    formData.features.notifications.whatsappNotifications
                  }
                  onChange={(v) =>
                    handleChange(
                      "features.notifications.whatsappNotifications",
                      v
                    )
                  }
                  label="WhatsApp Notifications"
                />
              </div>
            </div>
          )}

          {activeTab === "advanced" && (
            <div className="space-y-6">
              <SectionTitle>
                {t("admin.membership.form.security_features") ||
                  "Security Features"}
              </SectionTitle>
              <div className="space-y-2">
                <CheckboxRow
                  checked={formData.features.security.twoFactorAuth}
                  onChange={(v) =>
                    handleChange("features.security.twoFactorAuth", v)
                  }
                  label="Two-Factor Authentication"
                />
                <CheckboxRow
                  checked={formData.features.security.ipWhitelisting}
                  onChange={(v) =>
                    handleChange("features.security.ipWhitelisting", v)
                  }
                  label="IP Whitelisting"
                />
                <CheckboxRow
                  checked={formData.features.security.sessionManagement}
                  onChange={(v) =>
                    handleChange("features.security.sessionManagement", v)
                  }
                  label="Session Management"
                />
                <CheckboxRow
                  checked={formData.features.security.auditLogs}
                  onChange={(v) =>
                    handleChange("features.security.auditLogs", v)
                  }
                  label="Audit Logs"
                />
              </div>

              <SectionTitle>
                {t("admin.membership.form.referral_system") ||
                  "Referral System"}
              </SectionTitle>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <CheckboxRow
                  checked={formData.features.referral.canEarnCommission}
                  onChange={(v) =>
                    handleChange("features.referral.canEarnCommission", v)
                  }
                  label="Enable Referral Commission"
                />
                <NumberInput
                  label="Commission Rate (%)"
                  value={formData.features.referral.commissionRate}
                  onChange={(v) =>
                    handleChange("features.referral.commissionRate", v ?? 0)
                  }
                  min={0}
                  max={100}
                  step={0.1}
                />
                <NumberInput
                  label="Max Referrals (-1 = unlimited)"
                  value={formData.features.referral.maxReferrals}
                  onChange={(v) =>
                    handleChange("features.referral.maxReferrals", v ?? -1)
                  }
                  min={-1}
                />
                <NumberInput
                  label="Referral Bonus Multiplier"
                  value={
                    formData.features.commissions.referralBonusMultiplier ?? 1
                  }
                  onChange={(v) =>
                    handleChange(
                      "features.commissions.referralBonusMultiplier",
                      v ?? 1
                    )
                  }
                  min={0}
                  step={0.1}
                />
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 border-t border-day-border/70 bg-day-panel/50 px-6 py-4 dark:border-night-border/70 dark:bg-night-panel/40 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-2xl border border-day-border bg-day-surface px-5 py-3 text-sm font-semibold text-day-text transition hover:bg-day-panel dark:border-night-border dark:bg-night-surface dark:text-night-text dark:hover:bg-night-panel"
          >
            {t("common.cancel") || "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center justify-center rounded-2xl bg-day-primary px-5 py-3 text-sm font-semibold text-white shadow-accent transition hover:-translate-y-0.5 hover:opacity-95 dark:bg-night-primary dark:text-night-background"
          >
            {t("common.save") || "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

const INPUT_CLS = (err, isTextArea = false) =>
  `w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-4 focus:ring-day-primary/10 dark:focus:ring-night-primary/10 
   bg-day-surface dark:bg-night-surface text-day-text dark:text-night-text placeholder:text-day-muted/70 dark:placeholder:text-night-muted/70
   ${isTextArea ? "min-h-[96px]" : ""}
   ${
     err
       ? "border-red-500 focus:border-red-500"
       : "border-day-border focus:border-day-primary dark:border-night-border dark:focus:border-night-primary"
   }`;

const SectionTitle = ({ children }) => (
  <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
    {children}
  </h3>
);
const Field = ({ label, children, error, required }) => (
  <div>
    <label className="mb-2 block text-sm font-semibold text-day-text dark:text-night-text">
      {label} {required ? "*" : ""}
    </label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const CheckboxRow = ({ checked, onChange, label, className = "" }) => (
  <label
    className={`flex cursor-pointer items-center gap-3 rounded-2xl border border-day-border/70 bg-day-panel/60 px-4 py-3 transition hover:bg-day-panel dark:border-night-border/70 dark:bg-night-panel/60 dark:hover:bg-night-panel ${className}`}
  >
    <input
      type="checkbox"
      checked={!!checked}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 rounded border-day-border text-day-primary focus:ring-2 focus:ring-day-primary/20 dark:border-night-border dark:text-night-primary dark:focus:ring-night-primary/20"
    />
    <span className="text-sm font-medium text-day-text dark:text-night-text">
      {label}
    </span>
  </label>
);

const NumberInput = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  error,
  className = "",
}) => (
  <div className={className}>
    <label className="mb-2 block text-sm font-semibold text-day-text dark:text-night-text">
      {label}
    </label>
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      min={min}
      max={max}
      step={step}
      className={`w-full rounded-2xl border px-4 py-3 text-sm text-day-text outline-none transition focus:ring-4 focus:ring-day-primary/10 dark:text-night-text dark:focus:ring-night-primary/10
        bg-day-surface dark:bg-night-surface
        ${
          error
            ? "border-red-500 focus:border-red-500"
            : "border-day-border focus:border-day-primary dark:border-night-border dark:focus:border-night-primary"
        }`}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const TextInput = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="mb-2 block text-sm font-semibold text-day-text dark:text-night-text">
      {label}
    </label>
    <input
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm text-day-text outline-none transition placeholder:text-day-muted/70 focus:border-day-primary focus:ring-4 focus:ring-day-primary/10 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:placeholder:text-night-muted/70 dark:focus:border-night-primary dark:focus:ring-night-primary/10"
    />
  </div>
);

const Select = ({ label, value, onChange, options, disabled = false }) => (
  <div>
    <label className="mb-2 block text-sm font-semibold text-day-text dark:text-night-text">
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm text-day-text outline-none transition focus:border-day-primary focus:ring-4 focus:ring-day-primary/10 disabled:cursor-not-allowed disabled:opacity-70 dark:border-night-border dark:bg-night-surface dark:text-night-text dark:focus:border-night-primary dark:focus:ring-night-primary/10"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

const CloseIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

MembershipPlanForm.propTypes = {
  mode: PropTypes.oneOf(["create", "edit"]).isRequired,
  planData: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

SectionTitle.propTypes = { children: PropTypes.node };
Field.propTypes = {
  label: PropTypes.node.isRequired,
  children: PropTypes.node.isRequired,
  error: PropTypes.node,
  required: PropTypes.bool,
};
CheckboxRow.propTypes = {
  checked: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.node.isRequired,
  className: PropTypes.string,
};
NumberInput.propTypes = {
  label: PropTypes.node.isRequired,
  value: PropTypes.number,
  onChange: PropTypes.func.isRequired,
  min: PropTypes.number,
  max: PropTypes.number,
  step: PropTypes.number,
  error: PropTypes.node,
  className: PropTypes.string,
};
TextInput.propTypes = {
  label: PropTypes.node.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
};
Select.propTypes = {
  label: PropTypes.node.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.any, label: PropTypes.node })
  ).isRequired,
};

export default MembershipPlanForm;
