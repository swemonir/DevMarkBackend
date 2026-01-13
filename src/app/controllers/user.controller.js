// controllers/user.controller.js
import UserModel from "../../infrastructure/models/User.model.js";
import { generateAccessToken } from "../utils/token.js";
import mongoose from "mongoose";

// Helper function to get safe user object (without sensitive info)
const getSafeUserObject = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  isBlocked: user.isBlocked,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  lastLogin: user.lastLogin
});

/* =================== ADMIN ROUTES =================== */

/**
 * @desc    Get all users (Admin only)
 * @route   GET /api/users
 * @access  Private/Admin
 */
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search, isBlocked } = req.query;

    // Build query object
    let query = {};

    if (role) {
      query.role = role;
    }

    if (isBlocked !== undefined) {
      query.isBlocked = isBlocked === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;

    // Get total count
    const total = await UserModel.countDocuments(query);

    // Get users with pagination
    const users = await UserModel.find(query)
      .select('-password -emailVerificationToken -emailVerificationExpire -resetPasswordToken -resetPasswordExpire')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / pageSize),
      currentPage: pageNumber,
      data: users.map(getSafeUserObject)
    });

  } catch (err) {
    console.error("GET ALL USERS ERROR 👉", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: err.message
    });
  }
};

/**
 * @desc    Get single user by ID
 * @route   GET /api/users/:id
 * @access  Private/Admin or Self
 */
export const getUserById = async (req, res) => {
  try {
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const user = await UserModel.findById(req.params.id)
      .select('-password -emailVerificationToken -emailVerificationExpire -resetPasswordToken -resetPasswordExpire');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check if requester is admin or the user themselves
    const isAdmin = req.user.role === 'admin';
    const isSelf = req.user.id === req.params.id;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this user's information"
      });
    }

    res.status(200).json({
      success: true,
      data: getSafeUserObject(user)
    });

  } catch (err) {
    console.error("GET USER BY ID ERROR 👉", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: err.message
    });
  }
};

/**
 * @desc    Update user by ID (Admin can update any, users can update themselves)
 * @route   PUT /api/users/:id
 * @access  Private
 */
export const updateUser = async (req, res) => {
  try {
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const user = await UserModel.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Authorization check
    const isAdmin = req.user.role === 'admin';
    const isSelf = req.user.id === req.params.id;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this user"
      });
    }

    const { name, email, role, isBlocked, isEmailVerified } = req.body;

    // Non-admin users can only update their own name
    if (!isAdmin) {
      // Regular users cannot change role, block status, or email verification
      if (role || isBlocked !== undefined || isEmailVerified !== undefined) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update these fields"
        });
      }

      // Regular users cannot change email (use separate email change flow)
      if (email && email !== user.email) {
        return res.status(403).json({
          success: false,
          message: "Please use email change request"
        });
      }

      // Update only name
      if (name) {
        user.name = name;
      }
    } else {
      // Admin can update all fields
      if (name) user.name = name;
      if (email && email !== user.email) {
        // Check if new email already exists
        const emailExists = await UserModel.findOne({
          email,
          _id: { $ne: req.params.id }
        });

        if (emailExists) {
          return res.status(409).json({
            success: false,
            message: "Email already in use"
          });
        }
        user.email = email;
      }
      if (role) user.role = role;
      if (isBlocked !== undefined) user.isBlocked = isBlocked;
      if (isEmailVerified !== undefined) user.isEmailVerified = isEmailVerified;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: getSafeUserObject(user)
    });

  } catch (err) {
    console.error("UPDATE USER ERROR 👉", err);

    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already exists"
      });
    }

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
      message: "Failed to update user",
      error: err.message
    });
  }
};

/**
 * @desc    Delete user by ID
 * @route   DELETE /api/users/:id
 * @access  Private/Admin (Users can delete themselves with confirmation)
 */
export const deleteUser = async (req, res) => {
  try {
    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const user = await UserModel.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Authorization check
    const isAdmin = req.user.role === 'admin';
    const isSelf = req.user.id === req.params.id;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this user"
      });
    }

    // Admin can delete anyone, users can only delete themselves
    // Optional: Add confirmation for self-deletion
    const { confirm } = req.body;

    if (!isAdmin && isSelf && confirm !== true) {
      return res.status(400).json({
        success: false,
        message: "Please confirm deletion by sending { confirm: true } in request body"
      });
    }

    await UserModel.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "User deleted successfully"
    });

  } catch (err) {
    console.error("DELETE USER ERROR 👉", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: err.message
    });
  }
};

/* =================== USER PROFILE ROUTES =================== */

/**
 * @desc    Get current user profile
 * @route   GET /api/users/profile/me
 * @access  Private
 */
export const getCurrentUser = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id)
      .select('-password -emailVerificationToken -emailVerificationExpire -resetPasswordToken -resetPasswordExpire');

    res.status(200).json({
      success: true,
      data: getSafeUserObject(user)
    });

  } catch (err) {
    console.error("GET CURRENT USER ERROR 👉", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: err.message
    });
  }
};

/**
 * @desc    Update current user profile
 * @route   PUT /api/users/profile/me
 * @access  Private
 */
export const updateCurrentUser = async (req, res) => {
  try {
    const { name, email, password, currentPassword } = req.body;
    const user = await UserModel.findById(req.user.id).select('+password');

    // Update name if provided
    if (name) {
      user.name = name;
    }

    // Handle email change
    if (email && email !== user.email) {
      // Check if email already exists
      const emailExists = await UserModel.findOne({
        email,
        _id: { $ne: req.user.id }
      });

      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: "Email already in use"
        });
      }

      user.email = email;
      user.isEmailVerified = false; // Reset email verification on email change
      // TODO: Send verification email
    }

    // Handle password change
    if (password) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password is required to set new password"
        });
      }

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect"
        });
      }

      user.password = password;
    }

    await user.save();

    // Generate new token if email or password changed
    let newAccessToken = null;
    if (email || password) {
      newAccessToken = generateAccessToken({
        id: user._id,
        role: user.role
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      newAccessToken,
      data: getSafeUserObject(user)
    });

  } catch (err) {
    console.error("UPDATE PROFILE ERROR 👉", err);

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
      message: "Failed to update profile",
      error: err.message
    });
  }
};

/**
 * @desc    Upload profile avatar
 * @route   POST /api/users/profile/avatar
 * @access  Private
 */
export const uploadAvatar = async (req, res) => {
  try {
    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image file"
      });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Only JPEG, PNG, GIF, and WebP images are allowed"
      });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: "Image size must be less than 5MB"
      });
    }

    // Add avatar field to user model first (update your User.model.js)
    // In User.model.js, add:
    // avatar: {
    //   type: String,
    //   default: null
    // }

    const user = await UserModel.findById(req.user.id);

    // TODO: Delete old avatar from storage if exists
    // if (user.avatar) {
    //   // Delete old file logic here
    // }

    // Update user with new avatar URL/path
    user.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Avatar uploaded successfully",
      data: {
        avatar: user.avatar
      }
    });

  } catch (err) {
    console.error("UPLOAD AVATAR ERROR 👉", err);
    res.status(500).json({
      success: false,
      message: "Failed to upload avatar",
      error: err.message
    });
  }
};

/**
 * @desc    Delete current user avatar
 * @route   DELETE /api/users/profile/avatar
 * @access  Private
 */
export const deleteAvatar = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id);

    if (!user.avatar) {
      return res.status(404).json({
        success: false,
        message: "No avatar found"
      });
    }

    // TODO: Delete avatar file from storage
    // const filePath = path.join(__dirname, '..', user.avatar);
    // if (fs.existsSync(filePath)) {
    //   fs.unlinkSync(filePath);
    // }

    user.avatar = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Avatar deleted successfully"
    });

  } catch (err) {
    console.error("DELETE AVATAR ERROR 👉", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete avatar",
      error: err.message
    });
  }
};

/**
 * @desc    Get user statistics (Admin only)
 * @route   GET /api/users/stats
 * @access  Private/Admin
 */
export const getUserStats = async (req, res) => {
  try {
    const stats = await UserModel.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          blocked: { $sum: { $cond: [{ $eq: ['$isBlocked', true] }, 1, 0] } },
          verified: { $sum: { $cond: [{ $eq: ['$isEmailVerified', true] }, 1, 0] } }
        }
      },
      {
        $project: {
          role: '$_id',
          count: 1,
          blocked: 1,
          verified: 1,
          _id: 0
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const totalUsers = await UserModel.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newUsersToday = await UserModel.countDocuments({
      createdAt: { $gte: today }
    });

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const newUsersThisWeek = await UserModel.countDocuments({
      createdAt: { $gte: lastWeek }
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        newUsersToday,
        newUsersThisWeek,
        stats
      }
    });

  } catch (err) {
    console.error("USER STATS ERROR 👉", err);
    res.status(500).json({
      success: false,
      message: "Failed to get user statistics",
      error: err.message
    });
  }
};