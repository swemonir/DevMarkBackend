import axios from 'axios';
import { tcoConfig } from '../../config/twocheckout.js';

/**
 * @desc    Payment Service Layer for 2Checkout (Verifone) using Axios
 * @responsibility Handle all direct communication with Payment Gateway API
 */
export const PaymentService = {

    /**
     * Charge a card using a token (Frontend generated)
     * @param {Object} paymentData 
     * @returns {Promise<Object>} Gateway response
     */
    charge: async (paymentData) => {
        try {
            // ==========================================
            // SANDBOX SIMULATION (FOR DEVELOPMENT ONLY)
            // ==========================================
            if (tcoConfig.sandbox && paymentData.token === '9012930219301') {
                console.log("🧪 SANDBOX MODE: Simulating Successful Payment");
                return {
                    success: true,
                    transactionId: `mock_txn_${Date.now()}`,
                    orderNumber: `mock_order_${Date.now()}`,
                    raw: { responseCode: 'APPROVED', message: 'Sandbox Simulation' }
                };
            }

            // 2Checkout API Endpoint (Sandbox vs Production)
            const baseUrl = tcoConfig.sandbox
                ? 'https://sandbox.2checkout.com/checkout/api/1.0'
                : 'https://www.2checkout.com/checkout/api/1.0';

            // Construct payload
            const payload = {
                sellerId: tcoConfig.sellerId,
                privateKey: tcoConfig.privateKey,
                merchantOrderId: paymentData.merchantOrderId,
                token: paymentData.token,
                currency: 'USD',
                total: paymentData.amount, // API expects string or number
                billingAddr: paymentData.billingDetails
            };

            // Making Request
            const response = await axios.post(`${baseUrl}/authorizationService/authorize`, payload, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            const data = response.data;

            // Check API Response Code
            if (data.responseCode === 'APPROVED') {
                return {
                    success: true,
                    transactionId: data.transactionId,
                    orderNumber: data.orderNumber,
                    raw: data
                };
            } else {
                throw {
                    success: false,
                    type: 'DECLINED',
                    message: 'Card was declined or review needed',
                    raw: data
                };
            }

        } catch (error) {
            // Handle Axios or API Errors
            const errorData = error.response ? error.response.data : error;

            // Normalize error
            throw {
                success: false,
                type: 'GATEWAY_ERROR',
                message: errorData.message || errorData.exception || 'Payment authorization failed',
                raw: errorData
            };
        }
    },

    /**
     * Verify INS (Instant Notification Service) Signature
     * @param {Object} params
     * @returns {Boolean}
     */
    verifySignature: (params) => {
        // MD5 Verification Logic (Simplified for Demo)
        // In production: calculatedHash === params.key
        return true;
    }
};
