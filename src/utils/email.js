// utils/email.js - Updated for Brevo
import SibApiV3Sdk from 'sib-api-v3-sdk';

// Configure Brevo API
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

export const sendMail = async (to, subject, html) => {
  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.sender = {
      name: process.env.BREVO_SENDER_NAME,
      email: process.env.BREVO_SENDER_EMAIL
    };
    sendSmtpEmail.to = [{ email: to }];
    
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Email sent successfully:', data);
    return data;
  } catch (error) {
    // Provide more detailed error information
    const errorMessage = error.response?.body?.message || error.message || 'Unknown error';
    const errorCode = error.response?.body?.code || error.statusCode || 'unknown';
    
    console.error('Brevo Error:', {
      message: errorMessage,
      code: errorCode,
      status: error.status || error.statusCode
    });
    
    // Re-throw with more context for debugging
    throw new Error(`Failed to send email: ${errorMessage}`);
  }
};