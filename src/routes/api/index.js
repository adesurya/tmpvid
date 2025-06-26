// src/routes/api/index.js - FIXED VERSION
const express = require('express');
const router = express.Router();

// Import API route modules
const videoRoutes = require('./videos');
const categoryRoutes = require('./categories');
const seriesRoutes = require('./series');
const adminRoutes = require('./admin');
const publicRoutes = require('./public');

// Import ads routes with error handling
let adApiRoutes = null;
let adsAvailable = false;

try {
    adApiRoutes = require('./ads');
    adsAvailable = true;
    console.log('✅ Ads API routes loaded successfully');
} catch (error) {
    console.warn('⚠️ Ads API routes not available:', error.message);
    
    // Create fallback router for ads
    adApiRoutes = express.Router();
    adApiRoutes.use('*', (req, res) => {
        res.status(503).json({
            success: false,
            message: 'Advertisement API is not available',
            error: 'Ads system not loaded',
            timestamp: new Date().toISOString()
        });
    });
}

// Debug middleware for API routes - FIRST
router.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.originalUrl} - Body:`, req.body ? 'Present' : 'None');
    next();
});

// Ensure JSON response for all API routes
router.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});

// Health check endpoint - EARLY
router.get('/health', (req, res) => {
    res.json({
        success: true,
        timestamp: new Date().toISOString(),
        services: {
            ads_api: adsAvailable,
            series_api: true,
            categories_api: true,
            videos_api: true
        },
        endpoints: {
            series: [
                'GET /api/series',
                'POST /api/series',
                'GET /api/series/:id',
                'PUT /api/series/:id',
                'DELETE /api/series/:id',
                'GET /api/series/admin/with-categories',
                'PATCH /api/series/:id/update-episode-count'
            ],
            categories: [
                'GET /api/categories',
                'POST /api/categories',
                'PUT /api/categories/:id',
                'DELETE /api/categories/:id'
            ],
            ads: adsAvailable ? [
                'GET /api/ads/feed',
                'POST /api/ads/click/:id',
                'GET /api/ads/admin/ads/summary',
                'GET /api/ads/admin/ads/slots/overview'
            ] : ['Service unavailable']
        }
    });
});

// Register specific API routes - ORDER MATTERS!
// Most specific routes first, then more general ones

// 1. Public routes (has /public prefix)
router.use('/public', publicRoutes);

// 2. Admin routes (has /admin prefix) - MUST be before other routes
router.use('/admin', adminRoutes);

// 3. Specific entity routes
router.use('/videos', videoRoutes);
router.use('/categories', categoryRoutes);
router.use('/series', seriesRoutes);  // This is the critical route for your issue

// 4. Ads routes
router.use('/ads', adApiRoutes);

// API status endpoint
router.get('/status', (req, res) => {
    res.json({
        success: true,
        api: {
            name: 'KlipQ API',
            version: '1.0.0',
            status: 'active'
        },
        registered_routes: {
            '/api/public': 'Public API endpoints',
            '/api/admin': 'Admin API endpoints',
            '/api/videos': 'Video management',
            '/api/categories': 'Category management',
            '/api/series': 'Series management',
            '/api/ads': adsAvailable ? 'Advertisement management' : 'Not available'
        },
        timestamp: new Date().toISOString()
    });
});

// 404 handler for API routes - LAST
router.use('*', (req, res) => {
    console.warn(`[API] 404 - Route not found: ${req.method} ${req.originalUrl}`);
    
    const availableEndpoints = [
        'GET /api/health',
        'GET /api/status',
        'GET /api/categories',
        'POST /api/categories',
        'PUT /api/categories/:id',
        'DELETE /api/categories/:id',
        'GET /api/series',
        'POST /api/series',
        'GET /api/series/:id',
        'PUT /api/series/:id',
        'DELETE /api/series/:id',
        'GET /api/series/admin/with-categories',
        'PATCH /api/series/:id/update-episode-count'
    ];

    // Add ads endpoints if available
    if (adsAvailable) {
        availableEndpoints.push(
            'GET /api/ads/feed',
            'POST /api/ads/click/:id',
            'GET /api/ads/admin/ads/summary',
            'GET /api/ads/admin/ads/slots/overview'
        );
    }

    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.originalUrl,
        method: req.method,
        available_endpoints: availableEndpoints,
        ads_system_available: adsAvailable,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;