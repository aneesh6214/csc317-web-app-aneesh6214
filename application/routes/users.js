var express = require('express');
var router = express.Router();
var db = require('../conf/database');
var bcrypt = require('bcrypt');
var multer = require('multer');
var path = require('path');

// Set up the multer storage and file upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/uploads');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, 'profile_picture' + ext);
  }
});

// Create the multer upload object
const upload = multer({ storage: storage });

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
      req.flash('error', 'Username or Email already exists');
      req.session.save(function (error) {
        return res.redirect('/register');
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into database
    const [result] = await db.promise().query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    // Send success response
    req.flash('success', 'User Registered Successfully');
    req.session.save(function (error) {
      return res.redirect("/");
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'SERVER ERROR');
    req.session.save(function (error) {
      return res.redirect("/register");
    });
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
      req.flash("error", 'Log In Failed: Invalid username/password');
      req.session.save(function (error) {
        return res.redirect("/login");
      });
    }

    // Compare hashed password in database with password provided by user
    const passwordsMatch = await bcrypt.compare(password, rows[0].password);

    // If passwords don't match, send error response
    if (!passwordsMatch) {
      req.flash("error", 'Log In Failed: Invalid username/password');
      req.session.save(function (error) {
        return res.redirect("/login");
      });
    }

    // Define user object for sessions
    const user = rows[0];
    req.session.user = {
      userId: user.id,
      email: user.email,
      username: user.username,
      profile_picture: user.profile_picture // Update to the correct column name
    };

    // Send success response
    req.flash("success", 'Log In Success!');
    req.session.save(function (error) {
      return res.redirect("/");
    });

  } catch (error) {
    console.error(error);
    return res.redirect("/login");
  }
});

router.get('/profile', function (req, res) {
  if (req.session.user) {
    // User is logged in, render profile template
    res.render('profile', { title: 'Profile', css: ["../css/profile.css"] });
  } else {
    // User is not logged in, redirect to login page
    res.redirect('/login');
  }
});


router.post('/upload-profile-picture', upload.single('profilePicture'), async function (req, res) {
  if (req.session.user) {
    if (!req.file) {
      req.flash('error', 'Please select a file');
      req.session.save(function (error) {
        return res.redirect('/users/profile');
      });
      return;
    }

    const userId = req.session.user.userId;
    const profilePicturePath = '/images/uploads/' + req.file.filename;

    // update database
    db.query(
      'UPDATE users SET profile_picture = ? WHERE id = ?',
      [profilePicturePath, userId],
      function (error, results) {
        if (error) {
          console.error(error);
          res.status(500).send('Internal Server Error');
        } else {
          res.redirect('/users/profile');
        }
      }
    );
  } else {
    res.redirect('/login');
  }
});

//LOGOUT
router.get('/logout', function (req, res) {
  req.session.destroy(function (err) {
    if (err) {
      next(err);
    } else {
      res.redirect('/login');
    }
  });
});

function displayFlashMessage(req, success, message) {
  req.flash(success, message);
  req.session.save();
}

module.exports = router;
exports.displayFlashMessage = displayFlashMessage;
