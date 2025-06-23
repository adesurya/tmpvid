const express = require('express');
const router = express.Router();

// Import API route modules
const videoRoutes = require('./videos');
const categoryRoutes = require('./categories');
const seriesRoutes = require('./series');
const adminRoutes = require('./admin');
const publicRoutes = require('./public');

// FIXED: Import ads routes
let adsRoutes;
let adsAvailable = false;

try {
    adsRoutes = require('./ads'); // Use separate ads API file
    adsAvailable = true;
    console.log('✅ Ads API routes loaded successfully');
} catch (error) {
    console.warn('⚠️ Ads API routes not available:', error.message);
    adsRoutes = null;
    adsAvailable = false;
}

// Register ads routes
if (adsAvailable && adsRoutes) {
    router.use('/ads', adsRoutes);
    console.log('✅ Ads API routes registered at /api/ads');
}


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

// FIXED: Register ads routes FIRST (they need to be specific)
if (adsAvailable && adsRoutes) {
    router.use('/ads', adsRoutes);
    console.log('✅ Ads API routes registered at /api/ads');
}

// Public API routes
router.use('/public', publicRoutes);
router.use('/videos', videoRoutes);
router.use('/categories', categoryRoutes);
router.use('/series', seriesRoutes);

// Admin API routes
router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
    const endpoints = [
        'GET /api/health',
        'GET /api/public/feed',
        'GET /api/public/rss',
        'GET /api/videos/feed',
        'GET /api/categories',
        'POST /api/videos/:id/like',
        'POST /api/videos/:id/share',
        'POST /api/videos/:id/view'
    ];

    // FIXED: Add ads endpoints if available
    if (adsAvailable) {
        endpoints.push(
            'GET /api/ads/feed',
            'POST /api/ads/:id/click',
            'GET /api/admin/ads/health',
            'GET /api/admin/ads/status',
            'POST /api/admin/ads/migrate'
        );
    }

    res.json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        ads_system: {
            available: adsAvailable,
            routes_registered: adsAvailable
        },
        endpoints: {
            public: '/api/public',
            admin: '/api/admin',
            videos: '/api/videos',
            categories: '/api/categories',
            ads: adsAvailable ? '/api/ads' : 'not available'
        },
        available_endpoints: endpoints
    });
});

// 404 handler for API routes
router.use('*', (req, res) => {
    console.log(`[API] 404 - Route not found: ${req.originalUrl}`);
    
    const availableEndpoints = [
        'GET /api/health',
        'GET /api/public/feed',
        'GET /api/public/rss',
        'GET /api/videos/feed',
        'GET /api/categories',
        'POST /api/videos/:id/like',
        'POST /api/videos/:id/share',
        'POST /api/videos/:id/view'
    ];

    // Add ads endpoints if available
    if (adsAvailable) {
        availableEndpoints.push(
            'GET /api/ads/feed',
            'POST /api/ads/:id/click',
            'GET /api/admin/ads/health',
            'GET /api/admin/ads/status'
        );
    }

    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.originalUrl,
        ads_system_available: adsAvailable,
        suggestion: req.originalUrl.includes('/ads/') && !adsAvailable ? 
            'Ads system is not available. Check server configuration.' : 
            'Check available endpoints below',
        availableEndpoints: availableEndpoints
    });
});

module.exports = router;