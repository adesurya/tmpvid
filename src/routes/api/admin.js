// src/routes/api/admin.js - Enhanced with ads validation routes
const express = require('express');
const router = express.Router();
const VideoController = require('../../controllers/videoController');
const CategoryController = require('../../controllers/categoryController');
const SeriesController = require('../../controllers/seriesController');
const AdminController = require('../../controllers/adminController');
const { adminAuth } = require('../../middleware/auth');

// Import upload middleware with fallback
let upload;
try {
    upload = require('../../middleware/upload');
} catch (error) {
    console.warn('⚠️ Upload middleware not found, file upload will be disabled');
    upload = {
        single: () => (req, res, next) => next(),
        handleUploadError: (req, res, next) => next()
    };
}

// Import AdsController with error handling
let AdsController;
try {
    AdsController = require('../../controllers/adsController');
    console.log('✅ Enhanced AdsController loaded for API routes');
} catch (error) {
    console.warn('⚠️ AdsController not found, ads API routes will be disabled');
    AdsController = null;
}

// Add debug middleware
router.use((req, res, next) => {
    console.log(`[ADMIN-API] ${req.method} ${req.path}`);
    next();
});

// Apply admin authentication to all routes
router.use(adminAuth);

// Dashboard
router.get('/dashboard/stats', AdminController.getDashboardStats);

// Enhanced Analytics Routes
router.get('/analytics/overview', AdminController.getAnalyticsOverview);
router.get('/analytics/detailed', AdminController.getDetailedAnalytics);
router.get('/analytics/videos', AdminController.getVideoAnalytics);
router.get('/analytics/users', AdminController.getUserAnalytics);

// Real-time activity endpoint
router.get('/analytics/realtime', AdminController.getRealTimeActivity);

// Video management
if (VideoController) {
    router.get('/videos', VideoController.getAdminList || ((req, res) => res.json({ success: false, message: 'Method not implemented' })));
    router.get('/videos/:id', VideoController.getVideo || ((req, res) => res.json({ success: false, message: 'Method not implemented' })));
    router.get('/videos/:id/stats', VideoController.getVideoStats || ((req, res) => res.json({ success: false, message: 'Method not implemented' })));
    router.post('/videos/upload', upload.single('video'), upload.handleUploadError, VideoController.upload || ((req, res) => res.json({ success: false, message: 'Method not implemented' })));
    router.put('/videos/:id', VideoController.update || ((req, res) => res.json({ success: false, message: 'Method not implemented' })));
    router.delete('/videos/:id', VideoController.delete || ((req, res) => res.json({ success: false, message: 'Method not implemented' })));
    router.get('/videos/:id/analytics', VideoController.getAnalytics || ((req, res) => res.json({ success: false, message: 'Method not implemented' })));
}

// Enhanced Google Ads Management Routes with Validation
if (AdsController) {
    // Basic CRUD operations
    router.get('/ads', AdsController.getAllAds);
    router.post('/ads', AdsController.createAds);
    router.put('/ads/:id', AdsController.updateAds);
    router.delete('/ads/:id', AdsController.deleteAds);
    router.put('/ads/:id/toggle', AdsController.toggleAdsStatus);
    
    // Enhanced validation features
    router.post('/ads/:id/validate', AdsController.validateAdsCode);
    router.post('/ads/bulk-validate', AdsController.bulkValidateAds);
    router.get('/ads/validation-report', AdsController.getValidationReport);
    
    // Migration and maintenance
    router.post('/ads/migrate', AdsController.runMigration);
    router.get('/ads/health', AdsController.healthCheck);
    
    // Analytics and reporting
    router.get('/ads/analytics', AdsController.getAdsAnalytics);
    
    // Import/Export functionality
    router.get('/ads/export', AdsController.exportAds);
    router.post('/ads/import', AdsController.importAds);
    
    // Preview validation (untuk pre-validate di form)
    router.post('/ads/validate-preview', async (req, res) => {
        try {
            const { code, type } = req.body;
            
            if (!code) {
                return res.status(400).json({
                    success: false,
                    message: 'Code is required for validation'
                });
            }
            
            // Try to import validator
            let AdsValidator;
            try {
                AdsValidator = require('../../utils/adsValidator');
            } catch (error) {
                return res.status(503).json({
                    success: false,
                    message: 'Validation service not available. Please install adsValidator.js'
                });
            }
            
            const validator = new AdsValidator();
            
            const validationResult = await validator.validateAdsCode(code, type || 'custom', {
                verifySiteRegistration: false // Quick validation without ads.txt check
            });
            
            res.json({
                success: true,
                data: validationResult,
                message: 'Preview validation completed'
            });
            
        } catch (error) {
            console.error('Preview validation error:', error);
            res.status(500).json({
                success: false,
                message: 'Preview validation failed',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    });
    
    // ads.txt management
    router.post('/ads/generate-ads-txt', AdsController.generateAdsTxt);
    
    // Active ads for injection (with validation filter)
    router.get('/ads/active', AdsController.getActiveAdsForInjection);
    
} else {
    // Fallback routes when AdsController is not available
    const adsNotAvailable = (req, res) => {
        res.status(503).json({
            success: false,
            message: 'Ads management is not available. Please ensure src/controllers/adsController.js and src/utils/adsValidator.js exist.',
            error: 'AdsController not loaded'
        });
    };
    
    router.get('/ads', adsNotAvailable);
    router.post('/ads', adsNotAvailable);
    router.put('/ads/:id', adsNotAvailable);
    router.delete('/ads/:id', adsNotAvailable);
    router.put('/ads/:id/toggle', adsNotAvailable);
    router.post('/ads/:id/validate', adsNotAvailable);
    router.post('/ads/bulk-validate', adsNotAvailable);
    router.get('/ads/validation-report', adsNotAvailable);
    router.post('/ads/generate-ads-txt', adsNotAvailable);
    router.get('/ads/active', adsNotAvailable);
}

// User management
router.get('/users', AdminController.getUsers);
router.post('/users', AdminController.createUser);
router.put('/users/:id', AdminController.updateUser);
router.delete('/users/:id', AdminController.deleteUser);

// Settings
router.get('/settings', AdminController.getSettings);
router.put('/settings', AdminController.updateSettings);

// Categories management (if controller available)
if (CategoryController) {
    router.get('/categories', CategoryController.getAll || ((req, res) => res.json({ success: false, message: 'Method not implemented' })));
    router.post('/categories', CategoryController.create || ((req, res) => res.json({ success: false, message: 'Method not implemented' })));
    router.put('/categories/:id', CategoryController.update || ((req, res) => res.json({ success: false, message: 'Method not implemented' })));
    router.delete('/categories/:id', CategoryController.delete || ((req, res) => res.json({ success: false, message: 'Method not implemented' })));
}

// Series management (if controller available)
if (SeriesController) {
    router.get('/series', SeriesController.getAll || ((req, res) => res.json({ success: false, message: 'Method not implemented' })));
    router.post('/series', SeriesController.create || ((req, res) => res.json({ success: false, message: 'Method not implemented' })));
    router.put('/series/:id', SeriesController.update || ((req, res) => res.json({ success: false, message: 'Method not implemented' })));
    router.delete('/series/:id', SeriesController.delete || ((req, res) => res.json({ success: false, message: 'Method not implemented' })));
}

module.exports = router;