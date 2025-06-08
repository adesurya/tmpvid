const express = require('express');
const router = express.Router();

// Import route modules
const apiRoutes = require('./api');
const webRoutes = require('./web');

// Debug middleware
router.use((req, res, next) => {
    console.log(`[ROUTER] ${req.method} ${req.originalUrl}`);
    next();
});

// API routes MUST come FIRST and be more specific
router.use('/api', apiRoutes);

// Web routes come after API routes
router.use('/', webRoutes);

module.exports = router;