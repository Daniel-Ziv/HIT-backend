/**
 * Report Model
 * Defines the schema for cached report documents.
 * Implements the Computed Design Pattern for monthly reports.
 * Reports for past months are cached to improve performance.
 */

const mongoose = require('mongoose');

// Report schema definition
const reportSchema = new mongoose.Schema({
    // User ID for the report
    userid: {
        type: Number,
        required: true
    },
    // Year of the report
    year: {
        type: Number,
        required: true
    },
    // Month of the report (1-12)
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    // Cached costs data grouped by category
    costs: {
        type: Array,
        required: true
    },
    // Timestamp when the report was computed/cached
    computed_at: {
        type: Date,
        default: Date.now
    }
});

// Compound index for efficient lookups by userid, year, and month
reportSchema.index({ userid: 1, year: 1, month: 1 }, { unique: true });

// Create and export the Report model
const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
