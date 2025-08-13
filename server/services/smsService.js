// server/services/smsService.js

// Mock SMS Service - Development Version

class SMSService {
  constructor() {
    this.isProduction = process.env.NODE_ENV === "production";
    this.fromNumber = process.env.SMS_FROM || "+905551234567";

    if (!this.isProduction) {
      console.log("📱 SMS Service: Running in MOCK mode (console.log only)");
    }
  }

  /**
   * SMS gönderme fonksiyonu (mock)
   */
  async sendSMS(to, message) {
    const smsData = {
      from: this.fromNumber,
      to,
      message,
      timestamp: new Date().toISOString(),
      length: message.length,
    };

    if (this.isProduction) {
      // TODO: Production'da gerçek SMS servisi kullanılacak
      console.warn("⚠️ SMS service not configured for production!");
      console.log("📱 Would send SMS:", smsData);
      return { success: false, message: "SMS service not configured" };
    } else {
      // Development: Console'a yazdır
      console.log("\n" + "=".repeat(60));
      console.log("📱 MOCK SMS SENT");
      console.log("=".repeat(60));
      console.log(`To: ${to}`);
      console.log(`From: ${this.fromNumber}`);
      console.log(`Message (${message.length} chars):`);
      console.log("-".repeat(60));
      console.log(message);
      console.log("=".repeat(60) + "\n");

      return { success: true, messageId: `mock-sms-${Date.now()}` };
    }
  }

  /**
   * 2FA Code SMS
   */
  async send2FACode(phoneNumber, code) {
    if (this.isDevelopment) {
      console.log(`
╔════════════════════════════════════════╗
║         2FA CODE SMS MOCK              ║
╠════════════════════════════════════════╣
║ To: ${phoneNumber.padEnd(35)}║
║ Code: ${code.padEnd(33)}║
║ Valid for: 10 minutes                  ║
╚════════════════════════════════════════╝
      `);
      return true;
    }

    // Production'da gerçek SMS servisi kullan
    // Örnek: Twilio, AWS SNS, Nexmo vb.
    try {
      // await twilio.messages.create({
      //   body: `Your Pledged Platform verification code is: ${code}`,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: phoneNumber
      // });
      return true;
    } catch (error) {
      console.error("SMS send error:", error);
      throw error;
    }
  }

  /**
   * Phone Verification SMS
   */
  async sendVerificationCode(phoneNumber, code) {
    const message = `Pledged Platform telefon doğrulama kodunuz: ${code}\n\nKod 15 dakika geçerlidir.`;

    console.log(`\n📱 Phone Verification Code for ${phoneNumber}: ${code}\n`);

    return this.sendSMS(phoneNumber, message);
  }
  async sendPhoneVerification(phoneNumber, code) {
    if (this.isDevelopment) {
      console.log(`
╔════════════════════════════════════════╗
║     PHONE VERIFICATION SMS MOCK        ║
╠════════════════════════════════════════╣
║ To: ${phoneNumber.padEnd(35)}║
║ Code: ${code.padEnd(33)}║
╚════════════════════════════════════════╝
      `);
      return true;
    }

    // Production SMS
    return true;
  }

  /**
   * Investment Alert SMS
   */
  async sendInvestmentAlert(phoneNumber, data) {
    const message = `Pledged Platform: ${data.propertyTitle} mülkünüze ${data.investorName} tarafından ${data.amount} ${data.currency} yatırım teklifi geldi. Detaylar için paneli kontrol edin.`;

    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Payment Reminder SMS
   */
  async sendPaymentReminder(phoneNumber, data) {
    const message = `Pledged Platform: ${data.propertyTitle} için ${data.amount} ${data.currency} kira ödemesi yaklaşıyor. Son ödeme tarihi: ${data.dueDate}`;

    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Security Alert SMS
   */
  async sendSecurityAlert(phoneNumber, message) {
    if (this.isDevelopment) {
      console.log(`
╔════════════════════════════════════════╗
║       SECURITY ALERT SMS MOCK          ║
╠════════════════════════════════════════╣
║ To: ${phoneNumber.padEnd(35)}║
║ Message: ${message.substring(0, 30).padEnd(30)}║
╚════════════════════════════════════════╝
      `);
      return true;
    }

    // Production SMS
    return true;
  }

  /**
   * Format phone number (Turkish format)
   */
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digits
    let cleaned = phoneNumber.replace(/\D/g, "");

    // Add country code if not present
    if (cleaned.startsWith("0")) {
      cleaned = "9" + cleaned; // Remove leading 0 and add 9
    }
    if (!cleaned.startsWith("90")) {
      cleaned = "90" + cleaned; // Add Turkey country code
    }

    return "+" + cleaned;
  }

  /**
   * Validate phone number
   */
  isValidPhoneNumber(phoneNumber) {
    // Basic validation for Turkish numbers
    const cleaned = phoneNumber.replace(/\D/g, "");

    // Turkish mobile numbers: 05XX XXX XX XX (10 digits after 0)
    // With country code: 905XX XXX XX XX (12 digits total)

    if (cleaned.startsWith("905") && cleaned.length === 12) {
      return true;
    }
    if (cleaned.startsWith("05") && cleaned.length === 11) {
      return true;
    }
    if (cleaned.startsWith("5") && cleaned.length === 10) {
      return true;
    }

    return false;
  }

  /**
   * Calculate SMS segments
   * Turkish characters count as 2 in SMS
   */
  calculateSegments(message) {
    const turkishChars = [
      "ç",
      "ğ",
      "ı",
      "ö",
      "ş",
      "ü",
      "Ç",
      "Ğ",
      "İ",
      "Ö",
      "Ş",
      "Ü",
    ];
    let length = 0;

    for (const char of message) {
      if (turkishChars.includes(char)) {
        length += 2;
      } else {
        length += 1;
      }
    }

    // SMS segment limits
    const singleSmsLimit = 160;
    const multiSmsLimit = 153; // Each segment in multi-part SMS

    if (length <= singleSmsLimit) {
      return 1;
    } else {
      return Math.ceil(length / multiSmsLimit);
    }
  }
}

module.exports = new SMSService();
