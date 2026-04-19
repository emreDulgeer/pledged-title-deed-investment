export const SUPPORTED_PROPERTY_COUNTRIES = [
  { name: "Portugal", code: "pt", aliases: ["pt", "portugal"] },
  { name: "Spain", code: "es", aliases: ["es", "spain", "espana"] },
  { name: "Latvia", code: "lv", aliases: ["lv", "latvia", "latvija"] },
  { name: "Estonia", code: "ee", aliases: ["ee", "estonia", "eesti"] },
  { name: "Malta", code: "mt", aliases: ["mt", "malta"] },
  { name: "Montenegro", code: "me", aliases: ["me", "montenegro", "crna gora"] },
  { name: "Georgia", code: "ge", aliases: ["ge", "georgia", "sakartvelo"] },
];

const normalizeCountryKey = (value) => {
  if (typeof value !== "string") return "";

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

const countryConfigByAlias = SUPPORTED_PROPERTY_COUNTRIES.reduce(
  (lookup, country) => {
    [country.name, country.code, ...(country.aliases || [])].forEach((alias) => {
      lookup[normalizeCountryKey(alias)] = country;
    });

    return lookup;
  },
  {},
);

export const SUPPORTED_PROPERTY_COUNTRY_NAMES = SUPPORTED_PROPERTY_COUNTRIES.map(
  ({ name }) => name,
);

export const normalizeSupportedPropertyCountry = (value) => {
  const normalizedKey = normalizeCountryKey(value);
  return normalizedKey ? countryConfigByAlias[normalizedKey]?.name || null : null;
};

export const getSupportedPropertyCountryCode = (value) => {
  const normalizedKey = normalizeCountryKey(value);
  return normalizedKey ? countryConfigByAlias[normalizedKey]?.code || "" : "";
};

export const isSupportedPropertyCountry = (value) =>
  Boolean(normalizeSupportedPropertyCountry(value));
