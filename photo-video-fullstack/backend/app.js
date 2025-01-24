const express = require("express");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const app = express();
const multer = require("multer");
// const FormData = require("form-data");

// Set up multer to parse multipart form data
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).array("photos", 10);

// Trust the proxy to use X-Forwarded-For headers correctly
app.set("trust proxy", "loopback");

app.use(express.json());
const cors = require("cors");
app.use(
  cors({
    origin: "https://n11780100.cab432.com",
    credentials: true,
  })
);

// Rate limiter with a custom keyGenerator
const RateLimit = require("express-rate-limit");
const limiter = RateLimit({
  windowMs: 1 * 10 * 1000,
  max: 10,
  keyGenerator: (req) => req.ip, // Use req.ip directly
});
app.use(limiter);

app.get("/api/health", (req, res) => {
  res.status(200).send("OK");
});

// Authorization Middleware to extract username and groups from JWT
async function cognitoAuthorize(req, res, next) {
  const receivedHeader = req.headers["authorization"];
  console.log("Received authorization header:", receivedHeader);

  const accessToken = receivedHeader?.split(" ")[1]; // Extract token from 'Bearer token'
  console.log("Received accessToken:", accessToken);

  if (!accessToken) {
    console.error("Authorization token is missing.");
    return res.status(401).send("Unauthorized: No token provided");
  }

  try {
    // Decode the JWT token to extract user details
    const decodedToken = jwt.decode(accessToken);

    if (!decodedToken) {
      console.error("Failed to decode token.");
      return res.status(401).send("Invalid token");
    }

    // Extract username and group information
    const username = decodedToken.username || decodedToken.sub;
    const groups = decodedToken["cognito:groups"] || [];

    // Attach username and groups to the request headers for downstream services
    req.headers["x-username"] = username;
    req.headers["x-groups"] = JSON.stringify(groups);

    next();
  } catch (error) {
    console.error("Authorization error:", error);
    res.status(500).send("Internal Server Error");
  }
}

// Public Routes (no authorization required)
app.use("/api/auth/signup", (req, res) => {
  axios({
    method: req.method,
    url: `http://3.106.216.80:8084/signup`,
    data: req.body,
    headers: req.headers,
  })
    .then((response) => res.json(response.data))
    .catch((error) =>
      res.status(error.response?.status || 500).send(error.message)
    );
});

app.use("/api/auth/login", (req, res) => {
  axios({
    method: req.method,
    url: `http://3.106.216.80:8084/login`,
    data: req.body,
    headers: req.headers,
  })
    .then((response) => res.json(response.data))
    .catch((error) =>
      res.status(error.response?.status || 500).send(error.message)
    );
});

// Protected Route (authorization required)
app.use("/api/photos/upload", cognitoAuthorize, upload, async (req, res) => {
  console.log("This is req.files in app.js: ", req.files);

  try {
    console.log("This is header sent from app.js: ", req.headers);
    // Forward `req.files` directly as JSON to `photos.js`
    const response = await axios.post(
      "http://3.107.174.222:8082/upload",
      { files: req.files}, 
      {
        headers: {
          Authorization: req.headers["authorization"],
          "x-username": req.headers["x-username"],
          "x-groups": req.headers["x-groups"],
          "Content-Type": "application/json" // Specify JSON content type
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error forwarding to photos service:", error.message);
    res.status(error.response?.status || 500).send(error.message);
  }
});

// Route to Videos Service
app.use("/api/videos", cognitoAuthorize, (req, res) => {
  axios({
    method: req.method,
    url: `http://52.65.12.76:8083${req.url}`,
    data: req.body,
    headers: req.headers,
  })
    .then((response) => res.json(response.data))
    .catch((error) =>
      res.status(error.response?.status || 500).send(error.message)
    );
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`Core Application Service running on port ${PORT}`);
});
