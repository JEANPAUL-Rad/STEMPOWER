import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import SibApiV3Sdk from 'sib-api-v3-sdk';

export const sendMail = async (to, subject, html) => {
  const brevoKey = (process.env.BREVO_API_KEY || '').trim();
  const brevoSenderEmail = (process.env.BREVO_SENDER_EMAIL || '').trim();
  const brevoSenderName = (process.env.BREVO_SENDER_NAME || '').trim();
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 0);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const resendKey = process.env.RESEND_API_KEY;
  const recipient = String(to || '').trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipient)) {
    throw new Error('Invalid recipient email');
  }

  const canUseBrevo = Boolean(brevoKey && brevoSenderEmail);
  const canUseSMTP = Boolean(smtpHost && smtpPort && smtpUser && smtpPass);
  const canUseResend = Boolean(resendKey);

  if (canUseBrevo) {
    try {
      const defaultClient = SibApiV3Sdk.ApiClient.instance;
      defaultClient.authentications['api-key'].apiKey = brevoKey;
      const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = html;
      sendSmtpEmail.sender = { name: brevoSenderName, email: brevoSenderEmail };
      sendSmtpEmail.to = [{ email: recipient }];
      const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Email sent via Brevo:', { to: recipient, subject });
      return data;
    } catch (error) {
      const errorMessage = error.response?.body?.message || error.message || 'Unknown error';
      const errorCode = error.response?.body?.code || error.statusCode || 'unknown';
      console.error('Brevo send error:', { message: errorMessage, code: errorCode });
      if (String(errorMessage || '').toLowerCase().includes('email is not valid')) {
        throw new Error('Invalid recipient email');
      }
      if (!canUseSMTP && !canUseResend) {
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
        to: recipient,
        subject,
        html,
      });
      console.log('Email sent via SMTP:', { to: recipient, subject, messageId: info.messageId });
      return info;
    } catch (err) {
      const msg = err?.message || 'Unknown SMTP error';
      console.error('SMTP send error:', msg);
      if (!canUseResend) {
        throw new Error(`Failed to send email: ${msg}`);
      }
    }
  }

  if (canUseResend) {
    try {
      const resend = new Resend(resendKey);
      const fromEmail = brevoSenderEmail || process.env.RESEND_FROM || 'onboarding@resend.dev';
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: recipient,
        subject,
        html,
      });
      if (error) {
        throw new Error(error.message || 'Resend error');
      }
      console.log('Email sent via Resend:', { to: recipient, subject, id: data?.id });
      return data;
    } catch (err) {
      const msg = err?.message || 'Unknown Resend error';
      console.error('Resend send error:', msg);
      throw new Error(`Failed to send email: ${msg}`);
    }
  }

  console.error('Email configuration missing');
  throw new Error('Email service not configured');
};
