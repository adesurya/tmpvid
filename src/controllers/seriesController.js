// src/controllers/seriesController.js
const Series = require('../models/Series');
const Joi = require('joi');

const seriesSchema = Joi.object({
    title: Joi.string().min(2).max(255).required(),
    description: Joi.string().max(1000).allow(''),
    thumbnail: Joi.string().uri().allow(''),
    category_id: Joi.number().integer().positive().allow(null)
});

class SeriesController {
    // Get all series for API
    static async getAll(req, res) {
        try {
            console.log('SeriesController.getAll - Request received');
            
            const series = await Series.getAll();
            
            console.log(`SeriesController.getAll - Returning ${series.length} series`);
            
            res.json({
                success: true,
                data: series,
                message: `Found ${series.length} series`
            });
        } catch (error) {
            console.error('SeriesController.getAll error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to load series',
                data: []
            });
        }
    }

    // Create new series
    static async create(req, res) {
        try {
            const { title, description, status } = req.body;
            
            if (!title || title.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Series title is required and must be at least 2 characters'
                });
            }
            
            const series = await Series.create({
                title: title.trim(),
                description: description ? description.trim() : null,
                status: status || 'active'
            });
            
            res.json({
                success: true,
                data: series,
                message: 'Series created successfully'
            });
        } catch (error) {
            console.error('SeriesController.create error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create series'
            });
        }
    }

    // Update series
    static async update(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            
            const series = await Series.update(parseInt(id), updateData);
            
            if (!series) {
                return res.status(404).json({
                    success: false,
                    message: 'Series not found'
                });
            }
            
            res.json({
                success: true,
                data: series,
                message: 'Series updated successfully'
            });
        } catch (error) {
            console.error('SeriesController.update error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update series'
            });
        }
    }

    // Delete series
    static async delete(req, res) {
        try {
            const { id } = req.params;
            
            const deleted = await Series.delete(parseInt(id));
            
            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Series not found'
                });
            }
            
            res.json({
                success: true,
                message: 'Series deleted successfully'
            });
        } catch (error) {
            console.error('SeriesController.delete error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete series'
            });
        }
    }
}

module.exports = SeriesController;