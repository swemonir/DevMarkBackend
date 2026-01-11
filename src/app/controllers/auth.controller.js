const User = require("../../infrastructure/models/User.model.js");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/token.js");

/* ✅ Signup */
const signup = async (req, res) => {
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
      user,
    });
  } catch (err) {
    console.error("SIGNUP ERROR 👉", err);
    res.status(500).json({
      message: "Signup failed",
      error: err.message,
    });
  }
};

/* ✅ Login */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await new Promise((resolve, reject) => {
      user.comparePassword(password, (err, isMatch) => {
        if (err) return reject(err);
        resolve(isMatch);
      });
    });
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

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
    res.status(500).json({ message: "Login failed" });
  }
};

module.exports = {
  signup,
  login,
};
