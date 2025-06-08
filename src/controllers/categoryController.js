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
            
            const categories = await Category.getAll();
            console.log('CategoryController.getAll - Found categories:', categories.length);
            
            // ALWAYS return JSON for API requests
            if (req.originalUrl.startsWith('/api/')) {
                return res.json({
                    success: true,
                    data: categories
                });
            }
            
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
            const { error, value } = categorySchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error.details[0].message
                });
            }

            const category = await Category.create(value);
            
            res.json({
                success: true,
                data: category,
                message: 'Category created successfully'
            });
        } catch (error) {
            console.error('Create category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create category'
            });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
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
                message: 'Failed to update category'
            });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            
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
                message: 'Failed to delete category'
            });
        }
    }
}

module.exports = CategoryController;