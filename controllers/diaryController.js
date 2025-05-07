import Diary from "../models/Diary.js";
import User from "../models/User.js";
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { Op } from "sequelize";
import config from "../config/index.js";

const { sequelize } = config;

// Helper function to handle file deletion
const deleteUploadedFile = (filePath) => {
  // Ensure the path is absolute or correctly relative to the project root
  const absoluteFilePath = path.resolve(filePath); // Assuming filePath might be relative from 'uploads'
  fs.unlink(absoluteFilePath, (err) => {
    if (err) console.error(`Error deleting file ${absoluteFilePath}:`, err);
    // else console.log(`Successfully deleted file: ${absoluteFilePath}`);
  });
};

// @desc    Create a new diary
// @route   POST /api/diaries
// @access  Private (User)
export const createDiary = async (req, res) => {
  const { title, content, videoUrl } = req.body;
  const imageFiles = req.files?.images;
  const videoFile = req.files?.video ? req.files.video[0] : null;

  if (!title || !content) {
    if (imageFiles) imageFiles.forEach(file => deleteUploadedFile(file.path));
    if (videoFile) deleteUploadedFile(videoFile.path);
    return res.status(400).json({ message: "Title and content are required" });
  }

  if (!imageFiles || imageFiles.length === 0) {
    if (videoFile) deleteUploadedFile(videoFile.path);
    return res.status(400).json({ message: "At least one image is required" });
  }

  const t = await sequelize.transaction(); // Start a transaction

  try {
    const processedImageUrls = [];
    if (imageFiles && imageFiles.length > 0) {
      for (const image of imageFiles) {
        const compressedImageDir = path.join(path.dirname(image.path), 'compressed');
        if (!fs.existsSync(compressedImageDir)){
            fs.mkdirSync(compressedImageDir, { recursive: true });
        }
        // Adjust filename to avoid issues if original filename had special chars, though multer usually handles this.
        const newFilename = `compressed-${path.basename(image.filename)}`;
        const compressedImagePath = path.join(compressedImageDir, newFilename);
        
        await sharp(image.path)
          .resize({ width: 800, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(compressedImagePath);
        
        processedImageUrls.push(`/uploads/images/compressed/${newFilename}`);
        deleteUploadedFile(image.path); // Delete original uploaded image
      }
    }

    let finalVideoUrl = videoUrl; // Use provided URL if no file uploaded
    if (videoFile) {
        // In a real app, upload to a CDN. For now, just use the path.
        // The file is already in /uploads/videos/ by multer config
        finalVideoUrl = `/uploads/videos/${videoFile.filename}`; 
    }

    const author = await User.findByPk(req.user.id, { transaction: t });
    if (!author) {
        await t.rollback();
        return res.status(404).json({ message: "Author not found" });
    }

    const diary = await Diary.create({
      title,
      content,
      images: processedImageUrls,
      videoUrl: finalVideoUrl,
      authorId: req.user.id,
      // authorNickname and authorAvatar will be set by beforeValidate hook in Diary model
      status: 'pending',
    }, { transaction: t });

    await t.commit();
    // Refetch to include associations or use the instance if hooks populate correctly
    const createdDiary = await Diary.findByPk(diary.id, { include: [{ model: User, as: 'author', attributes: ['nickname', 'avatarUrl'] }] });
    res.status(201).json(createdDiary);

  } catch (error) {
    await t.rollback();
    console.error("Create diary error:", error);
    // Clean up any uploaded files if an error occurs
    if (imageFiles) {
        imageFiles.forEach(file => {
            deleteUploadedFile(file.path); // Original path
            const compressedImagePath = path.join(path.dirname(file.path), 'compressed', `compressed-${path.basename(file.filename)}`);
            deleteUploadedFile(compressedImagePath); // Compressed path
        });
    }
    if (videoFile) deleteUploadedFile(videoFile.path);
    res.status(500).json({ message: "Server error while creating diary", error: error.message });
  }
};

// @desc    Get all approved diaries (for homepage, paginated, searchable)
// @route   GET /api/diaries
// @access  Public
export const getDiaries = async (req, res) => {
  const pageSize = 10;
  const page = parseInt(req.query.pageNumber, 10) || 1;
  const offset = (page - 1) * pageSize;

  const whereClause = {
    status: "approved",
    isDeleted: false,
  };

  if (req.query.title) {
    whereClause.title = { [Op.iLike]: `%${req.query.title}%` }; // Case-insensitive for PostgreSQL
  }
  if (req.query.authorNickname) {
    whereClause.authorNickname = { [Op.iLike]: `%${req.query.authorNickname}%` };
  }

  try {
    const { count, rows } = await Diary.findAndCountAll({
      where: whereClause,
      include: [{ model: User, as: 'author', attributes: ['id', 'nickname', 'avatarUrl'] }],
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset: offset,
    });

    res.json({ diaries: rows, page, pages: Math.ceil(count / pageSize) });
  } catch (error) {
    console.error("Get diaries error:", error);
    res.status(500).json({ message: "Server error while fetching diaries", error: error.message });
  }
};

// @desc    Get diaries for the logged-in user
// @route   GET /api/diaries/my
// @access  Private (User)
export const getMyDiaries = async (req, res) => {
  try {
    const diaries = await Diary.findAll({
      where: { authorId: req.user.id, isDeleted: false },
      include: [{ model: User, as: 'author', attributes: ['id', 'nickname', 'avatarUrl'] }],
      order: [["createdAt", "DESC"]],
    });
    res.json(diaries);
  } catch (error) {
    console.error("Get my diaries error:", error);
    res.status(500).json({ message: "Server error while fetching user diaries", error: error.message });
  }
};

// @desc    Get a single diary by ID
// @route   GET /api/diaries/:id
// @access  Public (if approved), or Private (if owner or admin/reviewer)
export const getDiaryById = async (req, res) => {
  try {
    const diary = await Diary.findOne({
      where: { id: req.params.id, isDeleted: false },
      include: [{ model: User, as: 'author', attributes: ['id', 'nickname', 'avatarUrl'] }],
    });

    if (diary) {
      if (diary.status !== 'approved') {
        let canView = false;
        if (req.user) { // Check if user is logged in (req.user might not be set for public access)
            if (diary.authorId === req.user.id || req.user.role === 'admin' || req.user.role === 'reviewer') {
                canView = true;
            }
        }
        if (!canView) {
            return res.status(403).json({ message: "Not authorized to view this diary" });
        }
      }
      res.json(diary);
    } else {
      res.status(404).json({ message: "Diary not found" });
    }
  } catch (error) {
    console.error("Get diary by ID error:", error);
    if (error.name === 'SequelizeDatabaseError' && error.message.includes('invalid input syntax for type uuid')) {
        return res.status(404).json({ message: "Diary not found (invalid ID format)" });
    }
    res.status(500).json({ message: "Server error while fetching diary", error: error.message });
  }
};

// @desc    Update a diary
// @route   PUT /api/diaries/:id
// @access  Private (Owner only)
export const updateDiary = async (req, res) => {
  const { title, content, videoUrl } = req.body;
  const newImageFiles = req.files?.images;
  const newVideoFile = req.files?.video ? req.files.video[0] : null;
  const t = await sequelize.transaction();

  try {
    const diary = await Diary.findByPk(req.params.id, { transaction: t });

    if (!diary || diary.isDeleted) {
      await t.rollback();
      return res.status(404).json({ message: "Diary not found" });
    }

    if (diary.authorId !== req.user.id) {
      await t.rollback();
      return res.status(403).json({ message: "User not authorized to update this diary" });
    }

    if (diary.status === 'approved') {
      await t.rollback();
      return res.status(400).json({ message: "Cannot edit an approved diary." });
    }

    diary.title = title || diary.title;
    diary.content = content || diary.content;
    
    if (newImageFiles && newImageFiles.length > 0) {
      // Simple approach: delete old images from storage and replace array
      // diary.images.forEach(imageUrl => { /* delete logic for old images from storage */ });
      const processedImageUrls = [];
      for (const image of newImageFiles) {
        const compressedImageDir = path.join(path.dirname(image.path), 'compressed');
        if (!fs.existsSync(compressedImageDir)){
            fs.mkdirSync(compressedImageDir, { recursive: true });
        }
        const newFilename = `compressed-${path.basename(image.filename)}`;
        const compressedImagePath = path.join(compressedImageDir, newFilename);
        await sharp(image.path).resize({ width: 800, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(compressedImagePath);
        processedImageUrls.push(`/uploads/images/compressed/${newFilename}`);
        deleteUploadedFile(image.path);
      }
      diary.images = processedImageUrls;
    }

    if (newVideoFile) {
        // if(diary.videoUrl) { /* delete old video from storage */ }
        diary.videoUrl = `/uploads/videos/${newVideoFile.filename}`;
    } else if (videoUrl !== undefined) { // Allows clearing videoUrl
        // if(diary.videoUrl && videoUrl === null) { /* delete old video from storage */ }
        diary.videoUrl = videoUrl;
    }

    diary.status = 'pending'; // Reset status to pending for re-approval
    diary.rejectReason = null; // Clear previous rejection reason

    await diary.save({ transaction: t });
    await t.commit();
    
    const updatedDiary = await Diary.findByPk(diary.id, { include: [{ model: User, as: 'author', attributes: ['nickname', 'avatarUrl'] }] });
    res.json(updatedDiary);

  } catch (error) {
    await t.rollback();
    console.error("Update diary error:", error);
    if (newImageFiles) {
        newImageFiles.forEach(file => {
            deleteUploadedFile(file.path);
            const compressedImagePath = path.join(path.dirname(file.path), 'compressed', `compressed-${path.basename(file.filename)}`);
            deleteUploadedFile(compressedImagePath);
        });
    }
    if (newVideoFile) deleteUploadedFile(newVideoFile.path);
    res.status(500).json({ message: "Server error while updating diary", error: error.message });
  }
};

// @desc    Delete a diary (logical delete)
// @route   DELETE /api/diaries/:id
// @access  Private (Owner only)
export const deleteDiary = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const diary = await Diary.findByPk(req.params.id, { transaction: t });

    if (!diary || diary.isDeleted) {
      await t.rollback();
      return res.status(404).json({ message: "Diary not found" });
    }

    if (diary.authorId !== req.user.id) {
      await t.rollback();
      return res.status(403).json({ message: "User not authorized to delete this diary" });
    }

    diary.isDeleted = true;
    await diary.save({ transaction: t });
    await t.commit();

    res.json({ message: "Diary removed successfully" });
  } catch (error) {
    await t.rollback();
    console.error("Delete diary error:", error);
    res.status(500).json({ message: "Server error while deleting diary", error: error.message });
  }
};

