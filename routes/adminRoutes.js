import express from "express";
import { body, param } from "express-validator";
import {
  loginAdmin,
} from "../controllers/authController.js";

import {
    getDiariesForAdmin,
    approveDiaryAdmin,
    rejectDiaryAdmin,
    deleteDiaryAdmin
} from "../controllers/adminController.js"; 

import { protectUser, authorizeAdmin, authorizeAdminOrReviewer } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Validation middleware for admin login
const adminLoginValidation = [
  body("username").trim().notEmpty().withMessage("用户名不能为空"),
  body("password").notEmpty().withMessage("密码不能为空")
];

const diaryIdParamValidation = [
    param("id").isUUID(4).withMessage("无效的游记ID格式")
];

const rejectReasonValidation = [
    body("rejectReason").optional().trim().isLength({ min: 1, max: 255 }).withMessage("拒绝原因长度应为1-255字符")
];

// Admin/Reviewer Authentication
router.post("/auth/login", adminLoginValidation, loginAdmin);

// Diary Management by Admin/Reviewer
router.get("/diaries", protectUser, authorizeAdminOrReviewer, getDiariesForAdmin);

router.put("/diaries/:id/approve", protectUser, authorizeAdminOrReviewer, diaryIdParamValidation, approveDiaryAdmin);

router.put("/diaries/:id/reject", protectUser, authorizeAdminOrReviewer, diaryIdParamValidation, rejectReasonValidation, rejectDiaryAdmin);

router.delete("/diaries/:id", protectUser, authorizeAdmin, diaryIdParamValidation, deleteDiaryAdmin);

export default router;

