/**
 * Logs Service Unit Tests
 * Tests for GET /api/logs endpoint
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const { Log } = require('../shared/models');
const { setupDatabase, seedDatabase, teardownDatabase } = require('./setup');

// Create a test app instance
const app = express();
app.use(express.json());

// Mock the endpoint for testing
app.get('/api/logs', async (req, res) => {
    try {
        const logs = await Log.find({}).sort({ timestamp: -1 });
        res.json(logs);
    } catch (error) {
        res.status(500).json({
            id: null,
            message: error.message
        });
    }
});

describe('Logs Service', () => {
    // Connect to database before all tests
    beforeAll(async () => {
        await setupDatabase();
    });

    // Seed database before each test
    beforeEach(async () => {
        await seedDatabase();
    });

    // Disconnect after all tests
    afterAll(async () => {
        await teardownDatabase();
    });

    describe('GET /api/logs', () => {
        // Test: Should return empty array when no logs exist
        test('should return empty array when no logs exist', async () => {
            await Log.deleteMany({});

            const response = await request(app)
                .get('/api/logs')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(0);
        });

        // Test: Should return all logs
        test('should return all logs', async () => {
            // Create some test logs
            await Log.create([
                { level: 'info', message: 'Test log 1', service: 'test-service' },
                { level: 'warn', message: 'Test log 2', service: 'test-service' },
                { level: 'error', message: 'Test log 3', service: 'test-service' }
            ]);

            const response = await request(app)
                .get('/api/logs')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(3);
        });

        // Test: Logs should contain required properties
        test('logs should contain required properties', async () => {
            await Log.create({
                level: 'info',
                message: 'Test message',
                service: 'test-service',
                method: 'GET',
                url: '/api/test'
            });

            const response = await request(app)
                .get('/api/logs')
                .expect(200);

            expect(response.body[0]).toHaveProperty('level');
            expect(response.body[0]).toHaveProperty('message');
            expect(response.body[0]).toHaveProperty('service');
        });
    });
});
