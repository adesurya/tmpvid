// src/routes/index.js
const express = require('express');
const router = express.Router();

// Import route modules
const webRoutes = require('./web');
const apiRoutes = require('./api');

// Web routes (for rendering pages)
router.use('/', webRoutes);

// API routes
router.use('/api', apiRoutes);

module.exports = router;