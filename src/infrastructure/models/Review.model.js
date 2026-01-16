import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true
        },
        reviewer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        rating: {
            type: Number,
            required: [true, "Rating is required"],
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            required: [true, "Review comment is required"],
            maxlength: 500
        }
    },
    {
        timestamps: true
    }
);

// Prevent duplicate reviews from same user for same project
reviewSchema.index({ project: 1, reviewer: 1 }, { unique: true });

export default mongoose.model("Review", reviewSchema);
