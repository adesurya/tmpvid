const express = require('express');
const router = express.Router();
const VideoController = require('../../controllers/videoController');

// Debug middleware
router.use((req, res, next) => {
    console.log(`[WEB] ${req.method} ${req.path}`);
    next();
});

// Home page - Video feed
router.get('/', VideoController.getFeed);

// Single video page
router.get('/video/:slug', VideoController.getVideo);

// Embed video page (for sharing)
router.get('/embed/:slug', VideoController.getEmbedVideo);

// Search page
router.get('/search', VideoController.search);

// Trending page
router.get('/trending', VideoController.getTrending);

// Category page
router.get('/category/:slug', VideoController.getByCategory);

// FIXED: Import and register ads routes for admin web interface
let adsRoutes;
let adsAvailable = false;

try {
    adsRoutes = require('../adRoutes');
    adsAvailable = true;
    console.log('✅ Ads routes loaded successfully in web router');
} catch (error) {
    console.warn('⚠️ Ads routes not available in web router:', error.message);
    adsRoutes = null;
    adsAvailable = false;
}

// Register ads routes for admin interface if available
if (adsAvailable && adsRoutes) {
    router.use('/', adsRoutes); // This will handle /admin/ads routes
    console.log('✅ Ads web routes registered');
}

// Admin routes (must come after ads routes to avoid conflicts)
router.use('/admin', require('./admin'));

module.exports = router;