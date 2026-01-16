import mongoose from "mongoose";

/**
 * @desc    Order Schema for 2Checkout Payment System
 * @rules   1. Never trust frontend amount
 *          2. Status flow: pending -> processing -> paid | failed
 *          3. Transaction ID validates payment
 */
const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true
        },

        // Amount is calculated and stored on backend to prevent tampering
        totalAmount: {
            type: Number,
            required: true,
            min: [0, "Amount cannot be negative"]
        },

        currency: {
            type: String,
            default: "USD",
            uppercase: true
        },

        // Order Status Flow
        status: {
            type: String,
            enum: ["pending", "processing", "paid", "failed", "refunded"],
            default: "pending",
            index: true
        },

        // 2Checkout Transaction Reference
        transactionId: {
            type: String,
            unique: true,
            sparse: true // Allows null initially
        },

        // Snapshot of billing info (Required by 2Checkout)
        billingDetails: {
            name: String,
            email: String,
            city: String,
            address: String,
            zip: String,
            country: String
        },

        // Gateway specific logs (for debugging failures)
        paymentGatewayLogs: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

// Indexes
orderSchema.index({ createdAt: -1 });
orderSchema.index({ transactionId: 1 });

export default mongoose.model("Order", orderSchema);
