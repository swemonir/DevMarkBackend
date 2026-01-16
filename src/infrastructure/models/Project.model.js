import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
            minlength: [3, "Title must be at least 3 characters"],
            maxlength: [200, "Title cannot exceed 200 characters"],
        },

        description: {
            type: String,
            required: [true, "Description is required"],
            trim: true,
            minlength: [10, "Description must be at least 10 characters"],
            maxlength: [5000, "Description cannot exceed 5000 characters"],
        },

        category: {
            type: String,
            required: [true, "Category is required"],
            enum: [
                "web-development",
                "mobile-development",
                "design",
                "marketing",
                "writing",
                "data-science",
                "other"
            ],
        },

        price: {
            type: Number,
            required: [true, "Price is required"],
            min: [0, "Price cannot be negative"],
        },

        deliveryTime: {
            type: Number,
            required: [true, "Delivery time is required"],
            min: [1, "Delivery time must be at least 1 day"],
            max: [365, "Delivery time cannot exceed 365 days"],
        },

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        status: {
            type: String,
            enum: ["draft", "submitted", "approved", "rejected"],
            default: "draft",
        },

        rejectionReason: {
            type: String,
            default: null,
        },

        media: [
            {
                type: String, // Store file paths
            }
        ],

        submittedAt: {
            type: Date,
            default: null,
        },

        reviewedAt: {
            type: Date,
            default: null,
        },

        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        // Marketplace fields
        isForSale: {
            type: Boolean,
            default: false,
        },

        soldTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        soldAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Indexes for better query performance
projectSchema.index({ owner: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ category: 1 });
projectSchema.index({ createdAt: -1 });

// Compound index for common queries
projectSchema.index({ status: 1, createdAt: -1 });
projectSchema.index({ owner: 1, status: 1 });

// Marketplace index for listing queries  
projectSchema.index({ status: 1, isForSale: 1, soldTo: 1 });

// Virtual for project age in days
projectSchema.virtual('ageInDays').get(function () {
    if (!this.createdAt) return 0;
    const diffTime = Math.abs(new Date() - this.createdAt);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

export default mongoose.model("Project", projectSchema);
