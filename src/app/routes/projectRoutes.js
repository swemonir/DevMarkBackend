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
    rejectProject,
    getProjectsByStatus
} from '../controllers/project.controller.js';
import { protect, restrictTo, optionalProtect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Multer configuration for project media upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/projects/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '-');
        // If we don't have an ID yet (create), just use 'new' or omit
        const prefix = req.params.id ? `project-${req.params.id}` : 'project-new';
        cb(null, `${prefix}-${basename}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
        }
    }
});

/* =================== PUBLIC/OPTIONAL AUTH ROUTES =================== */
// These routes work with or without authentication
router.get('/', optionalProtect, getAllProjects);
router.get('/status/:status', optionalProtect, getProjectsByStatus);
router.get('/:id', optionalProtect, getProjectById);

/* =================== AUTHENTICATED ROUTES =================== */
// All routes below require authentication
router.use(protect);

router.post('/',
    upload.fields([
        { name: 'thumbnail', maxCount: 1 },
        { name: 'screenshots', maxCount: 10 }
    ]),
    createProject
);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.post('/:id/submit', submitProject);
router.post('/:id/media', upload.array('media', 5), uploadProjectMedia);

/* =================== ADMIN ROUTES =================== */
router.put('/:id/approve', restrictTo('admin'), approveProject);
router.put('/:id/reject', restrictTo('admin'), rejectProject);

export default router;
