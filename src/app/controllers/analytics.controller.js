import OrderModel from "../../infrastructure/models/Order.model.js";
import ProjectModel from "../../infrastructure/models/Project.model.js";
import UserModel from "../../infrastructure/models/User.model.js";
import mongoose from "mongoose";

/**
 * @desc    Get Dashboard Overview (Admin)
 * @route   GET /api/analytics/dashboard
 * @access  Private (Admin)
 */
export const getDashboardAnalytics = async (req, res) => {
    try {
        // Parallel Execution for Performance
        const [
            totalUsers,
            totalProjects,
            orderStats
        ] = await Promise.all([
            UserModel.countDocuments(),
            ProjectModel.countDocuments(),
            OrderModel.aggregate([
                { $match: { status: 'paid' } },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: "$totalAmount" },
                        totalSales: { $sum: 1 }
                    }
                }
            ])
        ]);

        const revenue = orderStats.length > 0 ? orderStats[0].totalRevenue : 0;
        const sales = orderStats.length > 0 ? orderStats[0].totalSales : 0;

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                totalProjects,
                totalRevenue: revenue,
                totalSales: sales
            }
        });
    } catch (err) {
        console.error("DASHBOARD ANALYTICS ERROR:", err);
        res.status(500).json({ success: false, message: "Server error fetching dashboard analytics" });
    }
};

/**
 * @desc    Get Project Analytics
 * @route   GET /api/analytics/projects
 * @access  Private (Admin)
 */
export const getProjectAnalytics = async (req, res) => {
    try {
        const [
            projectsByCategory,
            projectsByStatus,
            topSellingProjects
        ] = await Promise.all([
            // 1. Projects by Category
            ProjectModel.aggregate([
                { $group: { _id: "$category", count: { $sum: 1 } } },
                { $project: { category: "$_id", count: 1, _id: 0 } }
            ]),
            // 2. Projects by Status
            ProjectModel.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } },
                { $project: { status: "$_id", count: 1, _id: 0 } }
            ]),
            // 3. Top Selling Projects (Based on Orders)
            OrderModel.aggregate([
                { $match: { status: 'paid' } },
                { $group: { _id: "$project", salesCount: { $sum: 1 }, totalRevenue: { $sum: "$totalAmount" } } },
                { $sort: { salesCount: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: "projects",
                        localField: "_id",
                        foreignField: "_id",
                        as: "projectDetails"
                    }
                },
                { $unwind: "$projectDetails" },
                {
                    $project: {
                        title: "$projectDetails.title",
                        salesCount: 1,
                        totalRevenue: 1
                    }
                }
            ])
        ]);

        res.status(200).json({
            success: true,
            data: {
                byCategory: projectsByCategory,
                byStatus: projectsByStatus,
                topSelling: topSellingProjects
            }
        });
    } catch (err) {
        console.error("PROJECT ANALYTICS ERROR:", err);
        res.status(500).json({ success: false, message: "Server error fetching project analytics" });
    }
};

/**
 * @desc    Get User Analytics
 * @route   GET /api/analytics/users
 * @access  Private (Admin)
 */
export const getUserAnalytics = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [
            usersByRole,
            newUsers
        ] = await Promise.all([
            // 1. Users by Role
            UserModel.aggregate([
                { $group: { _id: "$role", count: { $sum: 1 } } },
                { $project: { role: "$_id", count: 1, _id: 0 } }
            ]),
            // 2. New Users (Last 30 Days)
            UserModel.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
        ]);

        res.status(200).json({
            success: true,
            data: {
                byRole: usersByRole,
                newUsersLast30Days: newUsers
            }
        });
    } catch (err) {
        console.error("USER ANALYTICS ERROR:", err);
        res.status(500).json({ success: false, message: "Server error fetching user analytics" });
    }
};

/**
 * @desc    Get Sales Analytics
 * @route   GET /api/analytics/sales
 * @access  Private (Admin)
 */
export const getSalesAnalytics = async (req, res) => {
    try {
        // Last 30 Days Daily Revenue
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [
            dailyRevenue,
            recentTransactions
        ] = await Promise.all([
            OrderModel.aggregate([
                {
                    $match: {
                        status: 'paid',
                        createdAt: { $gte: thirtyDaysAgo }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        dailyTotal: { $sum: "$totalAmount" },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            OrderModel.find({ status: 'paid' })
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('user', 'name email')
                .populate('project', 'title')
                .select('active totalAmount createdAt transactionId')
        ]);

        res.status(200).json({
            success: true,
            data: {
                revenueTrend: dailyRevenue,
                formattedTrend: dailyRevenue.map(item => ({ date: item._id, amount: item.dailyTotal })),
                recentTransactions
            }
        });
    } catch (err) {
        console.error("SALES ANALYTICS ERROR:", err);
        res.status(500).json({ success: false, message: "Server error fetching sales analytics" });
    }
};
