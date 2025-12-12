const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

class MomoService {
  constructor() {
    this.baseUrl = process.env.MOMO_BASE_URL || 'https://sandbox.momodeveloper.mtn.com';
    this.subscriptionKey = process.env.MOMO_SUBSCRIPTION_KEY;
    this.apiUser = process.env.MOMO_API_USER;
    this.apiKey = process.env.MOMO_API_KEY;
    this.callbackUrl = process.env.MOMO_CALLBACK_URL;
    this.targetEnvironment = process.env.MOMO_TARGET_ENV || 'sandbox';
    this.currency = process.env.MOMO_CURRENCY || 'RWF';
  }

  // Generate authentication token
  async generateAuthToken() {
    try {
      const credentials = Buffer.from(`${this.apiUser}:${this.apiKey}`).toString('base64');
      
      const response = await axios.post(
        `${this.baseUrl}/collection/token/`,
        {},
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Authorization': `Basic ${credentials}`
          }
        }
      );

      return response.data.access_token;
    } catch (error) {
      console.error('Error generating auth token:', error.response?.data || error.message);
      throw new Error('Failed to generate authentication token');
    }
  }

  // Create payment request using RequestToPay endpoint
  async requestPayment(amount, phoneNumber, externalId, message = 'Payment for service') {
    const client = await db.connect();
    try {
      const referenceId = uuidv4();
      const token = await this.generateAuthToken();
      
      const paymentData = {
        amount: amount.toString(),
        currency: this.currency,
        externalId: externalId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber
        },
        payerMessage: message,
        payeeNote: 'Thank you for your payment'
      };

      // Using the correct RequestToPay endpoint
      await axios.post(
        `${this.baseUrl}/collection/v1_0/requesttopay`,
        paymentData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'X-Target-Environment': this.targetEnvironment,
            'Authorization': `Bearer ${token}`,
            'X-Reference-Id': referenceId,
            'X-Callback-Url': this.callbackUrl
          }
        }
      );

      // Save to database
      const result = await client.query(
        `INSERT INTO momo_payments 
        (external_id, amount, currency, payer_number, payment_status, conversation_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [externalId, amount, this.currency, phoneNumber, 'PENDING', referenceId]
      );

      return {
        success: true,
        referenceId,
        status: 'PENDING',
        payment: result.rows[0]
      };
    } catch (error) {
      console.error('Payment request error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Payment request failed');
    } finally {
      client.release();
    }
  }

  // Check payment status using RequestToPay status endpoint
  async checkPaymentStatus(referenceId) {
    try {
      const token = await this.generateAuthToken();
      
      const response = await axios.get(
        `${this.baseUrl}/collection/v1_0/requesttopay/${referenceId}`,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'X-Target-Environment': this.targetEnvironment,
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // Update payment status in database
      const result = await client.query(
        `UPDATE momo_payments 
        SET payment_status = $1, 
            financial_transaction_id = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE conversation_id = $3
        RETURNING *`,
        [response.data.status, response.data.financialTransactionId, referenceId]
      );

      return {
        success: true,
        status: response.data.status,
        amount: response.data.amount,
        currency: response.data.currency,
        financialTransactionId: response.data.financialTransactionId,
        payment: result.rows[0]
      };
    } catch (error) {
      console.error('Error checking payment status:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to check payment status');
    } finally {
      client.release();
    }
  }

  // Handle payment webhook
  async handlePaymentWebhook(referenceId, status, financialTransactionId) {
    const client = await db.connect();
    try {
      const result = await client.query(
        `UPDATE momo_payments 
        SET payment_status = $1, 
            financial_transaction_id = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE conversation_id = $3
        RETURNING *`,
        [status, financialTransactionId, referenceId]
      );

      if (result.rows.length === 0) {
        throw new Error('Payment not found');
      }

      return {
        success: true,
        payment: result.rows[0]
      };
    } catch (error) {
      console.error('Webhook error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get payment by ID
  async getPaymentById(id) {
    try {
      const result = await db.query(
        'SELECT * FROM momo_payments WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error getting payment by ID:', error);
      throw error;
    }
  }

  // Get payment by reference ID
  async getPaymentByReference(referenceId) {
    try {
      const result = await db.query(
        'SELECT * FROM momo_payments WHERE conversation_id = $1',
        [referenceId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error getting payment by reference:', error);
      throw error;
    }
  }

  // Get all payments with pagination
  async getAllPayments(limit = 10, offset = 0) {
    try {
      const result = await db.query(
        'SELECT * FROM momo_payments ORDER BY initiated_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      
      const countResult = await db.query('SELECT COUNT(*) FROM momo_payments');
      
      return {
        data: result.rows,
        total: parseInt(countResult.rows[0].count, 10)
      };
    } catch (error) {
      console.error('Error getting all payments:', error);
      throw error;
    }
  }

  // Get account balance using the GetAccountBalance endpoint
  async getAccountBalance() {
    try {
      const token = await this.generateAuthToken();
      
      const response = await axios.get(
        `${this.baseUrl}/collection/v1_0/account/balance`,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'X-Target-Environment': this.targetEnvironment,
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return {
        success: true,
        balance: response.data.availableBalance,
        currency: response.data.currency
      };
    } catch (error) {
      console.error('Error getting account balance:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to get account balance');
    }
  }

  // Create payment using the CreatePayments endpoint (v2)
  async createPayment(amount, phoneNumber, externalId, message = 'Payment for service') {
    const client = await db.connect();
    try {
      const referenceId = uuidv4();
      const token = await this.generateAuthToken();
      
      const paymentData = {
        amount: amount.toString(),
        currency: this.currency,
        externalId: externalId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber
        },
        payerMessage: message,
        payeeNote: 'Thank you for your payment'
      };

      // Using the CreatePayments v2 endpoint
      const response = await axios.post(
        `${this.baseUrl}/collection/v2_0/payment`,
        paymentData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'X-Target-Environment': this.targetEnvironment,
            'Authorization': `Bearer ${token}`,
            'X-Reference-Id': referenceId,
            'X-Callback-Url': this.callbackUrl
          }
        }
      );

      // Save to database
      const result = await client.query(
        `INSERT INTO momo_payments 
        (external_id, amount, currency, payer_number, payment_status, conversation_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [externalId, amount, this.currency, phoneNumber, 'PENDING', referenceId]
      );

      return {
        success: true,
        referenceId,
        status: 'PENDING',
        payment: result.rows[0]
      };
    } catch (error) {
      console.error('Payment creation error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Payment creation failed');
    } finally {
      client.release();
    }
  }
}

module.exports = new MomoService();
