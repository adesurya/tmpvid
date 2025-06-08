// src/routes/index.js
const express = require('express');
const router = express.Router();

// Import route modules
const webRoutes = require('./web');
const apiRoutes = require('./api');

// API routes HARUS SEBELUM web routes
router.use('/api', apiRoutes);

// Web routes (for rendering pages)
router.use('/', webRoutes);

module.exports = router;