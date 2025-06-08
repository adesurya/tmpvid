const express = require('express');
const router = express.Router();
const VideoController = require('../../controllers/videoController');
const { optionalAuth } = require('../../middleware/auth');

// Debug middleware
router.use((req, res, next) => {
    console.log(`[VIDEO-API] ${req.method} ${req.path}`);
    next();
});

// Ensure all responses are JSON
router.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});

// Public video routes
router.get('/feed', VideoController.getFeed);
router.get('/search', VideoController.search);
router.get('/trending', VideoController.getTrending);
router.get('/category/:categoryId', VideoController.getByCategory);
router.get('/:slug', VideoController.getVideo);

// Semi-protected routes (work with or without authentication)
router.post('/:id/like', optionalAuth, VideoController.toggleLike);
router.post('/:id/share', optionalAuth, VideoController.share);
router.post('/:id/view', optionalAuth, VideoController.recordView);

router.get('/test', (req, res) => {
    console.log('[VIDEO-API] Test endpoint called');
    res.json({
        success: true,
        message: 'Video API is working',
        timestamp: new Date().toISOString(),
        requestInfo: {
            method: req.method,
            path: req.path,
            originalUrl: req.originalUrl,
            headers: {
                accept: req.headers.accept,
                'content-type': req.headers['content-type']
            }
        }
    });
});

module.exports = router;