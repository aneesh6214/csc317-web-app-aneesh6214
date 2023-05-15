//dependencies
var express = require('express');
var router = express.Router();
var db = require('../conf/database');
var bcrypt = require('bcrypt');
var multer = require('multer');
var path = require('path');

//configure multer for file uploading
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'public/images/uploads');
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = file.fieldname + '-' + Date.now();
      cb(null, name + ext);
    }
  })
});

//REGISTRATION
router.post('/register', async function (req, res) {
  try {
    //get resistration data
    const { username, email, password } = req.body;

    //check if name/email is taken
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

    const hashedPassword = await bcrypt.hash(password, 10);

    //insert user into db
    const [result] = await db.promise().query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    req.flash('success', 'User Registered Successfully');
    req.session.save((error) => {
      return res.redirect("/");
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'SERVER ERROR');
    req.session.save((error) => {
      return res.redirect("/register");
    });
  }
});

//LOGIN
router.post('/login', async function (req, res) {
  try {
    //get login data
    const { username, password } = req.body;

    //find user from db
    const [rows] = await db.promise().query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    //invalid username
    if (rows.length === 0) {
      req.flash("error", 'Log In Failed: Invalid username/password');
      req.session.save(function (error) {
        return res.redirect("/login");
      });
      return;
    }

    //compare passwords
    const passwordsMatch = await bcrypt.compare(password, rows[0].password);

    //invalid password
    if (!passwordsMatch) {
      req.flash("error", 'Log In Failed: Invalid username/password');
      req.session.save(function (error) {
        return res.redirect("/login");
      });
      return;
    }

    //define user object for sessions
    const user = rows[0];
    req.session.user = {
      userId: user.id,
      email: user.email,
      username: user.username,
      profile_picture: user.profile_picture // Update to the correct column name
    };

    req.flash("success", 'Log In Success!');
    req.session.save((error) => {
      return res.redirect("/");
    });

  } catch (error) {
    console.error(error);
    return res.redirect("/login");
  }
});

//PROFILE PAGE
router.get('/profile', function (req, res) {
  if (req.session.user) {
    const userId = req.session.user.userId;

    //get user posts from db
    db.query(
      'SELECT * FROM posts WHERE fk_userid = ?',
      [userId],
      (error, results) => {
        if (error) {
          console.error(error);
          res.status(500).send('Internal Server Error');
        } else {
          const videos = results;
          //pass videos to frontend in res.render
          res.render('profile', {
            title: 'Profile',
            css: ['../css/profile.css'],
            videos: videos,
          });
        }
      }
    );
  } else {
    //not logged in
    res.redirect('/login');
  }
});

//route to handle porfile picture uploads
router.post('/upload-profile-picture', upload.single('profilePicture'), async function (req, res) {
  if (req.session.user) {
    //if they didnt provide a file flash an error
    if (!req.file) {
      req.flash('error', 'Please select a file');
      req.session.save((error) => {
        return res.redirect('/users/profile');
      });
      return;
    }

    const userId = req.session.user.userId;

    //create unique filename
    const profilePicturePath = `/public/images/uploads/${req.file.filename.split(".")[0]}${path.extname(req.file.filename)}`.replace('/public', '');
    req.session.user.profile_picture = profilePicturePath;

    //update pfp path in db
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

//helper to display flash messages in front end js
async function displayFlashMessage(req, success, message) {
  req.flash(success, message);
  await req.session.save();
}

module.exports = router;
exports.displayFlashMessage = displayFlashMessage;
