// src/controllers/categoryController.js
const Category = require('../models/Category');
const Joi = require('joi');

const categorySchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).allow('').optional(),
    image: Joi.string().uri().allow('').optional()
});

class CategoryController {
    static async getAll(req, res) {
        try {
            console.log('CategoryController.getAll - Request path:', req.path);
            console.log('CategoryController.getAll - Headers:', req.headers.accept);
            
            const categories = await Category.getAll();
            console.log('CategoryController.getAll - Found categories:', categories.length);
            
            // ALWAYS return JSON for API requests
            if (req.originalUrl.startsWith('/api/')) {
                return res.json({
                    success: true,
                    data: categories
                });
            }
            
            // Only render if it's NOT an API request
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: categories
                });
            }
            
            res.render('admin/categories', {
                title: 'Manage Categories',
                categories: categories,
                layout: 'layouts/admin'
            });
        } catch (error) {
            console.error('Get categories error:', error);
            
            // ALWAYS return JSON for API requests
            if (req.originalUrl.startsWith('/api/') || req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to get categories',
                    error: error.message
                });
            }
            
            res.status(500).render('error', {
                title: 'Error',
                message: 'Failed to load categories',
                layout: 'layouts/main'
            });
        }
    }

    static async create(req, res) {
        try {
            console.log('CategoryController.create - Creating category:', req.body);
            
            const { error, value } = categorySchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error.details[0].message
                });
            }

            const category = await Category.create(value);
            console.log('CategoryController.create - Category created:', category);
            
            res.json({
                success: true,
                data: category,
                message: 'Category created successfully'
            });
        } catch (error) {
            console.error('Create category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create category',
                error: error.message
            });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            console.log('CategoryController.update - Updating category:', id, req.body);
            
            const { error, value } = categorySchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error.details[0].message
                });
            }

            const category = await Category.update(parseInt(id), value);
            
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            res.json({
                success: true,
                data: category,
                message: 'Category updated successfully'
            });
        } catch (error) {
            console.error('Update category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update category',
                error: error.message
            });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            console.log('CategoryController.delete - Deleting category:', id);
            
            const deleted = await Category.delete(parseInt(id));
            
            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }
            
            res.json({
                success: true,
                message: 'Category deleted successfully'
            });
        } catch (error) {
            console.error('Delete category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete category',
                error: error.message
            });
        }
    }
}

module.exports = CategoryController;