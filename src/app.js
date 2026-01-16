import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// ========== LOAD ENV FIRST ==========
dotenv.config();

console.log('✅ Environment loaded');
console.log('🔑 JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('🔑 JWT_SECRET length:', process.env.JWT_SECRET?.length);

// Import routes
import authRoutes from "./app/routes/authRoutes.js";
import userRoutes from "./app/routes/userRoutes.js";
import projectRoutes from "./app/routes/projectRoutes.js";
import marketplaceRoutes from "./app/routes/marketplaceRoutes.js";
import paymentRoutes, { transactionRouter } from "./app/routes/paymentRoutes.js";

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: "*",
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Data sanitization
app.use(hpp());
// Compression
app.use(compression());

// ========== ROUTES ==========
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/transactions", transactionRouter);

// Debug endpoint
app.get('/api/debug/verify-token', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({
      success: false,
      message: 'No Bearer token provided',
      header: authHeader
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.json({
      success: true,
      message: 'Token verified successfully',
      decoded,
      tokenInfo: {
        length: token.length,
        first20: token.substring(0, 20) + '...'
      }
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'Token verification failed',
      error: error.message,
      errorName: error.name,
      JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set'
    });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Test endpoint without auth
app.get("/api/test-public", (req, res) => {
  res.json({
    success: true,
    message: "Public route works!",
    time: new Date().toISOString()
  });
});

// ========== FIXED 404 HANDLER ==========
// Remove the problematic line and use this:
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found on this server`
  });
});

export default app;