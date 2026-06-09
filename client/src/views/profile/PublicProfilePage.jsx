import React from "react";
import { Globe2, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { getPropertyDetailPath } from "../../utils/profileRoutes";
import {
  InfoRow,
  ProfilePageLayout,
  PropertyCard,
} from "./profileViewParts";
import { ROLE_LABELS } from "./profileViewConstants";

const PublicProfilePage = ({ profile, isOwnProfile, onBack, viewerRole }) => {
  return (
    <ProfilePageLayout
      profile={profile}
      isOwnProfile={isOwnProfile}
      onBack={onBack}
    >
      <section className="grid gap-6">
        <div className="shell-surface px-5 py-5 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-day-muted dark:text-night-muted">
            Public details
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-day-text dark:text-night-text">
            Overview
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
            <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
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
        <section className="shell-surface px-6 py-8 text-sm text-day-muted dark:text-night-muted">
          This property owner does not have any published listings right now.
        </section>
      )}

      {profile.role !== "property_owner" && !isOwnProfile && (
        <section className="shell-surface px-6 py-8 text-sm text-day-muted dark:text-night-muted">
          This profile is currently available in public mode only.
        </section>
      )}
    </ProfilePageLayout>
  );
};

export default PublicProfilePage;
