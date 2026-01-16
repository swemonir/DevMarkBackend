import NotificationModel from "../../infrastructure/models/Notification.model.js";

/**
 * @desc    Get all notifications for logged in user
 * @route   GET /api/notifications
 * @access  Private
 */
export const getMyNotifications = async (req, res) => {
    try {
        const notifications = await NotificationModel.find({ recipient: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50) // Limit to last 50 notifications
            .lean();

        const unreadCount = await NotificationModel.countDocuments({
            recipient: req.user.id,
            isRead: false
        });

        res.status(200).json({
            success: true,
            count: notifications.length,
            unreadCount,
            data: notifications
        });
    } catch (err) {
        console.error("GET NOTIFICATIONS ERROR:", err);
        res.status(500).json({ success: false, message: "Server error fetching notifications" });
    }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
export const markAsRead = async (req, res) => {
    try {
        const notification = await NotificationModel.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user.id },
            { isRead: true, readAt: new Date() },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        res.status(200).json({
            success: true,
            data: notification
        });
    } catch (err) {
        console.error("MARK READ ERROR:", err);
        res.status(500).json({ success: false, message: "Server error updating notification" });
    }
};

/**
 * @desc    Send a notification (Admin or Internal Use)
 * @route   POST /api/notifications/send
 * @access  Private (Admin)
 */
export const sendNotification = async (req, res) => {
    try {
        const { recipientId, type, message, relatedId } = req.body;

        if (!recipientId || !message) {
            return res.status(400).json({ success: false, message: "Recipient ID and Message are required" });
        }

        const notification = await NotificationModel.create({
            recipient: recipientId,
            type: type || 'info',
            message,
            relatedId
        });

        res.status(201).json({
            success: true,
            message: "Notification sent successfully",
            data: notification
        });
    } catch (err) {
        console.error("SEND NOTIFICATION ERROR:", err);
        res.status(500).json({ success: false, message: "Server error sending notification" });
    }
};
