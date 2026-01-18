/**
 * Database Seed Script
 * Creates the initial imaginary user as required by the project specifications.
 * User details:
 *   - id: 123123
 *   - first_name: mosh
 *   - last_name: israeli
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const { User, Cost, Log, Report } = require('../shared/models');

// Initial imaginary user data as specified in requirements
const INITIAL_USER = {
    id: 123123,
    first_name: 'mosh',
    last_name: 'israeli',
    birthday: new Date('1990-01-01')
};

async function seed() {
    try {
        console.log('Connecting to MongoDB...');

        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not defined');
        }

        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB successfully');

        // Clear existing data
        console.log('Clearing existing data...');
        await User.deleteMany({});
        await Cost.deleteMany({});
        await Log.deleteMany({});
        await Report.deleteMany({});
        console.log('Existing data cleared');

        // Create the initial imaginary user
        console.log('Creating initial user...');
        const user = new User(INITIAL_USER);
        await user.save();

        console.log('Initial user created successfully:');
        console.log({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            birthday: user.birthday
        });

        console.log('\nDatabase seeded successfully!');
        console.log('The database now contains only the initial imaginary user.');

    } catch (error) {
        console.error('Seed error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
}

seed();
