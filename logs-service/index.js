/**
 * Logs Microservice
 * Handles all log-related operations.
 * Endpoint: GET /api/logs - Retrieve all logs
 * Port: 3001
 */

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Import required modules
const express = require('express');
const cors = require('cors');
const { connectDB } = require('../shared/db');
const { Log } = require('../shared/models');
const { createLogger, requestLoggerMiddleware } = require('../shared/logger');

// Initialize Express application
const app = express();
const PORT = process.env.PORT || process.env.LOGS_PORT || 3001;
const SERVICE_NAME = 'logs-service';

// Create logger for this service
const logger = createLogger(SERVICE_NAME);

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLoggerMiddleware(SERVICE_NAME));

/**
 * GET /api/logs
 * Retrieves all log documents from the logs collection.
 * Returns a JSON array of all logs.
 */
app.get('/api/logs', async (req, res) => {
    try {
        await logger.info('Endpoint accessed: GET /api/logs');

        // Retrieve all logs from the database
        const logs = await Log.find({}).sort({ timestamp: -1 });

        await logger.info('Logs retrieved successfully', { count: logs.length });

        res.json(logs);
    } catch (error) {
        // Log error to database
        await logger.error('Error retrieving logs', { error: error.message });

        // Return error JSON with id and message properties as required
        res.status(500).json({
            id: null,
            message: error.message || 'An error occurred while retrieving logs'
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
