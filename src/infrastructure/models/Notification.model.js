import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        type: {
            type: String,
            enum: ["info", "success", "warning", "error", "order_status", "project_update"],
            default: "info"
        },
        message: {
            type: String,
            required: true
        },
        relatedId: {
            type: mongoose.Schema.Types.ObjectId,
            // Dynamic reference depending on type (Project or Order)
            // We keep it generic
        },
        isRead: {
            type: Boolean,
            default: false
        },
        readAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

// Index for faster queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

export default mongoose.model("Notification", notificationSchema);
