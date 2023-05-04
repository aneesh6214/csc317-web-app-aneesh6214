var express = require('express');
var router = express.Router();
var db = require('../conf/database');
var bcrypt = require('bcrypt');

//
router.post('/register', async function (req, res) {
  try {
    // Get registration data from request body
    const { username, email, password } = req.body;

    // Check if username or email already exists in the database
    const [rows] = await db.promise().query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into database
    const [result] = await db.promise().query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    // Send success response
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

/* POST /users/login */
router.post('/login', async function (req, res) {
  try {
    // Get login data from request body
    const { username, password } = req.body;

    // Find user by username in database
    const [rows] = await db.promise().query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    // If user not found, send error response
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Compare hashed password in database with password provided by user
    const passwordsMatch = await bcrypt.compare(password, rows[0].password);

    // If passwords don't match, send error response
    if (!passwordsMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Send success response
    res.status(200).json({ message: 'User logged in successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;
