// src/routes/adRoutes.js
const express = require('express');
const router = express.Router();
const AdController = require('../controllers/adController');

// Middleware to check admin authentication
const requireAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(401).json({
                success: false,
                message: 'Admin access required'
            });
        }
        return res.redirect('/admin/login');
    }
    next();
};

// Public API routes (for video feed integration)
router.get('/api/ads/feed', AdController.getAdsForFeed);
router.post('/api/ads/:id/click', AdController.recordClick);

// Admin routes
router.get('/admin/ads', requireAdmin, AdController.getAdminList);
router.get('/admin/ads/create', requireAdmin, AdController.showCreateForm);
router.post('/admin/ads', requireAdmin, AdController.getUploadMiddleware(), AdController.create);
router.get('/admin/ads/:id/edit', requireAdmin, AdController.showEditForm);
router.put('/admin/ads/:id', requireAdmin, AdController.getUploadMiddleware(), AdController.update);
router.delete('/admin/ads/:id', requireAdmin, AdController.delete);
router.post('/admin/ads/:id/toggle', requireAdmin, AdController.toggleStatus);
router.get('/admin/ads/:id/analytics', requireAdmin, AdController.getAnalytics);
router.get('/admin/ads/performance', requireAdmin, AdController.getPerformanceDashboard);

// API routes for admin
router.get('/api/admin/ads', requireAdmin, AdController.getAdminList);
router.post('/api/admin/ads', requireAdmin, AdController.getUploadMiddleware(), AdController.create);
router.put('/api/admin/ads/:id', requireAdmin, AdController.getUploadMiddleware(), AdController.update);
router.delete('/api/admin/ads/:id', requireAdmin, AdController.delete);
router.post('/api/admin/ads/:id/toggle', requireAdmin, AdController.toggleStatus);
router.get('/api/admin/ads/:id/analytics', requireAdmin, AdController.getAnalytics);
router.get('/api/admin/ads/performance', requireAdmin, AdController.getPerformanceDashboard);

module.exports = router;