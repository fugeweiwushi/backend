import User from "../models/User.js";
import jwt from "jsonwebtoken";
import config from "../config/index.js";
import { Op } from "sequelize";

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  const { username, password, nickname } = req.body;

  if (!username || !password || !nickname) {
    return res.status(400).json({ message: "Please provide username, password, and nickname" });
  }

  try {
    const userExists = await User.findOne({
      where: {
        [Op.or]: [{ username: username }, { nickname: nickname }],
      },
    });

    if (userExists) {
      if (userExists.username === username) {
        return res.status(400).json({ message: "Username already exists" });
      }
      if (userExists.nickname === nickname) {
        return res.status(400).json({ message: "Nickname already exists" });
      }
    }

    const user = await User.create({
      username,
      password, // Password will be hashed by hook in User model
      nickname,
    });

    if (user) {
      const token = jwt.sign({ id: user.id, role: user.role }, config.jwtSecret, {
        expiresIn: "30d",
      });
      res.status(201).json({
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        role: user.role,
        token,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error("Register error:", error);
    if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ message: 'Username or Nickname already exists.', fields: error.fields });
    }
    res.status(500).json({ message: "Server error during registration", error: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Please provide username and password" });
  }

  try {
    const user = await User.findOne({ where: { username } });

    if (user && (await user.comparePassword(password))) {
      const token = jwt.sign({ id: user.id, role: user.role }, config.jwtSecret, {
        expiresIn: "30d",
      });
      res.json({
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        role: user.role,
        token,
      });
    } else {
      res.status(401).json({ message: "Invalid username or password" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login", error: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private (User)
export const getMe = async (req, res) => {
  // req.user is set by the protectUser middleware
  if (req.user) {
    res.json({
      id: req.user.id,
      username: req.user.username,
      nickname: req.user.nickname,
      avatarUrl: req.user.avatarUrl,
      role: req.user.role,
    });
  } else {
    // This case should ideally not be reached if protectUser middleware is working correctly
    res.status(404).json({ message: "User not found" }); 
  }
};


// @desc    Login an admin user
// @route   POST /api/admin/auth/login  (Note: This route is defined in adminRoutes.js)
// @access  Public
export const loginAdmin = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Please provide username and password" });
    }

    try {
        const adminUser = await User.findOne({ 
            where: { 
                username, 
                role: { [Op.in]: ["admin", "reviewer"] } 
            }
        });

        if (adminUser && (await adminUser.comparePassword(password))) {
            const token = jwt.sign({ id: adminUser.id, role: adminUser.role }, config.jwtSecret, {
                expiresIn: "30d",
            });
            res.json({
                id: adminUser.id,
                username: adminUser.username,
                nickname: adminUser.nickname, 
                role: adminUser.role,
                token,
            });
        } else {
            res.status(401).json({ message: "Invalid credentials or not an authorized user" });
        }
    } catch (error) {
        console.error("Admin login error:", error);
        res.status(500).json({ message: "Server error during admin login", error: error.message });
    }
};

