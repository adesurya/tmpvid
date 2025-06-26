// src/routes/admin/series.js
const express = require('express');
const router = express.Router();
const SeriesController = require('../../controllers/seriesController');

// Middleware to ensure admin authentication
router.use((req, res, next) => {
    // Add your authentication middleware here
    // For now, we'll assume authentication is handled globally
    console.log('[ADMIN-SERIES] Access to series admin route');
    next();
});

// Series management page
router.get('/', (req, res) => {
    try {
        console.log('[ADMIN-SERIES] Rendering series management page');
        
        res.render('admin/series', {
            title: 'Series Management',
            layout: 'layouts/admin',
            section: 'series'
        });
    } catch (error) {
        console.error('Error rendering series page:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load series management page',
            layout: 'layouts/admin'
        });
    }
});

// Create new series page (optional - can use modal instead)
router.get('/create', (req, res) => {
    try {
        console.log('[ADMIN-SERIES] Rendering create series page');
        
        res.render('admin/series-create', {
            title: 'Create New Series',
            layout: 'layouts/admin',
            section: 'series'
        });
    } catch (error) {
        console.error('Error rendering create series page:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load create series page',
            layout: 'layouts/admin'
        });
    }
});

// Edit series page (optional)
router.get('/edit/:id', async (req, res) => {
    try {
        console.log(`[ADMIN-SERIES] Rendering edit series page for ID: ${req.params.id}`);
        
        // Get series data
        let seriesData = null;
        if (SeriesController && SeriesController.getById) {
            // Use a mock request/response to get data
            const mockReq = { params: { id: req.params.id } };
            const mockRes = {
                json: (data) => {
                    if (data.success) {
                        seriesData = data.data;
                    }
                },
                status: () => mockRes
            };
            
            try {
                await SeriesController.getById(mockReq, mockRes);
            } catch (error) {
                console.warn('Failed to get series data via controller:', error);
            }
        }
        
        if (!seriesData) {
            return res.status(404).render('error', {
                title: 'Series Not Found',
                message: 'The series you are looking for does not exist.',
                layout: 'layouts/admin'
            });
        }
        
        res.render('admin/series-edit', {
            title: 'Edit Series',
            series: seriesData,
            layout: 'layouts/admin',
            section: 'series'
        });
    } catch (error) {
        console.error('Error rendering edit series page:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load edit series page',
            layout: 'layouts/admin'
        });
    }
});

// Series analytics/performance page
router.get('/analytics', (req, res) => {
    try {
        console.log('[ADMIN-SERIES] Rendering series analytics page');
        
        res.render('admin/series-analytics', {
            title: 'Series Analytics',
            layout: 'layouts/admin',
            section: 'series'
        });
    } catch (error) {
        console.error('Error rendering series analytics page:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load series analytics page',
            layout: 'layouts/admin'
        });
    }
});

// Series management with categories view
router.get('/with-categories', (req, res) => {
    try {
        console.log('[ADMIN-SERIES] Rendering series with categories view');
        
        res.render('admin/series-categories', {
            title: 'Series & Categories',
            layout: 'layouts/admin',
            section: 'series'
        });
    } catch (error) {
        console.error('Error rendering series categories page:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load series categories page',
            layout: 'layouts/admin'
        });
    }
});

// Bulk operations page
router.get('/bulk', (req, res) => {
    try {
        console.log('[ADMIN-SERIES] Rendering bulk operations page');
        
        res.render('admin/series-bulk', {
            title: 'Bulk Series Operations',
            layout: 'layouts/admin',
            section: 'series'
        });
    } catch (error) {
        console.error('Error rendering bulk operations page:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load bulk operations page',
            layout: 'layouts/admin'
        });
    }
});

// Export series data
router.get('/export', async (req, res) => {
    try {
        console.log('[ADMIN-SERIES] Exporting series data');
        
        let seriesData = [];
        if (SeriesController && SeriesController.getAll) {
            // Use mock request/response to get data
            const mockReq = {};
            const mockRes = {
                json: (data) => {
                    if (data.success && data.data) {
                        seriesData = data.data;
                    }
                },
                status: () => mockRes
            };
            
            try {
                await SeriesController.getAll(mockReq, mockRes);
            } catch (error) {
                console.warn('Failed to get series data for export:', error);
            }
        }
        
        // Set headers for file download
        res.setHeader('Content-Disposition', 'attachment; filename="series-export.json"');
        res.setHeader('Content-Type', 'application/json');
        
        res.json({
            export_date: new Date().toISOString(),
            total_series: seriesData.length,
            data: seriesData
        });
        
    } catch (error) {
        console.error('Error exporting series data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export series data',
            error: error.message
        });
    }
});

// Import series data (POST)
router.post('/import', async (req, res) => {
    try {
        console.log('[ADMIN-SERIES] Importing series data');
        
        const { series } = req.body;
        
        if (!series || !Array.isArray(series)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid import data. Expected array of series.'
            });
        }
        
        const results = {
            success: 0,
            errors: 0,
            details: []
        };
        
        // Process each series
        for (const seriesItem of series) {
            try {
                if (SeriesController && SeriesController.create) {
                    // Use mock request/response
                    const mockReq = { body: seriesItem };
                    const mockRes = {
                        json: (data) => {
                            if (data.success) {
                                results.success++;
                                results.details.push({
                                    title: seriesItem.title,
                                    status: 'success'
                                });
                            } else {
                                results.errors++;
                                results.details.push({
                                    title: seriesItem.title,
                                    status: 'error',
                                    message: data.message
                                });
                            }
                        },
                        status: () => mockRes
                    };
                    
                    await SeriesController.create(mockReq, mockRes);
                } else {
                    results.errors++;
                    results.details.push({
                        title: seriesItem.title || 'Unknown',
                        status: 'error',
                        message: 'Series controller not available'
                    });
                }
            } catch (error) {
                results.errors++;
                results.details.push({
                    title: seriesItem.title || 'Unknown',
                    status: 'error',
                    message: error.message
                });
            }
        }
        
        res.json({
            success: true,
            message: `Import completed: ${results.success} successful, ${results.errors} errors`,
            results: results
        });
        
    } catch (error) {
        console.error('Error importing series data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to import series data',
            error: error.message
        });
    }
});

module.exports = router;