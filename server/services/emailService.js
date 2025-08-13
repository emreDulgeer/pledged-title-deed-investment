// server/services/emailService.js

// Mock Email Service - Development Version

class EmailService {
  constructor() {
    this.isProduction = process.env.NODE_ENV === "production";
    this.fromEmail = process.env.EMAIL_FROM || "noreply@pledgedplatform.com";
    this.frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    this.isDevelopment = !this.isProduction;
    // Development modda email içeriklerini console'a yazdır
    if (!this.isProduction) {
      console.log("📧 Email Service: Running in MOCK mode (console.log only)");
    }
  }

  /**
   * Email gönderme fonksiyonu (mock)
   */
  async sendEmail(to, subject, htmlContent, textContent = null) {
    const emailData = {
      from: this.fromEmail,
      to,
      subject,
      html: htmlContent,
      text: textContent || this.htmlToText(htmlContent),
      timestamp: new Date().toISOString(),
    };

    if (this.isProduction) {
      // TODO: Production'da gerçek email servisi kullanılacak
      console.warn("⚠️ Email service not configured for production!");
      console.log("📧 Would send email:", emailData);
      return { success: false, message: "Email service not configured" };
    } else {
      // Development: Console'a yazdır
      console.log("\n" + "=".repeat(60));
      console.log("📧 MOCK EMAIL SENT");
      console.log("=".repeat(60));
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`From: ${this.fromEmail}`);
      console.log("-".repeat(60));
      console.log("Content Preview:");
      console.log(
        textContent || this.htmlToText(htmlContent).substring(0, 200) + "..."
      );
      console.log("=".repeat(60) + "\n");

      // Development modda başarılı dön
      return { success: true, messageId: `mock-${Date.now()}` };
    }
  }

  /**
   * Email Verification - Doğrulama emaili
   */
  async sendVerificationEmail(email, token) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

    if (this.isDevelopment) {
      console.log(`
╔════════════════════════════════════════╗
║      EMAIL VERIFICATION MOCK           ║
╠════════════════════════════════════════╣
║ To: ${email.padEnd(35)}║
║ Token: ${token}...
║ URL: ${verificationUrl}...
╚════════════════════════════════════════╝
      `);
      console.log("DEV ONLY — email verification token:", token);
      return true;
    }

    // Production email
    return true;
  }

  /**
   * Password Reset - Şifre sıfırlama emaili
   */
  async sendPasswordResetEmail(email, token) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    if (this.isDevelopment) {
      console.log(`
╔════════════════════════════════════════╗
║      PASSWORD RESET EMAIL MOCK         ║
╠════════════════════════════════════════╣
║ To: ${email.padEnd(35)}║
║ Reset URL: ${resetUrl}...
╚════════════════════════════════════════╝
      `);
      return true;
    }

    // Production email
    return true;
  }

  /**
   * 2FA Code - 2FA doğrulama kodu
   */
  /**
   * Send 2FA code via email
   */
  async send2FACode(email, code) {
    if (this.isDevelopment) {
      console.log(`
╔════════════════════════════════════════╗
║         2FA CODE EMAIL MOCK            ║
╠════════════════════════════════════════╣
║ To: ${email.padEnd(35)}║
║ Code: ${code}║
║ Valid for: 10 minutes                  ║
╚════════════════════════════════════════╝
      `);
      return true;
    }

    // Production'da gerçek email servisi kullan
    // Örnek: SendGrid, AWS SES, Mailgun vb.
    try {
      // await sendgrid.send({
      //   to: email,
      //   from: 'noreply@pledgedplatform.com',
      //   subject: 'Your 2FA Code',
      //   text: `Your verification code is: ${code}`,
      //   html: `<p>Your verification code is: <strong>${code}</strong></p>`
      // });
      return true;
    } catch (error) {
      console.error("Email send error:", error);
      throw error;
    }
  }

  /**
   * Welcome Email - Hoş geldin emaili
   */
  async sendWelcomeEmail(email, fullName) {
    if (this.isDevelopment) {
      console.log(`
╔════════════════════════════════════════╗
║         WELCOME EMAIL MOCK             ║
╠════════════════════════════════════════╣
║ To: ${email.padEnd(35)}║
║ Name: ${fullName}║
╚════════════════════════════════════════╝
      `);
      return true;
    }

    // Production email
    return true;
  }

  /**
   * Security Alert - Güvenlik uyarısı
   */
  async sendSecurityAlert(email, details) {
    if (this.isDevelopment) {
      console.log(`
╔════════════════════════════════════════╗
║        SECURITY ALERT MOCK             ║
╠════════════════════════════════════════╣
║ To: ${email.padEnd(35)}║
║ Type: ${details.type}║
║ IP: ${(details.ip || "Unknown").padEnd(35)}║
╚════════════════════════════════════════╝
      `);
      return true;
    }

    // Production email
    return true;
  }

  /**
   * Membership Activation - Üyelik aktivasyonu
   */
  async sendMembershipActivationEmail(email, details) {
    if (this.isDevelopment) {
      console.log(`
╔════════════════════════════════════════╗
║    MEMBERSHIP ACTIVATION MOCK          ║
╠════════════════════════════════════════╣
║ To: ${email.padEnd(35)}║
║ Plan: ${details.plan}║
║ Expires: ${details.expiresAt.toLocaleDateString().padEnd(29)}║
╚════════════════════════════════════════╝
      `);
      return true;
    }

    // Production email
    return true;
  }

  /**
   * Account Deletion Request - Hesap silme talebi
   */
  async sendAccountDeletionRequestEmail(email, details) {
    if (this.isDevelopment) {
      console.log(`
╔════════════════════════════════════════╗
║   ACCOUNT DELETION REQUEST MOCK        ║
╠════════════════════════════════════════╣
║ To: ${email.padEnd(35)}║
║ Scheduled: ${details.scheduledDate.toLocaleDateString().padEnd(27)}║
╚════════════════════════════════════════╝
      `);
      return true;
    }

    // Production email
    return true;
  }

  /**
   * Password Change Notification
   */
  async sendPasswordChangeNotification(email) {
    const subject = "Şifreniz Değiştirildi - Pledged Platform";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Şifre Değişikliği</h2>
        <p>Merhaba,</p>
        <p>Hesabınızın şifresi başarıyla değiştirildi.</p>
        <p style="color: #666;">
          Eğer bu değişikliği siz yapmadıysanız, lütfen hemen destek ekibimizle iletişime geçin.
        </p>
        <div style="margin: 20px 0;">
          <a href="${this.frontendUrl}/support" 
             style="background-color: #ff5252; color: white; padding: 10px 20px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Destek Merkezi
          </a>
        </div>
      </div>
    `;

    return this.sendEmail(email, subject, htmlContent);
  }
  // emailService.js'e eklenecek yeni metodlar

  /**
   * Account Activated Email - Hesap aktifleştirildi (email doğrulama sonrası)
   */
  async sendAccountActivatedEmail(email, data) {
    const subject = "Hesabınız Aktifleştirildi - Pledged Platform";

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Hoş Geldiniz ${data.fullName}! 🎉</h2>
      <p>Email adresiniz başarıyla doğrulandı ve hesabınız aktifleştirildi.</p>
      
      <div style="background-color: #f0f8ff; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #555;">Sırada Ne Var?</h3>
        <ol>
          <li><strong>Üyelik Planı Seçin:</strong> Basic, Pro veya Enterprise planlarından birini seçin</li>
          <li><strong>KYC Dokümanlarını Yükleyin:</strong> Kimlik doğrulama için gerekli belgeleri yükleyin</li>
          <li><strong>${
            data.role === "investor" ? "Yatırım Yapın" : "Mülk İlanı Verin"
          }:</strong> 
              Platformun tüm özelliklerinden yararlanmaya başlayın</li>
        </ol>
      </div>
      
      <div style="margin: 30px 0;">
        <a href="${this.frontendUrl}/dashboard" 
           style="background-color: #4CAF50; color: white; padding: 12px 30px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;">
          Panele Git
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        Not: Üyelik planı aktifleştirmadan bazı özellikler kısıtlı olabilir.
      </p>
    </div>
  `;

    console.log(`\n✅ Account Activated for ${email} (${data.role})\n`);

    return this.sendEmail(email, subject, htmlContent);
  }

  /**
   * Pending Approval Email - Admin onayı bekliyor (local representative için)
   */
  async sendPendingApprovalEmail(email, data) {
    const subject = "Hesabınız Onay Bekliyor - Pledged Platform";

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Merhaba ${data.fullName}</h2>
      <p>${data.message}</p>
      
      <div style="background-color: #fff3e0; padding: 20px; border-radius: 5px; 
                  border-left: 4px solid #ff9800; margin: 20px 0;">
        <p><strong>⏳ Bekleme Süreci:</strong></p>
        <ul>
          <li>Admin ekibimiz başvurunuzu inceleyecek</li>
          <li>Genellikle 24-48 saat içinde sonuçlanır</li>
          <li>Onay sonrası email ile bilgilendirileceksiniz</li>
        </ul>
      </div>
      
      <p style="color: #666;">
        Bu süreçte sorularınız varsa destek ekibimizle iletişime geçebilirsiniz.
      </p>
    </div>
  `;

    console.log(`\n⏳ Pending Admin Approval for ${email}\n`);

    return this.sendEmail(email, subject, htmlContent);
  }

  /**
   * Representative Activated Email - Temsilci hesabı onaylandı
   */
  async sendRepresentativeActivatedEmail(email, data) {
    const subject = "Temsilci Hesabınız Onaylandı - Pledged Platform";

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Tebrikler ${data.fullName}! 🎊</h2>
      <p><strong>${data.region}</strong> bölgesi temsilcisi olarak hesabınız onaylandı!</p>
      
      <div style="background-color: #e8f5e9; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #2e7d32;">Temsilci Yetkileri:</h3>
        <ul>
          <li>Bölgenizdeki tüm mülkleri yönetebilirsiniz</li>
          <li>Yatırımcılara ve mülk sahiplerine destek verebilirsiniz</li>
          <li>Sözleşme süreçlerinde aracılık yapabilirsiniz</li>
          <li>Komisyon kazanma fırsatları</li>
        </ul>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Hesap Detayları:</strong></p>
        <p>👤 Rol: Yerel Temsilci</p>
        <p>📍 Bölge: ${data.region}</p>
        <p>💼 Üyelik: Enterprise (Ücretsiz)</p>
        <p>⏰ Geçerlilik: 1 Yıl</p>
      </div>
      
      <div style="margin: 30px 0;">
        <a href="${this.frontendUrl}/dashboard" 
           style="background-color: #2196F3; color: white; padding: 12px 30px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;">
          Temsilci Paneline Git
        </a>
      </div>
    </div>
  `;

    console.log(`\n🎊 Representative Activated: ${email} (${data.region})\n`);

    return this.sendEmail(email, subject, htmlContent);
  }

  /**
   * Membership Change Email - Plan değişikliği
   */
  async sendMembershipChangeEmail(email, data) {
    const subject = `Üyelik Planınız ${
      data.oldPlan < data.newPlan ? "Yükseltildi" : "Değiştirildi"
    } - Pledged Platform`;

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Üyelik Planınız Güncellendi</h2>
      
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Eski Plan:</strong> ${data.oldPlan}</p>
        <p><strong>Yeni Plan:</strong> ${data.newPlan} ${
      data.oldPlan < data.newPlan ? "⬆️" : "⬇️"
    }</p>
        <p><strong>Geçerlilik:</strong> ${new Date(
          data.expiresAt
        ).toLocaleDateString("tr-TR")}</p>
      </div>
      
      ${
        data.newPlan === "Pro"
          ? `
      <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #1976d2;">Pro Plan Avantajları:</h3>
        <ul>
          <li>5 eş zamanlı yatırım hakkı</li>
          <li>%4 platform komisyonu (Basic: %5)</li>
          <li>Öncelikli destek</li>
        </ul>
      </div>
      `
          : ""
      }
      
      ${
        data.newPlan === "Enterprise"
          ? `
      <div style="background-color: #f3e5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #7b1fa2;">Enterprise Plan Avantajları:</h3>
        <ul>
          <li>Sınırsız yatırım hakkı</li>
          <li>%3 platform komisyonu</li>
          <li>7/24 VIP destek</li>
          <li>Özel hesap yöneticisi</li>
        </ul>
      </div>
      `
          : ""
      }
    </div>
  `;

    return this.sendEmail(email, subject, htmlContent);
  }

  /**
   * Password Reset Confirmation
   */
  async sendPasswordResetConfirmation(email) {
    const subject = "Şifreniz Sıfırlandı - Pledged Platform";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Şifre Sıfırlama Başarılı</h2>
        <p>Merhaba,</p>
        <p>Şifreniz başarıyla sıfırlandı. Artık yeni şifrenizle giriş yapabilirsiniz.</p>
        <p style="color: #666;">Güvenliğiniz için 2FA'yı etkinleştirmenizi öneririz.</p>
      </div>
    `;

    return this.sendEmail(email, subject, htmlContent);
  }

  /**
   * Helper: HTML to Text converter
   */
  htmlToText(html) {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, "")
      .replace(/<script[^>]*>.*?<\/script>/gs, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Helper: Get role name in Turkish
   */
  getRoleName(role) {
    const roles = {
      investor: "Yatırımcı",
      property_owner: "Mülk Sahibi",
      local_representative: "Yerel Temsilci",
      admin: "Yönetici",
    };
    return roles[role] || role;
  }
}

module.exports = new EmailService();
