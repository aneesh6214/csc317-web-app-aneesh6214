var express = require('express');
var router = express.Router();
var db = require('../conf/database');
var bcrypt = require('bcrypt');

//REGISTRATION
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

//LOGIN
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
      req.flash("error", 'Log In Failed: Invalid username/password')
      await req.session.save;
      return res.redirect("/login");
    }

    // Compare hashed password in database with password provided by user
    const passwordsMatch = await bcrypt.compare(password, rows[0].password);

    // If passwords don't match, send error response
    if (!passwordsMatch) {
      req.flash("error", 'Log In Failed: Invalid username/password')
      await req.session.save;
      return res.redirect("/login");
      //return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Define user object for sessions
    var user = rows[0];
    req.session.user = {
       userId: user.id,
       email: user.email,
       username: user.username
    };

    // Send success response
    //res.status(200).json({ message: 'User logged in successfully' });
    req.flash("success", 'Log In Success!')
      await req.session.save;
      return res.redirect("/");

  } catch (error) {
    console.error(error);
    //res.status(500).json({ error: 'Server error' });
    return res.redirect("/login")
  }
});

//DISPLAY PROFILE
router.get('/profile', function (req, res) {
  if (req.session.user) {
    // User is logged in, render profile template
    res.render('profile', { title: 'Profile', css: ["../css/profile.css"] });
  } else {
    // User is not logged in, redirect to login page
    res.redirect('/login');
  }
});

//LOGOUT
router.get('/logout', function(req, res) {
  req.session.destroy(function(err) {
    if(err) {
      next(err);
    } else {
      res.redirect('/login');
    }
  });
});

module.exports = router;
