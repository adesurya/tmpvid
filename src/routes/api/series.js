// src/routes/api/series.js
const express = require('express');
const router = express.Router();
const SeriesController = require('../../controllers/seriesController');
const { adminAuth } = require('../../middleware/auth');

// Public routes
router.get('/', SeriesController.getAll);

// Admin routes
router.post('/', adminAuth, SeriesController.create);
router.put('/:id', adminAuth, SeriesController.update);
router.delete('/:id', adminAuth, SeriesController.delete);

module.exports = router;