// routes/marketplaceRoutes.js
import express from 'express';
import {
    getAllListings,
    getListingById,
    createListing,
    updateListing,
    deleteListing,
    buyProject,
    searchListings
} from '../controllers/marketplace.controller.js';
import { protect, optionalProtect } from '../middleware/auth.middleware.js';

const router = express.Router();

/* =================== PUBLIC ROUTES =================== */
router.get('/', optionalProtect, getAllListings);
router.get('/search', optionalProtect, searchListings);
router.get('/:id', optionalProtect, getListingById);

/* =================== AUTHENTICATED ROUTES =================== */
router.use(protect);

router.post('/', createListing);
router.put('/:id', updateListing);
router.delete('/:id', deleteListing);
router.post('/:id/buy', buyProject);

export default router;
