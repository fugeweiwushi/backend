import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || "travel_diary",
  process.env.DB_USER || "postgres", // Default PostgreSQL user
  process.env.DB_PASSWORD || "password", // Default or your specific password
  {
    host: process.env.DB_HOST || "localhost",
    dialect: "postgres",
    logging: process.env.NODE_ENV === "development" ? console.log : false, // Log SQL queries in development
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || "your_jwt_secret",
  adminCredentials: {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "password123",
  },
  sequelize, // Export the sequelize instance
};

export default config;

