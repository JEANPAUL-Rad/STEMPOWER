// utils/email.js - Provider-agnostic email sender with Brevo and SMTP fallback
import SibApiV3Sdk from 'sib-api-v3-sdk';
import nodemailer from 'nodemailer';

const hasBrevo = Boolean(process.env.BREVO_API_KEY);
let sendMailImpl = null;

if (hasBrevo) {
  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  const apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = process.env.BREVO_API_KEY;
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  const brevoSender = {
    name: process.env.BREVO_SENDER_NAME || 'Nkusi Engineering Group Ltd',
    email: process.env.BREVO_SENDER_EMAIL,
  };
  sendMailImpl = async (to, subject, html) => {
    try {
      if (!brevoSender.email) {
        throw new Error('BREVO_SENDER_EMAIL not configured');
      }
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = html;
      sendSmtpEmail.sender = brevoSender;
      sendSmtpEmail.to = [{ email: to }];
      const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
      return data;
    } catch (error) {
      const errorMessage = error.response?.body?.message || error.message || 'Unknown error';
      const errorCode = error.response?.body?.code || error.statusCode || 'unknown';
      console.error('Brevo Error:', { message: errorMessage, code: errorCode, status: error.status || error.statusCode });
      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  };
} else {
  // SMTP fallback using Nodemailer
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '0', 10) || 0;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
  const fromName = process.env.SMTP_FROM_NAME || 'Nkusi Engineering Group Ltd';
  const fromEmail = process.env.SMTP_FROM_EMAIL;

  let transporter = null;
  if (smtpHost && smtpPort && smtpUser && smtpPass && fromEmail) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
    });
    sendMailImpl = async (to, subject, html) => {
      const info = await transporter.sendMail({
        from: `${fromName} <${fromEmail}>`,
        to,
        subject,
        html,
      });
      return info;
    };
  } else {
    // No provider configured
    sendMailImpl = async () => {
      throw new Error('Email provider not configured. Set BREVO_* or SMTP_* environment variables.');
    };
  }
}

export const sendMail = async (to, subject, html) => {
  return await sendMailImpl(to, subject, html);
};
