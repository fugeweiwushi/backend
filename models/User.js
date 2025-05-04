import { DataTypes, Model } from "sequelize";
import bcrypt from "bcryptjs";
import config from "../config/index.js"; // To get the sequelize instance

const { sequelize } = config;

class User extends Model {
  // Method to compare password for login
  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        is: /^[a-zA-Z0-9]+$/, // Alphanumeric username
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 255], // Enforce a minimum password length
      },
    },
    nickname: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    avatarUrl: {
      type: DataTypes.STRING,
      defaultValue: "/default-avatar.png", // A default avatar if not provided
    },
    role: {
      type: DataTypes.ENUM("user", "admin", "reviewer"),
      defaultValue: "user",
    },
    // createdAt and updatedAt are automatically added by Sequelize by default
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users", // Explicitly define table name
    timestamps: true, // Enable timestamps (createdAt, updatedAt)
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);

export default User;

