import multer from "multer";
import path from "path";
import fs from "fs";

// Helper to ensure directory exists
const ensureUploadPathExists = (uploadPath) => {
    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
    }
};

// Configure storage for general images (e.g., diary images)
const diaryImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/images/"; // Relative to project root
    ensureUploadPathExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// Configure storage for videos
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/videos/"; // Relative to project root
    ensureUploadPathExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// Configure storage for user avatars
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = "public/images/avatars/"; // Avatars will be publicly accessible
        ensureUploadPathExists(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Use user ID for filename to ensure uniqueness and easy association
        // Ensure req.user is available from a preceding auth middleware
        const userId = req.user?.id || "unknown-user"; 
        cb(null, `avatar-${userId}-${Date.now()}${path.extname(file.originalname)}`);
    },
});

// File filter for images
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload only images."), false);
  }
};

// File filter for videos
const videoFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("video")) {
    cb(null, true);
  } else {
    cb(new Error("Not a video! Please upload only videos."), false);
  }
};

// Multer instance for single avatar upload
export const uploadAvatar = multer({
    storage: avatarStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 1024 * 1024 * 2 }, // 2MB limit for avatars
});

export const uploadImage = multer({
  storage: diaryImageStorage, // Changed to diaryImageStorage for clarity
  fileFilter: imageFileFilter,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit for images
});

export const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFileFilter,
  limits: { fileSize: 1024 * 1024 * 50 }, // 50MB limit for videos
});

export const uploadDiaryFiles = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            let uploadPath = "uploads/";
            if (file.fieldname === "images") {
                uploadPath += "images/";
            } else if (file.fieldname === "video") {
                uploadPath += "videos/";
            }
            ensureUploadPathExists(uploadPath);
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
        }
    }),
    fileFilter: (req, file, cb) => {
        if (file.fieldname === "images") {
            if (file.mimetype.startsWith("image")) {
                cb(null, true);
            } else {
                cb(new Error("Not an image! Please upload only images for the 'images' field."), false);
            }
        } else if (file.fieldname === "video") {
            if (file.mimetype.startsWith("video")) {
                cb(null, true);
            } else {
                cb(new Error("Not a video! Please upload only a video for the 'video' field."), false);
            }
        } else {
            cb(new Error("Unexpected field name for file upload."), false);
        }
    },
    limits: {
        fileSize: 1024 * 1024 * 50, 
        files: 11 
    }
});

