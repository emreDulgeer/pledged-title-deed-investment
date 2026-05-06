export const getUserId = (user) => user?.id || user?._id || null;

export const getUserProfilePath = (userId) =>
  userId ? `/profiles/${userId}` : "/profile";

export const getProfileSettingsPath = () => "/profile/settings";

export const getAppSettingsPath = (role) => {
  if (role === "admin") {
    return "/admin/settings";
  }

  if (role === "investor") {
    return "/investor/settings";
  }

  if (role === "property_owner") {
    return "/owner/settings";
  }

  if (role === "local_representative") {
    return "/rep/settings";
  }

  return "/profile/settings";
};

export const getPropertyDetailPath = (viewerRole, propertyId) => {
  if (!propertyId) {
    return null;
  }

  if (viewerRole === "admin") {
    return `/admin/properties/${propertyId}`;
  }

  if (viewerRole === "investor") {
    return `/investor/properties/${propertyId}`;
  }

  if (viewerRole === "property_owner") {
    return `/owner/properties/${propertyId}`;
  }

  return null;
};

export const getInvestmentPropertyPath = (viewerRole, propertyId) => {
  if (!propertyId) {
    return null;
  }

  if (viewerRole === "admin") {
    return `/admin/properties/${propertyId}`;
  }

  if (viewerRole === "owner" || viewerRole === "property_owner") {
    return `/owner/properties/${propertyId}`;
  }

  return `/properties/${propertyId}`;
};

export const getInvestmentDetailPath = (viewerRole, investmentId) => {
  if (!investmentId) {
    return null;
  }

  if (viewerRole === "admin") {
    return `/admin/investments/${investmentId}`;
  }

  if (viewerRole === "property_owner") {
    return `/owner/investments/${investmentId}`;
  }

  if (viewerRole === "investor") {
    return `/investor/investments/${investmentId}`;
  }

  if (viewerRole === "local_representative") {
    return `/rep/investments/${investmentId}`;
  }

  return null;
};
