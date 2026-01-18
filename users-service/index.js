/**
 * Users Microservice
 * Handles all user-related operations.
 * Endpoints:
 *   - GET /api/users - List all users
 *   - GET /api/users/:id - Get specific user details with total costs
 *   - POST /api/add - Add a new user
 * Port: 3002
 */

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Import required modules
const express = require('express');
const cors = require('cors');
const { connectDB } = require('../shared/db');
const { User, Cost } = require('../shared/models');
const { createLogger, requestLoggerMiddleware } = require('../shared/logger');

// Initialize Express application
const app = express();
const PORT = process.env.PORT || process.env.USERS_PORT || 3002;
const SERVICE_NAME = 'users-service';

// Create logger for this service
const logger = createLogger(SERVICE_NAME);

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLoggerMiddleware(SERVICE_NAME));

/**
 * GET /api/users
 * Retrieves all users from the users collection.
 * Returns a JSON array of all users.
 */
app.get('/api/users', async (req, res) => {
    try {
        await logger.info('Endpoint accessed: GET /api/users');

        // Retrieve all users from the database
        const users = await User.find({}).select('-__v');

        await logger.info('Users retrieved successfully', { count: users.length });

        res.json(users);
    } catch (error) {
        await logger.error('Error retrieving users', { error: error.message });

        res.status(500).json({
            id: null,
            message: error.message || 'An error occurred while retrieving users'
        });
    }
});

/**
 * GET /api/users/:id
 * Retrieves details of a specific user including total costs.
 * Response includes: first_name, last_name, id, and total
 */
app.get('/api/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);

        await logger.info('Endpoint accessed: GET /api/users/:id', { userId });

        // Validate user ID
        if (isNaN(userId)) {
            await logger.warn('Invalid user ID provided', { id: req.params.id });
            return res.status(400).json({
                id: req.params.id,
                message: 'Invalid user ID. Must be a number.'
            });
        }

        // Find the user by custom id (not _id)
        const user = await User.findOne({ id: userId });

        if (!user) {
            await logger.warn('User not found', { userId });
            return res.status(404).json({
                id: userId,
                message: 'User not found'
            });
        }

        // Calculate total costs for this user
        const costsAggregate = await Cost.aggregate([
            { $match: { userid: userId } },
            {
                $group: {
                    _id: null,
                    total: { $sum: { $toDouble: '$sum' } }
                }
            }
        ]);

        const total = costsAggregate.length > 0 ? costsAggregate[0].total : 0;

        await logger.info('User details retrieved successfully', { userId, total });

        // Return user details with total costs
        res.json({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            total: total
        });
    } catch (error) {
        await logger.error('Error retrieving user details', { error: error.message });

        res.status(500).json({
            id: req.params.id,
            message: error.message || 'An error occurred while retrieving user details'
        });
    }
});

/**
 * POST /api/add
 * Adds a new user to the users collection.
 * Required parameters: id, first_name, last_name, birthday
 */
app.post('/api/add', async (req, res) => {
    try {
        await logger.info('Endpoint accessed: POST /api/add (user)', { body: req.body });

        const { id, first_name, last_name, birthday } = req.body;

        // Validate required fields
        if (id === undefined || id === null) {
            return res.status(400).json({
                id: null,
                message: 'User ID is required'
            });
        }

        if (!first_name || typeof first_name !== 'string') {
            return res.status(400).json({
                id: id,
                message: 'First name is required and must be a string'
            });
        }

        if (!last_name || typeof last_name !== 'string') {
            return res.status(400).json({
                id: id,
                message: 'Last name is required and must be a string'
            });
        }

        if (!birthday) {
            return res.status(400).json({
                id: id,
                message: 'Birthday is required'
            });
        }

        // Validate ID is a number
        const userId = parseInt(id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({
                id: id,
                message: 'User ID must be a number'
            });
        }

        // Check if user with this ID already exists
        const existingUser = await User.findOne({ id: userId });
        if (existingUser) {
            await logger.warn('User with this ID already exists', { userId });
            return res.status(400).json({
                id: userId,
                message: 'A user with this ID already exists'
            });
        }

        // Parse and validate birthday
        const birthdayDate = new Date(birthday);
        if (isNaN(birthdayDate.getTime())) {
            return res.status(400).json({
                id: userId,
                message: 'Invalid birthday format. Please provide a valid date.'
            });
        }

        // Create new user
        const newUser = new User({
            id: userId,
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            birthday: birthdayDate
        });

        await newUser.save();

        await logger.info('User added successfully', { userId });

        // Return the created user
        res.status(201).json({
            id: newUser.id,
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            birthday: newUser.birthday
        });
    } catch (error) {
        await logger.error('Error adding user', { error: error.message });

        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                id: req.body.id,
                message: 'A user with this ID already exists'
            });
        }

        res.status(500).json({
            id: req.body.id || null,
            message: error.message || 'An error occurred while adding the user'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: SERVICE_NAME });
});

// Start server
async function startServer() {
    try {
        await connectDB();
        await logger.info('Database connected successfully');

        app.listen(PORT, () => {
            console.log(`${SERVICE_NAME} running on port ${PORT}`);
            logger.info(`${SERVICE_NAME} started`, { port: PORT });
        });
    } catch (error) {
        console.error(`Failed to start ${SERVICE_NAME}:`, error.message);
        process.exit(1);
    }
}

startServer();

module.exports = app;
