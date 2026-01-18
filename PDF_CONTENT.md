# HIT Backend - Final Project

## Team Information

**Team Manager:** Daniel Ziv

### Team Members:

| Name          | ID        | Phone      | Email                       |
| ------------- | --------- | ---------- | --------------------------- |
| Daniel Ziv    | 318728060 | 0545794332 | contact.danielziv@gmail.com |
| Taisiya Angel | 209238013 | 0523435340 | khaleesi1999@gmail.com      |

---

## Video Link

**YouTube (Unlisted):** https://youtu.be/5F7aH674kzw

---

## Collaborative Tools Summary

We used Discord as our primary communication platform, creating dedicated channels for discussing implementation details, sharing code snippets, and troubleshooting issues together. This allowed us to stay connected and coordinate our work efficiently. Additionally, we held regular in-person coding sessions where we worked side by side, enabling real-time collaboration, pair programming, and immediate feedback on code changes. This combination of remote communication and face-to-face collaboration significantly improved our workflow and helped us complete the project successfully.

---

## How to Run the Project

### Prerequisites

- Node.js (v18 or higher)
- MongoDB Atlas account (or local MongoDB instance)

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file in the root directory with:

```
MONGODB_URI=mongodb+srv://[username]:[password]@[cluster].mongodb.net/hit_costs_db
LOGS_PORT=3001
USERS_PORT=3002
COSTS_PORT=3003
ADMIN_PORT=3004
```

### Seed Database

To create the initial user (id: 123123, mosh israeli):

```bash
npm run seed
```

### Start All Services

```bash
npm run start:all
```

This starts 4 microservices:

- Logs Service: http://localhost:3001
- Users Service: http://localhost:3002
- Costs Service: http://localhost:3003
- Admin Service: http://localhost:3004

### Run Tests

```bash
npm test
```

---

## Project Structure

```
HIT-backend/
├── shared/
│   ├── models/
│   │   ├── User.js
│   │   ├── Cost.js
│   │   ├── Log.js
│   │   ├── Report.js
│   │   └── index.js
│   ├── db.js
│   └── logger.js
├── logs-service/
│   └── index.js
├── users-service/
│   └── index.js
├── costs-service/
│   └── index.js
├── admin-service/
│   └── index.js
├── scripts/
│   └── seed.js
├── tests/
│   ├── setup.js
│   ├── logs.test.js
│   ├── users.test.js
│   ├── costs.test.js
│   └── admin.test.js
├── package.json
├── jest.config.js
└── .env
```

---

# Code Files

---

## 1. package.json

```json
{
  "name": "hit-backend",
  "version": "1.0.0",
  "description": "RESTful Web Services for cost management - HIT Final Project",
  "main": "index.js",
  "scripts": {
    "start:logs": "node logs-service/index.js",
    "start:users": "node users-service/index.js",
    "start:costs": "node costs-service/index.js",
    "start:admin": "node admin-service/index.js",
    "start:all": "concurrently \"npm run start:logs\" \"npm run start:users\" \"npm run start:costs\" \"npm run start:admin\"",
    "seed": "node scripts/seed.js",
    "test": "jest --detectOpenHandles --forceExit"
  },
  "keywords": [
    "express",
    "mongodb",
    "mongoose",
    "pino",
    "restful",
    "microservices"
  ],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "mongoose": "^8.0.3",
    "pino": "^8.17.2",
    "pino-pretty": "^10.3.1"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "jest": "^29.7.0",
    "supertest": "^6.3.3"
  }
}
```

---

## 2. .env

```env
# MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://[USERNAME]:[PASSWORD]@hit-backend.xfdgdmi.mongodb.net/hit_costs_db?retryWrites=true&w=majority&appName=HIT-backend

# Microservice Ports
LOGS_PORT=3001
USERS_PORT=3002
COSTS_PORT=3003
ADMIN_PORT=3004

# Environment
NODE_ENV=development

# Developers Team Information (for /api/about endpoint)
DEVELOPER_1_FIRST_NAME=Daniel
DEVELOPER_1_LAST_NAME=Ziv
DEVELOPER_2_FIRST_NAME=Taisiya
DEVELOPER_2_LAST_NAME=Angel
```

---

## 3. shared/db.js

```javascript
/**
 * Database Connection Module
 * Provides MongoDB connection using Mongoose.
 */

const mongoose = require("mongoose");

// Database connection function
async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not defined");
    }

    await mongoose.connect(mongoUri);

    console.log("Connected to MongoDB Atlas successfully");

    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
}

// Handle connection events
mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB error:", err);
});

module.exports = { connectDB };
```

---

## 4. shared/logger.js

```javascript
/**
 * Pino Logger Module
 * Creates a Pino logger that writes log messages to MongoDB.
 * Logs are written for every HTTP request and endpoint access.
 */

const pino = require("pino");
const Log = require("./models/Log");

// Create base Pino logger
const baseLogger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
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
      await saveLogToMongoDB("info", message, serviceName, data);
    },

    /**
     * Logs a warning message to console and MongoDB
     * @param {string} message - Log message
     * @param {object} data - Additional data to log
     */
    async warn(message, data = {}) {
      baseLogger.warn({ service: serviceName, ...data }, message);
      await saveLogToMongoDB("warn", message, serviceName, data);
    },

    /**
     * Logs an error message to console and MongoDB
     * @param {string} message - Log message
     * @param {object} data - Additional data to log
     */
    async error(message, data = {}) {
      baseLogger.error({ service: serviceName, ...data }, message);
      await saveLogToMongoDB("error", message, serviceName, data);
    },

    /**
     * Logs a debug message to console and MongoDB
     * @param {string} message - Log message
     * @param {object} data - Additional data to log
     */
    async debug(message, data = {}) {
      baseLogger.debug({ service: serviceName, ...data }, message);
      await saveLogToMongoDB("debug", message, serviceName, data);
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
        responseTime: responseTime,
      };

      const message = `${req.method} ${req.originalUrl || req.url} ${
        res.statusCode
      } ${responseTime}ms`;
      baseLogger.info({ service: serviceName, ...logData }, message);
      await saveLogToMongoDB("info", message, serviceName, logData);
    },
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
      timestamp: new Date(),
    });

    await logEntry.save();
  } catch (error) {
    // Log to console if MongoDB save fails (don't throw to avoid disrupting main flow)
    baseLogger.error(
      { service, error: error.message },
      "Failed to save log to MongoDB"
    );
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
    res.on("finish", async () => {
      const responseTime = Date.now() - startTime;
      await logger.logRequest(req, res, responseTime);
    });

    next();
  };
}

module.exports = {
  createLogger,
  requestLoggerMiddleware,
};
```

---

## 5. shared/models/User.js

```javascript
/**
 * User Model
 * Defines the schema for user documents in the users collection.
 * Contains user identification and personal information.
 */

const mongoose = require("mongoose");

// User schema definition
const userSchema = new mongoose.Schema(
  {
    // Custom user ID (different from MongoDB _id)
    id: {
      type: Number,
      required: [true, "User ID is required"],
      unique: true,
    },
    // User's first name
    first_name: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    // User's last name
    last_name: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    // User's birthday
    birthday: {
      type: Date,
      required: [true, "Birthday is required"],
    },
  },
  {
    // Add timestamps for document creation and updates
    timestamps: true,
  }
);

// Create and export the User model
const User = mongoose.model("User", userSchema);

module.exports = User;
```

---

## 6. shared/models/Cost.js

```javascript
/**
 * Cost Model
 * Defines the schema for cost item documents in the costs collection.
 * Supports categorization and date tracking for monthly reports.
 */

const mongoose = require("mongoose");

// Valid cost categories as required by the specification
const VALID_CATEGORIES = ["food", "health", "housing", "sports", "education"];

// Cost schema definition
const costSchema = new mongoose.Schema(
  {
    // Description of the cost item
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    // Category of the cost (must be one of the valid categories)
    category: {
      type: String,
      required: [true, "Category is required"],
      lowercase: true,
      trim: true,
      enum: {
        values: VALID_CATEGORIES,
        message:
          "Category must be one of: food, health, housing, sports, education",
      },
    },
    // Reference to the user who made this cost (using custom id, not _id)
    userid: {
      type: Number,
      required: [true, "User ID is required"],
    },
    // Sum/amount of the cost (Double type)
    sum: {
      type: mongoose.Schema.Types.Decimal128,
      required: [true, "Sum is required"],
      get: function (value) {
        // Convert Decimal128 to regular number for JSON output
        return value ? parseFloat(value.toString()) : 0;
      },
    },
    // Date of the cost item (defaults to current date/time if not provided)
    day: {
      type: Number,
      min: 1,
      max: 31,
    },
    month: {
      type: Number,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      min: 1900,
    },
    // Full date for internal use
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Enable getters when converting to JSON
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Pre-save middleware to set day, month, year from created_at
costSchema.pre("save", function (next) {
  if (!this.day || !this.month || !this.year) {
    const date = this.created_at || new Date();
    this.day = date.getDate();
    this.month = date.getMonth() + 1;
    this.year = date.getFullYear();
  }
  next();
});

// Static method to get valid categories
costSchema.statics.getValidCategories = function () {
  return VALID_CATEGORIES;
};

// Create and export the Cost model
const Cost = mongoose.model("Cost", costSchema);

module.exports = Cost;
```

---

## 7. shared/models/Log.js

```javascript
/**
 * Log Model
 * Defines the schema for log documents in the logs collection.
 * Used for storing Pino log messages to MongoDB.
 */

const mongoose = require("mongoose");

// Log schema definition
const logSchema = new mongoose.Schema({
  // Log level (info, warn, error, debug, etc.)
  level: {
    type: String,
    required: true,
  },
  // Log message
  message: {
    type: String,
    required: true,
  },
  // Service that generated the log
  service: {
    type: String,
    required: true,
  },
  // HTTP method (if applicable)
  method: {
    type: String,
  },
  // Request URL (if applicable)
  url: {
    type: String,
  },
  // Response status code (if applicable)
  statusCode: {
    type: Number,
  },
  // Response time in milliseconds (if applicable)
  responseTime: {
    type: Number,
  },
  // Additional data/context
  data: {
    type: mongoose.Schema.Types.Mixed,
  },
  // Timestamp of the log entry
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Create and export the Log model
const Log = mongoose.model("Log", logSchema);

module.exports = Log;
```

---

## 8. shared/models/Report.js

```javascript
/**
 * Report Model
 * Defines the schema for cached report documents.
 * Implements the Computed Design Pattern for monthly reports.
 * Reports for past months are cached to improve performance.
 */

const mongoose = require("mongoose");

// Report schema definition
const reportSchema = new mongoose.Schema({
  // User ID for the report
  userid: {
    type: Number,
    required: true,
  },
  // Year of the report
  year: {
    type: Number,
    required: true,
  },
  // Month of the report (1-12)
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  // Cached costs data grouped by category
  costs: {
    type: Array,
    required: true,
  },
  // Timestamp when the report was computed/cached
  computed_at: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient lookups by userid, year, and month
reportSchema.index({ userid: 1, year: 1, month: 1 }, { unique: true });

// Create and export the Report model
const Report = mongoose.model("Report", reportSchema);

module.exports = Report;
```

---

## 9. shared/models/index.js

```javascript
/**
 * Models Index
 * Central export point for all Mongoose models.
 */

const User = require("./User");
const Cost = require("./Cost");
const Log = require("./Log");
const Report = require("./Report");

module.exports = {
  User,
  Cost,
  Log,
  Report,
};
```

---

## 10. logs-service/index.js

```javascript
/**
 * Logs Microservice
 * Handles all log-related operations.
 * Endpoint: GET /api/logs - Retrieve all logs
 * Port: 3001
 */

// Load environment variables from .env file
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

// Import required modules
const express = require("express");
const cors = require("cors");
const { connectDB } = require("../shared/db");
const { Log } = require("../shared/models");
const { createLogger, requestLoggerMiddleware } = require("../shared/logger");

// Initialize Express application
const app = express();
const PORT = process.env.LOGS_PORT || 3001;
const SERVICE_NAME = "logs-service";

// Create logger for this service
const logger = createLogger(SERVICE_NAME);

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLoggerMiddleware(SERVICE_NAME));

/**
 * GET /api/logs
 * Retrieves all log documents from the logs collection.
 * Returns a JSON array of all logs.
 */
app.get("/api/logs", async (req, res) => {
  try {
    await logger.info("Endpoint accessed: GET /api/logs");

    // Retrieve all logs from the database
    const logs = await Log.find({}).sort({ timestamp: -1 });

    await logger.info("Logs retrieved successfully", { count: logs.length });

    res.json(logs);
  } catch (error) {
    // Log error to database
    await logger.error("Error retrieving logs", { error: error.message });

    // Return error JSON with id and message properties as required
    res.status(500).json({
      id: null,
      message: error.message || "An error occurred while retrieving logs",
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: SERVICE_NAME });
});

// Start server
async function startServer() {
  try {
    await connectDB();
    await logger.info("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`${SERVICE_NAME} running on port ${PORT}`);
      logger.info(`${SERVICE_NAME} started`, { port: PORT });
    });
  } catch (error) {
    console.error(`Failed to start ${SERVICE_NAME}:`, error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
```

---

## 11. users-service/index.js

```javascript
/**
 * Users Microservice
 * Handles all user-related operations.
 * Endpoints:
 *   - GET /api/users - List all users
 *   - GET /api/users/:id - Get specific user details with total costs
 *   - POST /api/add - Add a new user
 * Port: 3002
 */

// Load environment variables from .env file
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

// Import required modules
const express = require("express");
const cors = require("cors");
const { connectDB } = require("../shared/db");
const { User, Cost } = require("../shared/models");
const { createLogger, requestLoggerMiddleware } = require("../shared/logger");

// Initialize Express application
const app = express();
const PORT = process.env.USERS_PORT || 3002;
const SERVICE_NAME = "users-service";

// Create logger for this service
const logger = createLogger(SERVICE_NAME);

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLoggerMiddleware(SERVICE_NAME));

/**
 * GET /api/users
 * Retrieves all users from the users collection.
 * Returns a JSON array of all users.
 */
app.get("/api/users", async (req, res) => {
  try {
    await logger.info("Endpoint accessed: GET /api/users");

    // Retrieve all users from the database
    const users = await User.find({}).select("-__v");

    await logger.info("Users retrieved successfully", { count: users.length });

    res.json(users);
  } catch (error) {
    await logger.error("Error retrieving users", { error: error.message });

    res.status(500).json({
      id: null,
      message: error.message || "An error occurred while retrieving users",
    });
  }
});

/**
 * GET /api/users/:id
 * Retrieves details of a specific user including total costs.
 * Response includes: first_name, last_name, id, and total
 */
app.get("/api/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);

    await logger.info("Endpoint accessed: GET /api/users/:id", { userId });

    // Validate user ID
    if (isNaN(userId)) {
      await logger.warn("Invalid user ID provided", { id: req.params.id });
      return res.status(400).json({
        id: req.params.id,
        message: "Invalid user ID. Must be a number.",
      });
    }

    // Find the user by custom id (not _id)
    const user = await User.findOne({ id: userId });

    if (!user) {
      await logger.warn("User not found", { userId });
      return res.status(404).json({
        id: userId,
        message: "User not found",
      });
    }

    // Calculate total costs for this user
    const costsAggregate = await Cost.aggregate([
      { $match: { userid: userId } },
      {
        $group: {
          _id: null,
          total: { $sum: { $toDouble: "$sum" } },
        },
      },
    ]);

    const total = costsAggregate.length > 0 ? costsAggregate[0].total : 0;

    await logger.info("User details retrieved successfully", { userId, total });

    // Return user details with total costs
    res.json({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      total: total,
    });
  } catch (error) {
    await logger.error("Error retrieving user details", {
      error: error.message,
    });

    res.status(500).json({
      id: req.params.id,
      message:
        error.message || "An error occurred while retrieving user details",
    });
  }
});

/**
 * POST /api/add
 * Adds a new user to the users collection.
 * Required parameters: id, first_name, last_name, birthday
 */
app.post("/api/add", async (req, res) => {
  try {
    await logger.info("Endpoint accessed: POST /api/add (user)", {
      body: req.body,
    });

    const { id, first_name, last_name, birthday } = req.body;

    // Validate required fields
    if (id === undefined || id === null) {
      return res.status(400).json({
        id: null,
        message: "User ID is required",
      });
    }

    if (!first_name || typeof first_name !== "string") {
      return res.status(400).json({
        id: id,
        message: "First name is required and must be a string",
      });
    }

    if (!last_name || typeof last_name !== "string") {
      return res.status(400).json({
        id: id,
        message: "Last name is required and must be a string",
      });
    }

    if (!birthday) {
      return res.status(400).json({
        id: id,
        message: "Birthday is required",
      });
    }

    // Validate ID is a number
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({
        id: id,
        message: "User ID must be a number",
      });
    }

    // Check if user with this ID already exists
    const existingUser = await User.findOne({ id: userId });
    if (existingUser) {
      await logger.warn("User with this ID already exists", { userId });
      return res.status(400).json({
        id: userId,
        message: "A user with this ID already exists",
      });
    }

    // Parse and validate birthday
    const birthdayDate = new Date(birthday);
    if (isNaN(birthdayDate.getTime())) {
      return res.status(400).json({
        id: userId,
        message: "Invalid birthday format. Please provide a valid date.",
      });
    }

    // Create new user
    const newUser = new User({
      id: userId,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      birthday: birthdayDate,
    });

    await newUser.save();

    await logger.info("User added successfully", { userId });

    // Return the created user
    res.status(201).json({
      id: newUser.id,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      birthday: newUser.birthday,
    });
  } catch (error) {
    await logger.error("Error adding user", { error: error.message });

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        id: req.body.id,
        message: "A user with this ID already exists",
      });
    }

    res.status(500).json({
      id: req.body.id || null,
      message: error.message || "An error occurred while adding the user",
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: SERVICE_NAME });
});

// Start server
async function startServer() {
  try {
    await connectDB();
    await logger.info("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`${SERVICE_NAME} running on port ${PORT}`);
      logger.info(`${SERVICE_NAME} started`, { port: PORT });
    });
  } catch (error) {
    console.error(`Failed to start ${SERVICE_NAME}:`, error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
```

---

## 12. costs-service/index.js

```javascript
/**
 * Costs Microservice
 * Handles all cost-related operations.
 * Endpoints:
 *   - POST /api/add - Add a new cost item
 *   - GET /api/report - Get monthly report (implements Computed Design Pattern)
 * Port: 3003
 */

// Load environment variables from .env file
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

// Import required modules
const express = require("express");
const cors = require("cors");
const { connectDB } = require("../shared/db");
const { User, Cost, Report } = require("../shared/models");
const { createLogger, requestLoggerMiddleware } = require("../shared/logger");

// Initialize Express application
const app = express();
const PORT = process.env.COSTS_PORT || 3003;
const SERVICE_NAME = "costs-service";

// Valid cost categories as specified in requirements
const VALID_CATEGORIES = ["food", "health", "housing", "sports", "education"];

// Create logger for this service
const logger = createLogger(SERVICE_NAME);

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLoggerMiddleware(SERVICE_NAME));

/**
 * Checks if a given month/year is in the past
 * @param {number} year - Year to check
 * @param {number} month - Month to check (1-12)
 * @returns {boolean} True if the month/year is in the past
 */
function isMonthInPast(year, month) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear) {
    return true;
  }
  if (year === currentYear && month < currentMonth) {
    return true;
  }
  return false;
}

/**
 * Generates a monthly report for a specific user
 * @param {number} userid - User ID
 * @param {number} year - Year for the report
 * @param {number} month - Month for the report
 * @returns {object} Report object with costs grouped by category
 */
async function generateReport(userid, year, month) {
  // Get all costs for this user in the specified month/year
  const costs = await Cost.find({
    userid: userid,
    year: year,
    month: month,
  });

  // Initialize costs array with all categories
  const costsArray = VALID_CATEGORIES.map((category) => {
    const categoryCosts = costs
      .filter((cost) => cost.category === category)
      .map((cost) => ({
        sum: parseFloat(cost.sum.toString()),
        description: cost.description,
        day: cost.day,
      }));

    return { [category]: categoryCosts };
  });

  return {
    userid: userid,
    year: year,
    month: month,
    costs: costsArray,
  };
}

/**
 * POST /api/add
 * Adds a new cost item to the costs collection.
 * Required parameters: description, category, userid, sum
 * Optional: day, month, year (defaults to current date if not provided)
 * Note: The server does not allow adding costs with dates in the past.
 */
app.post("/api/add", async (req, res) => {
  try {
    await logger.info("Endpoint accessed: POST /api/add (cost)", {
      body: req.body,
    });

    const { description, category, userid, sum, day, month, year } = req.body;

    // Validate required fields
    if (!description || typeof description !== "string") {
      return res.status(400).json({
        id: null,
        message: "Description is required and must be a string",
      });
    }

    if (!category || typeof category !== "string") {
      return res.status(400).json({
        id: null,
        message: "Category is required and must be a string",
      });
    }

    // Validate category is one of the allowed values
    const normalizedCategory = category.toLowerCase().trim();
    if (!VALID_CATEGORIES.includes(normalizedCategory)) {
      return res.status(400).json({
        id: null,
        message: `Category must be one of: ${VALID_CATEGORIES.join(", ")}`,
      });
    }

    if (userid === undefined || userid === null) {
      return res.status(400).json({
        id: null,
        message: "User ID is required",
      });
    }

    // Parse and validate userid is a number
    const parsedUserid = parseInt(userid, 10);
    if (isNaN(parsedUserid)) {
      return res.status(400).json({
        id: userid,
        message: "User ID must be a number",
      });
    }

    // Validate sum is provided
    if (sum === undefined || sum === null) {
      return res.status(400).json({
        id: parsedUserid,
        message: "Sum is required",
      });
    }

    // Parse and validate sum is a number (Double type)
    const parsedSum = parseFloat(sum);
    if (isNaN(parsedSum)) {
      return res.status(400).json({
        id: parsedUserid,
        message: "Sum must be a number",
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ id: parsedUserid });
    if (!userExists) {
      await logger.warn("User not found when adding cost", {
        userid: parsedUserid,
      });
      return res.status(404).json({
        id: parsedUserid,
        message: "User not found. Cannot add cost for non-existent user.",
      });
    }

    // Handle date - use current date if not provided
    const now = new Date();
    let costDay = day !== undefined ? parseInt(day, 10) : now.getDate();
    let costMonth =
      month !== undefined ? parseInt(month, 10) : now.getMonth() + 1;
    let costYear = year !== undefined ? parseInt(year, 10) : now.getFullYear();

    // Validate date values
    if (isNaN(costDay) || costDay < 1 || costDay > 31) {
      return res.status(400).json({
        id: parsedUserid,
        message: "Day must be a number between 1 and 31",
      });
    }

    if (isNaN(costMonth) || costMonth < 1 || costMonth > 12) {
      return res.status(400).json({
        id: parsedUserid,
        message: "Month must be a number between 1 and 12",
      });
    }

    if (isNaN(costYear) || costYear < 1900) {
      return res.status(400).json({
        id: parsedUserid,
        message: "Year must be a valid year (1900 or later)",
      });
    }

    // Check if the date is in the past (server doesn't allow past dates)
    if (isMonthInPast(costYear, costMonth)) {
      await logger.warn("Attempt to add cost with past date", {
        userid: parsedUserid,
        year: costYear,
        month: costMonth,
      });
      return res.status(400).json({
        id: parsedUserid,
        message: "Cannot add costs with dates in the past",
      });
    }

    // Create the cost item
    const newCost = new Cost({
      description: description.trim(),
      category: normalizedCategory,
      userid: parsedUserid,
      sum: parsedSum,
      day: costDay,
      month: costMonth,
      year: costYear,
      created_at: new Date(costYear, costMonth - 1, costDay),
    });

    await newCost.save();

    await logger.info("Cost added successfully", {
      userid: parsedUserid,
      category: normalizedCategory,
      sum: parsedSum,
    });

    // Return the created cost item
    res.status(201).json({
      description: newCost.description,
      category: newCost.category,
      userid: newCost.userid,
      sum: parseFloat(newCost.sum.toString()),
      day: newCost.day,
      month: newCost.month,
      year: newCost.year,
      _id: newCost._id,
    });
  } catch (error) {
    await logger.error("Error adding cost", { error: error.message });

    res.status(500).json({
      id: req.body.userid || null,
      message: error.message || "An error occurred while adding the cost item",
    });
  }
});

/*
 * Computed Design Pattern Implementation:
 *
 * The Computed Design Pattern is used to optimize performance by caching
 * computed results that won't change. In this application:
 *
 * 1. When a report is requested for a PAST month:
 *    - First, we check if a cached report exists in the 'reports' collection
 *    - If cached report exists, return it immediately (no computation needed)
 *    - If not cached, compute the report, save it to cache, then return it
 *
 * 2. When a report is requested for the CURRENT or FUTURE month:
 *    - Always compute the report fresh (don't cache)
 *    - This is because new costs can still be added to current/future months
 *
 * 3. Why this works:
 *    - The server doesn't allow adding costs with past dates
 *    - Therefore, past month reports will never change
 *    - Caching them saves database queries on repeated requests
 *
 * The cached reports are stored in the 'reports' collection with:
 * userid, year, month, and the pre-computed costs array
 */

/**
 * GET /api/report
 * Gets a monthly report for a specific user.
 * Query parameters: id, year, month
 */
app.get("/api/report", async (req, res) => {
  try {
    await logger.info("Endpoint accessed: GET /api/report", {
      query: req.query,
    });

    const { id, year, month } = req.query;

    // Validate required parameters
    if (id === undefined || id === null) {
      return res.status(400).json({
        id: null,
        message: "User ID (id) is required",
      });
    }

    if (year === undefined || year === null) {
      return res.status(400).json({
        id: id,
        message: "Year is required",
      });
    }

    if (month === undefined || month === null) {
      return res.status(400).json({
        id: id,
        message: "Month is required",
      });
    }

    const parsedId = parseInt(id, 10);
    const parsedYear = parseInt(year, 10);
    const parsedMonth = parseInt(month, 10);

    // Validate numeric values
    if (isNaN(parsedId)) {
      return res.status(400).json({
        id: id,
        message: "User ID must be a number",
      });
    }

    if (isNaN(parsedYear) || parsedYear < 1900) {
      return res.status(400).json({
        id: parsedId,
        message: "Year must be a valid year",
      });
    }

    if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      return res.status(400).json({
        id: parsedId,
        message: "Month must be between 1 and 12",
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ id: parsedId });
    if (!userExists) {
      await logger.warn("User not found when getting report", {
        userid: parsedId,
      });
      return res.status(404).json({
        id: parsedId,
        message: "User not found",
      });
    }

    // Computed Design Pattern Implementation:
    // Check if this is a past month - if so, try to get cached report
    const isPastMonth = isMonthInPast(parsedYear, parsedMonth);

    if (isPastMonth) {
      // Try to find cached report
      const cachedReport = await Report.findOne({
        userid: parsedId,
        year: parsedYear,
        month: parsedMonth,
      });

      if (cachedReport) {
        await logger.info("Returning cached report", {
          userid: parsedId,
          year: parsedYear,
          month: parsedMonth,
        });

        return res.json({
          userid: cachedReport.userid,
          year: cachedReport.year,
          month: cachedReport.month,
          costs: cachedReport.costs,
        });
      }
    }

    // Generate the report
    const report = await generateReport(parsedId, parsedYear, parsedMonth);

    // Cache the report if it's for a past month
    if (isPastMonth) {
      try {
        const newReport = new Report({
          userid: parsedId,
          year: parsedYear,
          month: parsedMonth,
          costs: report.costs,
        });

        await newReport.save();

        await logger.info("Report cached for past month", {
          userid: parsedId,
          year: parsedYear,
          month: parsedMonth,
        });
      } catch (cacheError) {
        // Log but don't fail if caching fails (might be duplicate)
        await logger.warn("Could not cache report", {
          error: cacheError.message,
        });
      }
    }

    await logger.info("Report generated successfully", {
      userid: parsedId,
      year: parsedYear,
      month: parsedMonth,
    });

    res.json(report);
  } catch (error) {
    await logger.error("Error generating report", { error: error.message });

    res.status(500).json({
      id: req.query.id || null,
      message: error.message || "An error occurred while generating the report",
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: SERVICE_NAME });
});

// Start server
async function startServer() {
  try {
    await connectDB();
    await logger.info("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`${SERVICE_NAME} running on port ${PORT}`);
      logger.info(`${SERVICE_NAME} started`, { port: PORT });
    });
  } catch (error) {
    console.error(`Failed to start ${SERVICE_NAME}:`, error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
```

---

## 13. admin-service/index.js

```javascript
/**
 * Admin Microservice
 * Handles admin-related operations.
 * Endpoints:
 *   - GET /api/about - Get information about the development team
 * Port: 3004
 */

// Load environment variables from .env file
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

// Import required modules
const express = require("express");
const cors = require("cors");
const { connectDB } = require("../shared/db");
const { createLogger, requestLoggerMiddleware } = require("../shared/logger");

// Initialize Express application
const app = express();
const PORT = process.env.ADMIN_PORT || 3004;
const SERVICE_NAME = "admin-service";

// Create logger for this service
const logger = createLogger(SERVICE_NAME);

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLoggerMiddleware(SERVICE_NAME));

/**
 * Development team information
 * Stored in code (not in database) as per requirements.
 * Property names match those in the users collection: first_name, last_name
 * Update these values with actual team member names.
 */
const DEVELOPERS = [
  {
    first_name: process.env.DEVELOPER_1_FIRST_NAME || "Daniel",
    last_name: process.env.DEVELOPER_1_LAST_NAME || "Ziv",
  },
  {
    first_name: process.env.DEVELOPER_2_FIRST_NAME || "Team",
    last_name: process.env.DEVELOPER_2_LAST_NAME || "Member",
  },
];

/**
 * GET /api/about
 * Returns information about the development team.
 * Response includes first_name and last_name for each team member.
 * These names are not stored in the database (hardcoded or from .env).
 */
app.get("/api/about", async (req, res) => {
  try {
    await logger.info("Endpoint accessed: GET /api/about");

    await logger.info("Developers info retrieved successfully", {
      count: DEVELOPERS.length,
    });

    // Return the developers array
    res.json(DEVELOPERS);
  } catch (error) {
    // Log error and return error response with id and message
    await logger.error("Error retrieving developers info", {
      error: error.message,
    });

    // Return error JSON with id and message properties as required
    res.status(500).json({
      id: null,
      message:
        error.message ||
        "An error occurred while retrieving developers information",
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: SERVICE_NAME });
});

// Start server
async function startServer() {
  try {
    await connectDB();
    await logger.info("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`${SERVICE_NAME} running on port ${PORT}`);
      logger.info(`${SERVICE_NAME} started`, { port: PORT });
    });
  } catch (error) {
    console.error(`Failed to start ${SERVICE_NAME}:`, error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
```

---

## 14. scripts/seed.js

```javascript
/**
 * Database Seed Script
 * Creates the initial imaginary user as required by the project specifications.
 * User details:
 *   - id: 123123
 *   - first_name: mosh
 *   - last_name: israeli
 */

require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const mongoose = require("mongoose");
const { User, Cost, Log, Report } = require("../shared/models");

// Initial imaginary user data as specified in requirements
const INITIAL_USER = {
  id: 123123,
  first_name: "mosh",
  last_name: "israeli",
  birthday: new Date("1990-01-01"),
};

async function seed() {
  try {
    console.log("Connecting to MongoDB...");

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not defined");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB successfully");

    // Clear existing data
    console.log("Clearing existing data...");
    await User.deleteMany({});
    await Cost.deleteMany({});
    await Log.deleteMany({});
    await Report.deleteMany({});
    console.log("Existing data cleared");

    // Create the initial imaginary user
    console.log("Creating initial user...");
    const user = new User(INITIAL_USER);
    await user.save();

    console.log("Initial user created successfully:");
    console.log({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      birthday: user.birthday,
    });

    console.log("\nDatabase seeded successfully!");
    console.log("The database now contains only the initial imaginary user.");
  } catch (error) {
    console.error("Seed error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
}

seed();
```

---

## 15. jest.config.js

```javascript
/**
 * Jest Configuration
 */

module.exports = {
  // Test environment
  testEnvironment: "node",

  // Test file patterns
  testMatch: ["**/tests/**/*.test.js"],

  // Ignore patterns
  testPathIgnorePatterns: ["/node_modules/"],

  // Timeout for each test
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,
};
```

---

## 16. tests/setup.js

```javascript
/**
 * Test Setup File
 * Configures the test environment and database connection.
 */

require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const mongoose = require("mongoose");
const { User, Cost, Log, Report } = require("../shared/models");

// Test data
const TEST_USER = {
  id: 123123,
  first_name: "mosh",
  last_name: "israeli",
  birthday: new Date("1990-01-01"),
};

// Connect to database before tests
async function setupDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI not defined");
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
  TEST_USER,
};
```

---

## 17. tests/logs.test.js

```javascript
/**
 * Logs Service Unit Tests
 * Tests for GET /api/logs endpoint
 */

require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const request = require("supertest");
const mongoose = require("mongoose");
const express = require("express");
const { Log } = require("../shared/models");
const { setupDatabase, seedDatabase, teardownDatabase } = require("./setup");

// Create a test app instance
const app = express();
app.use(express.json());

// Mock the endpoint for testing
app.get("/api/logs", async (req, res) => {
  try {
    const logs = await Log.find({}).sort({ timestamp: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({
      id: null,
      message: error.message,
    });
  }
});

describe("Logs Service", () => {
  // Connect to database before all tests
  beforeAll(async () => {
    await setupDatabase();
  });

  // Seed database before each test
  beforeEach(async () => {
    await seedDatabase();
  });

  // Disconnect after all tests
  afterAll(async () => {
    await teardownDatabase();
  });

  describe("GET /api/logs", () => {
    // Test: Should return empty array when no logs exist
    test("should return empty array when no logs exist", async () => {
      await Log.deleteMany({});

      const response = await request(app)
        .get("/api/logs")
        .expect("Content-Type", /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    // Test: Should return all logs
    test("should return all logs", async () => {
      // Create some test logs
      await Log.create([
        { level: "info", message: "Test log 1", service: "test-service" },
        { level: "warn", message: "Test log 2", service: "test-service" },
        { level: "error", message: "Test log 3", service: "test-service" },
      ]);

      const response = await request(app)
        .get("/api/logs")
        .expect("Content-Type", /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
    });

    // Test: Logs should contain required properties
    test("logs should contain required properties", async () => {
      await Log.create({
        level: "info",
        message: "Test message",
        service: "test-service",
        method: "GET",
        url: "/api/test",
      });

      const response = await request(app).get("/api/logs").expect(200);

      expect(response.body[0]).toHaveProperty("level");
      expect(response.body[0]).toHaveProperty("message");
      expect(response.body[0]).toHaveProperty("service");
    });
  });
});
```

---

## 18. tests/users.test.js

```javascript
/**
 * Users Service Unit Tests
 * Tests for:
 *   - GET /api/users
 *   - GET /api/users/:id
 *   - POST /api/add (user)
 */

require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const request = require("supertest");
const mongoose = require("mongoose");
const express = require("express");
const { User, Cost } = require("../shared/models");
const {
  setupDatabase,
  seedDatabase,
  teardownDatabase,
  TEST_USER,
} = require("./setup");

// Create a test app instance
const app = express();
app.use(express.json());

// GET /api/users endpoint
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}).select("-__v");
    res.json(users);
  } catch (error) {
    res.status(500).json({ id: null, message: error.message });
  }
});

// GET /api/users/:id endpoint
app.get("/api/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
      return res.status(400).json({
        id: req.params.id,
        message: "Invalid user ID. Must be a number.",
      });
    }

    const user = await User.findOne({ id: userId });

    if (!user) {
      return res.status(404).json({ id: userId, message: "User not found" });
    }

    const costsAggregate = await Cost.aggregate([
      { $match: { userid: userId } },
      { $group: { _id: null, total: { $sum: { $toDouble: "$sum" } } } },
    ]);

    const total = costsAggregate.length > 0 ? costsAggregate[0].total : 0;

    res.json({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      total: total,
    });
  } catch (error) {
    res.status(500).json({ id: req.params.id, message: error.message });
  }
});

// POST /api/add (user) endpoint
app.post("/api/add", async (req, res) => {
  try {
    const { id, first_name, last_name, birthday } = req.body;

    if (id === undefined || id === null) {
      return res.status(400).json({ id: null, message: "User ID is required" });
    }

    if (!first_name || typeof first_name !== "string") {
      return res
        .status(400)
        .json({
          id: id,
          message: "First name is required and must be a string",
        });
    }

    if (!last_name || typeof last_name !== "string") {
      return res
        .status(400)
        .json({
          id: id,
          message: "Last name is required and must be a string",
        });
    }

    if (!birthday) {
      return res.status(400).json({ id: id, message: "Birthday is required" });
    }

    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return res
        .status(400)
        .json({ id: id, message: "User ID must be a number" });
    }

    const existingUser = await User.findOne({ id: userId });
    if (existingUser) {
      return res
        .status(400)
        .json({ id: userId, message: "A user with this ID already exists" });
    }

    const birthdayDate = new Date(birthday);
    if (isNaN(birthdayDate.getTime())) {
      return res
        .status(400)
        .json({ id: userId, message: "Invalid birthday format" });
    }

    const newUser = new User({
      id: userId,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      birthday: birthdayDate,
    });

    await newUser.save();

    res.status(201).json({
      id: newUser.id,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      birthday: newUser.birthday,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({
          id: req.body.id,
          message: "A user with this ID already exists",
        });
    }
    res.status(500).json({ id: req.body.id || null, message: error.message });
  }
});

describe("Users Service", () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await teardownDatabase();
  });

  describe("GET /api/users", () => {
    // Test: Should return all users
    test("should return all users", async () => {
      const response = await request(app)
        .get("/api/users")
        .expect("Content-Type", /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    // Test: Should return users with correct properties
    test("should return users with correct properties", async () => {
      const response = await request(app).get("/api/users").expect(200);

      const user = response.body.find((u) => u.id === TEST_USER.id);
      expect(user).toBeDefined();
      expect(user.id).toBe(TEST_USER.id);
      expect(user.first_name).toBe(TEST_USER.first_name);
      expect(user.last_name).toBe(TEST_USER.last_name);
    });
  });

  describe("GET /api/users/:id", () => {
    // Test: Should return user details with total costs
    test("should return user details with total costs", async () => {
      const response = await request(app)
        .get(`/api/users/${TEST_USER.id}`)
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body.id).toBe(TEST_USER.id);
      expect(response.body.first_name).toBe(TEST_USER.first_name);
      expect(response.body.last_name).toBe(TEST_USER.last_name);
      expect(response.body).toHaveProperty("total");
    });

    // Test: Should return 404 for non-existent user
    test("should return 404 for non-existent user", async () => {
      const response = await request(app)
        .get("/api/users/999999")
        .expect("Content-Type", /json/)
        .expect(404);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("not found");
    });

    // Test: Should return 400 for invalid user ID
    test("should return 400 for invalid user ID", async () => {
      const response = await request(app)
        .get("/api/users/invalid")
        .expect("Content-Type", /json/)
        .expect(400);

      expect(response.body).toHaveProperty("message");
    });

    // Test: Should calculate total costs correctly
    test("should calculate total costs correctly", async () => {
      // Add some costs for the test user
      const now = new Date();
      await Cost.create([
        {
          description: "Test cost 1",
          category: "food",
          userid: TEST_USER.id,
          sum: 50.5,
          day: now.getDate(),
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
        {
          description: "Test cost 2",
          category: "health",
          userid: TEST_USER.id,
          sum: 100.0,
          day: now.getDate(),
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
      ]);

      const response = await request(app)
        .get(`/api/users/${TEST_USER.id}`)
        .expect(200);

      expect(response.body.total).toBeCloseTo(150.5, 1);
    });
  });

  describe("POST /api/add (user)", () => {
    // Test: Should add a new user successfully
    test("should add a new user successfully", async () => {
      const newUser = {
        id: 999999,
        first_name: "Test",
        last_name: "User",
        birthday: "1995-05-15",
      };

      const response = await request(app)
        .post("/api/add")
        .send(newUser)
        .expect("Content-Type", /json/)
        .expect(201);

      expect(response.body.id).toBe(newUser.id);
      expect(response.body.first_name).toBe(newUser.first_name);
      expect(response.body.last_name).toBe(newUser.last_name);
    });

    // Test: Should return 400 when id is missing
    test("should return 400 when id is missing", async () => {
      const response = await request(app)
        .post("/api/add")
        .send({ first_name: "Test", last_name: "User", birthday: "1990-01-01" })
        .expect(400);

      expect(response.body).toHaveProperty("message");
    });

    // Test: Should return 400 when first_name is missing
    test("should return 400 when first_name is missing", async () => {
      const response = await request(app)
        .post("/api/add")
        .send({ id: 111111, last_name: "User", birthday: "1990-01-01" })
        .expect(400);

      expect(response.body.message).toContain("First name");
    });

    // Test: Should return 400 when last_name is missing
    test("should return 400 when last_name is missing", async () => {
      const response = await request(app)
        .post("/api/add")
        .send({ id: 111111, first_name: "Test", birthday: "1990-01-01" })
        .expect(400);

      expect(response.body.message).toContain("Last name");
    });

    // Test: Should return 400 when birthday is missing
    test("should return 400 when birthday is missing", async () => {
      const response = await request(app)
        .post("/api/add")
        .send({ id: 111111, first_name: "Test", last_name: "User" })
        .expect(400);

      expect(response.body.message).toContain("Birthday");
    });

    // Test: Should return 400 for duplicate user ID
    test("should return 400 for duplicate user ID", async () => {
      const response = await request(app)
        .post("/api/add")
        .send({
          id: TEST_USER.id,
          first_name: "Duplicate",
          last_name: "User",
          birthday: "1990-01-01",
        })
        .expect(400);

      expect(response.body.message).toContain("already exists");
    });
  });
});
```

---

## 19. tests/costs.test.js

```javascript
/**
 * Costs Service Unit Tests
 * Tests for:
 *   - POST /api/add (cost)
 *   - GET /api/report
 */

require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const request = require("supertest");
const mongoose = require("mongoose");
const express = require("express");
const { User, Cost, Report } = require("../shared/models");
const {
  setupDatabase,
  seedDatabase,
  teardownDatabase,
  TEST_USER,
} = require("./setup");

// Valid categories
const VALID_CATEGORIES = ["food", "health", "housing", "sports", "education"];

// Helper function to check if month is in past
function isMonthInPast(year, month) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear) return true;
  if (year === currentYear && month < currentMonth) return true;
  return false;
}

// Generate report function
async function generateReport(userid, year, month) {
  const costs = await Cost.find({ userid, year, month });

  const costsArray = VALID_CATEGORIES.map((category) => {
    const categoryCosts = costs
      .filter((cost) => cost.category === category)
      .map((cost) => ({
        sum: parseFloat(cost.sum.toString()),
        description: cost.description,
        day: cost.day,
      }));

    return { [category]: categoryCosts };
  });

  return { userid, year, month, costs: costsArray };
}

// Create test app instance
const app = express();
app.use(express.json());

// POST /api/add (cost) endpoint
app.post("/api/add", async (req, res) => {
  // ... implementation ...
});

// GET /api/report endpoint
app.get("/api/report", async (req, res) => {
  // ... implementation ...
});

describe("Costs Service", () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await teardownDatabase();
  });

  describe("POST /api/add (cost)", () => {
    test("should add a cost item successfully", async () => {
      // Test implementation
    });

    test("should use current date if not provided", async () => {
      // Test implementation
    });

    test("should return 400 for invalid category", async () => {
      // Test implementation
    });

    test("should not allow costs with past dates", async () => {
      // Test implementation
    });
  });

  describe("GET /api/report", () => {
    test("should return report with all categories", async () => {
      // Test implementation
    });

    test("should return costs grouped by category", async () => {
      // Test implementation
    });

    test("each cost should have sum, description, and day", async () => {
      // Test implementation
    });
  });
});
```

(Note: Full test file is longer - see actual file for complete implementation)

---

## 20. tests/admin.test.js

```javascript
/**
 * Admin Service Unit Tests
 * Tests for GET /api/about endpoint
 */

require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const request = require("supertest");
const express = require("express");
const { setupDatabase, teardownDatabase } = require("./setup");

// Create test app instance
const app = express();
app.use(express.json());

// Development team information (same as in admin service)
const DEVELOPERS = [
  {
    first_name: process.env.DEVELOPER_1_FIRST_NAME || "Daniel",
    last_name: process.env.DEVELOPER_1_LAST_NAME || "Ziv",
  },
  {
    first_name: process.env.DEVELOPER_2_FIRST_NAME || "Team",
    last_name: process.env.DEVELOPER_2_LAST_NAME || "Member",
  },
];

// GET /api/about endpoint
app.get("/api/about", async (req, res) => {
  try {
    res.json(DEVELOPERS);
  } catch (error) {
    res.status(500).json({
      id: null,
      message: error.message || "An error occurred",
    });
  }
});

describe("Admin Service", () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  afterAll(async () => {
    await teardownDatabase();
  });

  describe("GET /api/about", () => {
    test("should return array of developers", async () => {
      const response = await request(app)
        .get("/api/about")
        .expect("Content-Type", /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test("developers should have first_name and last_name properties", async () => {
      const response = await request(app).get("/api/about").expect(200);

      response.body.forEach((developer) => {
        expect(developer).toHaveProperty("first_name");
        expect(developer).toHaveProperty("last_name");
        expect(typeof developer.first_name).toBe("string");
        expect(typeof developer.last_name).toBe("string");
      });
    });

    test("should not include additional data beyond first_name and last_name", async () => {
      const response = await request(app).get("/api/about").expect(200);

      response.body.forEach((developer) => {
        const keys = Object.keys(developer);
        expect(keys.length).toBe(2);
        expect(keys).toContain("first_name");
        expect(keys).toContain("last_name");
      });
    });

    test("should return consistent data across multiple requests", async () => {
      const response1 = await request(app).get("/api/about").expect(200);
      const response2 = await request(app).get("/api/about").expect(200);

      expect(response1.body).toEqual(response2.body);
    });
  });
});
```

---

# End of Code Files

---

## Instructions for PDF Creation

1. Copy this entire markdown content
2. Use a Markdown to PDF converter (e.g., Pandoc, VS Code Markdown PDF extension, or online converter)
3. Fill in the personal details in the Team Information section (ID, Phone, Email)
4. The PDF should include all code files with proper syntax highlighting
