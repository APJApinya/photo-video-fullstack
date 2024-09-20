var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.send('Welcome to the API'); // Or use res.json({ message: 'Welcome to the API' });
});

module.exports = router;