// src/utils/roleRedirect.js
export const defaultPathByRole = (role) => {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "investor":
      return "/investor/dashboard";
    case "property_owner":
      return "/owner/dashboard";
    case "local_representative":
      return "/rep/dashboard";
    default:
      return "/login";
  }
};
