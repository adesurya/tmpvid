// src/routes/api/videos.js
const express = require('express');
const router = express.Router();
const VideoController = require('../../controllers/videoController');
const { optionalAuth } = require('../../middleware/auth');

// Public video routes
router.get('/feed', VideoController.getFeed);
router.get('/search', VideoController.search);
router.get('/trending', VideoController.getTrending);
router.get('/category/:categoryId', VideoController.getByCategory);
router.get('/:slug', VideoController.getVideo);

// Protected routes (require authentication)
router.post('/:id/like', optionalAuth, VideoController.toggleLike);
router.post('/:id/share', optionalAuth, VideoController.share);

module.exports = router;