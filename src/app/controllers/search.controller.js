import ProjectModel from "../../infrastructure/models/Project.model.js";
import UserModel from "../../infrastructure/models/User.model.js";

/**
 * @desc    Search Projects with Filters
 * @route   GET /api/search/projects
 * @params  keyword, category, minPrice, maxPrice, sort, page
 */
export const searchProjects = async (req, res) => {
    try {
        const { keyword, category, minPrice, maxPrice, sort, page = 1, limit = 10 } = req.query;

        // Build Query
        const query = { status: 'approved', isForSale: true }; // Only show available marketplace items

        if (keyword) {
            query.$or = [
                { title: { $regex: keyword, $options: 'i' } },
                { description: { $regex: keyword, $options: 'i' } }
            ];
        }

        if (category) {
            query.category = category;
        }

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        // Sorting
        let sortOption = { createdAt: -1 }; // Default: Newest
        if (sort === 'oldest') sortOption = { createdAt: 1 };
        if (sort === 'price_low') sortOption = { price: 1 };
        if (sort === 'price_high') sortOption = { price: -1 };

        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const [total, projects] = await Promise.all([
            ProjectModel.countDocuments(query),
            ProjectModel.find(query)
                .sort(sortOption)
                .skip(skip)
                .limit(limitNum)
                .populate('owner', 'name email')
                .lean()
        ]);

        res.status(200).json({
            success: true,
            count: projects.length,
            total,
            totalPages: Math.ceil(total / limitNum),
            currentPage: pageNum,
            data: projects
        });

    } catch (err) {
        console.error("SEARCH PROJECTS ERROR:", err);
        res.status(500).json({ success: false, message: "Server error searching projects" });
    }
};

/**
 * @desc    Search Users (For social features)
 * @route   GET /api/search/users
 */
export const searchUsers = async (req, res) => {
    try {
        const { keyword } = req.query;

        const query = {};
        if (keyword) {
            query.$or = [
                { name: { $regex: keyword, $options: 'i' } },
                { email: { $regex: keyword, $options: 'i' } }
            ];
        }

        const users = await UserModel.find(query)
            .select('name email role')
            .limit(20);

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (err) {
        console.error("SEARCH USERS ERROR:", err);
        res.status(500).json({ success: false, message: "Server error searching users" });
    }
};

/**
 * @desc    Get Filter Options (Categories, Tags)
 * @route   GET /api/filters/categories
 */
export const getCategories = async (req, res) => {
    const categories = [
        "web-development",
        "mobile-development",
        "design",
        "marketing",
        "writing",
        "data-science",
        "other"
    ];
    res.status(200).json({ success: true, data: categories });
};

export const getTags = async (req, res) => {
    // In a real app, tags would be aggregated from Projects
    // For now, returning static or aggregated simple tags
    const tags = ["react", "node", "python", "design", "api"];
    res.status(200).json({ success: true, data: tags });
};
