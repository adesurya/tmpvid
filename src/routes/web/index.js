// src/routes/web/index.js
const express = require('express');
const router = express.Router();
const VideoController = require('../../controllers/videoController');

// Home page - Video feed
router.get('/', VideoController.getFeed);

// Single video page
router.get('/video/:slug', VideoController.getVideo);

// Search page
router.get('/search', VideoController.search);

// Trending page
router.get('/trending', VideoController.getTrending);

// Category page
router.get('/category/:slug', VideoController.getByCategory);

// Admin routes
router.use('/admin', require('./admin'));

module.exports = router;