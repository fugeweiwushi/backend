# 旅游日记平台 - 后端 (Travel Diary Platform - Backend)

## 项目概述

本项目是旅游日记平台的核心后端服务，为前端应用（包括移动端用户系统和PC端审核管理系统）提供数据支持和业务逻辑处理。后端采用 Node.js 和 Express.js 框架构建，使用 PostgreSQL 作为数据库，并通过 Sequelize ORM 进行数据交互。

### 主要功能：

*   **用户认证与授权**: 提供用户注册、登录接口，支持 JWT (JSON Web Tokens) 进行会话管理和接口保护。区分普通用户、审核员和管理员角色。
*   **游记管理**: 实现游记的创建、读取、更新、删除 (CRUD) 操作。支持图文内容、多图片上传和单视频上传。
*   **审核流程**: 管理员或审核员可以审核用户提交的游记，进行通过、拒绝（附带原因）操作。
*   **数据校验**: 对 API 请求参数进行严格校验，确保数据完整性和安全性。
*   **文件上传**: 使用 Multer 处理图片和视频文件的上传，并存储到服务器指定目录。

## 技术选型

*   **运行时环境**: Node.js
*   **Web框架**: Express.js
*   **数据库**: PostgreSQL
*   **ORM**: Sequelize
*   **认证机制**: JWT (jsonwebtoken)
*   **密码处理**: bcrypt.js (通过 Sequelize hook 实现密码哈希存储和比对)
*   **文件上传**: Multer
*   **输入校验**: express-validator
*   **环境变量管理**: dotenv
*   **包管理**: npm

## API 接口文档 (主要端点)

(详细的 API 文档可以使用 Swagger/OpenAPI 等工具生成，此处列举核心路由供参考)

**基础路径**: `/api`

### 认证模块 (`/auth`)

*   `POST /register`: 用户注册 (username, password, nickname)
*   `POST /login`: 用户登录 (username, password)
*   `GET /me`: 获取当前登录用户信息 (需 Token)

### 游记模块 (`/diaries`)

*   `POST /`: 创建游记 (需 Token, 支持图片/视频上传)
    *   `title`, `content`, `images` (files), `video` (file)
*   `GET /`: 获取所有已通过的游记 (支持分页, 按标题/作者昵称搜索)
    *   Query params: `pageNumber`, `title`, `authorNickname`
*   `GET /my`: 获取当前用户的所有游记 (需 Token)
*   `GET /:id`: 获取指定ID的游记详情 (公开游记或用户自己的未审核游记)
*   `PUT /:id`: 更新指定ID的游记 (需 Token, 仅限作者且游记未通过审核时)
*   `DELETE /:id`: 删除指定ID的游记 (需 Token, 仅限作者)

### 管理员/审核模块 (`/admin`)

*   `POST /auth/login`: 管理员/审核员登录 (username, password)
*   `GET /diaries`: 获取所有游记供审核 (需管理员/审核员 Token, 支持按状态筛选)
    *   Query params: `status` (`pending`, `approved`, `rejected`)
*   `PUT /diaries/:id/approve`: 通过指定ID的游记 (需管理员/审核员 Token)
*   `PUT /diaries/:id/reject`: 拒绝指定ID的游记 (需管理员/审核员 Token)
    *   Body: `rejectReason` (string, optional)
*   `DELETE /diaries/:id`: (逻辑)删除指定ID的游记 (需管理员 Token)

## 项目结构 (简化)

```
/travel-diary-backend
├── config/                 # 配置文件 (数据库连接, JWT密钥等)
│   └── index.js
├── controllers/            # 控制器 (处理请求逻辑)
│   ├── authController.js
│   ├── diaryController.js
│   └── adminController.js
├── middlewares/            # 中间件 (认证, 文件上传, 错误处理等)
│   ├── authMiddleware.js
│   └── uploadMiddleware.js
├── models/                 # Sequelize 数据模型
│   ├── User.js
│   └── Diary.js
├── routes/                 # API 路由定义
│   ├── authRoutes.js
│   ├── diaryRoutes.js
│   └── adminRoutes.js
├── uploads/                # 文件上传存储目录 (需手动创建或由代码创建)
├── .env                    # 环境变量文件
├── app.js                  # Express 应用配置和中间件加载
├── server.js               # 服务器启动入口, 数据库连接
├── package.json
└── README.md
```

## 数据库设计

使用 PostgreSQL 数据库，通过 Sequelize ORM 定义模型。

### 1. `Users` 表

*   `id` (UUID, Primary Key, Default: UUIDV4)
*   `username` (String, Unique, Not Null)
*   `password` (String, Not Null) - 存储哈希后的密码
*   `nickname` (String, Unique, Not Null)
*   `avatarUrl` (String, Default: '/uploads/avatars/default-avatar.png')
*   `role` (Enum: ['user', 'reviewer', 'admin'], Default: 'user')
*   `createdAt` (Date, Not Null)
*   `updatedAt` (Date, Not Null)

### 2. `Diaries` 表

*   `id` (UUID, Primary Key, Default: UUIDV4)
*   `title` (String, Not Null)
*   `content` (Text, Not Null)
*   `images` (Array of Strings - JSONB/TEXT[], 存储图片路径)
*   `videoUrl` (String, Nullable - 存储视频路径)
*   `status` (Enum: ['pending', 'approved', 'rejected'], Default: 'pending')
*   `rejectReason` (String, Nullable)
*   `authorId` (UUID, Foreign Key to `Users.id`, Not Null)
*   `createdAt` (Date, Not Null)
*   `updatedAt` (Date, Not Null)

**关系**: `Users` 和 `Diaries` 之间是一对多关系 (一个用户可以有多篇游记)。

## 安装与启动

1.  **环境要求**:
    *   Node.js (建议 v18 或更高版本)
    *   npm (或 pnpm/yarn)
    *   PostgreSQL 服务已安装并运行

2.  **克隆项目** (如果适用)
    ```bash
    git clone <repository_url>
    cd travel-diary-backend
    ```

3.  **安装依赖**:
    ```bash
    npm install
    ```

4.  **配置PostgreSQL数据库**:
    *   确保 PostgreSQL 服务正在运行。
    *   创建一个名为 `travel_diary` 的数据库 (或与 `.env` 文件中配置的 `DB_NAME` 一致)。
    *   确保 PostgreSQL 用户 (默认为 `postgres`) 具有访问该数据库的权限，并设置密码 (与 `.env` 文件中配置的 `DB_PASSWORD` 一致)。
        ```sql
        -- (在 psql 中执行)
        CREATE DATABASE travel_diary;
        ALTER USER postgres WITH PASSWORD 'your_chosen_password'; 
        ```

5.  **配置环境变量**:
    复制 `.env.example` (如果提供) 或创建一个新的 `.env` 文件在项目根目录，并填入以下配置：
    ```env
    PORT=5000

    # PostgreSQL Configuration
    DB_HOST=localhost
    DB_PORT=5432
    DB_NAME=travel_diary
    DB_USER=postgres
    DB_PASSWORD=your_chosen_password # 替换为你的PostgreSQL用户密码
    DB_DIALECT=postgres

    # JWT Configuration
    JWT_SECRET=your_very_strong_and_long_jwt_secret_key # 务必修改为一个强随机字符串
    JWT_EXPIRES_IN=30d

    # Default Admin User (created on first run if not exists, or for seeding)
    ADMIN_USERNAME=admin
    ADMIN_PASSWORD=secureadminpassword123 # 建议首次启动后修改
    ADMIN_NICKNAME=管理员
    ```
    **重要**: `JWT_SECRET` 必须是一个强大且唯一的密钥。

6.  **创建 `uploads` 目录** (如果代码中未自动创建):
    在项目根目录下创建 `uploads` 文件夹，并在其中创建 `avatars`, `images`, `videos` 子文件夹：
    ```bash
    mkdir -p uploads/avatars uploads/images uploads/videos
    ```

7.  **启动开发服务器**:
    ```bash
    npm run dev 
    ```
    或者直接运行:
    ```bash
    node server.js
    ```
    服务将在 `http://localhost:5000` (或 `.env` 中配置的 `PORT`) 启动。
    Sequelize 会在服务启动时尝试同步数据库模型 (创建表)。

## 注意事项

*   **安全性**: 生产环境中，`JWT_SECRET` 和数据库密码等敏感信息应通过更安全的方式管理（如环境变量注入、密钥管理服务）。
*   **文件存储**: 当前文件存储在本地 `uploads` 目录。生产环境建议使用云存储服务 (如 AWS S3, Google Cloud Storage) 以获得更好的可伸缩性和可靠性。
*   **错误处理**: 项目中包含了基本的错误处理中间件，可根据需求进一步完善。
*   **日志记录**: 生产环境应集成更完善的日志系统 (如 Winston, Pino)。
