import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import config from "./config/index.js";
import authRoutes from "./routes/authRoutes.js";
import diaryRoutes from "./routes/diaryRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Serve static files from the "public" directory (e.g., for avatars)
app.use(express.static(path.join(__dirname, "public")));

// Serve static files from the "uploads" directory
// This makes /uploads/images/* and /uploads/videos/* accessible
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.use("/api/users", userRoutes); // Add user routes
app.use("/api/auth", authRoutes);
app.use("/api/diaries", diaryRoutes);
app.use("/api/admin", adminRoutes);

// Simple route for testing server is up
app.get("/", (req, res) => {
  res.send("Travel Diary Backend API is running...");
});

// Global error handler (basic example)
app.use((err, req, res, next) => {
  console.error("Global error handler:", err.stack);
  // If the error is from multer (e.g., file size limit)
  if (err.code && err.code.startsWith("LIMIT_")) {
    return res.status(400).json({ message: err.message });
  }
  // Handle other errors
  res.status(500).json({ 
    message: err.message || "Something went wrong!",
    // Provide stack in development only for debugging
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined 
  });
});

export default app;

