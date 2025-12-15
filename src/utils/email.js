// utils/email.js - Updated for Brevo
import SibApiV3Sdk from 'sib-api-v3-sdk';
import nodemailer from 'nodemailer';

// Configure Brevo API
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

export const sendMail = async (to, subject, html) => {
  const brevoKey = process.env.BREVO_API_KEY;
  const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL;
  const brevoSenderName = process.env.BREVO_SENDER_NAME || '';
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 0);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  const canUseBrevo = Boolean(brevoKey && brevoSenderEmail);
  const canUseSMTP = Boolean(smtpHost && smtpPort && smtpUser && smtpPass);

  if (canUseBrevo) {
    try {
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = html;
      sendSmtpEmail.sender = { name: brevoSenderName, email: brevoSenderEmail };
      sendSmtpEmail.to = [{ email: to }];
      const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Email sent via Brevo:', { to, subject });
      return data;
    } catch (error) {
      const errorMessage = error.response?.body?.message || error.message || 'Unknown error';
      const errorCode = error.response?.body?.code || error.statusCode || 'unknown';
      console.error('Brevo send error:', { message: errorMessage, code: errorCode });
      if (!canUseSMTP) {
        throw new Error(`Failed to send email: ${errorMessage}`);
      }
    }
  }

  if (canUseSMTP) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });
    const fromEmail = brevoSenderEmail || smtpUser;
    const fromName = brevoSenderName || fromEmail;
    try {
      const info = await transporter.sendMail({
        from: `${fromName} <${fromEmail}>`,
        to,
        subject,
        html,
      });
      console.log('Email sent via SMTP:', { to, subject, messageId: info.messageId });
      return info;
    } catch (err) {
      const msg = err?.message || 'Unknown SMTP error';
      console.error('SMTP send error:', msg);
      throw new Error(`Failed to send email: ${msg}`);
    }
  }

  console.error('Email configuration missing');
  throw new Error('Email service not configured');
};
