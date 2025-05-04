import { DataTypes, Model } from "sequelize";
import config from "../config/index.js";
import User from "./User.js"; // Import User model for associations

const { sequelize } = config;

class Diary extends Model {}

Diary.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT, // Use TEXT for longer content
      allowNull: false,
    },
    images: {
      type: DataTypes.ARRAY(DataTypes.STRING), // Array of image URLs
      allowNull: false,
      defaultValue: [],
      validate: {
        isEven(value) {
          if (value.length > 10) {
            throw new Error('Only 10 images are allowed!');
          }
        }
      }
    },
    videoUrl: {
      type: DataTypes.STRING,
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User, // This is a reference to another model
        key: 'id', // This is the column name of the referenced model
      },
    },
    authorNickname: { // Denormalized for faster querying and display
      type: DataTypes.STRING,
      allowNull: false,
    },
    authorAvatar: { // Denormalized for faster querying and display
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      defaultValue: "pending",
    },
    rejectReason: {
      type: DataTypes.STRING,
    },
    isDeleted: { // For logical delete
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // createdAt and updatedAt are automatically added by Sequelize by default
  },
  {
    sequelize,
    modelName: "Diary",
    tableName: "diaries", // Explicitly define table name
    timestamps: true, // Enable timestamps (createdAt, updatedAt)
    indexes: [
        { fields: ['title'] },
        { fields: ['authorId'] },
        { fields: ['authorNickname'] },
        { fields: ['status'] },
        { fields: ['isDeleted'] },
    ]
  }
);

// Define associations
// A Diary belongs to a User (Author)
Diary.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
// A User can have many Diaries
User.hasMany(Diary, { foreignKey: 'authorId', as: 'diaries' });

// Hook to populate authorNickname and authorAvatar before saving
Diary.beforeValidate(async (diary, options) => {
  if (diary.authorId && (diary.isNewRecord || diary.changed('authorId'))) {
    const user = await User.findByPk(diary.authorId, { attributes: ['nickname', 'avatarUrl'] });
    if (user) {
      diary.authorNickname = user.nickname;
      diary.authorAvatar = user.avatarUrl;
    }
  }
});

export default Diary;

