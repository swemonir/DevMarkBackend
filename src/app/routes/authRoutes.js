import express from "express";
const router = express.Router();
import {
    login,
    logout,
    signup,
    refreshToken,
    verifyEmail,
    resendVerificationEmail
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

router.post("/signup", signup);
router.post("/login", login);
router.get("/verify-email/:token", verifyEmail); // GET for clickable link ease
router.post("/resend-verification", resendVerificationEmail);

router.post("/refresh", refreshToken);
router.post("/logout", protect, logout);

export default router;
