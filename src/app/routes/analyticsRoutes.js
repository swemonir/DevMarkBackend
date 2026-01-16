import express from 'express';
import {
    getDashboardAnalytics,
    getProjectAnalytics,
    getUserAnalytics,
    getSalesAnalytics
} from '../controllers/analytics.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = express.Router();

// All analytics routes are protected and restricted to Admin
router.use(protect);
router.use(restrictTo('admin'));

router.get('/dashboard', getDashboardAnalytics); // Overview
router.get('/projects', getProjectAnalytics);    // Project Stats
router.get('/users', getUserAnalytics);          // User Stats
router.get('/sales', getSalesAnalytics);         // Revenue & Trends

export default router;
