// src/routes/api/series.js - FIXED VERSION
const express = require('express');
const router = express.Router();
const SeriesController = require('../../controllers/seriesController');

// Debug middleware with enhanced logging
router.use((req, res, next) => {
    console.log(`[SERIES-API] ${req.method} ${req.path}`, {
        hasBody: !!req.body,
        bodyKeys: req.body ? Object.keys(req.body) : [],
        contentType: req.get('Content-Type'),
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });
    next();
});

// Enhanced error handling middleware
router.use((req, res, next) => {
    // Store original send functions
    const originalJson = res.json;
    const originalStatus = res.status;
    
    // Override json function to add logging
    res.json = function(data) {
        console.log(`[SERIES-API] Response:`, {
            status: res.statusCode,
            success: data.success,
            message: data.message,
            hasData: !!data.data
        });
        return originalJson.call(this, data);
    };
    
    next();
});

// Get all series
router.get('/', async (req, res) => {
    try {
        console.log('[SERIES-API] Getting all series');
        
        // Try to get series from controller first
        if (SeriesController && SeriesController.getAll) {
            return await SeriesController.getAll(req, res);
        }
        
        // Fallback: Direct database query if controller is not available
        console.log('[SERIES-API] Controller not available, using fallback');
        const { query } = require('../../config/database');
        const series = await query(`
            SELECT 
                s.id, s.title, s.slug, s.description, s.thumbnail,
                s.total_episodes, s.category_id, s.status,
                s.created_at, s.updated_at,
                c.name as category_name
            FROM series s
            LEFT JOIN categories c ON s.category_id = c.id
            WHERE s.status = ? 
            ORDER BY s.title ASC
        `, ['active']);
        
        console.log(`[SERIES-API] Found ${series.length} series`);
        
        res.json({
            success: true,
            data: series,
            message: `Found ${series.length} series`
        });
    } catch (error) {
        console.error('[SERIES-API] Get series error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load series',
            data: [],
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get single series by ID
router.get('/:id', async (req, res) => {
    try {
        console.log(`[SERIES-API] Getting series by ID: ${req.params.id}`);
        
        if (SeriesController && SeriesController.getById) {
            return await SeriesController.getById(req, res);
        }
        
        // Fallback
        const { queryOne } = require('../../config/database');
        const seriesItem = await queryOne(`
            SELECT 
                s.*, 
                c.name as category_name
            FROM series s
            LEFT JOIN categories c ON s.category_id = c.id
            WHERE s.id = ? AND s.status = 'active'
        `, [req.params.id]);
        
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
        console.error('[SERIES-API] Get series by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load series',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Create new series - ENHANCED VERSION
router.post('/', async (req, res) => {
    try {
        console.log('[SERIES-API] Creating new series');
        console.log('[SERIES-API] Request body:', req.body);
        console.log('[SERIES-API] Content-Type:', req.get('Content-Type'));
        
        // Validate request body exists
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Request body is required',
                error: 'NO_BODY'
            });
        }
        
        // Try controller first
        if (SeriesController && SeriesController.create) {
            console.log('[SERIES-API] Using SeriesController.create');
            return await SeriesController.create(req, res);
        }
        
        // Enhanced fallback implementation
        console.log('[SERIES-API] Controller not available, using enhanced fallback');
        
        const { title, description, thumbnail, category_id } = req.body;
        
        // Validate required fields
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
        
        // Validate description
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
        
        // Process category_id
        let validatedCategoryId = null;
        if (category_id && category_id !== '' && category_id !== 'null') {
            const categoryIdNum = parseInt(category_id);
            if (isNaN(categoryIdNum) || categoryIdNum <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid category ID format',
                    field: 'category_id'
                });
            }
            validatedCategoryId = categoryIdNum;
        }
        
        // Generate unique slug
        const slugify = require('slugify');
        const { query, queryOne } = require('../../config/database');
        
        let baseSlug = slugify(title.trim(), { 
            lower: true, 
            strict: true,
            remove: /[*+~.()'"!:@]/g
        });
        
        let slug = baseSlug;
        let counter = 1;
        
        // Ensure unique slug
        while (true) {
            const existingSlug = await queryOne(
                'SELECT id FROM series WHERE slug = ? AND status != "deleted"', 
                [slug]
            );
            
            if (!existingSlug) break;
            
            slug = `${baseSlug}-${counter}`;
            counter++;
            
            if (counter > 100) {
                slug = `${baseSlug}-${Date.now()}`;
                break;
            }
        }
        
        console.log('[SERIES-API] Generated unique slug:', slug);
        
        // Insert into database
        const insertResult = await query(`
            INSERT INTO series (title, slug, description, thumbnail, category_id, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())
        `, [
            title.trim(),
            slug,
            description ? description.trim() : null,
            thumbnail && thumbnail.trim() ? thumbnail.trim() : null,
            validatedCategoryId
        ]);
        
        console.log('[SERIES-API] Insert result:', insertResult);
        
        if (!insertResult.insertId) {
            throw new Error('Failed to create series - no insertId returned');
        }
        
        // Get the created series with category info
        const createdSeries = await queryOne(`
            SELECT 
                s.*, 
                c.name as category_name
            FROM series s
            LEFT JOIN categories c ON s.category_id = c.id
            WHERE s.id = ?
        `, [insertResult.insertId]);
        
        console.log('[SERIES-API] Created series:', createdSeries);
        
        res.status(201).json({
            success: true,
            data: createdSeries,
            message: 'Series created successfully'
        });
        
    } catch (error) {
        console.error('[SERIES-API] Create series error:', error);
        
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
        
        res.status(500).json({
            success: false,
            message: 'Failed to create series',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Update series
router.put('/:id', async (req, res) => {
    try {
        console.log(`[SERIES-API] Updating series ${req.params.id}:`, req.body);
        
        if (SeriesController && SeriesController.update) {
            return await SeriesController.update(req, res);
        }
        
        // Enhanced fallback implementation
        const { id } = req.params;
        const { title, description, thumbnail, category_id, status } = req.body;
        const { query, queryOne } = require('../../config/database');
        
        // Validate ID
        const idNum = parseInt(id);
        if (isNaN(idNum) || idNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid series ID'
            });
        }
        
        // Check if series exists
        const existingSeries = await queryOne('SELECT id FROM series WHERE id = ? AND status != "deleted"', [idNum]);
        if (!existingSeries) {
            return res.status(404).json({
                success: false,
                message: 'Series not found'
            });
        }
        
        const fields = [];
        const params = [];
        
        if (title && title.trim()) {
            if (title.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Series title must be at least 2 characters'
                });
            }
            
            fields.push('title = ?');
            params.push(title.trim());
            
            // Update slug
            const slugify = require('slugify');
            const newSlug = slugify(title.trim(), { lower: true, strict: true });
            fields.push('slug = ?');
            params.push(newSlug);
        }
        
        if (description !== undefined) {
            fields.push('description = ?');
            params.push(description ? description.trim() : null);
        }
        
        if (thumbnail !== undefined) {
            fields.push('thumbnail = ?');
            params.push(thumbnail ? thumbnail.trim() : null);
        }
        
        if (category_id !== undefined) {
            let validatedCategoryId = null;
            if (category_id && category_id !== '' && category_id !== 'null') {
                const categoryIdNum = parseInt(category_id);
                if (!isNaN(categoryIdNum) && categoryIdNum > 0) {
                    validatedCategoryId = categoryIdNum;
                }
            }
            fields.push('category_id = ?');
            params.push(validatedCategoryId);
        }
        
        if (status) {
            fields.push('status = ?');
            params.push(status);
        }
        
        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }
        
        // Add updated_at and id parameter
        fields.push('updated_at = NOW()');
        params.push(idNum);
        
        const sql = `UPDATE series SET ${fields.join(', ')} WHERE id = ?`;
        const result = await query(sql, params);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Series not found'
            });
        }
        
        // Get updated series
        const updatedSeries = await queryOne(`
            SELECT 
                s.*, 
                c.name as category_name
            FROM series s
            LEFT JOIN categories c ON s.category_id = c.id
            WHERE s.id = ?
        `, [idNum]);
        
        res.json({
            success: true,
            data: updatedSeries,
            message: 'Series updated successfully'
        });
    } catch (error) {
        console.error('[SERIES-API] Update series error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update series',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Delete series (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        console.log(`[SERIES-API] Deleting series ${req.params.id}`);
        
        if (SeriesController && SeriesController.delete) {
            return await SeriesController.delete(req, res);
        }
        
        // Fallback implementation
        const { query } = require('../../config/database');
        const idNum = parseInt(req.params.id);
        
        if (isNaN(idNum) || idNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid series ID'
            });
        }
        
        const result = await query('UPDATE series SET status = "deleted", updated_at = NOW() WHERE id = ? AND status != "deleted"', [idNum]);
        
        if (result.affectedRows === 0) {
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
        console.error('[SERIES-API] Delete series error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete series',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get series with categories (admin endpoint)
router.get('/admin/with-categories', async (req, res) => {
    try {
        console.log('[SERIES-API] Getting series with categories for admin');
        
        if (SeriesController && SeriesController.getSeriesWithCategories) {
            return await SeriesController.getSeriesWithCategories(req, res);
        }
        
        // Fallback
        const { query } = require('../../config/database');
        const series = await query(`
            SELECT 
                s.id, s.title, s.slug, s.description, 
                s.thumbnail, s.total_episodes, s.status,
                s.created_at, s.updated_at,
                c.id as category_id, c.name as category_name
            FROM series s
            LEFT JOIN categories c ON s.category_id = c.id
            WHERE s.status = 'active'
            ORDER BY s.title ASC
        `);
        
        res.json({
            success: true,
            data: series,
            message: `Found ${series.length} series with categories`
        });
    } catch (error) {
        console.error('[SERIES-API] Get series with categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load series with categories',
            data: [],
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Update episode count for a series
router.patch('/:id/update-episode-count', async (req, res) => {
    try {
        console.log(`[SERIES-API] Updating episode count for series ${req.params.id}`);
        
        if (SeriesController && SeriesController.updateEpisodeCount) {
            return await SeriesController.updateEpisodeCount(req, res);
        }
        
        // Fallback
        const { query, queryOne } = require('../../config/database');
        const idNum = parseInt(req.params.id);
        
        if (isNaN(idNum) || idNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid series ID'
            });
        }
        
        // Update episode count based on actual videos
        await query(`
            UPDATE series 
            SET total_episodes = (
                SELECT COUNT(*) 
                FROM videos 
                WHERE series_id = ? AND status = 'published'
            ),
            updated_at = NOW()
            WHERE id = ?
        `, [idNum, idNum]);
        
        // Get updated series
        const updatedSeries = await queryOne(`
            SELECT 
                s.*, 
                c.name as category_name
            FROM series s
            LEFT JOIN categories c ON s.category_id = c.id
            WHERE s.id = ?
        `, [idNum]);
        
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
        console.error('[SERIES-API] Update episode count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update episode count',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Health check endpoint
router.get('/debug/health', async (req, res) => {
    try {
        const { query } = require('../../config/database');
        
        // Test database connection
        const dbTest = await query('SELECT 1 + 1 AS result');
        
        // Test series table
        const seriesCount = await query('SELECT COUNT(*) as count FROM series');
        
        res.json({
            success: true,
            health: {
                database_connection: !!dbTest,
                series_table: !!seriesCount,
                controller_available: !!(SeriesController && SeriesController.create),
                total_series: seriesCount[0]?.count || 0
            },
            timestamp: new Date().toISOString(),
            message: 'Health check completed'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Health check failed'
        });
    }
});

module.exports = router;