const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const createError = require('http-errors');
const indexRouter = require("./routes/index");
// const { router: usersRouter, users } = require("./routes/users");
const catalogRouter = require("./routes/catalog");
const authRouter = require("./routes/auth");

require('dotenv').config();
const app = express();
const AWS = require("aws-sdk"); 

// Serve the uploads directory as static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Initialize AWS Cognito SDK
const cognito = new AWS.CognitoIdentityServiceProvider({
  region: "ap-southeast-2",
});

// TODO: Cognito Authorization middleware (need to take username from frontend)
async function cognitoAuthorize(req, res, next) {
  const token = req.headers['authorization'];
  const username = req.headers['username'];

  if (!token || !username) {
    return res.status(401).send('Unauthorized: No token or username provided');
  }

  try {
    const accessToken = token.replace('Bearer ','');
    // Get user info from Cognito using the token
    const params = {
      AccessToken: accessToken,
    };

    const userInfo = await cognito.getUser(params).promise();
      req.username = username;
      next();
    } catch (error) {
      console.error("Error verifying token:", error);
      res.status(401).send('Unauthorized: Invalid Token');
    }
}

// Apply JWT authorization middleware to routes that need it
app.use("/catalog", cognitoAuthorize);
app.use("/catalog/list-videos", cognitoAuthorize);

app.use("/", indexRouter);
app.use("/catalog", catalogRouter);
app.use("/videos", express.static(path.join(__dirname, 'videos')));
app.use("/auth", authRouter); // Handle Login and SignUp



// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404, 'Endpoint not found'));
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});

module.exports = app;