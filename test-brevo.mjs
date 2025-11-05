// test-brevo.mjs
import dotenv from 'dotenv';
import SibApiV3Sdk from 'sib-api-v3-sdk';

dotenv.config();

console.log('Testing Brevo connection...');
console.log('API Key present:', !!process.env.BREVO_API_KEY);

if (!process.env.BREVO_API_KEY) {
  console.error('ERROR: BREVO_API_KEY is missing from environment variables');
  process.exit(1);
}

// Configure Brevo API
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

// Test 1: Account API (basic connection)
console.log('\n1. Testing account API...');
const accountApi = new SibApiV3Sdk.AccountApi();

try {
  const accountData = await accountApi.getAccount();
  console.log('✓ Account API successful');
  console.log('   Plan:', accountData.plan?.[0]?.type || 'Unknown');
  console.log('   Email:', accountData.email || 'Unknown');
  
  // Test 2: Senders API (check verified senders)
  console.log('\n2. Testing senders API...');
  const sendersApi = new SibApiV3Sdk.SendersApi();
  
  const sendersData = await sendersApi.getSenders();
  console.log('✓ Senders API successful');
  
  if (sendersData.senders && sendersData.senders.length > 0) {
    const verifiedSenders = sendersData.senders.filter(s => s.active).map(s => s.email);
    console.log('   Verified senders:', verifiedSenders.join(', ') || 'None');
  } else {
    console.log('   No senders found');
  }
  
  // Test 3: Try to send a test email
  console.log('\n3. Testing email sending...');
  const transactionalEmailsApi = new SibApiV3Sdk.TransactionalEmailsApi();
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  
  sendSmtpEmail.subject = 'Test Email from Brevo API';
  sendSmtpEmail.htmlContent = '<p>This is a test email from your Brevo integration.</p>';
  
  // Use your actual sender email from environment variables
  sendSmtpEmail.sender = { 
    name: process.env.BREVO_SENDER_NAME || 'Test Sender', 
    email: process.env.BREVO_SENDER_EMAIL || 'test@example.com'
  };
  
  sendSmtpEmail.to = [{ 
    email: process.env.BREVO_SENDER_EMAIL || 'test@example.com' // Send to yourself
  }];
  
  const emailData = await transactionalEmailsApi.sendTransacEmail(sendSmtpEmail);
  console.log('✓ Email sending successful');
  console.log('   Message ID:', emailData.messageId);
  console.log('\n✅ All tests passed! Brevo integration should work.');
  
} catch (error) {
  console.error('❌ Test failed:');
  
  if (error.response) {
    console.error('   Status:', error.response.status);
    console.error('   Data:', error.response.data);
  } else if (error.request) {
    console.error('   No response received:', error.request);
    console.error('   This usually means a network issue');
  } else {
    console.error('   Error:', error.message);
  }
  
  // Provide specific guidance based on error type
  if (error.response && error.response.status === 401) {
    console.error('\n💡 Solution: Check your BREVO_API_KEY is correct');
    console.error('   Get a new key from: https://app.brevo.com/settings/keys/api');
  } else if (error.response && error.response.status === 403) {
    console.error('\n💡 Solution: Your API key may not have sufficient permissions');
    console.error('   Check your Brevo plan and API key permissions');
  } else if (error.code === 'ENOTFOUND') {
    console.error('\n💡 Solution: Network connectivity issue');
    console.error('   Check your server can connect to api.brevo.com');
  }
}