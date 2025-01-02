const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "database.json");
console.log(`Enjoy the DB file: ${DB_PATH}`)
// Middleware
app.use(cors());
app.use(express.json());

// 读取数据库
function readDatabase() {
	try {
		const data = fs.readFileSync(DB_PATH, "utf8");
		return JSON.parse(data);
	} catch (err) {
		console.error('Error reading or parsing database.json:', err);
		throw err;
	}
}

// 写入数据库
function writeDatabase(data) {
	fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

// 秘密密钥用于 JWT 签名
const JWT_SECRET = "123";

// 注册新用户
app.post("/api/register", async (req, res) => {
	//console.log('Received request to register...');
	const {
		username,
		password
	} = req.body;
	// 检查用户名是否已经存在
	const db = readDatabase();
	const existingUser = db.users?.find((u) => u.username === username);
	if (existingUser) return res.status(400).send("User already exists");

	// 加密密码
	const newUser = {
		id: db.users.length + 1,
		username,
		password: bcrypt.hashSync(password, 10)
	};
	db.users.push(newUser);
	writeDatabase(db);

	res.status(201).json({
		message: "User registered successfully"
	});
});

// 登录
app.post("/api/login", async (req, res) => {
	//console.log('Received request to login...');
	const {
		username,
		password
	} = req.body;
	const db = readDatabase();
	const user = db.users.find((u) => u.username === username);
	if (!user) return res.status(400).send("Invalid username or password");

	// 检查密码是否匹配
	const isMatch = await bcrypt.compare(password, user.password);
	if (!isMatch) return res.status(400).send("Invalid username or password");

	// 创建 JWT
	const token = jwt.sign({
			userId: user.id,
			username: user.username
		},
		JWT_SECRET, {
			expiresIn: "1h", // token 1小时后过期
		}
	);

	res.json({
		token
	});
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
// 获取当前用户信息
app.get("/api/users/me", authenticateJWT, (req, res) => {
	const db = readDatabase()
	const users = db.users
	const user = users?.find((u) => u.id === req.user.userId);
	if (!user) return res.status(404).send("User not found");
	res.json(user);
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
	const {
		title,
		content
	} = req.body;
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

// 启动服务器
const startServer = () => {
	return app.listen(PORT, () => {
		console.log(`Server running on http://localhost:${PORT}`);
	});
};

// 导出应用实例和启动函数
module.exports = {
	app,
	startServer,
	readDatabase
};