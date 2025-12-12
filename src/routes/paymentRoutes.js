const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   POST /api/payments/request
// @desc    Request a payment
// @access  Private
router.post(
  '/request',
  [
    auth,
    [
      check('amount', 'Amount is required and must be a positive number').isNumeric().isFloat({ min: 1 }),
      check('phoneNumber', 'Please include a valid phone number').isMobilePhone(),
      check('externalId', 'External ID is required').not().isEmpty(),
      check('message', 'Message is required').optional().trim()
    ]
  ],
  paymentController.requestPayment
);

// @route   GET /api/payments/status/:referenceId
// @desc    Check payment status
// @access  Private
router.get(
  '/status/:referenceId',
  [
    auth,
    check('referenceId', 'Reference ID is required').not().isEmpty()
  ],
  paymentController.checkPaymentStatus
);

// @route   POST /api/payments/webhook
// @desc    Handle MoMo webhook
// @access  Public
router.post(
  '/webhook',
  [
    check('referenceId', 'Reference ID is required').not().isEmpty(),
    check('status', 'Status is required').not().isEmpty()
  ],
  paymentController.handleWebhook
);

// @route   GET /api/payments/:id
// @desc    Get payment by ID
// @access  Private
router.get(
  '/:id',
  [auth, check('id', 'Payment ID is required').isInt()],
  paymentController.getPaymentById
);

// @route   GET /api/payments
// @desc    Get all payments (Admin only)
// @access  Private/Admin
router.get(
  '/',
  [auth, admin],
  paymentController.getAllPayments
);

module.exports = router;
