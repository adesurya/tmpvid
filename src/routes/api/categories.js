// src/routes/api/categories.js
const express = require('express');
const router = express.Router();
const CategoryController = require('../../controllers/categoryController');
const { adminAuth } = require('../../middleware/auth');

// Public routes
router.get('/', CategoryController.getAll);

// Admin routes
router.post('/', adminAuth, CategoryController.create);
router.put('/:id', adminAuth, CategoryController.update);
router.delete('/:id', adminAuth, CategoryController.delete);

module.exports = router;

