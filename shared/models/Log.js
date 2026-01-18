/**
 * Log Model
 * Defines the schema for log documents in the logs collection.
 * Used for storing Pino log messages to MongoDB.
 */

const mongoose = require('mongoose');

// Log schema definition
const logSchema = new mongoose.Schema({
    // Log level (info, warn, error, debug, etc.)
    level: {
        type: String,
        required: true
    },
    // Log message
    message: {
        type: String,
        required: true
    },
    // Service that generated the log
    service: {
        type: String,
        required: true
    },
    // HTTP method (if applicable)
    method: {
        type: String
    },
    // Request URL (if applicable)
    url: {
        type: String
    },
    // Response status code (if applicable)
    statusCode: {
        type: Number
    },
    // Response time in milliseconds (if applicable)
    responseTime: {
        type: Number
    },
    // Additional data/context
    data: {
        type: mongoose.Schema.Types.Mixed
    },
    // Timestamp of the log entry
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Create and export the Log model
const Log = mongoose.model('Log', logSchema);

module.exports = Log;
