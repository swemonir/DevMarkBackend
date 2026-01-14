import UserModel from "../../infrastructure/models/User.model.js";
import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/token.js";

/*  Signup */

export const signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1️⃣ Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    // 2️⃣ Allowed roles (prevent admin creation)
    const allowedRoles = ["buyer", "seller", "admin"];
    const userRole = allowedRoles.includes(role?.toLowerCase()) ? role.toLowerCase() : "buyer";
    // 3️⃣ Check if email exists
    const exists = await UserModel.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "Email already exists" });
    }

    // 4️⃣ Create user
    const user = await UserModel.create({
      name,
      email,
      password,
      role: userRole,
    });

    // 5️⃣ Respond
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      role: userRole,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("SIGNUP ERROR 👉", err);

    // Check if mongoose validation error
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({ message: "Validation failed", errors: messages });
    }

    res.status(500).json({
      message: "Signup failed",
      error: err.message,
    });
  }
};


/* Login */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // Find user with password field
    const user = await UserModel.findOne({ email }).select("+password");
    console.log('Found user:', user ? user.email : 'Not found');

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if password exists
    if (!user.password) {
      console.error('Password field missing for user:', user.email);
      return res.status(500).json({ message: "Authentication error" });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }


    // Check if blocked
    if (user.isBlocked) {
      return res.status(403).json({ message: "User is blocked" });
    }

    const accessToken = generateAccessToken({
      id: user._id.toString(), // ✅ Convert to string
      role: user.role
    });

    const refreshToken = generateRefreshToken({
      id: user._id,
    });

    res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR 👉", err);
    res.status(500).json({
      message: "Login failed",
      error: err.message
    });
  }
};

// logout 
export const logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Logged out successfully. Please delete tokens on client-side.",
    });
  } catch (err) {
    console.error("LOGOUT ERROR 👉", err);
    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

// Refresh access token using refresh token
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'No refresh token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Refresh token expired' });
      }
      return res.status(401).json({ success: false, message: 'Invalid refresh token', error: err.message });
    }

    const user = await UserModel.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'User is blocked' });
    }

    const accessToken = generateAccessToken({ id: user._id.toString(), role: user.role });

    res.status(200).json({
      success: true,
      accessToken,
    });
  } catch (err) {
    console.error('REFRESH TOKEN ERROR 👉', err);
    res.status(500).json({ success: false, message: 'Could not refresh token', error: err.message });
  }
};
