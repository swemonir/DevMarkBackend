import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import hpp from "hpp";

// Import routes
import authRoutes from "./app/routes/authRoutes.js";
import userRoutes from "./app/routes/userRoutes.js";

// Import middleware

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
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
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

// Routes
// auth routes
app.use("/api/auth", authRoutes);

// user routes
app.use("/api/user", userRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware

export default app;
