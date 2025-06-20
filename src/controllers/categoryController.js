const Joi = require('joi');
const Category = require('../models/Category');

const categorySchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).allow('').optional(),
    image: Joi.string().uri().allow('').optional()
});

class CategoryController {
    static async getAll(req, res) {
        try {
            console.log('CategoryController.getAll - Request received');
            
            const categories = await Category.getAll();
            
            console.log(`CategoryController.getAll - Returning ${categories.length} categories`);
            
            res.json({
                success: true,
                data: categories,
                message: `Found ${categories.length} categories`
            });
        } catch (error) {
            console.error('CategoryController.getAll error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to load categories',
                data: []
            });
        }
    }

    static async create(req, res) {
        try {
            const { name, description, status } = req.body;
            
            if (!name || name.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Category name is required and must be at least 2 characters'
                });
            }
            
            const category = await Category.create({
                name: name.trim(),
                description: description ? description.trim() : null,
                status: status || 'active'
            });
            
            res.json({
                success: true,
                data: category,
                message: 'Category created successfully'
            });
        } catch (error) {
            console.error('CategoryController.create error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create category'
            });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            
            const category = await Category.update(parseInt(id), updateData);
            
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
            console.error('CategoryController.update error:', error);
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
            console.error('CategoryController.delete error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete category'
            });
        }
    }
}

module.exports = CategoryController;