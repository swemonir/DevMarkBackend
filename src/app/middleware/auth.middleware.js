import jwt from "jsonwebtoken";
import UserModel from "../../infrastructure/models/User.model.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserModel.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "User is blocked",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('JWT verification failed:', error);

    if (error && error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        expiredAt: error.expiredAt,
      });
    }

    return res.status(401).json({
      success: false,
      message: "Not authorized, token failed",
      error: error.message,
      errorName: error.name,
    });
  }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }
    next();
  };
};

// Optional authentication - allows both public and authenticated access
export const optionalProtect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // If no token, continue as public user
    if (!token) {
      return next();
    }

    // If token exists, try to verify
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await UserModel.findById(decoded.id);

      if (user && !user.isBlocked) {
        req.user = user; // Set user if valid
      }

      // Continue regardless (public or authenticated)
      next();
    } catch (error) {
      // Token invalid/expired - continue as public
      next();
    }
  } catch (error) {
    // Any error - continue as public
    next();
  }
};