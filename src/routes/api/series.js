const express = require('express');
const router = express.Router();
const SeriesController = require('../../controllers/seriesController');

// Debug middleware
router.use((req, res, next) => {
    console.log(`[SERIES-API] ${req.method} ${req.path}`);
    next();
});

// Get all series (OPTIONAL for dropdown)
router.get('/', async (req, res) => {
    try {
        console.log('[SERIES-API] Getting all series for dropdown');
        
        // Try to get series from controller
        if (SeriesController && SeriesController.getAll) {
            return await SeriesController.getAll(req, res);
        }
        
        // Fallback: Direct database query if controller is not available
        const { query } = require('../../config/database');
        const series = await query('SELECT id, title, slug FROM series WHERE status = ? ORDER BY title ASC', ['active']);
        
        console.log(`[SERIES-API] Found ${series.length} series`);
        
        res.json({
            success: true,
            data: series
        });
    } catch (error) {
        console.error('Get series error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load series',
            data: []
        });
    }
});

module.exports = router;