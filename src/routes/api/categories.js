// src/routes/api/categories.js
const express = require('express');
const router = express.Router();
const CategoryController = require('../../controllers/categoryController');
const { adminAuth } = require('../../middleware/auth');

// Add debug middleware
router.use((req, res, next) => {
    console.log(`Categories API - ${req.method} ${req.path}`);
    next();
});

// Public routes
router.get('/', CategoryController.getAll);

// Admin routes (with authentication)
router.post('/', adminAuth, CategoryController.create);
router.put('/:id', adminAuth, CategoryController.update);
router.delete('/:id', adminAuth, CategoryController.delete);

module.exports = router;