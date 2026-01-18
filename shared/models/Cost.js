/**
 * Cost Model
 * Defines the schema for cost item documents in the costs collection.
 * Supports categorization and date tracking for monthly reports.
 */

const mongoose = require('mongoose');

// Valid cost categories as required by the specification
const VALID_CATEGORIES = ['food', 'health', 'housing', 'sports', 'education'];

// Cost schema definition
const costSchema = new mongoose.Schema({
    // Description of the cost item
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true
    },
    // Category of the cost (must be one of the valid categories)
    category: {
        type: String,
        required: [true, 'Category is required'],
        lowercase: true,
        trim: true,
        enum: {
            values: VALID_CATEGORIES,
            message: 'Category must be one of: food, health, housing, sports, education'
        }
    },
    // Reference to the user who made this cost (using custom id, not _id)
    userid: {
        type: Number,
        required: [true, 'User ID is required']
    },
    // Sum/amount of the cost (Double type)
    sum: {
        type: mongoose.Schema.Types.Decimal128,
        required: [true, 'Sum is required'],
        get: function(value) {
            // Convert Decimal128 to regular number for JSON output
            return value ? parseFloat(value.toString()) : 0;
        }
    },
    // Date of the cost item (defaults to current date/time if not provided)
    day: {
        type: Number,
        min: 1,
        max: 31
    },
    month: {
        type: Number,
        min: 1,
        max: 12
    },
    year: {
        type: Number,
        min: 1900
    },
    // Full date for internal use
    created_at: {
        type: Date,
        default: Date.now
    }
}, {
    // Enable getters when converting to JSON
    toJSON: { getters: true },
    toObject: { getters: true }
});

// Pre-save middleware to set day, month, year from created_at
costSchema.pre('save', function(next) {
    if (!this.day || !this.month || !this.year) {
        const date = this.created_at || new Date();
        this.day = date.getDate();
        this.month = date.getMonth() + 1;
        this.year = date.getFullYear();
    }
    next();
});

// Static method to get valid categories
costSchema.statics.getValidCategories = function() {
    return VALID_CATEGORIES;
};

// Create and export the Cost model
const Cost = mongoose.model('Cost', costSchema);

module.exports = Cost;
