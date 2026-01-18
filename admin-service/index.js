/**
 * Admin Microservice
 * Handles admin-related operations.
 * Endpoints:
 *   - GET /api/about - Get information about the development team
 * Port: 3004
 */

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Import required modules
const express = require('express');
const cors = require('cors');
const { connectDB } = require('../shared/db');
const { createLogger, requestLoggerMiddleware } = require('../shared/logger');

// Initialize Express application
const app = express();
const PORT = process.env.PORT || process.env.ADMIN_PORT || 3004;
const SERVICE_NAME = 'admin-service';

// Create logger for this service
const logger = createLogger(SERVICE_NAME);

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLoggerMiddleware(SERVICE_NAME));

/**
 * Development team information
 * Stored in code (not in database) as per requirements.
 * Property names match those in the users collection: first_name, last_name
 * Update these values with actual team member names.
 */
const DEVELOPERS = [
    {
        first_name: process.env.DEVELOPER_1_FIRST_NAME || 'Daniel',
        last_name: process.env.DEVELOPER_1_LAST_NAME || 'Ziv'
    },
    {
        first_name: process.env.DEVELOPER_2_FIRST_NAME || 'Taisiya',
        last_name: process.env.DEVELOPER_2_LAST_NAME || 'Angel'
    }
];

/**
 * GET /api/about
 * Returns information about the development team.
 * Response includes first_name and last_name for each team member.
 * These names are not stored in the database (hardcoded or from .env).
 */
app.get('/api/about', async (req, res) => {
    try {
        await logger.info('Endpoint accessed: GET /api/about');

        await logger.info('Developers info retrieved successfully', {
            count: DEVELOPERS.length
        });

        // Return the developers array
        res.json(DEVELOPERS);
    } catch (error) {
        // Log error and return error response with id and message
        await logger.error('Error retrieving developers info', { error: error.message });

        // Return error JSON with id and message properties as required
        res.status(500).json({
            id: null,
            message: error.message || 'An error occurred while retrieving developers information'
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
