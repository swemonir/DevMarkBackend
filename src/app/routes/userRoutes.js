// routes/user.routes.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getCurrentUser,
    updateCurrentUser,
    uploadAvatar,
    deleteAvatar,
    getUserStats
} from '../controllers/user.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = express.Router();

// Configure multer for avatar upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/avatars/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `avatar-${req.user.id}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Apply protect middleware to all routes
router.use(protect);

/* =================== ADMIN ROUTES =================== */
router.get('/', restrictTo('admin'), getAllUsers);
router.get('/stats', restrictTo('admin'), getUserStats);
router.get('/:id', getUserById); // Admin or self can access
router.put('/:id', updateUser); // Admin or self can update
router.delete('/:id', deleteUser); // Admin or self can delete

/* =================== USER PROFILE ROUTES =================== */
router.get('/profile/me', getCurrentUser);
router.put('/profile/me', updateCurrentUser);
router.post('/profile/avatar', upload.single('avatar'), uploadAvatar);
router.delete('/profile/avatar', deleteAvatar);

export default router;