import dotenv from 'dotenv';
dotenv.config();

/**
 * @desc    2Checkout Configuration
 * @rules   Load keys from environment variables securely
 */

// Validate if keys exist
if (!process.env.TWOCHECKOUT_SELLER_ID || !process.env.TWOCHECKOUT_PRIVATE_KEY) {
    console.warn("⚠️ WARNING: 2Checkout credentials (SELLER_ID or PRIVATE_KEY) are missing in .env");
}

export const tcoConfig = {
    sellerId: process.env.TWOCHECKOUT_SELLER_ID,
    privateKey: process.env.TWOCHECKOUT_PRIVATE_KEY,
    publishableKey: process.env.TWOCHECKOUT_PUBLISHABLE_KEY, // Used by frontend
    secretWord: process.env.TWOCHECKOUT_SECRET_WORD, // For INS (Webhook) verification
    sandbox: process.env.NODE_ENV !== 'production'
};
