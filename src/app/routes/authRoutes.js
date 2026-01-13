import express from "express";
const router = express.Router();
import { login, logout, signup, refreshToken } from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

router.post("/signup", signup);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", protect, logout);


export default router;
