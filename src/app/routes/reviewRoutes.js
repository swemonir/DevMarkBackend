import express from 'express';
import {
    addReview,
    getProjectReviews,
    deleteReview,
    updateReview
} from '../controllers/review.controller.js';
import { protect, optionalProtect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', protect, addReview);
router.get('/:projectId', optionalProtect, getProjectReviews); // Public can view
router.put('/:id', protect, updateReview);
router.delete('/:id', protect, deleteReview);

export default router;
