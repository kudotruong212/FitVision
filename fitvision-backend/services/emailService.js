// services/emailService.js
// Email service integration (Resend/SendGrid/SES)

import config from '../config/index.js';
import logger from '../utils/logger.js';

let emailClient = null;

// Initialize email client based on provider
async function initEmailClient() {
  const provider = config.email.provider || 'resend';

  try {
    if (provider === 'resend') {
      if (!config.email.resendApiKey) {
        logger.warn('Resend API key not configured, email service disabled');
        return null;
      }
      // Dynamic import for Resend
      const resendModule = await import('resend');
      const { Resend } = resendModule;
      emailClient = new Resend(config.email.resendApiKey);
      logger.info('Email service initialized with Resend');
    } else if (provider === 'sendgrid') {
      if (!config.email.sendgridApiKey) {
        logger.warn('SendGrid API key not configured, email service disabled');
        return null;
      }
      const sgMailModule = await import('@sendgrid/mail');
      const sgMail = sgMailModule.default;
      sgMail.setApiKey(config.email.sendgridApiKey);
      emailClient = sgMail;
      logger.info('Email service initialized with SendGrid');
    } else if (provider === 'ses') {
      if (!config.email.awsAccessKeyId || !config.email.awsSecretAccessKey) {
        logger.warn('AWS credentials not configured, email service disabled');
        return null;
      }
      const AWS = await import('aws-sdk');
      emailClient = new AWS.default.SES({
        region: config.email.awsRegion || 'us-east-1',
        accessKeyId: config.email.awsAccessKeyId,
        secretAccessKey: config.email.awsSecretAccessKey,
      });
      logger.info('Email service initialized with AWS SES');
    } else {
      logger.warn(`Unknown email provider: ${provider}`);
      return null;
    }
  } catch (err) {
    logger.error('Failed to initialize email client', { error: err.message });
    return null;
  }

  return emailClient;
}

// Initialize on module load (lazy initialization - will be initialized when first email is sent)
// Don't await here to avoid blocking module load
initEmailClient().catch(err => {
  logger.error('Failed to initialize email client on module load', { error: err.message });
});

export async function sendEmail({ to, subject, html, text }) {
  // Ensure email client is initialized
  if (!emailClient) {
    emailClient = await initEmailClient();
    if (!emailClient) {
      logger.warn('Email service not available, skipping email send', { to, subject });
      return { success: false, error: 'Email service not configured' };
    }
  }

  const provider = config.email.provider || 'resend';

  try {
    if (provider === 'resend') {
      const result = await emailClient.emails.send({
        from: `${config.email.fromName} <${config.email.from}>`,
        to,
        subject,
        html,
        text,
      });
      logger.info('Email sent via Resend', { to, subject, id: result.id });
      return { success: true, id: result.id };
    } else if (provider === 'sendgrid') {
      await emailClient.send({
        from: { email: config.email.from, name: config.email.fromName },
        to,
        subject,
        html,
        text,
      });
      logger.info('Email sent via SendGrid', { to, subject });
      return { success: true };
    } else if (provider === 'ses') {
      const params = {
        Source: `${config.email.fromName} <${config.email.from}>`,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject },
          Body: {
            Html: { Data: html },
            Text: { Data: text || html.replace(/<[^>]*>/g, '') },
          },
        },
      };
      const result = await emailClient.sendEmail(params).promise();
      logger.info('Email sent via SES', { to, subject, messageId: result.MessageId });
      return { success: true, id: result.MessageId };
    }
  } catch (err) {
    logger.error('Failed to send email', { error: err.message, to, subject });
    return { success: false, error: err.message };
  }
}

export async function sendVerificationEmail(user, token) {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Xác nhận email - FitVision</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4F46E5;">Chào mừng đến với FitVision!</h1>
        <p>Xin chào ${user.name || user.email},</p>
        <p>Cảm ơn bạn đã đăng ký tài khoản FitVision. Vui lòng xác nhận email của bạn bằng cách nhấp vào liên kết bên dưới:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Xác nhận email</a>
        </p>
        <p>Hoặc copy và dán liên kết sau vào trình duyệt:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>Liên kết này sẽ hết hạn sau 24 giờ.</p>
        <p>Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">FitVision - AI Gym & Yoga Companion</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Chào mừng đến với FitVision!

Xin chào ${user.name || user.email},

Cảm ơn bạn đã đăng ký tài khoản FitVision. Vui lòng xác nhận email của bạn bằng cách truy cập liên kết sau:

${verificationUrl}

Liên kết này sẽ hết hạn sau 24 giờ.

Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.

FitVision - AI Gym & Yoga Companion
  `;

  return sendEmail({
    to: user.email,
    subject: 'Xác nhận email - FitVision',
    html,
    text,
  });
}

export async function sendPasswordResetEmail(user, token) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Đặt lại mật khẩu - FitVision</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4F46E5;">Đặt lại mật khẩu</h1>
        <p>Xin chào ${user.name || user.email},</p>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấp vào liên kết bên dưới để đặt lại mật khẩu:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Đặt lại mật khẩu</a>
        </p>
        <p>Hoặc copy và dán liên kết sau vào trình duyệt:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p>Liên kết này sẽ hết hạn sau 1 giờ.</p>
        <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Mật khẩu của bạn sẽ không thay đổi.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">FitVision - AI Gym & Yoga Companion</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Đặt lại mật khẩu

Xin chào ${user.name || user.email},

Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Truy cập liên kết sau để đặt lại mật khẩu:

${resetUrl}

Liên kết này sẽ hết hạn sau 1 giờ.

Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.

FitVision - AI Gym & Yoga Companion
  `;

  return sendEmail({
    to: user.email,
    subject: 'Đặt lại mật khẩu - FitVision',
    html,
    text,
  });
}

export async function sendWelcomeEmail(user) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Chào mừng đến với FitVision!</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4F46E5;">Chào mừng đến với FitVision!</h1>
        <p>Xin chào ${user.name || user.email},</p>
        <p>Cảm ơn bạn đã tham gia FitVision - nền tảng AI tư vấn thể hình và yoga hàng đầu!</p>
        <p>Với FitVision, bạn có thể:</p>
        <ul>
          <li>📸 Phân tích tư thế và thể hình qua ảnh</li>
          <li>💪 Nhận kế hoạch tập luyện cá nhân hóa</li>
          <li>🤖 Tư vấn với AI Coach thông minh</li>
          <li>📊 Theo dõi tiến độ của bạn</li>
        </ul>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/scan" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Bắt đầu ngay</a>
        </p>
        <p>Chúc bạn có trải nghiệm tuyệt vời với FitVision!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">FitVision - AI Gym & Yoga Companion</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Chào mừng đến với FitVision!

Xin chào ${user.name || user.email},

Cảm ơn bạn đã tham gia FitVision - nền tảng AI tư vấn thể hình và yoga hàng đầu!

Với FitVision, bạn có thể:
- Phân tích tư thế và thể hình qua ảnh
- Nhận kế hoạch tập luyện cá nhân hóa
- Tư vấn với AI Coach thông minh
- Theo dõi tiến độ của bạn

Bắt đầu ngay: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/scan

Chúc bạn có trải nghiệm tuyệt vời với FitVision!

FitVision - AI Gym & Yoga Companion
  `;

  return sendEmail({
    to: user.email,
    subject: 'Chào mừng đến với FitVision!',
    html,
    text,
  });
}

