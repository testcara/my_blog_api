const request = require('supertest');
const fs = require("fs");
const path = require("path");
const bcrypt = require('bcryptjs');
// 临时数据库文件路径
const TEMP_DB_PATH = path.join(__dirname, 'temp_database.json');
process.env.DB_PATH = TEMP_DB_PATH;
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
				"id": 1,
				"username": "John Doe",
				"password": hashedPassword,
			}],
			posts: [],
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
		expect(response.body).toHaveProperty('message', 'User registered successfully');
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
});