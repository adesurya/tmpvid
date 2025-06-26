// src/routes/adRoutes.js - FIXED VERSION
const express = require('express');
const router = express.Router();

// Import with proper error handling
let AdController;
let Ad;
try {
    AdController = require('../controllers/adController');
    Ad = require('../models/Ad');
    console.log('✅ AdController and Ad model loaded successfully in routes');
} catch (error) {
    console.error('❌ Failed to load AdController or Ad model in routes:', error);
    AdController = null;
    Ad = null;
}

// Enhanced middleware to check if Ad system is available
const checkAdSystem = (req, res, next) => {
    if (!AdController || !Ad) {
        const errorMessage = 'Advertisement system is not available. Please check server configuration.';
        
        if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.originalUrl.startsWith('/api/')) {
            return res.status(503).json({
                success: false,
                message: errorMessage,
                error: 'AdController or Ad model not loaded'
            });
        }
        
        // For web requests, render fallback page
        return res.status(503).render('admin/ads-fallback', {
            title: 'Advertisement System',
            error: errorMessage,
            instructions: [
                'Ensure src/controllers/adController.js exists and is valid',
                'Verify src/models/Ad.js is properly configured',
                'Check database connection and tables exist',
                'Verify upload directory permissions',
                'Restart the application server'
            ],
            layout: 'layouts/admin'
        });
    }
    next();
};

// === MAIN ADMIN ROUTES - FIXED ORDER ===

// Show ads list (main dashboard)
router.get('/', checkAdSystem, async (req, res) => {
    try {
        console.log('📋 Loading ads dashboard...');
        await AdController.getAdminList(req, res);
    } catch (error) {
        console.error('❌ Admin ads list error:', error);
        
        // Fallback rendering with error info
        const fallbackData = {
            title: 'Manage Advertisements',
            ads: [],
            allActiveAds: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
            filters: { status: null, slot: null, type: null },
            error_msg: `Failed to load ads: ${error.message}`,
            layout: 'layouts/admin'
        };
        
        res.status(500).render('admin/ads', fallbackData);
    }
});

// FIXED: Show create form - MUST BE BEFORE /:id routes
router.get('/create', checkAdSystem, async (req, res) => {
    try {
        console.log('📝 Loading create ad form...');
        
        // Use the showCreateForm method if available, otherwise render directly
        if (AdController && typeof AdController.showCreateForm === 'function') {
            await AdController.showCreateForm(req, res);
        } else {
            // Fallback rendering
            const presetSlot = req.query.slot ? parseInt(req.query.slot) : null;
            
            res.render('admin/ads-create', {
                title: 'Create New Advertisement',
                presetSlot: presetSlot,
                uploadDirExists: true, // Assume true for fallback
                layout: 'layouts/admin'
            });
        }
    } catch (error) {
        console.error('❌ Show create form error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load create form: ' + error.message,
            layout: 'layouts/admin'
        });
    }
});

// FIXED: Performance dashboard - BEFORE /:id routes
router.get('/performance', checkAdSystem, async (req, res) => {
    try {
        console.log('📊 Loading performance dashboard...');
        if (AdController && typeof AdController.getPerformanceDashboard === 'function') {
            await AdController.getPerformanceDashboard(req, res);
        } else {
            // Fallback
            res.render('admin/ads-performance', {
                title: 'Ad Performance Dashboard',
                summary: {
                    total_ads: 0, active_ads: 0, inactive_ads: 0,
                    total_impressions: 0, total_clicks: 0, overall_ctr: 0
                },
                ads: [],
                error_msg: 'Performance dashboard not available',
                layout: 'layouts/admin'
            });
        }
    } catch (error) {
        console.error('❌ Performance dashboard route error:', error);
        res.status(500).render('error', {
            title: 'Performance Error',
            message: 'Failed to load performance dashboard: ' + error.message,
            layout: 'layouts/admin'
        });
    }
});

// Create ad with enhanced error handling - FIXED middleware application
router.post('/', checkAdSystem, (req, res, next) => {
    console.log('📨 Received create ad request');
    console.log('📋 Request body keys:', Object.keys(req.body));
    console.log('📋 Request content-type:', req.get('Content-Type'));
    
    // Apply upload middleware conditionally
    if (AdController && typeof AdController.getUploadMiddleware === 'function') {
        const uploadMiddleware = AdController.getUploadMiddleware();
        uploadMiddleware(req, res, (err) => {
            if (err) {
                console.error('❌ Upload middleware error:', err);
                
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(400).json({
                        success: false,
                        message: `Upload error: ${err.message}`,
                        error: err.code || 'UPLOAD_ERROR'
                    });
                }
                
                if (req.flash) {
                    req.flash('error_msg', `Upload error: ${err.message}`);
                }
                return res.redirect('/admin/ads/create');
            }
            next();
        });
    } else {
        console.warn('⚠️ Upload middleware not available');
        next();
    }
}, async (req, res) => {
    try {
        console.log('🚀 Processing ad creation...');
        if (AdController && typeof AdController.create === 'function') {
            await AdController.create(req, res);
        } else {
            throw new Error('AdController.create method not available');
        }
    } catch (error) {
        console.error('❌ Create ad route error:', error);
        
        // Clean up uploaded file if exists
        if (req.file && req.file.path) {
            const fs = require('fs').promises;
            await fs.unlink(req.file.path).catch(console.error);
        }
        
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create advertisement: ' + error.message
            });
        }
        
        if (req.flash) {
            req.flash('error_msg', 'Failed to create advertisement: ' + error.message);
        }
        
        res.redirect('/admin/ads/create');
    }
});

// Show edit form - MUST be after /create and /performance
router.get('/:id/edit', checkAdSystem, async (req, res) => {
    try {
        const { id } = req.params;
        const adId = parseInt(id);
        
        if (!adId || isNaN(adId)) {
            if (req.flash) {
                req.flash('error_msg', 'Invalid advertisement ID');
            }
            return res.redirect('/admin/ads');
        }
        
        console.log('✏️ Loading edit form for ad:', adId);
        
        if (AdController && typeof AdController.showEditForm === 'function') {
            await AdController.showEditForm(req, res);
        } else {
            throw new Error('Edit form not available');
        }
    } catch (error) {
        console.error('❌ Show edit form error:', error);
        
        if (req.flash) {
            req.flash('error_msg', 'Failed to load advertisement for editing');
        }
        
        res.redirect('/admin/ads');
    }
});

// Preview ad - MUST be after /create and /performance  
router.get('/:id/preview', checkAdSystem, async (req, res) => {
    try {
        const { id } = req.params;
        const adId = parseInt(id);
        
        if (!adId || isNaN(adId)) {
            return res.status(400).render('error', {
                title: 'Invalid Ad',
                message: 'Invalid advertisement ID',
                layout: 'layouts/admin'
            });
        }
        
        console.log('👁️ Previewing ad:', adId);
        
        const ad = await Ad.findById(adId);
        
        if (!ad) {
            return res.status(404).render('error', {
                title: 'Ad Not Found',
                message: 'Advertisement not found',
                layout: 'layouts/admin'
            });
        }
        
        res.render('admin/ads-preview', {
            title: `Preview: ${ad.title}`,
            ad: ad,
            layout: 'layouts/admin'
        });
    } catch (error) {
        console.error('❌ Preview ad route error:', error);
        res.status(500).render('error', {
            title: 'Preview Error',
            message: 'Failed to preview advertisement: ' + error.message,
            layout: 'layouts/admin'
        });
    }
});

// Update ad - AFTER specific routes
router.post('/:id', checkAdSystem, (req, res, next) => {
    const { id } = req.params;
    console.log('📝 Received update request for ad:', id);
    
    // Apply upload middleware conditionally  
    if (AdController && typeof AdController.getUploadMiddleware === 'function') {
        const uploadMiddleware = AdController.getUploadMiddleware();
        uploadMiddleware(req, res, (err) => {
            if (err) {
                console.error('❌ Update upload error:', err);
                
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(400).json({
                        success: false,
                        message: `Upload error: ${err.message}`
                    });
                }
                
                if (req.flash) {
                    req.flash('error_msg', `Upload error: ${err.message}`);
                }
                return res.redirect(`/admin/ads/${id}/edit`);
            }
            next();
        });
    } else {
        next();
    }
}, async (req, res) => {
    try {
        console.log('🔄 Processing ad update...');
        if (AdController && typeof AdController.update === 'function') {
            await AdController.update(req, res);
        } else {
            throw new Error('Update method not available');
        }
    } catch (error) {
        console.error('❌ Update ad route error:', error);
        
        // Clean up uploaded file if exists
        if (req.file && req.file.path) {
            const fs = require('fs').promises;
            await fs.unlink(req.file.path).catch(console.error);
        }
        
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update advertisement: ' + error.message
            });
        }
        
        if (req.flash) {
            req.flash('error_msg', 'Failed to update advertisement: ' + error.message);
        }
        
        res.redirect('/admin/ads');
    }
});

// Delete ad
router.delete('/:id', checkAdSystem, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🗑️ Deleting ad:', id);
        if (AdController && typeof AdController.delete === 'function') {
            await AdController.delete(req, res);
        } else {
            throw new Error('Delete method not available');
        }
    } catch (error) {
        console.error('❌ Delete ad route error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete advertisement: ' + error.message
        });
    }
});

// Toggle ad status
router.post('/:id/toggle', checkAdSystem, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🔄 Toggling status for ad:', id);
        if (AdController && typeof AdController.toggleStatus === 'function') {
            await AdController.toggleStatus(req, res);
        } else {
            throw new Error('Toggle status method not available');
        }
    } catch (error) {
        console.error('❌ Toggle status route error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle status: ' + error.message
        });
    }
});

// Bulk operations routes
router.post('/bulk/toggle', checkAdSystem, async (req, res) => {
    try {
        console.log('🔄 Bulk toggle operation...');
        if (AdController && typeof AdController.bulkToggleStatus === 'function') {
            await AdController.bulkToggleStatus(req, res);
        } else {
            throw new Error('Bulk toggle method not available');
        }
    } catch (error) {
        console.error('❌ Bulk toggle route error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to perform bulk toggle: ' + error.message
        });
    }
});

router.post('/bulk/delete', checkAdSystem, async (req, res) => {
    try {
        console.log('🗑️ Bulk delete operation...');
        if (AdController && typeof AdController.bulkDelete === 'function') {
            await AdController.bulkDelete(req, res);
        } else {
            throw new Error('Bulk delete method not available');
        }
    } catch (error) {
        console.error('❌ Bulk delete route error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to perform bulk delete: ' + error.message
        });
    }
});

// Export data
router.get('/export', checkAdSystem, async (req, res) => {
    try {
        console.log('📤 Exporting ads data...');
        if (AdController && typeof AdController.exportAds === 'function') {
            await AdController.exportAds(req, res);
        } else {
            throw new Error('Export method not available');
        }
    } catch (error) {
        console.error('❌ Export route error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export data: ' + error.message
        });
    }
});

// Clone ad
router.post('/:id/clone', checkAdSystem, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('📋 Cloning ad:', id);
        if (AdController && typeof AdController.cloneAd === 'function') {
            await AdController.cloneAd(req, res);
        } else {
            throw new Error('Clone method not available');
        }
    } catch (error) {
        console.error('❌ Clone route error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clone ad: ' + error.message
        });
    }
});

module.exports = router;