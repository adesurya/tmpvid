const express = require('express');
const router = express.Router();
const CategoryController = require('../../controllers/categoryController');

// Debug middleware
router.use((req, res, next) => {
    console.log(`[CATEGORY-API] ${req.method} ${req.path}`);
    next();
});

// Get all categories (ESSENTIAL for dropdown)
router.get('/', async (req, res) => {
    try {
        console.log('[CATEGORY-API] Getting all categories for dropdown');
        
        // Try to get categories from controller
        if (CategoryController && CategoryController.getAll) {
            return await CategoryController.getAll(req, res);
        }
        
        // Fallback: Direct database query if controller is not available
        const { query } = require('../../config/database');
        const categories = await query('SELECT id, name, slug FROM categories WHERE status = ? ORDER BY name ASC', ['active']);
        
        console.log(`[CATEGORY-API] Found ${categories.length} categories`);
        
        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load categories',
            data: []
        });
    }
});

module.exports = router;