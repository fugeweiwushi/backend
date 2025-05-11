import express from "express";
import { protectUser } from "../middlewares/authMiddleware.js";
import { uploadAvatar } from "../middlewares/uploadMiddleware.js";
import { updateAvatar, getUserProfile, updateUserProfile } from "../controllers/userController.js"; // Assuming userController will be created

const router = express.Router();

// Route to get current user's profile (could include avatarUrl)
router.get("/me", protectUser, getUserProfile);

// Route to update user's profile (e.g., nickname - avatar is separate)
router.put("/me", protectUser, updateUserProfile);

// Route to upload/update user avatar
router.put("/me/avatar", protectUser, uploadAvatar.single("avatar"), updateAvatar);

export default router;

