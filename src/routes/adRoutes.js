// src/routes/adRoutes.js - FIXED Main Ad Routes
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

// === WEB ADMIN ROUTES ===

// Show ads list
router.get('/', checkAdController, async (req, res) => {
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

// Show create form
router.get('/create', checkAdController, async (req, res) => {
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

// Create ad with proper middleware
router.post('/', checkAdController, (req, res, next) => {
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

// Show edit form
router.get('/:id/edit', checkAdController, async (req, res) => {
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

// Update ad
router.post('/:id', checkAdController, (req, res, next) => {
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

// Delete ad
router.delete('/:id', checkAdController, async (req, res) => {
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

// Toggle ad status
router.post('/:id/toggle', checkAdController, async (req, res) => {
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

// Preview ad
router.get('/:id/preview', checkAdController, async (req, res) => {
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
router.get('/performance', checkAdController, async (req, res) => {
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