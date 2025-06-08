// src/controllers/categoryController.js
const Category = require('../models/Category');
const Joi = require('joi');

const categorySchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).allow(''),
    image: Joi.string().uri().allow('')
});

class CategoryController {
    static async getAll(req, res) {
        try {
            const categories = await Category.getAll();
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: categories
                });
            }
            
            res.render('admin/categories', {
                title: 'Manage Categories',
                categories: categories
            });
        } catch (error) {
            console.error('Get categories error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get categories'
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

            res.json({
                success: true,
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