/**
 * Costs Service Unit Tests
 * Tests for:
 *   - POST /api/add (cost)
 *   - GET /api/report
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const { User, Cost, Report } = require('../shared/models');
const { setupDatabase, seedDatabase, teardownDatabase, TEST_USER } = require('./setup');

// Valid categories
const VALID_CATEGORIES = ['food', 'health', 'housing', 'sports', 'education'];

// Helper function to check if month is in past
function isMonthInPast(year, month) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (year < currentYear) return true;
    if (year === currentYear && month < currentMonth) return true;
    return false;
}

// Generate report function
async function generateReport(userid, year, month) {
    const costs = await Cost.find({ userid, year, month });

    const costsArray = VALID_CATEGORIES.map(category => {
        const categoryCosts = costs
            .filter(cost => cost.category === category)
            .map(cost => ({
                sum: parseFloat(cost.sum.toString()),
                description: cost.description,
                day: cost.day
            }));

        return { [category]: categoryCosts };
    });

    return { userid, year, month, costs: costsArray };
}

// Create test app instance
const app = express();
app.use(express.json());

// POST /api/add (cost) endpoint
app.post('/api/add', async (req, res) => {
    try {
        const { description, category, userid, sum, day, month, year } = req.body;

        if (!description || typeof description !== 'string') {
            return res.status(400).json({ id: null, message: 'Description is required' });
        }

        if (!category || typeof category !== 'string') {
            return res.status(400).json({ id: null, message: 'Category is required' });
        }

        const normalizedCategory = category.toLowerCase().trim();
        if (!VALID_CATEGORIES.includes(normalizedCategory)) {
            return res.status(400).json({
                id: null,
                message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}`
            });
        }

        if (userid === undefined || userid === null) {
            return res.status(400).json({ id: null, message: 'User ID is required' });
        }

        const parsedUserid = parseInt(userid, 10);
        if (isNaN(parsedUserid)) {
            return res.status(400).json({ id: userid, message: 'User ID must be a number' });
        }

        if (sum === undefined || sum === null) {
            return res.status(400).json({ id: parsedUserid, message: 'Sum is required' });
        }

        const parsedSum = parseFloat(sum);
        if (isNaN(parsedSum)) {
            return res.status(400).json({ id: parsedUserid, message: 'Sum must be a number' });
        }

        const userExists = await User.findOne({ id: parsedUserid });
        if (!userExists) {
            return res.status(404).json({
                id: parsedUserid,
                message: 'User not found. Cannot add cost for non-existent user.'
            });
        }

        const now = new Date();
        let costDay = day !== undefined ? parseInt(day, 10) : now.getDate();
        let costMonth = month !== undefined ? parseInt(month, 10) : now.getMonth() + 1;
        let costYear = year !== undefined ? parseInt(year, 10) : now.getFullYear();

        if (isMonthInPast(costYear, costMonth)) {
            return res.status(400).json({
                id: parsedUserid,
                message: 'Cannot add costs with dates in the past'
            });
        }

        const newCost = new Cost({
            description: description.trim(),
            category: normalizedCategory,
            userid: parsedUserid,
            sum: parsedSum,
            day: costDay,
            month: costMonth,
            year: costYear,
            created_at: new Date(costYear, costMonth - 1, costDay)
        });

        await newCost.save();

        res.status(201).json({
            description: newCost.description,
            category: newCost.category,
            userid: newCost.userid,
            sum: parseFloat(newCost.sum.toString()),
            day: newCost.day,
            month: newCost.month,
            year: newCost.year,
            _id: newCost._id
        });
    } catch (error) {
        res.status(500).json({ id: req.body.userid || null, message: error.message });
    }
});

// GET /api/report endpoint
app.get('/api/report', async (req, res) => {
    try {
        const { id, year, month } = req.query;

        if (id === undefined || id === null) {
            return res.status(400).json({ id: null, message: 'User ID (id) is required' });
        }

        if (year === undefined || year === null) {
            return res.status(400).json({ id: id, message: 'Year is required' });
        }

        if (month === undefined || month === null) {
            return res.status(400).json({ id: id, message: 'Month is required' });
        }

        const parsedId = parseInt(id, 10);
        const parsedYear = parseInt(year, 10);
        const parsedMonth = parseInt(month, 10);

        if (isNaN(parsedId)) {
            return res.status(400).json({ id: id, message: 'User ID must be a number' });
        }

        if (isNaN(parsedYear) || parsedYear < 1900) {
            return res.status(400).json({ id: parsedId, message: 'Year must be a valid year' });
        }

        if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
            return res.status(400).json({ id: parsedId, message: 'Month must be between 1 and 12' });
        }

        const userExists = await User.findOne({ id: parsedId });
        if (!userExists) {
            return res.status(404).json({ id: parsedId, message: 'User not found' });
        }

        const isPastMonth = isMonthInPast(parsedYear, parsedMonth);

        if (isPastMonth) {
            const cachedReport = await Report.findOne({
                userid: parsedId,
                year: parsedYear,
                month: parsedMonth
            });

            if (cachedReport) {
                return res.json({
                    userid: cachedReport.userid,
                    year: cachedReport.year,
                    month: cachedReport.month,
                    costs: cachedReport.costs
                });
            }
        }

        const report = await generateReport(parsedId, parsedYear, parsedMonth);

        if (isPastMonth) {
            try {
                const newReport = new Report({
                    userid: parsedId,
                    year: parsedYear,
                    month: parsedMonth,
                    costs: report.costs
                });
                await newReport.save();
            } catch (cacheError) {
                // Ignore caching errors
            }
        }

        res.json(report);
    } catch (error) {
        res.status(500).json({ id: req.query.id || null, message: error.message });
    }
});

describe('Costs Service', () => {
    beforeAll(async () => {
        await setupDatabase();
    });

    beforeEach(async () => {
        await seedDatabase();
    });

    afterAll(async () => {
        await teardownDatabase();
    });

    describe('POST /api/add (cost)', () => {
        // Test: Should add a cost item successfully
        test('should add a cost item successfully', async () => {
            const now = new Date();
            const newCost = {
                description: 'Lunch',
                category: 'food',
                userid: TEST_USER.id,
                sum: 25.50,
                day: now.getDate(),
                month: now.getMonth() + 1,
                year: now.getFullYear()
            };

            const response = await request(app)
                .post('/api/add')
                .send(newCost)
                .expect('Content-Type', /json/)
                .expect(201);

            expect(response.body.description).toBe(newCost.description);
            expect(response.body.category).toBe(newCost.category);
            expect(response.body.userid).toBe(newCost.userid);
            expect(response.body.sum).toBeCloseTo(newCost.sum, 2);
        });

        // Test: Should use current date if not provided
        test('should use current date if not provided', async () => {
            const now = new Date();
            const newCost = {
                description: 'Coffee',
                category: 'food',
                userid: TEST_USER.id,
                sum: 5.00
            };

            const response = await request(app)
                .post('/api/add')
                .send(newCost)
                .expect(201);

            expect(response.body.day).toBe(now.getDate());
            expect(response.body.month).toBe(now.getMonth() + 1);
            expect(response.body.year).toBe(now.getFullYear());
        });

        // Test: Should return 400 for invalid category
        test('should return 400 for invalid category', async () => {
            const newCost = {
                description: 'Invalid category test',
                category: 'invalid_category',
                userid: TEST_USER.id,
                sum: 10.00
            };

            const response = await request(app)
                .post('/api/add')
                .send(newCost)
                .expect(400);

            expect(response.body.message).toContain('Category must be one of');
        });

        // Test: Should return 400 when description is missing
        test('should return 400 when description is missing', async () => {
            const response = await request(app)
                .post('/api/add')
                .send({ category: 'food', userid: TEST_USER.id, sum: 10 })
                .expect(400);

            expect(response.body.message).toContain('Description');
        });

        // Test: Should return 400 when category is missing
        test('should return 400 when category is missing', async () => {
            const response = await request(app)
                .post('/api/add')
                .send({ description: 'Test', userid: TEST_USER.id, sum: 10 })
                .expect(400);

            expect(response.body.message).toContain('Category');
        });

        // Test: Should return 400 when userid is missing
        test('should return 400 when userid is missing', async () => {
            const response = await request(app)
                .post('/api/add')
                .send({ description: 'Test', category: 'food', sum: 10 })
                .expect(400);

            expect(response.body.message).toContain('User ID');
        });

        // Test: Should return 400 when sum is missing
        test('should return 400 when sum is missing', async () => {
            const response = await request(app)
                .post('/api/add')
                .send({ description: 'Test', category: 'food', userid: TEST_USER.id })
                .expect(400);

            expect(response.body.message).toContain('Sum');
        });

        // Test: Should return 404 for non-existent user
        test('should return 404 for non-existent user', async () => {
            const response = await request(app)
                .post('/api/add')
                .send({
                    description: 'Test',
                    category: 'food',
                    userid: 999999,
                    sum: 10.00
                })
                .expect(404);

            expect(response.body.message).toContain('User not found');
        });

        // Test: Should accept all valid categories
        test('should accept all valid categories', async () => {
            const now = new Date();

            for (const category of VALID_CATEGORIES) {
                const response = await request(app)
                    .post('/api/add')
                    .send({
                        description: `Test ${category}`,
                        category: category,
                        userid: TEST_USER.id,
                        sum: 10.00
                    })
                    .expect(201);

                expect(response.body.category).toBe(category);
            }
        });

        // Test: Should not allow costs with past dates
        test('should not allow costs with past dates', async () => {
            const response = await request(app)
                .post('/api/add')
                .send({
                    description: 'Past cost',
                    category: 'food',
                    userid: TEST_USER.id,
                    sum: 10.00,
                    day: 1,
                    month: 1,
                    year: 2020
                })
                .expect(400);

            expect(response.body.message).toContain('past');
        });
    });

    describe('GET /api/report', () => {
        // Test: Should return report with all categories
        test('should return report with all categories', async () => {
            const now = new Date();

            const response = await request(app)
                .get('/api/report')
                .query({
                    id: TEST_USER.id,
                    year: now.getFullYear(),
                    month: now.getMonth() + 1
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.userid).toBe(TEST_USER.id);
            expect(response.body.year).toBe(now.getFullYear());
            expect(response.body.month).toBe(now.getMonth() + 1);
            expect(Array.isArray(response.body.costs)).toBe(true);
            expect(response.body.costs.length).toBe(5);

            // Check all categories are present
            const categoryNames = response.body.costs.map(c => Object.keys(c)[0]);
            VALID_CATEGORIES.forEach(cat => {
                expect(categoryNames).toContain(cat);
            });
        });

        // Test: Should return costs grouped by category
        test('should return costs grouped by category', async () => {
            const now = new Date();

            // Add some costs
            await Cost.create([
                {
                    description: 'Pizza',
                    category: 'food',
                    userid: TEST_USER.id,
                    sum: 30,
                    day: now.getDate(),
                    month: now.getMonth() + 1,
                    year: now.getFullYear()
                },
                {
                    description: 'Gym membership',
                    category: 'sports',
                    userid: TEST_USER.id,
                    sum: 50,
                    day: now.getDate(),
                    month: now.getMonth() + 1,
                    year: now.getFullYear()
                }
            ]);

            const response = await request(app)
                .get('/api/report')
                .query({
                    id: TEST_USER.id,
                    year: now.getFullYear(),
                    month: now.getMonth() + 1
                })
                .expect(200);

            const foodCategory = response.body.costs.find(c => c.food);
            const sportsCategory = response.body.costs.find(c => c.sports);

            expect(foodCategory.food.length).toBe(1);
            expect(foodCategory.food[0].description).toBe('Pizza');
            expect(sportsCategory.sports.length).toBe(1);
            expect(sportsCategory.sports[0].description).toBe('Gym membership');
        });

        // Test: Should return 400 when id is missing
        test('should return 400 when id is missing', async () => {
            const response = await request(app)
                .get('/api/report')
                .query({ year: 2025, month: 1 })
                .expect(400);

            expect(response.body.message).toContain('User ID');
        });

        // Test: Should return 400 when year is missing
        test('should return 400 when year is missing', async () => {
            const response = await request(app)
                .get('/api/report')
                .query({ id: TEST_USER.id, month: 1 })
                .expect(400);

            expect(response.body.message).toContain('Year');
        });

        // Test: Should return 400 when month is missing
        test('should return 400 when month is missing', async () => {
            const response = await request(app)
                .get('/api/report')
                .query({ id: TEST_USER.id, year: 2025 })
                .expect(400);

            expect(response.body.message).toContain('Month');
        });

        // Test: Should return 404 for non-existent user
        test('should return 404 for non-existent user', async () => {
            const response = await request(app)
                .get('/api/report')
                .query({ id: 999999, year: 2025, month: 1 })
                .expect(404);

            expect(response.body.message).toContain('User not found');
        });

        // Test: Should return 400 for invalid month
        test('should return 400 for invalid month', async () => {
            const response = await request(app)
                .get('/api/report')
                .query({ id: TEST_USER.id, year: 2025, month: 13 })
                .expect(400);

            expect(response.body.message).toContain('Month');
        });

        // Test: Each cost should have sum, description, and day
        test('each cost should have sum, description, and day', async () => {
            const now = new Date();

            await Cost.create({
                description: 'Test item',
                category: 'food',
                userid: TEST_USER.id,
                sum: 25.50,
                day: 15,
                month: now.getMonth() + 1,
                year: now.getFullYear()
            });

            const response = await request(app)
                .get('/api/report')
                .query({
                    id: TEST_USER.id,
                    year: now.getFullYear(),
                    month: now.getMonth() + 1
                })
                .expect(200);

            const foodCategory = response.body.costs.find(c => c.food);
            const cost = foodCategory.food[0];

            expect(cost).toHaveProperty('sum');
            expect(cost).toHaveProperty('description');
            expect(cost).toHaveProperty('day');
            expect(cost.day).toBe(15);
        });
    });
});
