/**
 * Models Index
 * Central export point for all Mongoose models.
 */

const User = require('./User');
const Cost = require('./Cost');
const Log = require('./Log');
const Report = require('./Report');

module.exports = {
    User,
    Cost,
    Log,
    Report
};
