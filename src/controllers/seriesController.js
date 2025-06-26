// src/controllers/seriesController.js - FIXED VERSION
const Joi = require('joi');
const Series = require('../models/Series');

const seriesSchema = Joi.object({
    title: Joi.string().min(2).max(200).required(),
    description: Joi.string().max(1000).allow('').optional(),
    thumbnail: Joi.string().uri().allow('').optional(),
    category_id: Joi.number().integer().positive().optional().allow(null)
});

class SeriesController {
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

    static async getById(req, res) {
        try {
            const { id } = req.params;
            console.log('SeriesController.getById - Searching for ID:', id);
            
            const seriesItem = await Series.findById(parseInt(id));
            
            if (!seriesItem) {
                return res.status(404).json({
                    success: false,
                    message: 'Series not found'
                });
            }
            
            res.json({
                success: true,
                data: seriesItem,
                message: 'Series found'
            });
        } catch (error) {
            console.error('SeriesController.getById error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to load series'
            });
        }
    }

    static async create(req, res) {
        try {
            console.log('SeriesController.create - Request body:', req.body);
            console.log('SeriesController.create - Content-Type:', req.get('Content-Type'));
            
            const { title, description, thumbnail, category_id, status } = req.body;
            
            // Enhanced validation
            if (!title || typeof title !== 'string' || title.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Series title is required and must be at least 2 characters',
                    field: 'title'
                });
            }

            if (title.trim().length > 200) {
                return res.status(400).json({
                    success: false,
                    message: 'Series title must be less than 200 characters',
                    field: 'title'
                });
            }

            // Validate description length
            if (description && description.length > 1000) {
                return res.status(400).json({
                    success: false,
                    message: 'Description must be less than 1000 characters',
                    field: 'description'
                });
            }

            // Validate thumbnail URL
            if (thumbnail && thumbnail.trim()) {
                try {
                    new URL(thumbnail.trim());
                } catch (urlError) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid thumbnail URL format',
                        field: 'thumbnail'
                    });
                }
            }
            
            // Validate category exists if provided
            let validatedCategoryId = null;
            if (category_id && category_id !== '' && category_id !== 'null') {
                try {
                    const categoryIdNum = parseInt(category_id);
                    if (isNaN(categoryIdNum) || categoryIdNum <= 0) {
                        return res.status(400).json({
                            success: false,
                            message: 'Invalid category ID format',
                            field: 'category_id'
                        });
                    }
                    
                    // Check if category exists
                    const Category = require('../models/Category');
                    const category = await Category.findById(categoryIdNum);
                    if (!category) {
                        return res.status(400).json({
                            success: false,
                            message: 'Selected category does not exist',
                            field: 'category_id'
                        });
                    }
                    validatedCategoryId = categoryIdNum;
                } catch (categoryError) {
                    console.warn('Category validation error:', categoryError.message);
                    // If Category model doesn't exist, allow null
                    validatedCategoryId = null;
                }
            }
            
            // Prepare series data
            const seriesData = {
                title: title.trim(),
                description: description ? description.trim() : null,
                thumbnail: thumbnail && thumbnail.trim() ? thumbnail.trim() : null,
                category_id: validatedCategoryId,
                status: status || 'active'
            };
            
            console.log('SeriesController.create - Processed data:', seriesData);
            
            // Create the series
            const seriesItem = await Series.create(seriesData);
            
            if (!seriesItem) {
                throw new Error('Failed to create series - no data returned');
            }
            
            console.log('SeriesController.create - Success:', seriesItem);
            
            res.status(201).json({
                success: true,
                data: seriesItem,
                message: 'Series created successfully'
            });
            
        } catch (error) {
            console.error('SeriesController.create error:', error);
            
            // Handle specific database errors
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({
                    success: false,
                    message: 'A series with this title already exists',
                    field: 'title'
                });
            }
            
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                return res.status(400).json({
                    success: false,
                    message: 'Selected category does not exist',
                    field: 'category_id'
                });
            }
            
            // Check if it's a validation error
            if (error.message.includes('required') || error.message.includes('Invalid')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Failed to create series',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            
            console.log('SeriesController.update - ID:', id, 'Data:', updateData);
            
            // Basic validation
            if (updateData.title && updateData.title.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Series title must be at least 2 characters'
                });
            }

            if (updateData.title && updateData.title.trim().length > 200) {
                return res.status(400).json({
                    success: false,
                    message: 'Series title must be less than 200 characters'
                });
            }
            
            // Validate category exists if being updated
            if (updateData.category_id && updateData.category_id !== null && updateData.category_id !== '') {
                try {
                    const categoryIdNum = parseInt(updateData.category_id);
                    if (isNaN(categoryIdNum)) {
                        return res.status(400).json({
                            success: false,
                            message: 'Invalid category ID format'
                        });
                    }
                    
                    const Category = require('../models/Category');
                    const category = await Category.findById(categoryIdNum);
                    if (!category) {
                        return res.status(400).json({
                            success: false,
                            message: 'Selected category does not exist'
                        });
                    }
                } catch (categoryError) {
                    console.warn('Category validation skipped:', categoryError.message);
                }
            }
            
            const seriesItem = await Series.update(parseInt(id), updateData);
            
            if (!seriesItem) {
                return res.status(404).json({
                    success: false,
                    message: 'Series not found'
                });
            }
            
            res.json({
                success: true,
                data: seriesItem,
                message: 'Series updated successfully'
            });
        } catch (error) {
            console.error('SeriesController.update error:', error);
            
            // Handle specific errors
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({
                    success: false,
                    message: 'A series with this title already exists'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Failed to update series',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            
            console.log('SeriesController.delete - ID:', id);
            
            // Check if series exists
            const existingSeries = await Series.findById(parseInt(id));
            if (!existingSeries) {
                return res.status(404).json({
                    success: false,
                    message: 'Series not found'
                });
            }
            
            const deleted = await Series.delete(parseInt(id));
            
            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Series not found or already deleted'
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
                message: 'Failed to delete series',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    static async getSeriesWithCategories(req, res) {
        try {
            const series = await Series.getSeriesWithCategories();
            
            res.json({
                success: true,
                data: series,
                message: `Found ${series.length} series with categories`
            });
        } catch (error) {
            console.error('SeriesController.getSeriesWithCategories error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to load series with categories',
                data: []
            });
        }
    }

    static async updateEpisodeCount(req, res) {
        try {
            const { id } = req.params;
            
            await Series.updateEpisodeCount(parseInt(id));
            
            // Get updated series
            const updatedSeries = await Series.findById(parseInt(id));
            
            if (!updatedSeries) {
                return res.status(404).json({
                    success: false,
                    message: 'Series not found'
                });
            }
            
            res.json({
                success: true,
                data: updatedSeries,
                message: 'Episode count updated successfully'
            });
        } catch (error) {
            console.error('SeriesController.updateEpisodeCount error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update episode count'
            });
        }
    }
}

module.exports = SeriesController;