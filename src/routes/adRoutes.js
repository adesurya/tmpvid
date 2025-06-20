// src/routes/adRoutes.js - FIXED VERSION
const express = require('express');
const router = express.Router();

// Import with error handling
let AdController;
try {
    AdController = require('../controllers/adController');
    console.log('✅ AdController loaded successfully');
} catch (error) {
    console.error('❌ Failed to load AdController:', error);
    AdController = null;
}

// Middleware to check if AdController is available
const checkAdController = (req, res, next) => {
    if (!AdController) {
        const errorMessage = 'Advertisement system is not available. Please check server configuration.';
        
        if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.originalUrl.startsWith('/api/')) {
            return res.status(503).json({
                success: false,
                message: errorMessage,
                error: 'AdController not loaded'
            });
        }
        
        // For web requests, render fallback page
        return res.status(503).render('admin/ads-fallback', {
            title: 'Advertisement System',
            error: errorMessage,
            instructions: [
                'Ensure src/controllers/adController.js exists',
                'Verify src/models/Ad.js is properly configured',
                'Check database connection and tables',
                'Restart the application server'
            ],
            layout: 'layouts/admin'
        });
    }
    next();
};

// API Routes (Public)

// FIXED: Get ads for video feed
router.get('/api/ads/feed', checkAdController, async (req, res) => {
    try {
        await AdController.getAdsForFeed(req, res);
    } catch (error) {
        console.error('❌ API ads feed error:', error);
        res.status(500).json({
            success: false,
            showAd: false,
            data: null,
            message: 'Failed to get ads'
        });
    }
});

// FIXED: Record ad click
router.post('/api/ads/:id/click', checkAdController, async (req, res) => {
    try {
        await AdController.recordClick(req, res);
    } catch (error) {
        console.error('❌ API record click error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record click'
        });
    }
});

// Admin API Routes

// FIXED: Get ads summary for dashboard
router.get('/api/admin/ads/summary', checkAdController, async (req, res) => {
    try {
        await AdController.getAdsSummary(req, res);
    } catch (error) {
        console.error('❌ API ads summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get ads summary',
            data: {
                total_ads: 0, active_ads: 0, inactive_ads: 0,
                total_impressions: 0, total_clicks: 0, overall_ctr: 0
            }
        });
    }
});

// FIXED: Get ad analytics
router.get('/api/admin/ads/:id/analytics', checkAdController, async (req, res) => {
    try {
        await AdController.getAnalytics(req, res);
    } catch (error) {
        console.error('❌ API analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get analytics',
            data: { impressions: [], clicks: [] }
        });
    }
});

// FIXED: Health check endpoint
router.get('/api/admin/ads/health', checkAdController, async (req, res) => {
    try {
        await AdController.healthCheck(req, res);
    } catch (error) {
        console.error('❌ API health check error:', error);
        res.status(500).json({
            success: false,
            message: 'Health check failed',
            error: error.message
        });
    }
});

// FIXED: Migration endpoint (if needed)
router.post('/api/admin/ads/migrate', async (req, res) => {
    try {
        if (!AdController) {
            return res.status(503).json({
                success: false,
                message: 'Migration not available - AdController not loaded'
            });
        }
        
        // For now, just initialize the controller
        const result = await AdController.initialize();
        
        res.json({
            success: result,
            message: result ? 'Migration completed successfully' : 'Migration failed'
        });
    } catch (error) {
        console.error('❌ Migration error:', error);
        res.status(500).json({
            success: false,
            message: 'Migration failed',
            error: error.message
        });
    }
});

// FIXED: System status endpoint
router.get('/api/admin/ads/status', async (req, res) => {
    try {
        const status = {
            controller_loaded: !!AdController,
            model_loaded: false,
            views_exist: false,
            upload_directory: false,
            fully_configured: false
        };
        
        // Check if Ad model can be loaded
        try {
            const Ad = require('../models/Ad');
            status.model_loaded = !!Ad;
        } catch (modelError) {
            console.warn('Ad model not found:', modelError.message);
        }
        
        // Check if views exist
        const fs = require('fs');
        const path = require('path');
        try {
            const viewsPath = path.join(__dirname, '../../views/admin');
            status.views_exist = fs.existsSync(path.join(viewsPath, 'ads.ejs')) &&
                                fs.existsSync(path.join(viewsPath, 'ads-create.ejs'));
        } catch (viewError) {
            console.warn('Views check failed:', viewError.message);
        }
        
        // Check upload directory
        try {
            const uploadPath = path.join(__dirname, '../../public/uploads/ads');
            await fs.promises.mkdir(uploadPath, { recursive: true });
            await fs.promises.access(uploadPath, fs.constants.W_OK);
            status.upload_directory = true;
        } catch (uploadError) {
            console.warn('Upload directory check failed:', uploadError.message);
        }
        
        // Overall status
        status.fully_configured = status.controller_loaded && 
                                  status.model_loaded && 
                                  status.views_exist && 
                                  status.upload_directory;
        
        res.json({
            success: true,
            data: status,
            message: status.fully_configured ? 'System ready' : 'System needs configuration'
        });
    } catch (error) {
        console.error('❌ Status check error:', error);
        res.status(500).json({
            success: false,
            message: 'Status check failed',
            error: error.message
        });
    }
});

// Bulk operations
router.post('/api/admin/ads/bulk/toggle', checkAdController, async (req, res) => {
    try {
        await AdController.bulkToggleStatus(req, res);
    } catch (error) {
        console.error('❌ Bulk toggle error:', error);
        res.status(500).json({
            success: false,
            message: 'Bulk toggle failed'
        });
    }
});

router.post('/api/admin/ads/bulk/delete', checkAdController, async (req, res) => {
    try {
        await AdController.bulkDelete(req, res);
    } catch (error) {
        console.error('❌ Bulk delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Bulk delete failed'
        });
    }
});

// Export ads
router.get('/api/admin/ads/export', checkAdController, async (req, res) => {
    try {
        await AdController.exportAds(req, res);
    } catch (error) {
        console.error('❌ Export error:', error);
        res.status(500).json({
            success: false,
            message: 'Export failed'
        });
    }
});

// Clone ad
router.post('/api/admin/ads/:id/clone', checkAdController, async (req, res) => {
    try {
        await AdController.cloneAd(req, res);
    } catch (error) {
        console.error('❌ Clone error:', error);
        res.status(500).json({
            success: false,
            message: 'Clone failed'
        });
    }
});

// Web Admin Routes

// FIXED: Show ads list
router.get('/admin/ads', checkAdController, async (req, res) => {
    try {
        await AdController.getAdminList(req, res);
    } catch (error) {
        console.error('❌ Admin ads list error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load advertisements',
            layout: 'layouts/admin'
        });
    }
});

// FIXED: Show create form
router.get('/admin/ads/create', checkAdController, async (req, res) => {
    try {
        await AdController.showCreateForm(req, res);
    } catch (error) {
        console.error('❌ Show create form error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load create form',
            layout: 'layouts/admin'
        });
    }
});

// FIXED: Create ad with proper middleware
router.post('/admin/ads', checkAdController, (req, res, next) => {
    // Use the upload middleware from AdController
    if (AdController && typeof AdController.getUploadMiddleware === 'function') {
        AdController.getUploadMiddleware()(req, res, next);
    } else {
        next();
    }
}, async (req, res) => {
    try {
        await AdController.create(req, res);
    } catch (error) {
        console.error('❌ Create ad error:', error);
        
        // Clean up uploaded file if exists
        if (req.file) {
            const fs = require('fs').promises;
            await fs.unlink(req.file.path).catch(console.error);
        }
        
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create advertisement'
            });
        }
        
        if (req.flash) {
            req.flash('error_msg', 'Failed to create advertisement');
        }
        
        res.redirect('/admin/ads/create');
    }
});

// FIXED: Show edit form
router.get('/admin/ads/:id/edit', checkAdController, async (req, res) => {
    try {
        await AdController.showEditForm(req, res);
    } catch (error) {
        console.error('❌ Show edit form error:', error);
        
        if (req.flash) {
            req.flash('error_msg', 'Failed to load advertisement for editing');
        }
        
        res.redirect('/admin/ads');
    }
});

// FIXED: Update ad
router.post('/admin/ads/:id', checkAdController, (req, res, next) => {
    // Use the upload middleware from AdController
    if (AdController && typeof AdController.getUploadMiddleware === 'function') {
        AdController.getUploadMiddleware()(req, res, next);
    } else {
        next();
    }
}, async (req, res) => {
    try {
        await AdController.update(req, res);
    } catch (error) {
        console.error('❌ Update ad error:', error);
        
        // Clean up uploaded file if exists
        if (req.file) {
            const fs = require('fs').promises;
            await fs.unlink(req.file.path).catch(console.error);
        }
        
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update advertisement'
            });
        }
        
        if (req.flash) {
            req.flash('error_msg', 'Failed to update advertisement');
        }
        
        res.redirect('/admin/ads');
    }
});

// FIXED: Delete ad
router.delete('/admin/ads/:id', checkAdController, async (req, res) => {
    try {
        await AdController.delete(req, res);
    } catch (error) {
        console.error('❌ Delete ad error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete advertisement'
        });
    }
});

// FIXED: Toggle ad status
router.post('/admin/ads/:id/toggle', checkAdController, async (req, res) => {
    try {
        await AdController.toggleStatus(req, res);
    } catch (error) {
        console.error('❌ Toggle status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle status'
        });
    }
});

// FIXED: Preview ad
router.get('/admin/ads/:id/preview', checkAdController, async (req, res) => {
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
        
        const Ad = require('../models/Ad');
        const ad = await Ad.findById(adId);
        
        if (!ad) {
            return res.status(404).render('error', {
                title: 'Ad Not Found',
                message: 'Advertisement not found',
                layout: 'layouts/admin'
            });
        }
        
        res.render('admin/ads-preview', {
            title: 'Preview Advertisement',
            ad: ad,
            layout: 'layouts/admin'
        });
    } catch (error) {
        console.error('❌ Preview ad error:', error);
        res.status(500).render('error', {
            title: 'Preview Error',
            message: 'Failed to preview advertisement',
            layout: 'layouts/admin'
        });
    }
});

// Performance dashboard
router.get('/admin/ads/performance', checkAdController, async (req, res) => {
    try {
        await AdController.getPerformanceDashboard(req, res);
    } catch (error) {
        console.error('❌ Performance dashboard error:', error);
        res.status(500).render('error', {
            title: 'Performance Error',
            message: 'Failed to load performance dashboard',
            layout: 'layouts/admin'
        });
    }
});

module.exports = router;