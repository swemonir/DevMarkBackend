// routes/projectRoutes.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import {
    getAllProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
    submitProject,
    uploadProjectMedia,
    approveProject,
    rejectProject
} from '../controllers/project.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = express.Router();

// Configure multer for project media upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/projects/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        cb(null, `project-${req.params.id}-${basename}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
    fileFilter: (req, file, cb) => {
        // Allow only image files
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
        }
    }
});

/* =================== PUBLIC ROUTES =================== */
// Public can view approved projects
router.get('/', getAllProjects);
router.get('/:id', getProjectById);

/* =================== AUTHENTICATED ROUTES =================== */
// Apply protect middleware to all routes below
router.use(protect);

// User project management routes
router.post('/', createProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

// Submit for review
router.post('/:id/submit', submitProject);

// Media upload (max 5 files at once)
router.post('/:id/media', upload.array('media', 5), uploadProjectMedia);

/* =================== ADMIN ROUTES =================== */
// Admin review routes
router.put('/:id/approve', restrictTo('admin'), approveProject);
router.put('/:id/reject', restrictTo('admin'), rejectProject);

export default router;
