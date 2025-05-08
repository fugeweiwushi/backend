import multer from "multer";
import path from "path";
import fs from "fs";

// Configure storage for images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/images/"; // Relative to project root
    fs.mkdirSync(uploadPath, { recursive: true }); // Ensure directory exists
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
    fs.mkdirSync(uploadPath, { recursive: true }); // Ensure directory exists
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
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

export const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit for images
});

export const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFileFilter,
  limits: { fileSize: 1024 * 1024 * 50 }, // 50MB limit for videos (adjust as needed)
});

// Middleware to handle multiple image uploads and a single video upload
// This will be used in the diary routes
// Example usage in router: uploadDiaryFiles.fields([{ name: 'images', maxCount: 10 }, { name: 'video', maxCount: 1 }])
export const uploadDiaryFiles = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            let uploadPath = "uploads/";
            if (file.fieldname === "images") {
                uploadPath += "images/";
            } else if (file.fieldname === "video") {
                uploadPath += "videos/";
            }
            fs.mkdirSync(uploadPath, { recursive: true });
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
        fileSize: 1024 * 1024 * 50, // Max 50MB for any single file (adjust if images need smaller limit)
        files: 11 // Max 10 images + 1 video
    }
});


