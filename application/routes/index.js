//dependencies
var express = require('express');
var router = express.Router();
var multer = require('multer');
var path = require('path');
var fs = require('fs');
var pool = require('../conf/database');
var pathToFFMPEG = require('ffmpeg-static');
var { exec } = require('child_process');

//configure multer for file uploading
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'public/videos/uploads');
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = file.fieldname + '-' + Date.now();
      cb(null, name + ext);
    },
  }),
});

//HOME PAGE
router.get('/', async function (req, res, next) {
  try {
    //get all posts from database
    const [rows, fields] = await pool.promise().query(
      'SELECT * FROM posts'
    );

    const videos = rows;

    res.render('index', { title: 'Home Page', videos: videos, css: ["index.css"] });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

//LOGIN PAGE
router.get('/login', function (req, res) {
  res.render('login', { title: 'Login', css: ["../css/login.css"] });
});

//REGISTRATION PAGE
router.get('/register', function (req, res) {
  res.render('registration', { title: 'Register', css: ["../css/registration.css"], js: ["registration.js"] });
});

//POST A VIDEO PAGE
router.get('/postvideo', (req, res) => {
  res.render('postvideo', { title: 'Post a Video', css: ['../css/postvideo.css'] });
});

//route for video submission
router.post('/postvideo_submit', upload.single('video-file'), async (req, res) => {
  //validate user login
  if (!req.session.user) {
    req.flash('error', 'You must be logged in to post a video.');
    req.session.save(function (error) {
      res.redirect('/postvideo');
    })
    //delete the file if the user is not logged in
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return;
  }

  const { title, description } = req.body;
  const videoPath = req.file.path.replace(/\\/g, '/');
  let thumbnailPath = '';
  var ffmpeg = pathToFFMPEG.replace(/\\/g, '/');

  //generate thumbnail
  try {
    const destinationOfThumbnail = `public/videos/uploads/thumbnails/thumbnail-${req.file.filename.split(".")[0]}.png`;
    const thumbnailCommand = `"${ffmpeg}" -ss 00:00:01 -i "${videoPath}" -y -s 200x200 -vframes 1 -f image2 "${destinationOfThumbnail}"`;
    exec(thumbnailCommand, (error) => {
      if (error) {
        console.error(error);
        res.status(500).send('Thumbnail generation failed');
      } else {
        thumbnailPath = destinationOfThumbnail;

        //insert into db
        pool.query(
          'INSERT INTO posts (title, description, video, thumbnail, fk_userid) VALUES (?, ?, ?, ?, ?)',
          [title, description, videoPath, thumbnailPath, req.session.user.userId],
          (error, results) => {
            if (error) {
              console.error(error);
              res.status(500).send('Internal Server Error');
            } else {
              req.flash('success', 'Video Posted Successfully!');
              req.session.save((error) => {
                if (error) {
                  console.error(error);
                  res.status(500).send('Internal Server Error');
                } else {
                  res.redirect('/');
                }
              });
            }
          }
        );
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

//VIEW A POST
router.get('/viewpost/:id(\\d+)', async function (req, res) {
  const postId = req.params.id;
  try {
    //query db for the post
    const [rows, fields] = await pool.promise().query(
      'SELECT * FROM posts WHERE id = ?',
      [postId]
    );

    if (rows.length === 0) {
      res.status(404).send('Post not found');
      return;
    }

    const post = rows[0];

    //fetch comments, usernames, pfps
    const [commentRows] = await pool.promise().query(
      'SELECT comments.*, users.username, users.profile_picture FROM comments JOIN users ON comments.fk_authorId = users.id WHERE comments.fk_postId = ?',
      [postId]
    );

    const comments = commentRows;

    res.render('viewpost', {
      title: 'View Post',
      css: ['../css/viewpost.css'],
      js: ['../js/viewpost.js'],
      post: post,
      videoSource: post.video,
      comments: comments
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

//route to handle deletion of posts
router.get('/deletepost/:id(\\d+)', async function (req, res) {
  const postId = req.params.id;
  const userId = req.session.user ? req.session.user.userId : -1; //set to -1 if not logged in

  try {
    //query db for post
    const [rows, fields] = await pool.promise().query(
      'SELECT * FROM posts WHERE id = ?',
      [postId]
    );
    if (rows.length === 0) {
      res.status(404).send('Post not found');
      return;
    }

    const post = rows[0];

    //check if they are the owner
    if (userId !== post.fk_userid) {
      req.flash('error', 'You are not the owner of this post.')
      req.session.save(function (error) {
        res.redirect('/');
      });
      return;
    }

    //delete video from disk
    const videoPath = post.video;
    fs.unlinkSync(videoPath);

    //delete post from db
    await pool.promise().query(
      'DELETE FROM posts WHERE id = ?',
      [postId]
    );
    req.flash('success', 'Video Deleted Successfully');
    req.session.save(function (error) {
      res.redirect('/');
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

//route to submit a comment
router.post('/comment/:postId(\\d+)', function (req, res) {
  const postId = req.params.postId;
  const commentText = req.body.comment;

  //check if logged in
  if (!req.session.user) {
    res.status(401).send('Unauthorized');
    return;
  }

  const userId = req.session.user.userId;

  //insert comments into comments table
  pool.query(
    'INSERT INTO comments (commentText, fk_authorId, fk_postId) VALUES (?, ?, ?)',
    [commentText, userId, postId],
    function (error, results) {
      if (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      } else {
        res.redirect(`/viewpost/${postId}`);
      }
    }
  );
});

//route to handle search bar
router.post('/search', (req, res) => {

  const searchTerm = req.body.searchTerm;

  //search db for posts like the search term
  pool.query(
    'SELECT * FROM posts WHERE title LIKE ? OR description LIKE ?',
    [`%${searchTerm}%`, `%${searchTerm}%`],
    (error, results) => {
      if (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        const searchResults = results;
        req.flash('success', `Showing Results For: ${searchTerm}`);
        req.session.save(function (error) {
        });
        res.render('index', { title: 'Home Page', searchResults: searchResults, searchTerm: searchTerm, css: ["index.css"] });
      }
    }
  );
});


module.exports = router;
