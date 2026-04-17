const ENTITY_DIRECTORY_MAP = {
  user: "users",
  property: "properties",
  investment: "investments",
};

function normalizeEntityModel(relatedModel) {
  if (!relatedModel) {
    return null;
  }

  const normalized = String(relatedModel).trim().toLowerCase();

  switch (normalized) {
    case "user":
    case "users":
      return "user";
    case "property":
    case "properties":
      return "property";
    case "investment":
    case "investments":
      return "investment";
    default:
      return null;
  }
}

function sanitizeSegment(value) {
  return String(value).trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function isImageMimeType(mimeType = "") {
  return String(mimeType).toLowerCase().startsWith("image/");
}

function buildEntityStorageDirectory({ relatedModel, relatedId, mimeType }) {
  const normalizedModel = normalizeEntityModel(relatedModel);
  const entityRoot = ENTITY_DIRECTORY_MAP[normalizedModel];

  if (!entityRoot || !relatedId) {
    return null;
  }

  const entityId = sanitizeSegment(relatedId);
  const folderName = isImageMimeType(mimeType) ? "Images" : "Documents";

  return `${entityRoot}/${entityId}/${folderName}`;
}

function resolveStorageDirectory({
  directory,
  relatedModel,
  relatedId,
  mimeType,
}) {
  const entityDirectory = buildEntityStorageDirectory({
    relatedModel,
    relatedId,
    mimeType,
  });

  if (entityDirectory) {
    return entityDirectory;
  }

  if (directory) {
    return sanitizeSegment(directory);
  }

  return isImageMimeType(mimeType) ? "images" : "documents";
}

module.exports = {
  buildEntityStorageDirectory,
  resolveStorageDirectory,
  isImageMimeType,
};
