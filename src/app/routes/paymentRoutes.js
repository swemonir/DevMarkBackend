import express from 'express';
import {
    createOrder,
    processPayment,
    handleWebhook
} from '../controllers/payment.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Order & Payment Routes (Protected)
router.post('/orders', protect, createOrder);       // Step 1: Create Order
router.post('/pay', protect, processPayment);       // Step 2: Pay with Token

// Webhook (Public, but secured by signature verification logic)
// 2Checkout sends POST requests here
router.post('/ins', handleWebhook);

export default router;

// Transaction Router for History (Optional separate export if needed by app.js)
// For now, we keep it simple.
export const transactionRouter = express.Router();
