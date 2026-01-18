/**
 * User Model
 * Defines the schema for user documents in the users collection.
 * Contains user identification and personal information.
 */

const mongoose = require('mongoose');

// User schema definition
const userSchema = new mongoose.Schema({
    // Custom user ID (different from MongoDB _id)
    id: {
        type: Number,
        required: [true, 'User ID is required'],
        unique: true
    },
    // User's first name
    first_name: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    // User's last name
    last_name: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true
    },
    // User's birthday
    birthday: {
        type: Date,
        required: [true, 'Birthday is required']
    }
}, {
    // Add timestamps for document creation and updates
    timestamps: true
});

// Create and export the User model
const User = mongoose.model('User', userSchema);

module.exports = User;
