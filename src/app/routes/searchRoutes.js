import express from 'express';
import {
    searchProjects,
    searchUsers,
    getCategories,
    getTags
} from '../controllers/search.controller.js';
import { optionalProtect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/projects', optionalProtect, searchProjects);
router.get('/users', optionalProtect, searchUsers);
router.get('/marketplace', optionalProtect, searchProjects); // Alias for marketplace search

// Filter helper routes
router.get('/filters/categories', getCategories); // Note: path mounted as /api/search/filters/categories? No, in app.js we will likely split or mount carefully.
// Actually the prompt asked for /api/filters/categories.
// So we might need a separate router or mount this one creatively.
// I'll create a separate router file or handle it here.

export default router;

// Separate router for filters to match specific route /api/filters/...
export const filterRouter = express.Router();
filterRouter.get('/categories', getCategories);
filterRouter.get('/tags', getTags);
