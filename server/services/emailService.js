// server/services/emailService.js

// Mock Email Service - Development Version

class EmailService {
  constructor() {
    this.isProduction = process.env.NODE_ENV === "production";
    this.fromEmail = process.env.EMAIL_FROM || "noreply@pledgedplatform.com";
    this.frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

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
  async sendVerificationEmail(email, verificationToken) {
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${verificationToken}`;

    const subject = "Email Adresinizi Doğrulayın - Pledged Platform";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Email Doğrulama</h2>
        <p>Merhaba,</p>
        <p>Pledged Platform'a hoş geldiniz! Hesabınızı aktifleştirmek için lütfen email adresinizi doğrulayın.</p>
        <div style="margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #4CAF50; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Email Adresimi Doğrula
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Butona tıklayamıyorsanız, aşağıdaki linki tarayıcınıza kopyalayın:
        </p>
        <p style="color: #666; font-size: 12px; word-break: break-all;">
          ${verificationUrl}
        </p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">
          Bu email 24 saat içinde geçerliliğini yitirecektir.
          Eğer bu hesabı siz oluşturmadıysanız, bu emaili görmezden gelebilirsiniz.
        </p>
      </div>
    `;

    console.log(`\n🔑 Verification Token for ${email}: ${verificationToken}`);
    console.log(`🔗 Verification URL: ${verificationUrl}\n`);

    return this.sendEmail(email, subject, htmlContent);
  }

  /**
   * Password Reset - Şifre sıfırlama emaili
   */
  async sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;

    const subject = "Şifre Sıfırlama Talebi - Pledged Platform";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Şifre Sıfırlama</h2>
        <p>Merhaba,</p>
        <p>Hesabınız için şifre sıfırlama talebinde bulundunuz.</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #FF9800; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Şifremi Sıfırla
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Butona tıklayamıyorsanız, aşağıdaki linki tarayıcınıza kopyalayın:
        </p>
        <p style="color: #666; font-size: 12px; word-break: break-all;">
          ${resetUrl}
        </p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">
          Bu link 1 saat içinde geçerliliğini yitirecektir.
          Eğer bu talebi siz yapmadıysanız, hesabınızın güvenliği için şifrenizi değiştirmenizi öneririz.
        </p>
      </div>
    `;

    console.log(`\n🔑 Password Reset Token for ${email}: ${resetToken}`);
    console.log(`🔗 Reset URL: ${resetUrl}\n`);

    return this.sendEmail(email, subject, htmlContent);
  }

  /**
   * 2FA Code - 2FA doğrulama kodu
   */
  async send2FACode(email, code) {
    const subject = "Güvenlik Kodu - Pledged Platform";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">İki Faktörlü Doğrulama</h2>
        <p>Merhaba,</p>
        <p>Hesabınıza giriş yapabilmek için güvenlik kodunuz:</p>
        <div style="margin: 30px 0; text-align: center;">
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; 
                      display: inline-block; font-size: 32px; letter-spacing: 5px; 
                      font-weight: bold; color: #333;">
            ${code}
          </div>
        </div>
        <p style="color: #666;">Bu kod 10 dakika içinde geçerliliğini yitirecektir.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">
          Eğer bu girişi siz yapmadıysanız, hesabınızın güvenliği tehlikede olabilir.
          Lütfen hemen şifrenizi değiştirin.
        </p>
      </div>
    `;

    console.log(`\n🔐 2FA Code for ${email}: ${code}\n`);

    return this.sendEmail(email, subject, htmlContent);
  }

  /**
   * Welcome Email - Hoş geldin emaili
   */
  async sendWelcomeEmail(email, userData) {
    const subject = "Hoş Geldiniz - Pledged Platform";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Platformumuza Hoş Geldiniz!</h2>
        <p>Merhaba ${userData.fullName},</p>
        <p>Pledged Platform ailesine katıldığınız için teşekkür ederiz.</p>
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #555;">Hesap Bilgileriniz:</h3>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Hesap Tipi:</strong> ${this.getRoleName(userData.role)}</p>
          <p><strong>Üyelik Planı:</strong> ${userData.membershipPlan}</p>
        </div>
        <p>Başlamak için yapmanız gerekenler:</p>
        <ul>
          <li>KYC dokümanlarınızı yükleyin</li>
          <li>Üyelik planınızı aktifleştirin</li>
          <li>Profilinizi tamamlayın</li>
        </ul>
        <div style="margin: 30px 0;">
          <a href="${this.frontendUrl}/dashboard" 
             style="background-color: #4CAF50; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Panele Git
          </a>
        </div>
      </div>
    `;

    return this.sendEmail(email, subject, htmlContent);
  }

  /**
   * Security Alert - Güvenlik uyarısı
   */
  async sendSecurityAlert(email, alertData) {
    const subject = "⚠️ Güvenlik Uyarısı - Pledged Platform";

    const alertMessages = {
      account_locked:
        "Hesabınız çok fazla başarısız giriş denemesi nedeniyle kilitlendi.",
      "2fa_disabled": "2FA koruması devre dışı bırakıldı.",
      password_changed: "Şifreniz değiştirildi.",
      suspicious_login: "Hesabınıza şüpheli bir giriş tespit ettik.",
      new_device: "Hesabınıza yeni bir cihazdan giriş yapıldı.",
    };

    const message =
      alertMessages[alertData.type] ||
      "Hesabınızda önemli bir güvenlik olayı tespit edildi.";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ff5252; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
          <h2 style="margin: 0;">⚠️ Güvenlik Uyarısı</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <p><strong>${message}</strong></p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Detaylar:</strong></p>
            <p>📅 Tarih: ${new Date(alertData.timestamp).toLocaleString(
              "tr-TR"
            )}</p>
            ${alertData.ip ? `<p>🌐 IP Adresi: ${alertData.ip}</p>` : ""}
            ${
              alertData.location ? `<p>📍 Konum: ${alertData.location}</p>` : ""
            }
          </div>
          <p style="color: #666;">
            Eğer bu işlemi siz yapmadıysanız, lütfen hemen şifrenizi değiştirin ve 
            2FA'yı etkinleştirin.
          </p>
          <div style="margin: 20px 0;">
            <a href="${this.frontendUrl}/security" 
               style="background-color: #ff5252; color: white; padding: 10px 20px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Güvenlik Ayarlarına Git
            </a>
          </div>
        </div>
      </div>
    `;

    console.log(`\n🚨 Security Alert for ${email}: ${alertData.type}\n`);

    return this.sendEmail(email, subject, htmlContent);
  }

  /**
   * Membership Activation - Üyelik aktivasyonu
   */
  async sendMembershipActivationEmail(email, membershipData) {
    const subject = "Üyeliğiniz Aktifleştirildi - Pledged Platform";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Üyeliğiniz Aktif! 🎉</h2>
        <p>Merhaba,</p>
        <p><strong>${
          membershipData.plan
        }</strong> üyelik planınız başarıyla aktifleştirildi.</p>
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #555;">Üyelik Detayları:</h3>
          <p><strong>Plan:</strong> ${membershipData.plan}</p>
          <p><strong>Başlangıç:</strong> ${new Date().toLocaleDateString(
            "tr-TR"
          )}</p>
          <p><strong>Bitiş:</strong> ${new Date(
            membershipData.expiresAt
          ).toLocaleDateString("tr-TR")}</p>
        </div>
        <p>Artık tüm premium özelliklere erişebilirsiniz!</p>
      </div>
    `;

    return this.sendEmail(email, subject, htmlContent);
  }

  /**
   * Account Deletion Request - Hesap silme talebi
   */
  async sendAccountDeletionRequestEmail(email, data) {
    const subject = "Hesap Silme Talebiniz Alındı - Pledged Platform";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Hesap Silme Talebi</h2>
        <p>Merhaba,</p>
        <p>Hesap silme talebiniz alınmıştır.</p>
        <div style="background-color: #fff3e0; padding: 20px; border-radius: 5px; 
                    border-left: 4px solid #ff9800; margin: 20px 0;">
          <p><strong>⚠️ Önemli:</strong></p>
          <ul>
            <li>Talebiniz admin onayına sunulmuştur</li>
            <li>Onaylandıktan sonra hesabınız 90 gün boyunca "silinmeyi bekliyor" durumunda olacak</li>
            <li>Bu süre içinde talebinizi iptal edebilirsiniz</li>
            <li>90 gün sonunda hesabınız kalıcı olarak silinecektir</li>
          </ul>
        </div>
        <p><strong>Planlanan Silme Tarihi:</strong> ${new Date(
          data.scheduledDate
        ).toLocaleDateString("tr-TR")}</p>
        <p>Eğer fikrinizi değiştirirseniz, panelden talebinizi iptal edebilirsiniz.</p>
      </div>
    `;

    return this.sendEmail(email, subject, htmlContent);
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
