const express = require('express');
const router = express.Router();

// Import API route modules
const videoRoutes = require('./videos');
const categoryRoutes = require('./categories');
const seriesRoutes = require('./series');
const adminRoutes = require('./admin');
const publicRoutes = require('./public'); // New

// Debug middleware for API routes
router.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.originalUrl}`);
    console.log(`[API] Accept header: ${req.headers.accept}`);
    next();
});

// Ensure JSON response for all API routes
router.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});

router.use('/public', publicRoutes);


// Public API routes
router.use('/videos', videoRoutes);
router.use('/categories', categoryRoutes);
router.use('/series', seriesRoutes);

// Admin API routes
router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
            public: '/api/public',
            admin: '/api/admin',
            videos: '/api/videos',
            categories: '/api/categories'
        }
    });
});

// 404 handler for API routes
router.use('*', (req, res) => {
    console.log(`[API] 404 - Route not found: ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.originalUrl,
        availableEndpoints: [
            'GET /api/health',
            'GET /api/public/feed',
            'GET /api/public/rss',
            'GET /api/videos/feed',
            'GET /api/categories',
            'POST /api/videos/:id/like',
            'POST /api/videos/:id/share',
            'POST /api/videos/:id/view'
        ]
    });
});

module.exports = router;