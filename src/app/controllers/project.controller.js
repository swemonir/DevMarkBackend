// controllers/project.controller.js
import ProjectModel from "../../infrastructure/models/Project.model.js";
import mongoose from "mongoose";

/* =================== PUBLIC/USER ROUTES =================== */

/**
 * @desc    Get all projects (filtered by user role and status)
 * @route   GET /api/projects
 * @access  Public (approved only), Private (own + approved), Admin (all)
 */
export const getAllProjects = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, status, search, minPrice, maxPrice } = req.query;

        // --- 1. Smart Status Filter ---
        const validStatuses = ["draft", "pending", "submitted", "approved", "rejected", "canceled"];
        let finalStatus = status;
        let finalCategory = category;

        if (category && validStatuses.includes(category.toLowerCase())) {
            finalStatus = category;
            finalCategory = undefined;
        }

        // --- 2. Build Query Conditions ---
        const conditions = [];

        // A. Access Control (Public: Approved, User: Approved+Own, Admin: All)
        if (!req.user) {
            conditions.push({ $or: [{ status: 'approved' }, { 'metadata.status': 'approved' }] });
        } else if (req.user.role !== 'admin') {
            conditions.push({
                $or: [
                    { status: 'approved' },
                    { 'metadata.status': 'approved' },
                    { owner: req.user._id },
                    { owner: req.user.id }
                ]
            });
        }

        // B. Apply User Filters
        if (finalStatus && finalStatus !== 'all') {
            const s = finalStatus.toLowerCase();
            conditions.push({ $or: [{ status: s }, { 'metadata.status': s }] });
        }

        if (finalCategory) {
            const cat = finalCategory.toLowerCase().replace(/\s+/g, '-');
            conditions.push({ $or: [{ category: cat }, { 'basicInfo.category': cat }] });
        }

        if (minPrice || maxPrice) {
            const p = {};
            if (minPrice) p.$gte = parseFloat(minPrice);
            if (maxPrice) p.$lte = parseFloat(maxPrice);
            conditions.push({ $or: [{ price: p }, { 'marketplace.price': p }] });
        }

        if (search) {
            const regex = { $regex: search, $options: 'i' };
            conditions.push({
                $or: [
                    { title: regex }, { 'basicInfo.title': regex },
                    { description: regex }, { 'basicInfo.description': regex },
                    { tags: regex }, { 'basicInfo.tags': regex }
                ]
            });
        }

        // --- 3. Execute Query ---
        const query = conditions.length > 0 ? { $and: conditions } : {};

        // Debug Logging
        console.log('\n🔍 ============ GET ALL PROJECTS (FINAL) ============');
        console.log('👤 User:', req.user ? `${req.user.email} (${req.user.role})` : '❌ Public');
        console.log('� MongoDB Query:', JSON.stringify(query, null, 2));

        const pageNum = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNum - 1) * pageSize;

        const [total, projects] = await Promise.all([
            ProjectModel.countDocuments(query),
            ProjectModel.find(query)
                .populate('owner', 'name email')
                .populate('reviewedBy', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize)
                .lean()
        ]);

        console.log(`✅ Found: ${total} projects`);
        console.log('====================================================\n');

        res.status(200).json({
            success: true,
            count: projects.length,
            total,
            totalPages: Math.ceil(total / pageSize),
            currentPage: pageNum,
            data: projects
        });

    } catch (err) {
        console.error("DEBUG ERROR 👉", err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch projects",
            error: err.message
        });
    }
};

/**
 * @desc    Helper to get projects by a specific status with role-based access
 * @route   GET /api/projects/status/:status
 */
export const getProjectsByStatus = async (req, res) => {
    try {
        const { status } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const conditions = [];

        // 1. Filter by requested status (Any schema)
        conditions.push({ $or: [{ status }, { 'metadata.status': status }] });

        // 2. Access Control
        if (!req.user) {
            // Public can ONLY see 'approved' projects
            if (status !== 'approved') {
                return res.status(403).json({ success: false, message: "Not authorized to view these projects" });
            }
        } else if (req.user.role !== 'admin') {
            // General Users see 'approved' projects OR their own projects of this status
            if (status !== 'approved') {
                conditions.push({
                    $or: [
                        { owner: req.user._id },
                        { owner: req.user.id }
                    ]
                });
            }
        }
        // Admin sees everything of that status (already covered by condition 1)

        const query = { $and: conditions };

        const pageNum = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNum - 1) * pageSize;

        const [total, projects] = await Promise.all([
            ProjectModel.countDocuments(query),
            ProjectModel.find(query)
                .populate('owner', 'name email')
                .populate('reviewedBy', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize)
                .lean()
        ]);

        res.status(200).json({
            success: true,
            status: status,
            count: projects.length,
            total,
            totalPages: Math.ceil(total / pageSize),
            currentPage: pageNum,
            data: projects
        });

    } catch (err) {
        console.error(`ERROR FETCHING ${req.params.status} PROJECTS 👉`, err);
        res.status(500).json({ success: false, message: "Failed to fetch projects", error: err.message });
    }
};

/**
 * @desc    Get single project by ID
 * @route   GET /api/projects/:id
 * @access  Public (if approved), Private (if owner), Admin (all)
 */
export const getProjectById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID"
            });
        }

        const project = await ProjectModel.findById(req.params.id)
            .populate('owner', 'name email')
            .populate('reviewedBy', 'name email')
            .lean();

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        // Authorization check
        const isAdmin = req.user && req.user.role === 'admin';
        const isOwner = req.user && req.user.id === project.owner._id.toString();
        // Check nested status. Note: project.metadata might be missing on old documents in migration scenario, so safe access
        const isApproved = project.metadata?.status === 'approved';

        if (!isApproved && !isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to access this project"
            });
        }

        res.status(200).json({ success: true, data: project });

    } catch (err) {
        console.error("GET PROJECT BY ID ERROR 👉", err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch project",
            error: err.message
        });
    }
};

/**
 * @desc    Create new project
 * @route   POST /api/projects
 * @access  Private
 */

export const createProject = async (req, res) => {
    try {
        let projectData;

        // Handle parsing of 'data' field whether it's a string (from FormData) or object
        try {
            if (typeof req.body.data === 'string') {
                projectData = JSON.parse(req.body.data);
            } else if (typeof req.body.data === 'object') {
                projectData = req.body.data;
            } else {
                // Fallback: try to look for flattened keys or just req.body if not nested under 'data'
                // But based on requirements, we expect 'data' key.
                // If direct body usage is needed as fallback:
                projectData = req.body;
            }
        } catch (parseError) {
            return res.status(400).json({
                success: false,
                message: "Invalid JSON format in 'data' field"
            });
        }

        // Basic validation existence check
        if (!projectData.basicInfo || !projectData.basicInfo.title) {
            return res.status(400).json({
                success: false,
                message: "Project title is required in basicInfo"
            });
        }

        // Handle Media Files
        const media = {
            thumbnail: null,
            screenshots: []
        };

        if (req.files) {
            // Check if files is an array (single field) or object (multiple fields)
            // Middleware uses upload.fields, so req.files should be an object
            if (req.files['thumbnail'] && req.files['thumbnail'][0]) {
                media.thumbnail = `/uploads/projects/${req.files['thumbnail'][0].filename}`;
            }

            if (req.files['screenshots']) {
                media.screenshots = req.files['screenshots'].map(file => `/uploads/projects/${file.filename}`);
            }
        }

        // Construct document payload
        const newProjectPayload = {
            ...projectData,
            media: {
                ...media,
                // If user sent media URLs in JSON (e.g. external links), allow merge but uploaded files take precedence if exists
                ...(projectData.media || {})
            },
            owner: req.user.id,
            // Ensure some restricted fields are reset/defaults
            metadata: {
                ...projectData.metadata,
                status: 'pending', // Default to pending as per requirement example, or 'draft'
                submissionDate: projectData.metadata?.submissionDate || new Date(),
                rejectionReason: null,
                reviewedAt: null
            },
            marketplace: {
                ...projectData.marketplace,
                soldTo: null,
                soldAt: null
            }
        };

        // Extract basic info for top-level access if needed by schema (Schema structure was updated to be nested)

        const project = await ProjectModel.create(newProjectPayload);

        const populatedProject = await ProjectModel.findById(project._id)
            .populate('owner', 'name email')
            .lean();

        res.status(201).json({
            success: true,
            message: "Project created successfully",
            data: populatedProject
        });

    } catch (err) {
        console.error("CREATE PROJECT ERROR 👉", err);

        if (err.name === "ValidationError") {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: messages
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to create project",
            error: err.message
        });
    }
};

/**
 * @desc    Update project
 * @route   PUT /api/projects/:id
 * @access  Private (Owner only, draft/rejected status only)
 */

export const updateProject = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid project ID" });
        }

        let project = await ProjectModel.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        // Authorization: only owner can update
        if (req.user.id !== project.owner.toString()) {
            return res.status(403).json({ success: false, message: "Not authorized to update this project" });
        }

        // Can only edit draft, pending or rejected projects
        const status = project.metadata?.status || 'draft';
        if (!['draft', 'pending', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot edit project in ${status} status. Only draft, pending or rejected projects can be edited.`
            });
        }

        // Parse body data same as create
        let projectData = req.body;
        // Check if we have 'data' (multipart update?) - though PUT usually JSON
        // Assume req.body contains the partial updates structured correctly. 
        // If it comes from same frontend logic as create, it might be { data: ... }
        if (req.body.data) {
            try {
                if (typeof req.body.data === 'string') {
                    projectData = JSON.parse(req.body.data);
                } else {
                    projectData = req.body.data;
                }
            } catch (e) {
                // ignore, process as is
            }
        }

        // Helper to update nested fields if provided
        if (projectData.basicInfo) {
            if (projectData.basicInfo.title) project.basicInfo.title = projectData.basicInfo.title;
            if (projectData.basicInfo.description) project.basicInfo.description = projectData.basicInfo.description;
            if (projectData.basicInfo.category) project.basicInfo.category = projectData.basicInfo.category;
            if (projectData.basicInfo.tags) project.basicInfo.tags = projectData.basicInfo.tags;
        }

        if (projectData.platform) {
            if (projectData.platform.type) project.platform.type = projectData.platform.type;
            if (projectData.platform.urls) project.platform.urls = { ...project.platform.urls, ...projectData.platform.urls };
        }

        if (projectData.marketplace) {
            if (projectData.marketplace.isForSale !== undefined) project.marketplace.isForSale = projectData.marketplace.isForSale;
            if (projectData.marketplace.price !== undefined) project.marketplace.price = projectData.marketplace.price;
            if (projectData.marketplace.contact) project.marketplace.contact = { ...project.marketplace.contact, ...projectData.marketplace.contact };
        }

        // Reset rejection if re-submitting implicitly or explicit status change?
        // Usually update keeps it in same status unless submitted. 
        // Just clear rejection reason if it was rejected
        if (status === 'rejected') {
            project.metadata.rejectionReason = null;
            project.metadata.status = 'pending'; // Auto move to pending on edit? Or keep rejected? User requirement says "create hobe ... status: pending". 
            // Let's keep it 'pending' if it was rejected to signify it needs review again
        }

        await project.save();

        const updatedProject = await ProjectModel.findById(project._id)
            .populate('owner', 'name email')
            .populate('reviewedBy', 'name email')
            .lean();

        res.status(200).json({
            success: true,
            message: "Project updated successfully",
            data: updatedProject
        });

    } catch (err) {
        console.error("UPDATE PROJECT ERROR 👉", err);

        if (err.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: Object.values(err.errors).map(val => val.message)
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to update project",
            error: err.message
        });
    }
};

/**
 * @desc    Delete project
 * @route   DELETE /api/projects/:id
 * @access  Private (Owner can delete own projects, Admin can delete any)
 */
export const deleteProject = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID"
            });
        }

        const project = await ProjectModel.findById(req.params.id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        const isAdmin = req.user.role === 'admin';
        const isOwner = req.user.id === project.owner.toString();

        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to delete this project"
            });
        }

        await ProjectModel.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Project deleted successfully"
        });

    } catch (err) {
        console.error("DELETE PROJECT ERROR 👉", err);
        res.status(500).json({
            success: false,
            message: "Failed to delete project",
            error: err.message
        });
    }
};

/**
 * @desc    Submit project for review  
 * @route   POST /api/projects/:id/submit
 * @access  Private (Owner only)
 */
export const submitProject = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid project ID" });
        }

        const project = await ProjectModel.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        // Authorization: only owner can submit
        if (req.user.id !== project.owner.toString()) {
            return res.status(403).json({ success: false, message: "Not authorized to submit this project" });
        }

        // Can only submit draft, pending or rejected projects
        const currentStatus = project.metadata?.status || 'draft';
        if (!['draft', 'pending', 'rejected'].includes(currentStatus)) {
            return res.status(400).json({
                success: false,
                message: `Cannot submit project in ${currentStatus} status. Only draft, pending or rejected projects can be submitted.`
            });
        }

        project.metadata.status = 'submitted';
        project.metadata.submissionDate = Date.now();
        project.metadata.rejectionReason = null;
        await project.save();

        const updatedProject = await ProjectModel.findById(project._id)
            .populate('owner', 'name email')
            .populate('reviewedBy', 'name email')
            .lean();

        res.status(200).json({
            success: true,
            message: "Project submitted for review successfully",
            data: updatedProject
        });

    } catch (err) {
        console.error("SUBMIT PROJECT ERROR 👉", err);
        res.status(500).json({
            success: false,
            message: "Failed to submit project",
            error: err.message
        });
    }
};

/**
 * @desc    Upload media for project
 * @route   POST /api/projects/:id/media
 * @access  Private (Owner only)
 */
export const uploadProjectMedia = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID"
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please upload at least one media file"
            });
        }

        const project = await ProjectModel.findById(req.params.id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        const isOwner = req.user.id === project.owner.toString();

        if (!isOwner) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to upload media for this project"
            });
        }

        const newMediaPaths = req.files.map(file => `/uploads/projects/${file.filename}`);
        // Ensure media object exists
        if (!project.media) project.media = { thumbnail: null, screenshots: [] };
        project.media.screenshots.push(...newMediaPaths); // Assume bulk upload is screenshots for now

        await project.save();

        res.status(200).json({
            success: true,
            message: "Media uploaded successfully",
            data: {
                media: project.media,
                newFiles: newMediaPaths
            }
        });

    } catch (err) {
        console.error("UPLOAD PROJECT MEDIA ERROR 👉", err);
        res.status(500).json({
            success: false,
            message: "Failed to upload media",
            error: err.message
        });
    }
};

/* =================== ADMIN ROUTES =================== */

/**
 * @desc    Approve project
 * @route   PUT /api/projects/:id/approve
 * @access  Private/Admin
 */
export const approveProject = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid project ID" });
        }

        const project = await ProjectModel.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        if (project.metadata?.status !== 'submitted') {
            return res.status(400).json({
                success: false,
                message: `Cannot approve project in ${project.metadata?.status} status. Only submitted projects can be approved.`
            });
        }

        project.metadata.status = 'approved';
        project.metadata.reviewedAt = Date.now();
        project.reviewedBy = req.user.id;
        project.metadata.rejectionReason = null;
        await project.save();

        const updatedProject = await ProjectModel.findById(project._id)
            .populate('owner', 'name email')
            .populate('reviewedBy', 'name email')
            .lean();

        res.status(200).json({
            success: true,
            message: "Project approved successfully",
            data: updatedProject
        });

    } catch (err) {
        console.error("APPROVE PROJECT ERROR 👉", err);
        res.status(500).json({
            success: false,
            message: "Failed to approve project",
            error: err.message
        });
    }
};

/**
 * @desc    Reject project
 * @route   PUT /api/projects/:id/reject
 * @access  Private/Admin
 */
export const rejectProject = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid project ID" });
        }

        const { reason } = req.body;
        if (!reason || reason.trim() === '') {
            return res.status(400).json({ success: false, message: "Rejection reason is required" });
        }

        const project = await ProjectModel.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        if (project.metadata?.status !== 'submitted') {
            return res.status(400).json({
                success: false,
                message: `Cannot reject project in ${project.metadata?.status} status. Only submitted projects can be rejected.`
            });
        }

        project.metadata.status = 'rejected';
        project.metadata.reviewedAt = Date.now();
        project.reviewedBy = req.user.id;
        project.metadata.rejectionReason = reason;
        await project.save();

        const updatedProject = await ProjectModel.findById(project._id)
            .populate('owner', 'name email')
            .populate('reviewedBy', 'name email')
            .lean();

        res.status(200).json({
            success: true,
            message: "Project rejected successfully",
            data: updatedProject
        });

    } catch (err) {
        console.error("REJECT PROJECT ERROR 👉", err);
        res.status(500).json({
            success: false,
            message: "Failed to reject project",
            error: err.message
        });
    }
};
