import express from 'express';
import {
    getMyNotifications,
    markAsRead,
    sendNotification
} from '../controllers/notification.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect); // All routes require auth

router.get('/', getMyNotifications);
router.put('/:id/read', markAsRead);
router.post('/send', restrictTo('admin'), sendNotification);

export default router;
