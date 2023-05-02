var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Home', name: "Aneesh Kumar", js: ["index.js"] });
});

router.get('/login', function (req, res) {
  res.render('login', { title: 'Login', css: ["../css/login.css"] });
});

router.get('/register', function (req, res) {
  res.render('registration', { title: 'Register', css: ["../css/registration.css"], js: ["registration.js"] });
});

router.get('/postvideo', function (req, res) {
  res.render('postvideo', { title: 'Post a Video', css: ["../css/postvideo.css"] });
});

router.get('/profile', function (req, res) {
  res.render('profile', { title: 'Profile', css: ["../css/profile.css"] });
});

router.get('/viewpost/:id(\\d+)', function (req, res) {
  res.render('viewpost', { title: 'View Post ${req.params.id}', css: ["../css/viewpost.css"] });
});

module.exports = router;
