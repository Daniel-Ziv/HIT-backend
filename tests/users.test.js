/**
 * Users Service Unit Tests
 * Tests for:
 *   - GET /api/users
 *   - GET /api/users/:id
 *   - POST /api/add (user)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const { User, Cost } = require('../shared/models');
const { setupDatabase, seedDatabase, teardownDatabase, TEST_USER } = require('./setup');

// Create a test app instance
const app = express();
app.use(express.json());

// GET /api/users endpoint
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}).select('-__v');
        res.json(users);
    } catch (error) {
        res.status(500).json({ id: null, message: error.message });
    }
});

// GET /api/users/:id endpoint
app.get('/api/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);

        if (isNaN(userId)) {
            return res.status(400).json({
                id: req.params.id,
                message: 'Invalid user ID. Must be a number.'
            });
        }

        const user = await User.findOne({ id: userId });

        if (!user) {
            return res.status(404).json({ id: userId, message: 'User not found' });
        }

        const costsAggregate = await Cost.aggregate([
            { $match: { userid: userId } },
            { $group: { _id: null, total: { $sum: { $toDouble: '$sum' } } } }
        ]);

        const total = costsAggregate.length > 0 ? costsAggregate[0].total : 0;

        res.json({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            total: total
        });
    } catch (error) {
        res.status(500).json({ id: req.params.id, message: error.message });
    }
});

// POST /api/add (user) endpoint
app.post('/api/add', async (req, res) => {
    try {
        const { id, first_name, last_name, birthday } = req.body;

        if (id === undefined || id === null) {
            return res.status(400).json({ id: null, message: 'User ID is required' });
        }

        if (!first_name || typeof first_name !== 'string') {
            return res.status(400).json({ id: id, message: 'First name is required and must be a string' });
        }

        if (!last_name || typeof last_name !== 'string') {
            return res.status(400).json({ id: id, message: 'Last name is required and must be a string' });
        }

        if (!birthday) {
            return res.status(400).json({ id: id, message: 'Birthday is required' });
        }

        const userId = parseInt(id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ id: id, message: 'User ID must be a number' });
        }

        const existingUser = await User.findOne({ id: userId });
        if (existingUser) {
            return res.status(400).json({ id: userId, message: 'A user with this ID already exists' });
        }

        const birthdayDate = new Date(birthday);
        if (isNaN(birthdayDate.getTime())) {
            return res.status(400).json({ id: userId, message: 'Invalid birthday format' });
        }

        const newUser = new User({
            id: userId,
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            birthday: birthdayDate
        });

        await newUser.save();

        res.status(201).json({
            id: newUser.id,
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            birthday: newUser.birthday
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ id: req.body.id, message: 'A user with this ID already exists' });
        }
        res.status(500).json({ id: req.body.id || null, message: error.message });
    }
});

describe('Users Service', () => {
    beforeAll(async () => {
        await setupDatabase();
    });

    beforeEach(async () => {
        await seedDatabase();
    });

    afterAll(async () => {
        await teardownDatabase();
    });

    describe('GET /api/users', () => {
        // Test: Should return all users
        test('should return all users', async () => {
            const response = await request(app)
                .get('/api/users')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
        });

        // Test: Should return users with correct properties
        test('should return users with correct properties', async () => {
            const response = await request(app)
                .get('/api/users')
                .expect(200);

            const user = response.body.find(u => u.id === TEST_USER.id);
            expect(user).toBeDefined();
            expect(user.id).toBe(TEST_USER.id);
            expect(user.first_name).toBe(TEST_USER.first_name);
            expect(user.last_name).toBe(TEST_USER.last_name);
        });
    });

    describe('GET /api/users/:id', () => {
        // Test: Should return user details with total costs
        test('should return user details with total costs', async () => {
            const response = await request(app)
                .get(`/api/users/${TEST_USER.id}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.id).toBe(TEST_USER.id);
            expect(response.body.first_name).toBe(TEST_USER.first_name);
            expect(response.body.last_name).toBe(TEST_USER.last_name);
            expect(response.body).toHaveProperty('total');
        });

        // Test: Should return 404 for non-existent user
        test('should return 404 for non-existent user', async () => {
            const response = await request(app)
                .get('/api/users/999999')
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toContain('not found');
        });

        // Test: Should return 400 for invalid user ID
        test('should return 400 for invalid user ID', async () => {
            const response = await request(app)
                .get('/api/users/invalid')
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message');
        });

        // Test: Should calculate total costs correctly
        test('should calculate total costs correctly', async () => {
            // Add some costs for the test user
            const now = new Date();
            await Cost.create([
                {
                    description: 'Test cost 1',
                    category: 'food',
                    userid: TEST_USER.id,
                    sum: 50.5,
                    day: now.getDate(),
                    month: now.getMonth() + 1,
                    year: now.getFullYear()
                },
                {
                    description: 'Test cost 2',
                    category: 'health',
                    userid: TEST_USER.id,
                    sum: 100.0,
                    day: now.getDate(),
                    month: now.getMonth() + 1,
                    year: now.getFullYear()
                }
            ]);

            const response = await request(app)
                .get(`/api/users/${TEST_USER.id}`)
                .expect(200);

            expect(response.body.total).toBeCloseTo(150.5, 1);
        });
    });

    describe('POST /api/add (user)', () => {
        // Test: Should add a new user successfully
        test('should add a new user successfully', async () => {
            const newUser = {
                id: 999999,
                first_name: 'Test',
                last_name: 'User',
                birthday: '1995-05-15'
            };

            const response = await request(app)
                .post('/api/add')
                .send(newUser)
                .expect('Content-Type', /json/)
                .expect(201);

            expect(response.body.id).toBe(newUser.id);
            expect(response.body.first_name).toBe(newUser.first_name);
            expect(response.body.last_name).toBe(newUser.last_name);
        });

        // Test: Should return 400 when id is missing
        test('should return 400 when id is missing', async () => {
            const response = await request(app)
                .post('/api/add')
                .send({ first_name: 'Test', last_name: 'User', birthday: '1990-01-01' })
                .expect(400);

            expect(response.body).toHaveProperty('message');
        });

        // Test: Should return 400 when first_name is missing
        test('should return 400 when first_name is missing', async () => {
            const response = await request(app)
                .post('/api/add')
                .send({ id: 111111, last_name: 'User', birthday: '1990-01-01' })
                .expect(400);

            expect(response.body.message).toContain('First name');
        });

        // Test: Should return 400 when last_name is missing
        test('should return 400 when last_name is missing', async () => {
            const response = await request(app)
                .post('/api/add')
                .send({ id: 111111, first_name: 'Test', birthday: '1990-01-01' })
                .expect(400);

            expect(response.body.message).toContain('Last name');
        });

        // Test: Should return 400 when birthday is missing
        test('should return 400 when birthday is missing', async () => {
            const response = await request(app)
                .post('/api/add')
                .send({ id: 111111, first_name: 'Test', last_name: 'User' })
                .expect(400);

            expect(response.body.message).toContain('Birthday');
        });

        // Test: Should return 400 for duplicate user ID
        test('should return 400 for duplicate user ID', async () => {
            const response = await request(app)
                .post('/api/add')
                .send({
                    id: TEST_USER.id,
                    first_name: 'Duplicate',
                    last_name: 'User',
                    birthday: '1990-01-01'
                })
                .expect(400);

            expect(response.body.message).toContain('already exists');
        });
    });
});
