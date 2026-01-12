import express from "express";
const router = express.Router();
import { login, logout, signup } from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", protect, logout);


export default router;
