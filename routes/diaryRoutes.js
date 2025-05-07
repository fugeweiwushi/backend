import express from "express";
import { body, param } from "express-validator";
import { 
    createDiary, 
    getDiaries, 
    getMyDiaries, 
    getDiaryById, 
    updateDiary, 
    deleteDiary 
} from "../controllers/diaryController.js";
import { protectUser } from "../middlewares/authMiddleware.js";
import { uploadDiaryFiles as upload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// Validation middleware for creating/updating a diary
const diaryValidation = [
    body("title").trim().notEmpty().withMessage("标题不能为空").isLength({ min: 3, max: 100 }).withMessage("标题长度应为3-100字符"),
    body("content").trim().notEmpty().withMessage("内容不能为空").isLength({ min: 10 }).withMessage("内容长度至少为10字符"),
    // Basic check for images and videoUrl, more complex validation (e.g., file type, size) is handled by multer and in controller
    body("images").optional().isArray().withMessage("图片必须是数组格式"),
    body("images.*").optional().isString().withMessage("图片路径必须是字符串"),
    body("videoUrl").optional().isURL().withMessage("无效的视频链接格式")
];

const idParamValidation = [
    param("id").isUUID(4).withMessage("无效的游记ID格式")
];

// Public route to get all approved diaries (with optional query params for search)
router.get("/", getDiaries);

// Protected routes for logged-in users
router.post("/", 
    protectUser, 
    upload.fields([{ name: 'images', maxCount: 9 }, { name: 'video', maxCount: 1 }]), 
    diaryValidation, 
    createDiary
);
router.get("/my", protectUser, getMyDiaries);

// Public route to get a specific diary by ID (controller will check status)
router.get("/:id", idParamValidation, getDiaryById);

router.put("/:id", 
    protectUser, 
    idParamValidation, 
    upload.fields([{ name: 'images', maxCount: 9 }, { name: 'video', maxCount: 1 }]), 
    diaryValidation, 
    updateDiary
);
router.delete("/:id", protectUser, idParamValidation, deleteDiary);

export default router;

