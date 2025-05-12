import Diary from "../models/Diary.js";
import User from "../models/User.js"; // For populating author details
import { Op } from "sequelize";
import config from "../config/index.js";

const { sequelize } = config;

// @desc    Get all diaries for admin/reviewer (paginated, filterable by status)
// @route   GET /api/admin/diaries
// @access  Private (Admin/Reviewer)
export const getDiariesForAdmin = async (req, res) => {
  const pageSize = 10;
  const page = parseInt(req.query.pageNumber, 10) || 1;
  const offset = (page - 1) * pageSize;

  const whereClause = {
    isDeleted: false, // Admins see non-deleted diaries
  };

  if (req.query.status) {
    if (["pending", "approved", "rejected"].includes(req.query.status)) {
      whereClause.status = req.query.status;
    } else {
      return res.status(400).json({ message: "Invalid status filter value." });
    }
  }

  try {
    const { count, rows } = await Diary.findAndCountAll({
      where: whereClause,
      include: [{ model: User, as: "author", attributes: ["id", "nickname", "username"] }],
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset: offset,
    });

    res.json({ diaries: rows, page, pages: Math.ceil(count / pageSize) });
  } catch (error) {
    console.error("Admin get diaries error:", error);
    res.status(500).json({ message: "Server error while fetching diaries for admin", error: error.message });
  }
};

// @desc    Approve a diary
// @route   PUT /api/admin/diaries/:id/approve
// @access  Private (Admin/Reviewer)
export const approveDiaryAdmin = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const diary = await Diary.findByPk(req.params.id, { transaction: t });

    if (!diary || diary.isDeleted) {
      await t.rollback();
      return res.status(404).json({ message: "Diary not found" });
    }

    if (diary.status === "approved") {
      await t.rollback();
      return res.status(400).json({ message: "Diary is already approved" });
    }

    diary.status = "approved";
    diary.rejectReason = null; // Clear any previous rejection reason
    await diary.save({ transaction: t });
    await t.commit();
    
    const updatedDiary = await Diary.findByPk(diary.id, { include: [{ model: User, as: 'author', attributes: ['nickname', 'avatarUrl'] }] });
    res.json(updatedDiary);

  } catch (error) {
    await t.rollback();
    console.error("Admin approve diary error:", error);
    res.status(500).json({ message: "Server error while approving diary", error: error.message });
  }
};

export const rejectDiaryAdmin = async (req, res) => {
  const { rejectReason } = req.body;
  const t = await sequelize.transaction();

  // 现在下面的校验会作用于正确的 `rejectReason` 变量
  if (!rejectReason || typeof rejectReason !== 'string' || rejectReason.trim() === "") {
    return res.status(400).json({ message: "Rejection reason is required and must be a non-empty string" });
  }

  try {
    const diary = await Diary.findByPk(req.params.id, { transaction: t });

    if (!diary || diary.isDeleted) {
      await t.rollback();
      return res.status(404).json({ message: "Diary not found" });
    }

    if (diary.status === "approved") {
        await t.rollback();
        return res.status(400).json({ message: "Cannot reject an already approved diary." });
    }

    diary.status = "rejected";
    diary.rejectReason = rejectReason.trim(); // 使用 trim 后的值
    await diary.save({ transaction: t });
    await t.commit();

    const updatedDiary = await Diary.findByPk(diary.id, { include: [{ model: User, as: 'author', attributes: ['nickname', 'avatarUrl'] }] });
    res.json(updatedDiary);

  } catch (error) {
    await t.rollback();
    console.error("Admin reject diary error:", error);
    res.status(500).json({ message: "Server error while rejecting diary", error: error.message });
  }
};

// @desc    Delete a diary (logical delete by admin)
// @route   DELETE /api/admin/diaries/:id
// @access  Private (Admin only)
export const deleteDiaryAdmin = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const diary = await Diary.findByPk(req.params.id, { transaction: t });

    if (!diary || diary.isDeleted) {
      await t.rollback();
      return res.status(404).json({ message: "Diary not found or already deleted" });
    }

    diary.isDeleted = true;
    // Optionally record who deleted it and when
    // diary.deletedBy = req.user.id; // Assuming req.user.id is available and is UUID
    // diary.deletedAt = new Date();
    await diary.save({ transaction: t });
    await t.commit();

    res.json({ message: "Diary logically deleted by admin successfully" });
  } catch (error) {
    await t.rollback();
    console.error("Admin delete diary error:", error);
    res.status(500).json({ message: "Server error while deleting diary by admin", error: error.message });
  }
};

