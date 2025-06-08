// src/routes/api/index.js
const express = require('express');
const router = express.Router();

// Import API route modules
const videoRoutes = require('./videos');
const categoryRoutes = require('./categories');
const seriesRoutes = require('./series');
const adminRoutes = require('./admin');

// Video routes
router.use('/videos', videoRoutes);

// Category routes
router.use('/categories', categoryRoutes);

// Series routes
router.use('/series', seriesRoutes);

// Admin routes
router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;