// server/utils/validator.js

/**
 * Basit validasyon fonksiyonu
 * Not: Production'da Joi, Yup veya express-validator
 */
const validateRequest = (data, rules) => {
  const errors = {};
  let isValid = true;

  for (const field in rules) {
    const fieldRules = rules[field].split("|");
    const fieldPath = field.split(".");
    const value = fieldPath.reduce((obj, key) => obj?.[key], data);

    for (const rule of fieldRules) {
      const [ruleName, ruleValue] = rule.split(":");

      switch (ruleName) {
        case "required":
          if (!value && value !== 0 && value !== false) {
            errors[field] = `${field} alanı zorunludur`;
            isValid = false;
          }
          break;

        case "string":
          if (value && typeof value !== "string") {
            errors[field] = `${field} metin tipinde olmalıdır`;
            isValid = false;
          }
          break;

        case "numeric":
          if (value && (typeof value !== "number" || isNaN(value))) {
            errors[field] = `${field} sayı tipinde olmalıdır`;
            isValid = false;
          }
          break;

        case "integer":
          if (value && !Number.isInteger(value)) {
            errors[field] = `${field} tam sayı olmalıdır`;
            isValid = false;
          }
          break;

        case "min":
          if (typeof value === "string" && value.length < parseInt(ruleValue)) {
            errors[field] = `${field} en az ${ruleValue} karakter olmalıdır`;
            isValid = false;
          } else if (typeof value === "number" && value < parseInt(ruleValue)) {
            errors[field] = `${field} en az ${ruleValue} olmalıdır`;
            isValid = false;
          }
          break;

        case "max":
          if (typeof value === "string" && value.length > parseInt(ruleValue)) {
            errors[field] = `${field} en fazla ${ruleValue} karakter olmalıdır`;
            isValid = false;
          } else if (typeof value === "number" && value > parseInt(ruleValue)) {
            errors[field] = `${field} en fazla ${ruleValue} olmalıdır`;
            isValid = false;
          }
          break;

        case "email":
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (value && !emailRegex.test(value)) {
            errors[field] = `${field} geçerli bir email adresi olmalıdır`;
            isValid = false;
          }
          break;

        case "date":
          if (value && isNaN(Date.parse(value))) {
            errors[field] = `${field} geçerli bir tarih olmalıdır`;
            isValid = false;
          }
          break;

        case "array":
          if (value && !Array.isArray(value)) {
            errors[field] = `${field} dizi tipinde olmalıdır`;
            isValid = false;
          }
          break;

        case "boolean":
          if (value !== undefined && typeof value !== "boolean") {
            errors[field] = `${field} boolean tipinde olmalıdır`;
            isValid = false;
          }
          break;
      }

      // Eğer bu alan için hata varsa, diğer kurallara bakmaya gerek yok
      if (errors[field]) break;
    }
  }

  return { isValid, errors };
};

/**
 * Sanitize input data
 */
const sanitizeInput = (data) => {
  if (typeof data === "string") {
    return data
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  }

  if (typeof data === "object" && data !== null) {
    const sanitized = {};
    for (const key in data) {
      sanitized[key] = sanitizeInput(data[key]);
    }
    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeInput(item));
  }

  return data;
};

module.exports = {
  validateRequest,
  sanitizeInput,
};
