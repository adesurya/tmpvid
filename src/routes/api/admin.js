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

let AdController;
try {
    AdController = require('../../controllers/adController');
    console.log('✅ AdController loaded for admin API routes');
} catch (error) {
    console.warn('⚠️ AdController not available for admin routes:', error.message);
    AdController = null;
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

// Middleware to check if AdController is available
const checkAdController = (req, res, next) => {
    if (!AdController) {
        return res.status(503).json({
            success: false,
            message: 'Advertisement system is not available',
            error: 'AdController not loaded'
        });
    }
    next();
};

// Test Google Ads script
router.post('/ads/test-script', checkAdController, async (req, res) => {
    try {
        await AdController.testGoogleAdsScript(req, res);
    } catch (error) {
        console.error('❌ Test script error:', error);
        res.status(500).json({
            success: false,
            message: 'Script test failed'
        });
    }
});

// Get ads summary for dashboard
router.get('/ads/summary', checkAdController, async (req, res) => {
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

// Get ad analytics
router.get('/ads/:id/analytics', checkAdController, async (req, res) => {
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
    router.post('/ads/migrate', async (req, res) => {
        try {
            if (!AdController) {
                return res.status(503).json({
                    success: false,
                    message: 'Migration not available - AdController not loaded'
                });
            }
            
            // Initialize the Ad system
            const Ad = require('../../models/Ad');
            await Ad.initializeTable();
            
            res.json({
                success: true,
                message: 'Migration completed successfully'
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

    router.get('/ads/status', async (req, res) => {
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
                const Ad = require('../../models/Ad');
                status.model_loaded = !!Ad;
            } catch (modelError) {
                console.warn('Ad model not found:', modelError.message);
            }
            
            // Check if views exist
            const fs = require('fs');
            const path = require('path');
            try {
                const viewsPath = path.join(__dirname, '../../../views/admin');
                status.views_exist = fs.existsSync(path.join(viewsPath, 'ads.ejs')) &&
                                    fs.existsSync(path.join(viewsPath, 'ads-create.ejs'));
            } catch (viewError) {
                console.warn('Views check failed:', viewError.message);
            }
            
            // Check upload directory
            try {
                const uploadPath = path.join(__dirname, '../../../public/uploads/ads');
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
    router.post('/ads/bulk/toggle', checkAdController, async (req, res) => {
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

    router.post('/ads/bulk/delete', checkAdController, async (req, res) => {
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


    // Health check endpoint
    router.get('/ads/health', checkAdController, async (req, res) => {
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
    
    // Import/Export functionality
    // Export ads
    router.get('/ads/export', checkAdController, async (req, res) => {
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

    router.post('/ads/:id/clone', checkAdController, async (req, res) => {
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

} else {
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