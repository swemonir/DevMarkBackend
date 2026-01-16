// controllers/marketplace.controller.js
import ProjectModel from "../../infrastructure/models/Project.model.js";
import mongoose from "mongoose";

/**
 * @desc    Get all marketplace listings
 * @route   GET /api/marketplace
 * @access  Public
 */
export const getAllListings = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, minPrice, maxPrice, search } = req.query;

        // Marketplace query: approved + for sale + not sold
        const query = {
            status: 'approved',
            isForSale: true,
            soldTo: null
        };

        // Apply filters
        if (category) query.category = category;

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        if (search) {
            query.$and = [
                {
                    $or: [
                        { title: { $regex: search, $options: 'i' } },
                        { description: { $regex: search, $options: 'i' } }
                    ]
                }
            ];
        }

        // Pagination
        const pageNum = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNum - 1) * pageSize;

        // Execute queries
        const [total, listings] = await Promise.all([
            ProjectModel.countDocuments(query),
            ProjectModel.find(query)
                .populate('owner', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize)
                .lean()
        ]);

        res.status(200).json({
            success: true,
            count: listings.length,
            total,
            totalPages: Math.ceil(total / pageSize),
            currentPage: pageNum,
            data: listings
        });

    } catch (err) {
        console.error("GET MARKETPLACE LISTINGS ERROR 👉", err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch marketplace listings",
            error: err.message
        });
    }
};

/**
 * @desc    Get single marketplace listing
 * @route   GET /api/marketplace/:id
 * @access  Public
 */
export const getListingById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid listing ID" });
        }

        const listing = await ProjectModel.findOne({
            _id: req.params.id,
            status: 'approved',
            isForSale: true,
            soldTo: null
        })
            .populate('owner', 'name email')
            .lean();

        if (!listing) {
            return res.status(404).json({
                success: false,
                message: "Listing not found or not available"
            });
        }

        res.status(200).json({ success: true, data: listing });

    } catch (err) {
        console.error("GET LISTING ERROR 👉", err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch listing",
            error: err.message
        });
    }
};

/**
 * @desc    Create marketplace listing (list approved project for sale)
 * @route   POST /api/marketplace
 * @access  Private
 */
export const createListing = async (req, res) => {
    try {
        const { projectId } = req.body;

        if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ success: false, message: "Valid project ID is required" });
        }

        const project = await ProjectModel.findById(projectId);

        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        // Authorization: only owner can list
        if (project.owner.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "You can only list your own projects"
            });
        }

        // Can only list approved projects
        if (project.status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: "Only approved projects can be listed in marketplace"
            });
        }

        // Check if already for sale
        if (project.isForSale) {
            return res.status(400).json({
                success: false,
                message: "Project is already listed in marketplace"
            });
        }

        // Check if already sold
        if (project.soldTo) {
            return res.status(400).json({
                success: false,
                message: "Project has already been sold"
            });
        }

        // List project for sale
        project.isForSale = true;
        await project.save();

        const listing = await ProjectModel.findById(project._id)
            .populate('owner', 'name email')
            .lean();

        res.status(201).json({
            success: true,
            message: "Project listed in marketplace successfully",
            data: listing
        });

    } catch (err) {
        console.error("CREATE LISTING ERROR 👉", err);
        res.status(500).json({
            success: false,
            message: "Failed to create listing",
            error: err.message
        });
    }
};

/**
 * @desc    Update marketplace listing
 * @route   PUT /api/marketplace/:id
 * @access  Private (Owner only)
 */
export const updateListing = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid listing ID" });
        }

        const project = await ProjectModel.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ success: false, message: "Listing not found" });
        }

        // Authorization: only owner can update
        if (project.owner.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        // Can only update if listed and not sold
        if (!project.isForSale) {
            return res.status(400).json({
                success: false,
                message: "Project is not listed in marketplace"
            });
        }

        if (project.soldTo) {
            return res.status(400).json({
                success: false,
                message: "Cannot update sold project"
            });
        }

        // Update allowed fields only
        const { title, description, price, deliveryTime } = req.body;
        if (title) project.title = title;
        if (description) project.description = description;
        if (price !== undefined) project.price = price;
        if (deliveryTime !== undefined) project.deliveryTime = deliveryTime;

        await project.save();

        const updatedListing = await ProjectModel.findById(project._id)
            .populate('owner', 'name email')
            .lean();

        res.status(200).json({
            success: true,
            message: "Listing updated successfully",
            data: updatedListing
        });

    } catch (err) {
        console.error("UPDATE LISTING ERROR 👉", err);
        res.status(500).json({
            success: false,
            message: "Failed to update listing",
            error: err.message
        });
    }
};

/**
 * @desc    Delete marketplace listing (unlist project)
 * @route   DELETE /api/marketplace/:id
 * @access  Private (Owner or Admin)
 */
export const deleteListing = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid listing ID" });
        }

        const project = await ProjectModel.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ success: false, message: "Listing not found" });
        }

        // Authorization
        const isOwner = project.owner.toString() === req.user.id;
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        // Just unlist (don't delete project)
        project.isForSale = false;
        await project.save();

        res.status(200).json({
            success: true,
            message: "Listing removed from marketplace"
        });

    } catch (err) {
        console.error("DELETE LISTING ERROR 👉", err);
        res.status(500).json({
            success: false,
            message: "Failed to delete listing",
            error: err.message
        });
    }
};

/**
 * @desc    Buy project from marketplace
 * @route   POST /api/marketplace/:id/buy
 * @access  Private
 */
export const buyProject = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid listing ID" });
        }

        const project = await ProjectModel.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ success: false, message: "Listing not found" });
        }

        // Cannot buy own project
        if (project.owner.toString() === req.user.id) {
            return res.status(400).json({
                success: false,
                message: "You cannot buy your own project"
            });
        }

        // Check if available
        if (!project.isForSale) {
            return res.status(400).json({
                success: false,
                message: "This project is not for sale"
            });
        }

        if (project.soldTo) {
            return res.status(400).json({
                success: false,
                message: "This project has already been sold"
            });
        }

        // Mark as sold
        project.soldTo = req.user.id;
        project.soldAt = Date.now();
        project.isForSale = false;
        await project.save();

        const purchasedProject = await ProjectModel.findById(project._id)
            .populate('owner', 'name email')
            .populate('soldTo', 'name email')
            .lean();

        res.status(200).json({
            success: true,
            message: "Project purchased successfully",
            data: purchasedProject
        });

        // TODO: Payment integration দরকার হলে পরে add করা যাবে

    } catch (err) {
        console.error("BUY PROJECT ERROR 👉", err);
        res.status(500).json({
            success: false,
            message: "Failed to purchase project",
            error: err.message
        });
    }
};

/**
 * @desc    Search marketplace listings
 * @route   GET /api/marketplace/search
 * @access  Public
 */
export const searchListings = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            category,
            minPrice,
            maxPrice,
            search,
            sortBy = 'createdAt',
            order = 'desc'
        } = req.query;

        // Base marketplace query
        const query = {
            status: 'approved',
            isForSale: true,
            soldTo: null
        };

        // Apply filters
        if (category) query.category = category;

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Pagination
        const pageNum = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNum - 1) * pageSize;

        // Sort options
        const sortOptions = {};
        const validSortFields = ['createdAt', 'price', 'title'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        sortOptions[sortField] = order === 'asc' ? 1 : -1;

        // Execute queries
        const [total, listings] = await Promise.all([
            ProjectModel.countDocuments(query),
            ProjectModel.find(query)
                .populate('owner', 'name email')
                .sort(sortOptions)
                .skip(skip)
                .limit(pageSize)
                .lean()
        ]);

        res.status(200).json({
            success: true,
            count: listings.length,
            total,
            totalPages: Math.ceil(total / pageSize),
            currentPage: pageNum,
            filters: { category, minPrice, maxPrice, search, sortBy, order },
            data: listings
        });

    } catch (err) {
        console.error("SEARCH LISTINGS ERROR 👉", err);
        res.status(500).json({
            success: false,
            message: "Failed to search listings",
            error: err.message
        });
    }
};
