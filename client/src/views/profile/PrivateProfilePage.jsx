import React from "react";
import { Globe2, Mail, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";
import {
  getInvestmentDetailPath,
  getPropertyDetailPath,
} from "../../utils/profileRoutes";
import {
  InfoRow,
  InvestmentCard,
  ProfilePageLayout,
  PropertyCard,
} from "./profileViewParts";
import { ROLE_LABELS } from "./profileViewConstants";

const PrivateProfilePage = ({ profile, isOwnProfile, onBack, viewerRole }) => {
  return (
    <ProfilePageLayout
      profile={profile}
      isOwnProfile={isOwnProfile}
      onBack={onBack}
    >
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="shell-surface px-5 py-5 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-day-muted dark:text-night-muted">
            Private profile
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-day-text dark:text-night-text">
            Overview
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <InfoRow
              icon={Globe2}
              label="Role"
              value={ROLE_LABELS[profile.role] || profile.role}
            />
            <InfoRow
              icon={MapPin}
              label="Country"
              value={profile.country || "-"}
            />
            <InfoRow
              icon={ShieldCheck}
              label="KYC Status"
              value={profile.kycStatus || "-"}
            />
            <InfoRow
              icon={UserRound}
              label="Trust Score"
              value={profile.trustScore ?? "-"}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="shell-surface px-5 py-5 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-day-muted dark:text-night-muted">
              Direct contact
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-day-text dark:text-night-text">
              Contact
            </h2>
            <div className="mt-5 space-y-3">
              <InfoRow
                icon={Mail}
                label="Email"
                value={profile.contact?.email || "-"}
              />
              <InfoRow
                icon={Phone}
                label="Phone"
                value={profile.contact?.phoneNumber || "-"}
              />
            </div>
          </div>

          <div className="shell-surface px-5 py-5 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-day-muted dark:text-night-muted">
              Membership
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-day-text dark:text-night-text">
              Account
            </h2>
            <div className="mt-5 grid gap-3">
              <AccountLine
                label="Account Status"
                value={profile.account?.accountStatus || "-"}
              />
              <AccountLine
                label="Membership Plan"
                value={profile.account?.membershipPlan || "-"}
              />
              <AccountLine
                label="Membership Status"
                value={profile.account?.membershipStatus || "-"}
              />
              <AccountLine
                label="Last Login"
                value={
                  profile.account?.lastLoginAt
                    ? new Date(profile.account.lastLoginAt).toLocaleString()
                    : "-"
                }
              />
            </div>
          </div>
        </div>
      </section>

      {(profile.properties || []).length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-day-text dark:text-night-text">
              Properties
            </h2>
            <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
              Admin can review the full property set for this profile.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {profile.properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                detailPath={getPropertyDetailPath(viewerRole, property.id)}
              />
            ))}
          </div>
        </section>
      )}

      {(profile.investments || []).length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-day-text dark:text-night-text">
              Investments
            </h2>
            <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
              Private admin view of this user's related investment records.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {profile.investments.map((investment) => (
              <InvestmentCard
                key={investment.id}
                investment={investment}
                detailPath={getInvestmentDetailPath(viewerRole, investment.id)}
              />
            ))}
          </div>
        </section>
      )}
    </ProfilePageLayout>
  );
};

const AccountLine = ({ label, value }) => (
  <div className="rounded-2xl border border-day-border/70 bg-day-panel/60 px-4 py-3 dark:border-night-border/70 dark:bg-night-panel/60">
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-day-muted dark:text-night-muted">
      {label}
    </p>
    <p className="mt-1 text-sm font-semibold text-day-text dark:text-night-text">
      {value}
    </p>
  </div>
);

export default PrivateProfilePage;
