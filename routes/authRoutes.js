import express from "express";
import { body } from "express-validator";
import { registerUser, loginUser, getMe } from "../controllers/authController.js";
import { protectUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Validation middleware for registration
const registerValidation = [
  body("username").trim().notEmpty().withMessage("用户名不能为空").isLength({ min: 3 }).withMessage("用户名长度至少为3位"),
  body("password").notEmpty().withMessage("密码不能为空").isLength({ min: 6 }).withMessage("密码长度至少为6位"),
  body("nickname").trim().notEmpty().withMessage("昵称不能为空").isLength({ min: 2, max: 15 }).withMessage("昵称长度应为2-15位")
];

// Validation middleware for login
const loginValidation = [
  body("username").trim().notEmpty().withMessage("用户名不能为空"),
  body("password").notEmpty().withMessage("密码不能为空")
];

router.post("/register", registerValidation, registerUser);
router.post("/login", loginValidation, loginUser);
router.get("/me", protectUser, getMe);

// Admin login route is in adminRoutes.js, but the controller function loginAdmin is here.
// We can add validation for admin login here if we decide to move the route or share validation logic.

export default router;

