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
  ROLE_LABELS,
} from "./profileViewParts";

const PrivateProfilePage = ({ profile, isOwnProfile, onBack, viewerRole }) => {
  return (
    <ProfilePageLayout
      profile={profile}
      isOwnProfile={isOwnProfile}
      onBack={onBack}
    >
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-day-text dark:text-night-text">
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
          <div className="rounded-3xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-day-text dark:text-night-text">
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

          <div className="rounded-3xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-day-text dark:text-night-text">
              Account
            </h2>
            <div className="mt-4 space-y-3 text-sm text-day-text/70 dark:text-night-text/70">
              <p>
                Account Status:{" "}
                <span className="font-medium text-day-text dark:text-night-text">
                  {profile.account?.accountStatus || "-"}
                </span>
              </p>
              <p>
                Membership Plan:{" "}
                <span className="font-medium text-day-text dark:text-night-text">
                  {profile.account?.membershipPlan || "-"}
                </span>
              </p>
              <p>
                Membership Status:{" "}
                <span className="font-medium text-day-text dark:text-night-text">
                  {profile.account?.membershipStatus || "-"}
                </span>
              </p>
              <p>
                Last Login:{" "}
                <span className="font-medium text-day-text dark:text-night-text">
                  {profile.account?.lastLoginAt
                    ? new Date(profile.account.lastLoginAt).toLocaleString()
                    : "-"}
                </span>
              </p>
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
            <p className="mt-1 text-sm text-day-text/60 dark:text-night-text/60">
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
            <p className="mt-1 text-sm text-day-text/60 dark:text-night-text/60">
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

export default PrivateProfilePage;
