import User from "../../infrastructure/models/User.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/token.js";

/* ✅ Signup */
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const user = await User.create({ name, email, password });

    return res.status(201).json({
      message: "User registered successfully",
    });
  } catch (err) {
    console.error("SIGNUP ERROR 👉", err);
    res.status(500).json({
      message: "Signup failed",
      error: err.message,
    });
  }
};

/* Login */
/* Login - Updated */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // Find user with password field
    const user = await User.findOne({ email }).select("+password");
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
      id: user._id,
      role: user.role,
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
