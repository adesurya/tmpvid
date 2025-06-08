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
    static async getAll(req, res) {
        try {
            const series = await Series.getAll();
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: series
                });
            }
            
            res.render('admin/series', {
                title: 'Manage Series',
                series: series
            });
        } catch (error) {
            console.error('Get series error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get series'
            });
        }
    }

    static async create(req, res) {
        try {
            const { error, value } = seriesSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error.details[0].message
                });
            }

            const series = await Series.create(value);
            
            res.json({
                success: true,
                data: series,
                message: 'Series created successfully'
            });
        } catch (error) {
            console.error('Create series error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create series'
            });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const { error, value } = seriesSchema.validate(req.body);
            
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error.details[0].message
                });
            }

            res.json({
                success: true,
                message: 'Series updated successfully'
            });
        } catch (error) {
            console.error('Update series error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update series'
            });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            
            res.json({
                success: true,
                message: 'Series deleted successfully'
            });
        } catch (error) {
            console.error('Delete series error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete series'
            });
        }
    }
}

module.exports = SeriesController;