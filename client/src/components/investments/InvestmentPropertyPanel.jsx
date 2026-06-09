import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileStack } from "lucide-react";

import {
  LocationMap,
  OwnerCard,
  PropertySummary,
} from "../property/detail";
import { getUserId, getUserProfilePath } from "../../utils/profileRoutes";

const InvestmentPropertyPanel = ({
  property,
  owner,
  propertyPath = null,
  navigateLabel = "Open property page",
  t,
}) => {
  if (!property) {
    return null;
  }

  const translate = t || ((key, fallback) => fallback || key);

  const normalizedOwner = owner
    ? {
        ...owner,
        phone: owner.phone || owner.phoneNumber || null,
        verificationStatus:
          owner.verificationStatus || owner.kycStatus || null,
      }
    : property.owner
      ? {
          ...property.owner,
          phone: property.owner.phone || property.owner.phoneNumber || null,
          verificationStatus:
            property.owner.verificationStatus || property.owner.kycStatus || null,
        }
      : null;

  const ownerProfilePath = normalizedOwner
    ? getUserProfilePath(getUserId(normalizedOwner))
    : null;

  return (
    <div className="space-y-6">
      {propertyPath && (
        <div className="flex justify-end">
          <Link
            to={propertyPath}
            className="inline-flex items-center gap-2 rounded-2xl border border-day-border bg-day-surface px-4 py-3 text-sm font-semibold text-day-primary transition hover:bg-day-panel dark:border-night-border dark:bg-night-surface dark:text-night-primary dark:hover:bg-night-panel"
          >
            <FileStack className="h-4 w-4" />
            {navigateLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <PropertySummary property={property} t={translate} />

      {property.description && (
        <section className="shell-surface px-6 py-6 sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
            Narrative
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
            About this property
          </h3>
          <p className="mt-3 text-sm leading-7 text-day-muted dark:text-night-muted">
            {property.description}
          </p>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <LocationMap property={property} t={t} />

        {normalizedOwner ? (
          <OwnerCard
            owner={normalizedOwner}
            profilePath={ownerProfilePath}
            t={translate}
          />
        ) : null}
      </div>
    </div>
  );
};

export default InvestmentPropertyPanel;
