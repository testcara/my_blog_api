const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs").promises; // Use the Promise-based fs module for async operations
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "database.json");
const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret"; // Move to env variable

// Middleware
app.use(cors());
app.use(express.json());

// Utility function to read the database (Async version)
async function readDatabase() {
	try {
		const data = await fs.readFile(DB_PATH, "utf8");
		return JSON.parse(data);
	} catch (err) {
		console.error('Error reading or parsing database.json:', err);
		throw new Error("Error reading database");
	}
}

// Utility function to write to the database (Async version)
async function writeDatabase(data) {
	try {
		await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf8");
	} catch (err) {
		console.error('Error writing to database.json:', err);
		throw new Error("Error writing to database");
	}
}

// JWT Authentication Middleware
function authenticateJWT(req, res, next) {
	console.log("--- verifying token ---")
	const token = req.header("Authorization")?.replace("Bearer ", "");
	if (!token) return res.status(403).send("Access denied");

	jwt.verify(token, JWT_SECRET, (err, user) => {
		if (err) return res.status(403).send("Invalid token");
		req.user = user; // Attach user info to the request object
		next();
	});
}

// Register new user
app.post("/api/register", async (req, res) => {
	const {
		username,
		password
	} = req.body;

	try {
		const db = await readDatabase();
		const existingUser = db.users.find((u) => u.username === username);
		if (existingUser) return res.status(400).json({
			message: "User already exists!"
		});

		const hashedPassword = await bcrypt.hash(password, 10);
		const newUser = {
			id: db.users.length + 1,
			username,
			password: hashedPassword,
		};

		db.users.push(newUser);
		await writeDatabase(db);

		res.status(201).json({
			message: "User registered successfully!"
		});
	} catch (err) {
		res.status(500).json({
			message: "Server error, please try again later."
		});
	}
});

// Login user
app.post("/api/login", async (req, res) => {
	const {
		username,
		password
	} = req.body;

	try {
		const db = await readDatabase();
		const user = db.users.find((u) => u.username === username);
		if (!user) return res.status(400).send("User does not exist!");

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) return res.status(400).send("Invalid username or password");

		const token = jwt.sign({
			userId: user.id,
			username: user.username
		}, JWT_SECRET, {
			expiresIn: "1h"
		});
		res.json({
			token
		});
	} catch (err) {
		res.status(500).json({
			message: "Server error, please try again later."
		});
	}
});

// Get current user info
app.get("/api/users/me", authenticateJWT, async (req, res) => {
	try {
		const db = await readDatabase();
		const user = db.users.find((u) => u.id === req.user.userId);
		if (!user) return res.status(404).send("User not found");

		res.json(user);
	} catch (err) {
		res.status(500).json({
			message: "Server error, please try again later."
		});
	}
});

// Get all posts
app.get("/api/posts", authenticateJWT, async (req, res) => {
	try {
		const db = await readDatabase();
		res.json(db.posts);
	} catch (err) {
		res.status(500).json({
			message: "Server error, please try again later."
		});
	}
});

// Get single post
app.get("/api/posts/:id", authenticateJWT, async (req, res) => {
	try {
		const db = await readDatabase();
		const post = db.posts.find((p) => p.id === parseInt(req.params.id));
		if (!post) return res.status(404).send("Post not found");

		res.json(post);
	} catch (err) {
		res.status(500).json({
			message: "Server error, please try again later."
		});
	}
});

// Update post
app.put("/api/posts/:id", authenticateJWT, async (req, res) => {
	const {
		title,
		summary,
		content
	} = req.body;

	try {
		const db = await readDatabase();
		const postIndex = db.posts.findIndex((p) => p.id === parseInt(req.params.id));

		if (postIndex === -1) return res.status(404).send("Post not found");

		const updatedPost = {
			...db.posts[postIndex],
			title,
			summary,
			content,
			updatedAt: new Date().toISOString(),
		};

		db.posts[postIndex] = updatedPost;
		await writeDatabase(db);
		res.status(200).json(updatedPost);
	} catch (err) {
		res.status(500).json({
			message: "Server error, please try again later."
		});
	}
});

// Delete post
app.delete("/api/posts/:id", authenticateJWT, async (req, res) => {
	try {
		const db = await readDatabase();
		const postIndex = db.posts.findIndex((p) => p.id === parseInt(req.params.id));

		if (postIndex === -1) return res.status(404).send("Post not found");

		db.posts = db.posts.filter((p) => p.id !== parseInt(req.params.id))
		await writeDatabase(db);
		res.status(200).json(db.posts);
	} catch (err) {
		res.status(500).json({
			message: "Server error, please try again later."
		});
	}
});

// Create new post
app.post("/api/posts", authenticateJWT, async (req, res) => {
	console.log('--- create post ---')
	const {
		title,
		summary,
		content
	} = req.body;

	try {
		const db = await readDatabase();
		const newPost = {
			id: db.posts.length + 1,
			title,
			summary,
			content,
			author: req.user.username,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		console.log(`test post ${db}`)
		db.posts.push(newPost);
		await writeDatabase(db);
		res.status(201).json(newPost);
	} catch (err) {
		res.status(500).json({
			message: "Server error, please try again later."
		});
	}
});

// Start server
const startServer = () => {
	return app.listen(PORT, () => {
		console.log(`Server running on http://localhost:${PORT}`);
	});
};

if (require.main === module) {
	startServer();
}

module.exports = {
	app,
	startServer,
	readDatabase
};