/**
 * Pino Logger Module
 * Creates a Pino logger that writes log messages to MongoDB.
 * Logs are written for every HTTP request and endpoint access.
 */

const pino = require('pino');
const Log = require('./models/Log');

// Create base Pino logger
const baseLogger = pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
        level: (label) => {
            return { level: label };
        }
    }
});

/**
 * Creates a logger instance for a specific service.
 * Logs are written to both console and MongoDB.
 * @param {string} serviceName - Name of the service using the logger
 * @returns {object} Logger object with logging methods
 */
function createLogger(serviceName) {
    const logger = {
        /**
         * Logs an info message to console and MongoDB
         * @param {string} message - Log message
         * @param {object} data - Additional data to log
         */
        async info(message, data = {}) {
            baseLogger.info({ service: serviceName, ...data }, message);
            await saveLogToMongoDB('info', message, serviceName, data);
        },

        /**
         * Logs a warning message to console and MongoDB
         * @param {string} message - Log message
         * @param {object} data - Additional data to log
         */
        async warn(message, data = {}) {
            baseLogger.warn({ service: serviceName, ...data }, message);
            await saveLogToMongoDB('warn', message, serviceName, data);
        },

        /**
         * Logs an error message to console and MongoDB
         * @param {string} message - Log message
         * @param {object} data - Additional data to log
         */
        async error(message, data = {}) {
            baseLogger.error({ service: serviceName, ...data }, message);
            await saveLogToMongoDB('error', message, serviceName, data);
        },

        /**
         * Logs a debug message to console and MongoDB
         * @param {string} message - Log message
         * @param {object} data - Additional data to log
         */
        async debug(message, data = {}) {
            baseLogger.debug({ service: serviceName, ...data }, message);
            await saveLogToMongoDB('debug', message, serviceName, data);
        },

        /**
         * Logs an HTTP request to console and MongoDB
         * @param {object} req - Express request object
         * @param {object} res - Express response object
         * @param {number} responseTime - Response time in milliseconds
         */
        async logRequest(req, res, responseTime) {
            const logData = {
                method: req.method,
                url: req.originalUrl || req.url,
                statusCode: res.statusCode,
                responseTime: responseTime
            };

            const message = `${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${responseTime}ms`;
            baseLogger.info({ service: serviceName, ...logData }, message);
            await saveLogToMongoDB('info', message, serviceName, logData);
        }
    };

    return logger;
}

/**
 * Saves a log entry to MongoDB
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {string} service - Service name
 * @param {object} data - Additional data
 */
async function saveLogToMongoDB(level, message, service, data) {
    try {
        const logEntry = new Log({
            level,
            message,
            service,
            method: data.method,
            url: data.url,
            statusCode: data.statusCode,
            responseTime: data.responseTime,
            data: data,
            timestamp: new Date()
        });

        await logEntry.save();
    } catch (error) {
        // Log to console if MongoDB save fails (don't throw to avoid disrupting main flow)
        baseLogger.error({ service, error: error.message }, 'Failed to save log to MongoDB');
    }
}

/**
 * Express middleware for logging HTTP requests
 * @param {string} serviceName - Name of the service
 * @returns {function} Express middleware function
 */
function requestLoggerMiddleware(serviceName) {
    const logger = createLogger(serviceName);

    return async (req, res, next) => {
        const startTime = Date.now();

        // Log when response finishes
        res.on('finish', async () => {
            const responseTime = Date.now() - startTime;
            await logger.logRequest(req, res, responseTime);
        });

        next();
    };
}

module.exports = {
    createLogger,
    requestLoggerMiddleware
};
