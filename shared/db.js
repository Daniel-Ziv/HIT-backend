/**
 * Database Connection Module
 * Provides MongoDB connection using Mongoose.
 */

const mongoose = require('mongoose');

// Database connection function
async function connectDB() {
    try {
        const mongoUri = process.env.MONGODB_URI;

        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not defined');
        }

        await mongoose.connect(mongoUri);

        console.log('Connected to MongoDB Atlas successfully');

        return mongoose.connection;
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    }
}

// Handle connection events
mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err);
});

module.exports = { connectDB };
