const request = require('supertest');
const fs = require("fs");
const path = require("path");
const bcrypt = require('bcryptjs');
// 临时数据库文件路径
const TEMP_DB_PATH = path.join(__dirname, 'temp_database.json');
process.env.DB_PATH = TEMP_DB_PATH;
process.env.PORT = 5001
const {
	app,
	startServer,
	readDatabase
} = require('../server'); // 引入你的应用文件
//const mockfs = require('mock-fs');

// 启动服务器
let server;

beforeAll(() => {
	server = startServer(); // 启动服务器
});

afterAll(() => {
	server.close(); // 测试完成后关闭服务器
});

describe('API Server Tests', () => {
	beforeEach(() => {
		// 先加密密码 
		const hashedPassword = bcrypt.hashSync('testpassword', 10);
		const initialData = {
			users: [{
				id: 1,
				username: "John Doe",
				password: hashedPassword,
			}],
			posts: [{
				id: 1,
				title: 'test title',
				summary: 'test summary',
				content: 'test content',
				author: "John Doe",
				createdAt: '2025-01-03T06:12:28.551Z',
				updatedAt: '2025-01-03T06:12:28.551Z'
			}],
		};
		fs.writeFileSync(TEMP_DB_PATH, JSON.stringify(initialData, null, 2));

		//mockfs({
		//  'database.json': JSON.stringify(initialData, null, 2),
		//});
	});

	afterEach(() => {
		if (fs.existsSync(TEMP_DB_PATH)) {
			fs.unlinkSync(TEMP_DB_PATH); // 正确删除文件
			console.log(`Deleted temporary database file: ${TEMP_DB_PATH}`);
		}
		// 清理模拟的文件系统
		//mockfs.restore();
	});

	// 测试register POST请求
	it('should return a 201 status for POST /api/register', async () => {
		const userData = {
			username: 'John Doe123',
			password: 'testpassword',
		};

		const response = await request(app)
			.post('/api/register')
			.send(userData)
			.set('Content-Type', 'application/json');
		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty('message', 'User registered successfully!');
	});

	it('should return a 400 status for POST /api/register with existing user', async () => {
		const userData = {
			username: 'John Doe',
			password: 'testpassword',
		};

		const response = await request(app)
			.post('/api/register')
			.send(userData)
			.set('Content-Type', 'application/json');

		expect(response.status).toBe(400);
		expect(response.body).toHaveProperty('message', 'User already exists!');
	});

	// 测试login POST请求
	it('should return a 200 status for POST /api/login', async () => {
		const userData = {
			username: 'John Doe',
			password: 'testpassword',
		};

		const response = await request(app)
			.post('/api/login')
			.send(userData)
			.set('Content-Type', 'application/json');
		// 确认返回状态码和包含 token
		expect(response.status).toBe(200); // 登录成功应该返回200
		expect(response.body).toHaveProperty('token'); // 登录成功后返回一个token
	});

	// 测试login POST请求
	it('should return a 200 status for GET /api/users/me', async () => {
		const userData = {
			username: 'John Doe',
			password: 'testpassword',
		};

		const response = await request(app)
			.post('/api/login')
			.send(userData)
			.set('Content-Type', 'application/json');

		const token = response.body.token;
		const response1 = await request(app)
			.get('/api/users/me')
			.set('Authorization', `Bearer ${token}`)
			.set('Content-Type', 'application/json')
		expect(response1.status).toBe(200);
		expect(response1.body).toHaveProperty('id', 1);
		expect(response1.body).toHaveProperty('username', 'John Doe');
	});

	it('should return a 200 status for GET /api/posts/1', async () => {
		const userData = {
			username: 'John Doe',
			password: 'testpassword',
		};

		const response = await request(app)
			.post('/api/login')
			.send(userData)
			.set('Content-Type', 'application/json');

		const token = response.body.token
		const response1 = await request(app)
			.get('/api/posts/1')
			.set('Authorization', `Bearer ${token}`)
			.set('Content-Type', 'application/json')

		expect(response1.status).toBe(200);
		expect(response1.body).toHaveProperty('id', 1);
		expect(response1.body).toHaveProperty('title', 'test title');
	})

	it('should return a 200 status for GET /api/posts', async () => {
		const userData = {
			username: 'John Doe',
			password: 'testpassword',
		};

		const response = await request(app)
			.post('/api/login')
			.send(userData)
			.set('Content-Type', 'application/json');

		const token = response.body.token
		const response1 = await request(app)
			.get('/api/posts')
			.set('Authorization', `Bearer ${token}`)
			.set('Content-Type', 'application/json')

		expect(response1.status).toBe(200);
		expect(Array.isArray(response.body))
		expect(response.body.length === 1)
	})


	it('should return a 201 status for POST /api/posts', async () => {
		const userData = {
			username: 'John Doe',
			password: 'testpassword',
		};

		const response = await request(app)
			.post('/api/login')
			.send(userData)
			.set('Content-Type', 'application/json');

		const token = response.body.token
		const postData = {
			title: 'test title1',
			summary: 'test summary',
			content: 'test content',
			author_id: 1,
		};

		const response1 = await request(app)
			.post('/api/posts')
			.send(postData)
			.set('Authorization', `Bearer ${token}`)
			.set('Content-Type', 'application/json')

		expect(response1.status).toBe(201);
		expect(response1.body).toHaveProperty('id', 2);
		expect(response1.body).toHaveProperty('title', 'test title1');
	})

	it('should return a 200 status for PUT /api/posts/1', async () => {
		const userData = {
			username: 'John Doe',
			password: 'testpassword',
		};

		const response = await request(app)
			.post('/api/login')
			.send(userData)
			.set('Content-Type', 'application/json');

		const token = response.body.token
		const postData = {
			title: 'test title2',
			summary: 'test summary2',
			content: 'test content2',
		};

		const response1 = await request(app)
			.put('/api/posts/1')
			.send(postData)
			.set('Authorization', `Bearer ${token}`)
			.set('Content-Type', 'application/json')

		expect(response1.status).toBe(200);
		expect(response1.body).toHaveProperty('id', 1);
		expect(response1.body).toHaveProperty('title', 'test title2');
		expect(response1.body).toHaveProperty('summary', 'test summary2');
		expect(response1.body).toHaveProperty('content', 'test content2');
	})

	it('should return a 200 status for Delete /api/posts/1', async () => {
		const userData = {
			username: 'John Doe',
			password: 'testpassword',
		};

		const response = await request(app)
			.post('/api/login')
			.send(userData)
			.set('Content-Type', 'application/json');

		const token = response.body.token

		const response1 = await request(app)
			.delete('/api/posts/1')
			.set('Authorization', `Bearer ${token}`)
			.set('Content-Type', 'application/json')

		expect(response1.status).toBe(200);
		expect(response1.body.length === 0)
	})

});