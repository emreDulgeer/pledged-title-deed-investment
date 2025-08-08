const crypto = require("crypto");
const bcrypt = require("bcryptjs");

class SecurityUtils {
  /**
   * Generate secure random token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString("hex");
  }

  /**
   * Hash token for storage
   */
  hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Generate OTP code
   */
  generateOTP(length = 6) {
    const digits = "0123456789";
    let otp = "";

    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }

    return otp;
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(text) {
    const algorithm = "aes-256-gcm";
    const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex");
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
    };
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData) {
    const algorithm = "aes-256-gcm";
    const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex");

    const decipher = crypto.createDecipheriv(
      algorithm,
      key,
      Buffer.from(encryptedData.iv, "hex")
    );

    decipher.setAuthTag(Buffer.from(encryptedData.authTag, "hex"));

    let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  /**
   * Sanitize input to prevent injection attacks
   */
  sanitizeInput(input) {
    if (typeof input !== "string") return input;

    // Remove any potential script tags
    input = input.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ""
    );

    // Remove any HTML tags
    input = input.replace(/<[^>]*>/g, "");

    // Escape special characters
    const escapeMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "/": "&#x2F;",
    };

    return input.replace(/[&<>"'/]/g, (char) => escapeMap[char]);
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   */
  isValidPhone(phone) {
    const phoneRegex =
      /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Check password complexity
   */
  checkPasswordComplexity(password) {
    const requirements = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      noCommonPatterns: !this.hasCommonPatterns(password),
    };

    const score = Object.values(requirements).filter(Boolean).length;

    return {
      requirements,
      score,
      strength: score <= 2 ? "weak" : score <= 4 ? "medium" : "strong",
      isValid:
        requirements.minLength &&
        requirements.hasUpperCase &&
        requirements.hasLowerCase &&
        requirements.hasNumbers,
    };
  }

  /**
   * Check for common password patterns
   */
  hasCommonPatterns(password) {
    const commonPatterns = [
      "123456",
      "password",
      "12345678",
      "qwerty",
      "abc123",
      "123456789",
      "12345",
      "1234",
      "111111",
      "1234567",
      "dragon",
      "123123",
      "baseball",
      "abc123",
      "football",
      "monkey",
      "letmein",
      "696969",
      "shadow",
      "master",
    ];

    const lowerPassword = password.toLowerCase();
    return commonPatterns.some((pattern) => lowerPassword.includes(pattern));
  }

  /**
   * Generate CSRF token
   */
  generateCSRFToken() {
    return this.generateSecureToken(32);
  }

  /**
   * Validate CSRF token
   */
  validateCSRFToken(sessionToken, requestToken) {
    return sessionToken === requestToken;
  }

  /**
   * Rate limit key generator
   */
  getRateLimitKey(req, type = "general") {
    const userId = req.user?.id || "anonymous";
    const ip = req.ip;

    return `rate_limit:${type}:${userId}:${ip}`;
  }

  /**
   * Mask sensitive data for logging
   */
  maskSensitiveData(data) {
    const sensitiveFields = ["password", "token", "creditCard", "ssn", "iban"];
    const masked = { ...data };

    for (const field of sensitiveFields) {
      if (masked[field]) {
        masked[field] = "***MASKED***";
      }
    }

    return masked;
  }

  /**
   * Generate secure session ID
   */
  generateSessionId() {
    return `sess_${this.generateSecureToken(32)}`;
  }

  /**
   * Hash password with bcrypt
   */
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate backup codes
   */
  generateBackupCodes(count = 10) {
    const codes = [];

    for (let i = 0; i < count; i++) {
      const code = this.generateOTP(8);
      codes.push(`${code.substr(0, 4)}-${code.substr(4)}`);
    }

    return codes;
  }

  /**
   * Validate IP address
   */
  isValidIP(ip) {
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex =
      /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }
}

module.exports = new SecurityUtils();
