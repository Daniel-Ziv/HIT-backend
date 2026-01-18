/**
 * Costs Microservice
 * Handles all cost-related operations.
 * Endpoints:
 *   - POST /api/add - Add a new cost item
 *   - GET /api/report - Get monthly report (implements Computed Design Pattern)
 * Port: 3003
 */

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Import required modules
const express = require('express');
const cors = require('cors');
const { connectDB } = require('../shared/db');
const { User, Cost, Report } = require('../shared/models');
const { createLogger, requestLoggerMiddleware } = require('../shared/logger');

// Initialize Express application
const app = express();
const PORT = process.env.PORT || process.env.COSTS_PORT || 3003;
const SERVICE_NAME = 'costs-service';

// Valid cost categories as specified in requirements
const VALID_CATEGORIES = ['food', 'health', 'housing', 'sports', 'education'];

// Create logger for this service
const logger = createLogger(SERVICE_NAME);

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLoggerMiddleware(SERVICE_NAME));

/**
 * Checks if a given month/year is in the past
 * @param {number} year - Year to check
 * @param {number} month - Month to check (1-12)
 * @returns {boolean} True if the month/year is in the past
 */
function isMonthInPast(year, month) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (year < currentYear) {
        return true;
    }
    if (year === currentYear && month < currentMonth) {
        return true;
    }
    return false;
}

/**
 * Generates a monthly report for a specific user
 * @param {number} userid - User ID
 * @param {number} year - Year for the report
 * @param {number} month - Month for the report
 * @returns {object} Report object with costs grouped by category
 */
async function generateReport(userid, year, month) {
    // Get all costs for this user in the specified month/year
    const costs = await Cost.find({
        userid: userid,
        year: year,
        month: month
    });

    // Initialize costs array with all categories
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

    return {
        userid: userid,
        year: year,
        month: month,
        costs: costsArray
    };
}

/**
 * POST /api/add
 * Adds a new cost item to the costs collection.
 * Required parameters: description, category, userid, sum
 * Optional: day, month, year (defaults to current date if not provided)
 * Note: The server does not allow adding costs with dates in the past.
 */
app.post('/api/add', async (req, res) => {
    try {
        await logger.info('Endpoint accessed: POST /api/add (cost)', { body: req.body });

        const { description, category, userid, sum, day, month, year } = req.body;

        // Validate required fields
        if (!description || typeof description !== 'string') {
            return res.status(400).json({
                id: null,
                message: 'Description is required and must be a string'
            });
        }

        if (!category || typeof category !== 'string') {
            return res.status(400).json({
                id: null,
                message: 'Category is required and must be a string'
            });
        }

        // Validate category is one of the allowed values
        const normalizedCategory = category.toLowerCase().trim();
        if (!VALID_CATEGORIES.includes(normalizedCategory)) {
            return res.status(400).json({
                id: null,
                message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}`
            });
        }

        if (userid === undefined || userid === null) {
            return res.status(400).json({
                id: null,
                message: 'User ID is required'
            });
        }

        // Parse and validate userid is a number
        const parsedUserid = parseInt(userid, 10);
        if (isNaN(parsedUserid)) {
            return res.status(400).json({
                id: userid,
                message: 'User ID must be a number'
            });
        }

        // Validate sum is provided
        if (sum === undefined || sum === null) {
            return res.status(400).json({
                id: parsedUserid,
                message: 'Sum is required'
            });
        }

        // Parse and validate sum is a number (Double type)
        const parsedSum = parseFloat(sum);
        if (isNaN(parsedSum)) {
            return res.status(400).json({
                id: parsedUserid,
                message: 'Sum must be a number'
            });
        }

        // Check if user exists
        const userExists = await User.findOne({ id: parsedUserid });
        if (!userExists) {
            await logger.warn('User not found when adding cost', { userid: parsedUserid });
            return res.status(404).json({
                id: parsedUserid,
                message: 'User not found. Cannot add cost for non-existent user.'
            });
        }

        // Handle date - use current date if not provided
        const now = new Date();
        let costDay = day !== undefined ? parseInt(day, 10) : now.getDate();
        let costMonth = month !== undefined ? parseInt(month, 10) : now.getMonth() + 1;
        let costYear = year !== undefined ? parseInt(year, 10) : now.getFullYear();

        // Validate date values
        if (isNaN(costDay) || costDay < 1 || costDay > 31) {
            return res.status(400).json({
                id: parsedUserid,
                message: 'Day must be a number between 1 and 31'
            });
        }

        if (isNaN(costMonth) || costMonth < 1 || costMonth > 12) {
            return res.status(400).json({
                id: parsedUserid,
                message: 'Month must be a number between 1 and 12'
            });
        }

        if (isNaN(costYear) || costYear < 1900) {
            return res.status(400).json({
                id: parsedUserid,
                message: 'Year must be a valid year (1900 or later)'
            });
        }

        // Check if the date is in the past (server doesn't allow past dates)
        if (isMonthInPast(costYear, costMonth)) {
            await logger.warn('Attempt to add cost with past date', {
                userid: parsedUserid,
                year: costYear,
                month: costMonth
            });
            return res.status(400).json({
                id: parsedUserid,
                message: 'Cannot add costs with dates in the past'
            });
        }

        // Create the cost item
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

        await logger.info('Cost added successfully', {
            userid: parsedUserid,
            category: normalizedCategory,
            sum: parsedSum
        });

        // Return the created cost item
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
        await logger.error('Error adding cost', { error: error.message });

        res.status(500).json({
            id: req.body.userid || null,
            message: error.message || 'An error occurred while adding the cost item'
        });
    }
});

/*
 * Computed Design Pattern Implementation:
 *
 * The Computed Design Pattern is used to optimize performance by caching
 * computed results that won't change. In this application:
 *
 * 1. When a report is requested for a PAST month:
 *    - First, we check if a cached report exists in the 'reports' collection
 *    - If cached report exists, return it immediately (no computation needed)
 *    - If not cached, compute the report, save it to cache, then return it
 *
 * 2. When a report is requested for the CURRENT or FUTURE month:
 *    - Always compute the report fresh (don't cache)
 *    - This is because new costs can still be added to current/future months
 *
 * 3. Why this works:
 *    - The server doesn't allow adding costs with past dates
 *    - Therefore, past month reports will never change
 *    - Caching them saves database queries on repeated requests
 *
 * The cached reports are stored in the 'reports' collection with:
 * userid, year, month, and the pre-computed costs array
 */

/**
 * GET /api/report
 * Gets a monthly report for a specific user.
 * Query parameters: id, year, month
 */
app.get('/api/report', async (req, res) => {
    try {
        await logger.info('Endpoint accessed: GET /api/report', { query: req.query });

        const { id, year, month } = req.query;

        // Validate required parameters
        if (id === undefined || id === null) {
            return res.status(400).json({
                id: null,
                message: 'User ID (id) is required'
            });
        }

        if (year === undefined || year === null) {
            return res.status(400).json({
                id: id,
                message: 'Year is required'
            });
        }

        if (month === undefined || month === null) {
            return res.status(400).json({
                id: id,
                message: 'Month is required'
            });
        }

        const parsedId = parseInt(id, 10);
        const parsedYear = parseInt(year, 10);
        const parsedMonth = parseInt(month, 10);

        // Validate numeric values
        if (isNaN(parsedId)) {
            return res.status(400).json({
                id: id,
                message: 'User ID must be a number'
            });
        }

        if (isNaN(parsedYear) || parsedYear < 1900) {
            return res.status(400).json({
                id: parsedId,
                message: 'Year must be a valid year'
            });
        }

        if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
            return res.status(400).json({
                id: parsedId,
                message: 'Month must be between 1 and 12'
            });
        }

        // Check if user exists
        const userExists = await User.findOne({ id: parsedId });
        if (!userExists) {
            await logger.warn('User not found when getting report', { userid: parsedId });
            return res.status(404).json({
                id: parsedId,
                message: 'User not found'
            });
        }

        // Computed Design Pattern Implementation:
        // Check if this is a past month - if so, try to get cached report
        const isPastMonth = isMonthInPast(parsedYear, parsedMonth);

        if (isPastMonth) {
            // Try to find cached report
            const cachedReport = await Report.findOne({
                userid: parsedId,
                year: parsedYear,
                month: parsedMonth
            });

            if (cachedReport) {
                await logger.info('Returning cached report', {
                    userid: parsedId,
                    year: parsedYear,
                    month: parsedMonth
                });

                return res.json({
                    userid: cachedReport.userid,
                    year: cachedReport.year,
                    month: cachedReport.month,
                    costs: cachedReport.costs
                });
            }
        }

        // Generate the report
        const report = await generateReport(parsedId, parsedYear, parsedMonth);

        // Cache the report if it's for a past month
        if (isPastMonth) {
            try {
                const newReport = new Report({
                    userid: parsedId,
                    year: parsedYear,
                    month: parsedMonth,
                    costs: report.costs
                });

                await newReport.save();

                await logger.info('Report cached for past month', {
                    userid: parsedId,
                    year: parsedYear,
                    month: parsedMonth
                });
            } catch (cacheError) {
                // Log but don't fail if caching fails (might be duplicate)
                await logger.warn('Could not cache report', { error: cacheError.message });
            }
        }

        await logger.info('Report generated successfully', {
            userid: parsedId,
            year: parsedYear,
            month: parsedMonth
        });

        res.json(report);
    } catch (error) {
        await logger.error('Error generating report', { error: error.message });

        res.status(500).json({
            id: req.query.id || null,
            message: error.message || 'An error occurred while generating the report'
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
