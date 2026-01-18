/**
 * Test Setup File
 * Configures the test environment and database connection.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const { User, Cost, Log, Report } = require('../shared/models');

// Test data
const TEST_USER = {
    id: 123123,
    first_name: 'mosh',
    last_name: 'israeli',
    birthday: new Date('1990-01-01')
};

// Connect to database before tests
async function setupDatabase() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('MONGODB_URI not defined');
    }

    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoUri);
    }
}

// Clear database and seed with test data
async function seedDatabase() {
    await User.deleteMany({});
    await Cost.deleteMany({});
    await Log.deleteMany({});
    await Report.deleteMany({});

    const user = new User(TEST_USER);
    await user.save();
}

// Disconnect from database after tests
async function teardownDatabase() {
    await mongoose.disconnect();
}

module.exports = {
    setupDatabase,
    seedDatabase,
    teardownDatabase,
    TEST_USER
};
