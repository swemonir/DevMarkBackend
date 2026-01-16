import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
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
        amount: {
            type: Number,
            required: true,
            min: [0, "Amount cannot be negative"]
        },
        currency: {
            type: String,
            default: "USD"
        },
        status: {
            type: String,
            enum: ["pending", "completed", "failed", "refunded"],
            default: "pending",
            index: true
        },
        transactionId: {
            type: String,
            unique: true,
            sparse: true // Allows null/undefined to be unique
        },
        paymentMethod: {
            type: String,
            default: "card"
        },
        gatewayData: {
            type: Object, // Store gateway response (Stripe/SSLCommerz etc)
            default: {}
        }
    },
    {
        timestamps: true
    }
);

// Indexes for common queries
paymentSchema.index({ createdAt: -1 });

export default mongoose.model("Payment", paymentSchema);
