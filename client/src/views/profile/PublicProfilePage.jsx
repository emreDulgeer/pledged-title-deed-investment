import React from "react";
import { Globe2, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { getPropertyDetailPath } from "../../utils/profileRoutes";
import {
  InfoRow,
  ProfilePageLayout,
  PropertyCard,
  ROLE_LABELS,
} from "./profileViewParts";

const PublicProfilePage = ({ profile, isOwnProfile, onBack, viewerRole }) => {
  return (
    <ProfilePageLayout
      profile={profile}
      isOwnProfile={isOwnProfile}
      onBack={onBack}
    >
      <section className="grid gap-6">
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
      </section>

      {(profile.properties || []).length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-day-text dark:text-night-text">
              Published Properties
            </h2>
            <p className="mt-1 text-sm text-day-text/60 dark:text-night-text/60">
              Only public listings are shown in public profile mode.
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

      {profile.role === "property_owner" && (profile.properties || []).length === 0 && (
        <section className="rounded-3xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6 text-sm text-day-text/60 dark:text-night-text/60">
          This property owner does not have any published listings right now.
        </section>
      )}

      {profile.role !== "property_owner" && !isOwnProfile && (
        <section className="rounded-3xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6 text-sm text-day-text/60 dark:text-night-text/60">
          This profile is currently available in public mode only.
        </section>
      )}
    </ProfilePageLayout>
  );
};

export default PublicProfilePage;
