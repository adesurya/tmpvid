// src/routes/api/index.js
const express = require('express');
const router = express.Router();

// Import API route modules
const videoRoutes = require('./videos');
const categoryRoutes = require('./categories');
const seriesRoutes = require('./series');
const adminRoutes = require('./admin');

// Debug middleware
router.use((req, res, next) => {
    console.log(`API Request: ${req.method} ${req.originalUrl}`);
    next();
});

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
        timestamp: new Date().toISOString()
    });
});

// 404 handler for API routes
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

module.exports = router;