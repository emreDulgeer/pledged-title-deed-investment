export const getUserId = (user) => user?.id || user?._id || null;

export const getUserProfilePath = (userId) =>
  userId ? `/profiles/${userId}` : "/profile";

export const getProfileSettingsPath = () => "/profile/settings";

export const getPropertyDetailPath = (viewerRole, propertyId) => {
  if (!propertyId) {
    return null;
  }

  if (viewerRole === "admin") {
    return `/admin/properties/${propertyId}`;
  }

  if (viewerRole === "property_owner") {
    return `/owner/properties/${propertyId}`;
  }

  return null;
};

export const getInvestmentDetailPath = (viewerRole, investmentId) => {
  if (!investmentId) {
    return null;
  }

  if (viewerRole === "admin") {
    return `/admin/investments/${investmentId}`;
  }

  if (viewerRole === "investor") {
    return `/investor/investments/${investmentId}`;
  }

  return null;
};
