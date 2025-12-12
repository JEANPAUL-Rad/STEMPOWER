const momoService = require('../services/momoService');
const { validationResult } = require('express-validator');

// @desc    Request a payment
// @route   POST /api/payments/request
// @access  Private
exports.requestPayment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { amount, phoneNumber, externalId, message } = req.body;
    const userId = req.user.id; // Assuming you have user authentication middleware

    const result = await momoService.requestPayment(
      amount,
      phoneNumber,
      externalId,
      message
    );

    res.status(202).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Payment request error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process payment request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Check payment status
// @route   GET /api/payments/status/:referenceId
// @access  Private
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { referenceId } = req.params;
    
    if (!referenceId) {
      return res.status(400).json({
        success: false,
        message: 'Reference ID is required'
      });
    }

    const result = await momoService.checkPaymentStatus(referenceId);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Handle MoMo webhook
// @route   POST /api/payments/webhook
// @access  Public
exports.handleWebhook = async (req, res) => {
  try {
    const { referenceId, status, financialTransactionId } = req.body;
    
    if (!referenceId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Reference ID and status are required'
      });
    }

    await momoService.handlePaymentWebhook(referenceId, status, financialTransactionId);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process webhook',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Private
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await momoService.getPaymentById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private/Admin
exports.getAllPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const { data, total } = await momoService.getAllPayments(limit, offset);
    
    res.status(200).json({
      success: true,
      count: data.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
