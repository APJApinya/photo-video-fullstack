const express = require('express');
const jwt = require('jsonwebtoken'); // Import jsonwebtoken
const router = express.Router();

// In-memory user store (in production, use a database)
const userStore = {
  'apinya': 'password123',
  'admin': 'password456'
};

// JWT Secret Key (Should be stored securely in environment variables in a production app)
const JWT_SECRET = 'your_secret_key';

// Simple login route
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).send('Username and password are required');
  }

  if (userStore[username] && userStore[username] === password) {
    // Create a JWT token
    const token = jwt.sign({ user: username, username }, JWT_SECRET, { expiresIn: '1h' });
    console.log("Token is", token)
    return res.json({ token });
  } else {
    return res.status(401).send('Invalid credentials');
  }
});

router.get('/test', (req, res) => {
  console.log("Test route accessed");
  res.send("Test route working");
});

module.exports = { router };
