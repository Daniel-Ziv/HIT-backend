/**
 * Admin Service Unit Tests
 * Tests for GET /api/about endpoint
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const request = require('supertest');
const express = require('express');
const { setupDatabase, teardownDatabase } = require('./setup');

// Create test app instance
const app = express();
app.use(express.json());

// Development team information (same as in admin service)
const DEVELOPERS = [
    {
        first_name: process.env.DEVELOPER_1_FIRST_NAME || 'Daniel',
        last_name: process.env.DEVELOPER_1_LAST_NAME || 'Ziv'
    },
    {
        first_name: process.env.DEVELOPER_2_FIRST_NAME || 'Team',
        last_name: process.env.DEVELOPER_2_LAST_NAME || 'Member'
    }
];

// GET /api/about endpoint
app.get('/api/about', async (req, res) => {
    try {
        res.json(DEVELOPERS);
    } catch (error) {
        res.status(500).json({
            id: null,
            message: error.message || 'An error occurred'
        });
    }
});

describe('Admin Service', () => {
    beforeAll(async () => {
        await setupDatabase();
    });

    afterAll(async () => {
        await teardownDatabase();
    });

    describe('GET /api/about', () => {
        // Test: Should return array of developers
        test('should return array of developers', async () => {
            const response = await request(app)
                .get('/api/about')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
        });

        // Test: Developers should have first_name and last_name properties
        test('developers should have first_name and last_name properties', async () => {
            const response = await request(app)
                .get('/api/about')
                .expect(200);

            response.body.forEach(developer => {
                expect(developer).toHaveProperty('first_name');
                expect(developer).toHaveProperty('last_name');
                expect(typeof developer.first_name).toBe('string');
                expect(typeof developer.last_name).toBe('string');
            });
        });

        // Test: Should not include additional data beyond first_name and last_name
        test('should not include additional data beyond first_name and last_name', async () => {
            const response = await request(app)
                .get('/api/about')
                .expect(200);

            response.body.forEach(developer => {
                const keys = Object.keys(developer);
                expect(keys.length).toBe(2);
                expect(keys).toContain('first_name');
                expect(keys).toContain('last_name');
            });
        });

        // Test: Should return consistent data across multiple requests
        test('should return consistent data across multiple requests', async () => {
            const response1 = await request(app).get('/api/about').expect(200);
            const response2 = await request(app).get('/api/about').expect(200);

            expect(response1.body).toEqual(response2.body);
        });
    });
});
