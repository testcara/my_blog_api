const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// 模拟数据库
let users = [];

let posts = [
  {
    id: 1,
    title: "First Post",
    summary: "summary 1",
    content: "This is my first post!",
    author: "wlin111",
    liked_by: [],
    updatedAt: "2024-12-19 20:10:30",
    createdAt: "2024-12-19 20:10:30",
  },
];

// 秘密密钥用于 JWT 签名
const JWT_SECRET = "your_jwt_secret_key";

// 注册新用户
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  // 检查用户名是否已经存在
  const existingUser = users.find((u) => u.username === username);
  if (existingUser) return res.status(400).send("User already exists");

  // 加密密码
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { id: users.length + 1, username, password: hashedPassword };
  users.push(newUser);
  res.status(201).json({ message: "User registered successfully" });
});

// 登录
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username);
  if (!user) return res.status(400).send("Invalid username or password");

  // 检查密码是否匹配
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).send("Invalid username or password");

  // 创建 JWT
  const token = jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    {
      expiresIn: "1h", // token 1小时后过期
    }
  );

  res.json({ token });
});

// 获取所有帖子
app.get("/api/posts", (req, res) => {
  res.json(posts);
});

// 获取单个帖子
app.get("/api/posts/:id", (req, res) => {
  const post = posts.find((p) => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).send("Post not found");
  res.json(post);
});

// 创建新帖子（需要认证）
app.post("/api/posts", authenticateJWT, (req, res) => {
  const { title, content } = req.body;
  const newPost = {
    id: posts.length + 1,
    title,
    summary,
    content,
    author: req.user.username, // 使用请求中的用户名
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  posts.push(newPost);
  res.status(201).json(newPost);
});

// 中间件：JWT 认证
function authenticateJWT(req, res, next) {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(403).send("Access denied");

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).send("Invalid token");
    req.user = user; // 将用户信息附加到请求对象
    next();
  });
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
