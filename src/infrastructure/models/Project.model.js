import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
    {
        basicInfo: {
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
                    "ai-tools",
                    "other"
                ],
            },
            tags: [{
                type: String,
                trim: true
            }]
        },

        platform: {
            type: {
                type: String,
                required: [true, "Platform type is required"],
                enum: ["Web", "Mobile", "Desktop", "Cross-Platform", "Other"],
                default: "Web"
            },
            urls: {
                website: { type: String, trim: true },
                appStore: { type: String, trim: true },
                playStore: { type: String, trim: true },
                demo: { type: String, trim: true },
                github: { type: String, trim: true }
            }
        },

        marketplace: {
            isForSale: {
                type: Boolean,
                default: false,
            },
            price: {
                type: Number,
                default: 0,
                min: [0, "Price cannot be negative"],
            },
            contact: {
                email: { type: String, trim: true },
                whatsapp: { type: String, trim: true }
            },
            soldTo: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                default: null,
            },
            soldAt: {
                type: Date,
                default: null,
            }
        },

        metadata: {
            submissionDate: {
                type: Date,
                default: Date.now
            },
            status: {
                type: String,
                enum: ["draft", "pending", "submitted", "approved", "rejected"],
                default: "pending",
            },
            version: {
                type: String,
                default: "1.0"
            },
            rejectionReason: {
                type: String,
                default: null,
            },
            reviewedAt: {
                type: Date,
                default: null,
            }
        },

        media: {
            thumbnail: {
                type: String, // File path
                default: null
            },
            screenshots: [{
                type: String // File paths
            }]
        },

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Indexes
projectSchema.index({ owner: 1 });
projectSchema.index({ "metadata.status": 1 });
projectSchema.index({ "basicInfo.category": 1 });
projectSchema.index({ createdAt: -1 });

// Compound indexes
projectSchema.index({ "metadata.status": 1, createdAt: -1 });
projectSchema.index({ owner: 1, "metadata.status": 1 });
projectSchema.index({ "marketplace.isForSale": 1, "marketplace.price": 1 });

// Text search index
projectSchema.index({
    "basicInfo.title": "text",
    "basicInfo.description": "text",
    "basicInfo.tags": "text"
});

export default mongoose.model("Project", projectSchema);
