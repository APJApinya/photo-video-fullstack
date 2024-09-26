const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const createError = require("http-errors");
const indexRouter = require("./routes/index");
const catalogRouter = require("./routes/catalog");
const authRouter = require("./routes/auth");

require("dotenv").config();
const { S3Client } = require("@aws-sdk/client-s3");

const app = express();
const AWS = require("aws-sdk");

// Initialize AWS S3 SDK client
const s3Client = new S3Client({ region: "ap-southeast-2" });
app.set("s3Client", s3Client);

// Initialize AWS Cognito SDK
const cognito = new AWS.CognitoIdentityServiceProvider({
  region: "ap-southeast-2",
});

// Initialize MySQL connection
const mysql = require("mysql2/promise");

async function createPool(app) {
  try {
    const pool = mysql.createPool({
      host: "n11780100-photodetail.ce2haupt2cta.ap-southeast-2.rds.amazonaws.com",
      user: "admin",
      password: "Password123&",
      database: "n11780100-photodetail",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    app.set("mysqlPool", pool);
    console.log("MySQL pool created successfully.");
  } catch (error) {
    console.error("Error creating MySQL pool:", error);
    throw error;
  }
}

// Set up the MySQL pool globally
createPool(app).catch((error) => {
  console.error("Error during pool creation:", error);
})

const RateLimit = require("express-rate-limit");
const limiter = RateLimit({
  windowMs: 1 * 10 * 1000, // 10 seconds
  max: 10,
});

// Apply rate limiter to all requests
app.use(limiter);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// TODO: Cognito Authorization middleware (need to take username from frontend)
async function cognitoAuthorize(req, res, next) {
  const username = req.headers["username"];
  if (!username) {
    return res.status(401).send("Unauthorized: No username provided");
  }
  try {
    req.username = username;
    next();
  } catch (error) {
    console.error("Error om middleware:", error);
    res.status(500).send("Internal Server Error");
  }
}

// Apply JWT authorization middleware to routes that need it
app.use("/catalog", cognitoAuthorize);
app.use("/catalog/list-videos", cognitoAuthorize);

app.use("/", indexRouter);
app.use("/catalog", catalogRouter);
app.use("/auth", authRouter); // Handle Login and SignUp

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404, "Endpoint not found"));
});

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Error handler
app.use(function (err, req, res, next) {
  const status = err.status || 500;
  res.status(status).json({
    error: {
      status: status,
      message: err.message,
    },
  });
});

// Start the server and listen on port 3000
const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

module.exports = app;
