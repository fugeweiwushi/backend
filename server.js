import config from "./config/index.js";
import app from "./app.js";
import User from "./models/User.js"; // Import User model for seeding
import Diary from "./models/Diary.js"; // Import Diary model to ensure it's initialized for associations

const { sequelize, port, adminCredentials } = config;

const PORT = port || 5000;

const connectDBAndStartServer = async () => {
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log("PostgreSQL Connection has been established successfully.");

    // Sync all models
    // Use { force: true } to drop and re-create tables - useful in development, be cautious in production
    // await sequelize.sync({ force: process.env.NODE_ENV === "development" }); 
    await sequelize.sync(); // This will create tables if they don't exist
    console.log("All models were synchronized successfully.");

    // Seed admin user if not exists
    const adminExists = await User.findOne({ where: { username: adminCredentials.username, role: "admin" } });
    if (!adminExists) {
      await User.create({
        username: adminCredentials.username,
        password: adminCredentials.password, // Will be hashed by pre-save hook
        nickname: "Administrator", // Default nickname for admin
        role: "admin",
      });
      console.log("Admin user created.");
    } else {
      console.log("Admin user already exists.");
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Unable to connect to the database or start server:", err);
    process.exit(1); // Exit process with failure
  }
};

connectDBAndStartServer();

