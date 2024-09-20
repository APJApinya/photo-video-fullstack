const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const createError = require('http-errors');
const jwt = require("jsonwebtoken"); // Import jsonwebtoken
const indexRouter = require("./routes/index");
const { router: usersRouter, users } = require("./routes/users");
const catalogRouter = require("./routes/catalog");
const loadTestRoute = require("./routes/load-test");

const app = express();

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

// JWT Secret Key (Should be stored securely in environment variables in a production app)
const JWT_SECRET = 'your_secret_key';

// JWT Authorization middleware
function jwtAuthorize(req, res, next) {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(401).send('Unauthorized: No token provided');
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send('Unauthorized: Invalid token');
    } else {
      req.user = decoded.user; // Assuming the decoded token has the 'user' field
      req.username = decoded.username; // Assuming the decoded token has the 'username' field
      next();
    }
  });
}

// Apply JWT authorization middleware to routes that need it
app.use("/catalog", jwtAuthorize);
app.use("/users/protected-route", jwtAuthorize);
app.use("/catalog/list-videos", jwtAuthorize);

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/catalog", catalogRouter);
app.use('/videos', express.static(path.join(__dirname, 'videos')));
app.use("/load-test", loadTestRoute);

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