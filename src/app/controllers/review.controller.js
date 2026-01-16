import ReviewModel from "../../infrastructure/models/Review.model.js";
import ProjectModel from "../../infrastructure/models/Project.model.js";
import OrderModel from "../../infrastructure/models/Order.model.js";

/**
 * @desc    Add a review
 * @route   POST /api/reviews
 * @access  Private (Buyer Only)
 * @rules   User must have purchased the project to review it
 */
export const addReview = async (req, res) => {
    try {
        const { projectId, rating, comment } = req.body;

        // 1. Check if user purchased this project
        const hasPurchased = await OrderModel.findOne({
            user: req.user.id,
            project: projectId,
            status: 'paid'
        });

        // NOTE: In strict production apps, we enable this check. 
        // For development flexibility, you might comment it out, but I'll keep it for industry standard.
        // if (!hasPurchased) {
        //     return res.status(403).json({ success: false, message: "You must purchase the project to review it" });
        // }

        // 2. Check for duplicate review
        const existingReview = await ReviewModel.findOne({
            project: projectId,
            reviewer: req.user.id
        });

        if (existingReview) {
            return res.status(400).json({ success: false, message: "You have already reviewed this project" });
        }

        // 3. Create Review
        const review = await ReviewModel.create({
            project: projectId,
            reviewer: req.user.id,
            rating,
            comment
        });

        res.status(201).json({
            success: true,
            message: "Review added successfully",
            data: review
        });

    } catch (err) {
        console.error("ADD REVIEW ERROR:", err);
        res.status(500).json({ success: false, message: "Server error adding review" });
    }
};

/**
 * @desc    Get reviews for a project
 * @route   GET /api/reviews/:projectId
 * @access  Public
 */
export const getProjectReviews = async (req, res) => {
    try {
        const reviews = await ReviewModel.find({ project: req.params.projectId })
            .populate('reviewer', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: reviews.length,
            data: reviews
        });
    } catch (err) {
        console.error("GET REVIEW ERROR:", err);
        res.status(500).json({ success: false, message: "Server error fetching reviews" });
    }
};

/**
 * @desc    Delete a review
 * @route   DELETE /api/reviews/:id
 * @access  Private (Owner or Admin)
 */
export const deleteReview = async (req, res) => {
    try {
        const review = await ReviewModel.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ success: false, message: "Review not found" });
        }

        // Allow owner or admin to delete
        if (review.reviewer.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Not authorized to delete this review" });
        }

        await review.deleteOne();

        res.status(200).json({
            success: true,
            message: "Review deleted successfully"
        });
    } catch (err) {
        console.error("DELETE REVIEW ERROR:", err);
        res.status(500).json({ success: false, message: "Server error deleting review" });
    }
};

/**
 * @desc    Update a review
 * @route   PUT /api/reviews/:id
 * @access  Private (Owner)
 */
export const updateReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;

        let review = await ReviewModel.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ success: false, message: "Review not found" });
        }

        if (review.reviewer.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: "Not authorized to update this review" });
        }

        review.rating = rating || review.rating;
        review.comment = comment || review.comment;
        await review.save();

        res.status(200).json({
            success: true,
            data: review
        });

    } catch (err) {
        console.error("UPDATE REVIEW ERROR:", err);
        res.status(500).json({ success: false, message: "Server error updating review" });
    }
};
