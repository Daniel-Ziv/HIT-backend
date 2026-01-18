/**
 * Jest Configuration
 */

module.exports = {
    // Test environment
    testEnvironment: 'node',

    // Test file patterns
    testMatch: ['**/tests/**/*.test.js'],

    // Ignore patterns
    testPathIgnorePatterns: ['/node_modules/'],

    // Timeout for each test
    testTimeout: 30000,

    // Verbose output
    verbose: true,

    // Force exit after tests complete
    forceExit: true,

    // Detect open handles
    detectOpenHandles: true
};
