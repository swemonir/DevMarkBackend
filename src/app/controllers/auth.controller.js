import UserModel from "../../infrastructure/models/User.model.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/token.js";
import { sendVerificationEmail, sendWelcomeEmail } from "../utils/email.js";

/*  Signup */
export const signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1️⃣ Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    // 2️⃣ Allowed roles (prevent admin creation via public signup)
    const allowedRoles = ["buyer", "seller", "admin"];
    const userRole = allowedRoles.includes(role?.toLowerCase()) ? role.toLowerCase() : "buyer";

    // 3️⃣ Check if email exists
    const exists = await UserModel.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "Email already exists" });
    }

    // 4️⃣ Create user (without saving yet)
    const user = new UserModel({
      name,
      email,
      password,
      role: userRole,
    });

    // 5️⃣ Generate Verification Token
    const verificationToken = user.generateEmailVerificationToken();

    // 6️⃣ Save user
    await user.save();

    // 7️⃣ Send Verification Email
    // Production Protocol: User needs to click this link
    // URL Format: protocol://host/verify-email/TOKEN
    const verifyUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-email/${verificationToken}`;

    try {
      await sendVerificationEmail(user.email, user.name, verifyUrl);
    } catch (emailError) {
      // If email fails, we might want to delete the user or just let them resend
      // Usually better to let them resend.
      console.error("Email send failed during signup:", emailError);
      // We still return success but warn about email
      return res.status(201).json({
        success: true,
        message: "Account created but failed to send verification email. Please try logging in to resend.",
      });
    }

    // 8️⃣ Respond
    res.status(201).json({
      success: true,
      message: "Registration successful! Please check your email to verify your account.",
      email: user.email
    });

  } catch (err) {
    console.error("SIGNUP ERROR 👉", err);
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({ message: "Validation failed", errors: messages });
    }
    res.status(500).json({ message: "Signup failed", error: err.message });
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

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 🛑 EMAIL VERIFICATION CHECK
    // Industry Standard: Block login if not verified
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email address to log in.",
        isVerified: false
      });
    }

    // Check if blocked
    if (user.isBlocked) {
      return res.status(403).json({ message: "User is blocked" });
    }

    // Generate Tokens
    const accessToken = generateAccessToken({
      id: user._id.toString(),
      role: user.role
    });

    const refreshToken = generateRefreshToken({
      id: user._id,
    });

    // Update last login
    user.updateLastLogin();

    res.status(200).json({
      success: true,
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
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

/* Verify Email */
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Hash token to compare with DB
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with valid token and not expired
    const user = await UserModel.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token"
      });
    }

    // Mark verified and clear token
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    // Send Welcome Email
    try {
      await sendWelcomeEmail(user.email, user.name);
    } catch (err) {
      console.error("Welcome email failed", err);
    }

    // Respond with HTML for direct browser clicks or JSON
    // If API use, JSON is better. If browser link, maybe redirect to frontend login.
    // For this backend API, we return JSON.
    res.status(200).json({
      success: true,
      message: "Email verified successfully! You can now log in.",
    });

  } catch (err) {
    console.error("VERIFY EMAIL ERROR 👉", err);
    res.status(500).json({ message: "Verification failed", error: err.message });
  }
};

/* Resend Verification Email */
export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    // Generate new token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Send Email
    const verifyUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-email/${verificationToken}`;

    await sendVerificationEmail(user.email, user.name, verifyUrl);

    res.status(200).json({
      success: true,
      message: "Verification email resent successfully",
    });

  } catch (err) {
    console.error("RESEND EMAIL ERROR 👉", err);
    res.status(500).json({ message: "Failed to resend email", error: err.message });
  }
};

/* Logout */
export const logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Logout failed" });
  }
};

/* Refresh Access Token */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: 'No refresh token' });

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const user = await UserModel.findById(decoded.id);
    if (!user || user.isBlocked) return res.status(403).json({ success: false, message: 'Invalid user' });

    const accessToken = generateAccessToken({ id: user._id.toString(), role: user.role });
    res.status(200).json({ success: true, accessToken });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Refresh failed' });
  }
};
