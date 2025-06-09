const express = require('express');
const router = express.Router();
const PublicApiController = require('../../controllers/publicApiController');
const rateLimit = require('express-rate-limit');

// Rate limiting for public API
const publicApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Rate limit exceeded. Maximum 1000 requests per 15 minutes.',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

// Apply rate limiting to all public API routes
router.use(publicApiLimiter);

// Add CORS headers for public API
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    // Add API version header
    res.header('X-API-Version', '1.0');
    res.header('X-RateLimit-Limit', req.rateLimit?.limit || 1000);
    res.header('X-RateLimit-Remaining', req.rateLimit?.remaining || 999);
    res.header('X-RateLimit-Reset', req.rateLimit?.resetTime || Date.now() + 900000);
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    next();
});

// Debug middleware
router.use((req, res, next) => {
    console.log(`[PUBLIC-API] ${req.method} ${req.originalUrl}`);
    next();
});

// API Documentation
router.get('/', PublicApiController.getApiDocs);
router.get('/docs', PublicApiController.getApiDocs);

// Public video feed (supports JSON and RSS)
router.get('/feed', PublicApiController.getPublicFeed);

// RSS feed shortcut
router.get('/rss', (req, res, next) => {
    req.query.format = 'rss';
    PublicApiController.getPublicFeed(req, res, next);
});

// RSS by category
router.get('/rss/:category', (req, res, next) => {
    req.query.format = 'rss';
    req.query.category = req.params.category;
    PublicApiController.getPublicFeed(req, res, next);
});

// Get single video by slug
router.get('/videos/:slug', PublicApiController.getPublicVideo);

// Get all categories
router.get('/categories', PublicApiController.getPublicCategories);

// Get platform statistics
router.get('/stats', PublicApiController.getPublicStats);

// Health check for public API
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Public API is operational',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        endpoints: {
            feed: '/api/public/feed',
            rss: '/api/public/rss',
            videos: '/api/public/videos/{slug}',
            categories: '/api/public/categories',
            stats: '/api/public/stats',
            docs: '/api/public/docs'
        }
    });
});

// 404 handler for public API
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.originalUrl,
        suggestion: 'Check /api/public/docs for available endpoints',
        availableEndpoints: [
            'GET /api/public/feed',
            'GET /api/public/rss',
            'GET /api/public/videos/{slug}',
            'GET /api/public/categories',
            'GET /api/public/stats',
            'GET /api/public/docs'
        ]
    });
});

module.exports = router;