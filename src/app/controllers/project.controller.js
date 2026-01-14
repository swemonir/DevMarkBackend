// controllers/project.controller.js
import ProjectModel from "../../infrastructure/models/Project.model.js";
import mongoose from "mongoose";

// Helper function to get safe project object
const getSafeProjectObject = (project) => ({
    id: project._id,
    title: project.title,
    description: project.description,
    category: project.category,
    price: project.price,
    deliveryTime: project.deliveryTime,
    owner: project.owner,
    status: project.status,
    rejectionReason: project.rejectionReason,
    media: project.media,
    submittedAt: project.submittedAt,
    reviewedAt: project.reviewedAt,
    reviewedBy: project.reviewedBy,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    ageInDays: project.ageInDays
});

/* =================== PUBLIC/USER ROUTES =================== */

/**
 * @desc    Get all projects (filtered by user role and status)
 * @route   GET /api/projects
 * @access  Public (approved projects), Private (own projects), Admin (all projects)
 */
export const getAllProjects = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, status, search, minPrice, maxPrice } = req.query;

        // Build query object
        let query = {};

        // Role-based filtering
        if (!req.user) {
            // Public users can only see approved projects
            query.status = 'approved';
        } else if (req.user.role === 'admin') {
            // Admin can see all projects
            if (status) {
                query.status = status;
            }
        } else {
            // Regular users can see approved projects and their own projects
            query.$or = [
                { status: 'approved' },
                { owner: req.user.id }
            ];

            // If status filter is provided by user, apply it only to their own projects
            if (status) {
                query.$or[1].status = status;
            }
        }

        // Apply filters
        if (category) {
            query.category = category;
        }

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        if (search) {
            query.$and = query.$and || [];
            query.$and.push({
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ]
            });
        }

        // Pagination
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNumber - 1) * pageSize;

        // Get total count
        const total = await ProjectModel.countDocuments(query);

        // Get projects with pagination and populate owner
        const projects = await ProjectModel.find(query)
            .populate('owner', 'name email')
            .populate('reviewedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize);

        res.status(200).json({
            success: true,
            count: projects.length,
            total,
            totalPages: Math.ceil(total / pageSize),
            currentPage: pageNumber,
            data: projects.map(getSafeProjectObject)
        });

    } catch (err) {
        console.error("GET ALL PROJECTS ERROR 👉", err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch projects",
            error: err.message
        });
    }
};

/**
 * @desc    Get single project by ID
 * @route   GET /api/projects/:id
 * @access  Public (if approved), Private (if owner), Admin (all)
 */
export const getProjectById = async (req, res) => {
    try {
        // Validate MongoDB ID
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID"
            });
        }

        const project = await ProjectModel.findById(req.params.id)
            .populate('owner', 'name email')
            .populate('reviewedBy', 'name email');

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        // Authorization check
        const isAdmin = req.user && req.user.role === 'admin';
        const isOwner = req.user && req.user.id === project.owner._id.toString();
        const isApproved = project.status === 'approved';

        if (!isApproved && !isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to access this project"
            });
        }

        res.status(200).json({
            success: true,
            data: getSafeProjectObject(project)
        });

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
        const { title, description, category, price, deliveryTime } = req.body;

        // Create project with draft status
        const project = await ProjectModel.create({
            title,
            description,
            category,
            price,
            deliveryTime,
            owner: req.user.id,
            status: 'draft'
        });

        const populatedProject = await ProjectModel.findById(project._id)
            .populate('owner', 'name email');

        res.status(201).json({
            success: true,
            message: "Project created successfully",
            data: getSafeProjectObject(populatedProject)
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
 * @access  Private (Owner only, and only for draft/rejected projects)
 */
export const updateProject = async (req, res) => {
    try {
        // Validate MongoDB ID
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

        // Authorization check - only owner can update
        const isOwner = req.user.id === project.owner.toString();

        if (!isOwner) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to update this project"
            });
        }

        // Can only edit draft or rejected projects
        if (!['draft', 'rejected'].includes(project.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot edit project in ${project.status} status. Only draft or rejected projects can be edited.`
            });
        }

        const { title, description, category, price, deliveryTime } = req.body;

        // Update fields
        if (title) project.title = title;
        if (description) project.description = description;
        if (category) project.category = category;
        if (price !== undefined) project.price = price;
        if (deliveryTime !== undefined) project.deliveryTime = deliveryTime;

        // If updating a rejected project, clear rejection reason
        if (project.status === 'rejected') {
            project.rejectionReason = null;
        }

        await project.save();

        const updatedProject = await ProjectModel.findById(project._id)
            .populate('owner', 'name email')
            .populate('reviewedBy', 'name email');

        res.status(200).json({
            success: true,
            message: "Project updated successfully",
            data: getSafeProjectObject(updatedProject)
        });

    } catch (err) {
        console.error("UPDATE PROJECT ERROR 👉", err);

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
        // Validate MongoDB ID
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

        // Authorization check
        const isAdmin = req.user.role === 'admin';
        const isOwner = req.user.id === project.owner.toString();

        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to delete this project"
            });
        }

        // TODO: Delete associated media files from storage
        // if (project.media && project.media.length > 0) {
        //   // Delete files logic here
        // }

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
        // Validate MongoDB ID
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

        // Authorization check - only owner can submit
        const isOwner = req.user.id === project.owner.toString();

        if (!isOwner) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to submit this project"
            });
        }

        // Can only submit draft or rejected projects
        if (!['draft', 'rejected'].includes(project.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot submit project in ${project.status} status. Only draft or rejected projects can be submitted.`
            });
        }

        // Update status to submitted
        project.status = 'submitted';
        project.submittedAt = Date.now();
        project.rejectionReason = null; // Clear rejection reason if resubmitting

        await project.save();

        const updatedProject = await ProjectModel.findById(project._id)
            .populate('owner', 'name email')
            .populate('reviewedBy', 'name email');

        res.status(200).json({
            success: true,
            message: "Project submitted for review successfully",
            data: getSafeProjectObject(updatedProject)
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
        // Validate MongoDB ID
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID"
            });
        }

        // Check if files are uploaded
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

        // Authorization check - only owner can upload media
        const isOwner = req.user.id === project.owner.toString();

        if (!isOwner) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to upload media for this project"
            });
        }

        // Add new media paths to project
        const newMediaPaths = req.files.map(file => `/uploads/projects/${file.filename}`);
        project.media.push(...newMediaPaths);

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
        // Validate MongoDB ID
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

        // Can only approve submitted projects
        if (project.status !== 'submitted') {
            return res.status(400).json({
                success: false,
                message: `Cannot approve project in ${project.status} status. Only submitted projects can be approved.`
            });
        }

        // Update status to approved
        project.status = 'approved';
        project.reviewedAt = Date.now();
        project.reviewedBy = req.user.id;
        project.rejectionReason = null;

        await project.save();

        const updatedProject = await ProjectModel.findById(project._id)
            .populate('owner', 'name email')
            .populate('reviewedBy', 'name email');

        res.status(200).json({
            success: true,
            message: "Project approved successfully",
            data: getSafeProjectObject(updatedProject)
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
        // Validate MongoDB ID
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID"
            });
        }

        const { reason } = req.body;

        if (!reason || reason.trim() === '') {
            return res.status(400).json({
                success: false,
                message: "Rejection reason is required"
            });
        }

        const project = await ProjectModel.findById(req.params.id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        // Can only reject submitted projects
        if (project.status !== 'submitted') {
            return res.status(400).json({
                success: false,
                message: `Cannot reject project in ${project.status} status. Only submitted projects can be rejected.`
            });
        }

        // Update status to rejected
        project.status = 'rejected';
        project.reviewedAt = Date.now();
        project.reviewedBy = req.user.id;
        project.rejectionReason = reason;

        await project.save();

        const updatedProject = await ProjectModel.findById(project._id)
            .populate('owner', 'name email')
            .populate('reviewedBy', 'name email');

        res.status(200).json({
            success: true,
            message: "Project rejected successfully",
            data: getSafeProjectObject(updatedProject)
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
