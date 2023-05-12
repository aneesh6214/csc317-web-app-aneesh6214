var express = require('express');
var router = express.Router();
var multer = require('multer');
var path = require('path');
var fs = require('fs');
var pool = require('../conf/database');
var pathToFFMPEG = require('ffmpeg-static');
const { exec } = require('child_process');

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

router.get('/', async function (req, res, next) {
  try {
    const [rows, fields] = await pool.promise().query(
      'SELECT * FROM posts'
    );

    const videos = rows;

    res.render('index', { title: 'Home Page', videos: videos , css: ["index.css"]});
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/login', function (req, res) {
  res.render('login', { title: 'Login', css: ["../css/login.css"] });
});

router.get('/register', function (req, res) {
  res.render('registration', { title: 'Register', css: ["../css/registration.css"], js: ["registration.js"] });
});

router.get('/postvideo', (req, res) => {
  res.render('postvideo', { title: 'Post a Video', css: ['../css/postvideo.css'] });
});

router.post('/postvideo_submit', upload.single('video-file'), async (req, res) => {
  // Check if the user is logged in
  if (!req.session.user) {
    req.flash('error', 'You must be logged in to post a video.');
    await req.session.save();
    res.redirect('/postvideo');
    // Remove the video file if the user is not logged in
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return;
  }

  const { title, description } = req.body;
  const videoPath = req.file.path.replace('public', '').replace(/\\/g, '/');
  let thumbnailPath = '';

  // Generate thumbnail
  try {
    const destinationOfThumbnail = `./public/videos/uploads/thumbnails/thumbnail-${req.file.filename.split(".")[0]}.png`;
    const thumbnailCommand = `"${pathToFFMPEG}" -ss 00:00:01 -i "${req.file.path}" -y -s 200x200 -vframes 1 -f image2 "${destinationOfThumbnail}"`;
    exec(thumbnailCommand, (error) => {
      if (error) {
        console.error(error);
        res.status(500).send('Thumbnail generation failed');
      } else {
        thumbnailPath = destinationOfThumbnail;

        // Insert the post with the video and thumbnail paths into the database
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




router.get('/viewpost/:id(\\d+)', async function (req, res) {
  const postId = req.params.id;
  try {
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

router.get('/deletepost/:id(\\d+)', async function (req, res) {
  const postId = req.params.id;
  try {
    const [rows, fields] = await pool.promise().query(
      'SELECT * FROM posts WHERE id = ?',
      [postId]
    );
    if (rows.length === 0) {
      res.status(404).send('Post not found');
      return;
    }

    // Delete video file from disk
    const post = rows[0];
    const videoPath = path.join('public', post.video);
    fs.unlinkSync(videoPath);

    // Delete record from database
    await pool.promise().query(
      'DELETE FROM posts WHERE id = ?',
      [postId] 
    );
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/comment/:postId(\\d+)', function (req, res) {
  const postId = req.params.postId;
  const commentText = req.body.comment;

  // Check if the user is logged in
  if (!req.session.user) {
    res.status(401).send('Unauthorized');
    return;
  }

  const userId = req.session.user.userId;

  // Insert the comment into the comments table
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

module.exports = router;
