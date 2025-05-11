import User from "../models/User.js";
import fs from "fs";
import path from "path";

// @desc    Get user profile
// @route   GET /api/users/me
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] }, // Don't send back the password
    });

    if (user) {
      res.json({
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl.startsWith('http') ? user.avatarUrl : `${req.protocol}://${req.get('host')}${user.avatarUrl}`, // Ensure full URL for avatar
        role: user.role,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({ message: "Server error while fetching user profile" });
  }
};

// @desc    Update user profile (e.g., nickname)
// @route   PUT /api/users/me
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (user) {
      user.nickname = req.body.nickname || user.nickname;
      // Add other fields to update as needed, e.g., password (with care for hashing)

      const updatedUser = await user.save();
      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        nickname: updatedUser.nickname,
        avatarUrl: updatedUser.avatarUrl.startsWith('http') ? updatedUser.avatarUrl : `${req.protocol}://${req.get('host')}${updatedUser.avatarUrl}`,
        role: updatedUser.role,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Update user profile error:", error);
    res.status(500).json({ message: "Server error while updating user profile" });
  }
};

// @desc    Update user avatar
// @route   PUT /api/users/me/avatar
// @access  Private
export const updateAvatar = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No avatar image uploaded" });
    }

    // Construct the new avatar URL (relative to the server's public path)
    const newAvatarUrl = `/images/avatars/${req.file.filename}`;

    // If user had a previous avatar (and it's not the default one), delete it
    if (user.avatarUrl && user.avatarUrl !== "/images/default-avatar.png" && !user.avatarUrl.startsWith('http')) {
      const oldAvatarPath = path.join("public", user.avatarUrl);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlink(oldAvatarPath, err => {
          if (err) console.error("Error deleting old avatar:", err);
        });
      }
    }

    user.avatarUrl = newAvatarUrl;
    await user.save();

    res.json({
      message: "Avatar updated successfully",
      avatarUrl: `${req.protocol}://${req.get('host')}${newAvatarUrl}`,
    });

  } catch (error) {
    console.error("Update avatar error:", error);
    // If an error occurs after file upload, attempt to delete the newly uploaded file
    if (req.file && req.file.path) {
        if (fs.existsSync(req.file.path)) {
            fs.unlink(req.file.path, err => {
                if (err) console.error("Error deleting uploaded avatar after failed update:", err);
            });
        }
    }
    res.status(500).json({ message: "Server error while updating avatar" });
  }
};

