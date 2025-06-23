// src/routes/api/ads.js - FIXED API Routes for Ads
const express = require('express');
const router = express.Router();

// Import with error handling
let AdController;
try {
    AdController = require('../../controllers/adController');
    console.log('✅ AdController loaded successfully for API routes');
} catch (error) {
    console.error('❌ Failed to load AdController for API routes:', error);
    AdController = null;
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

// Public API Routes

// Get ads for video feed
router.get('/feed', checkAdController, async (req, res) => {
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

// Record ad click
router.post('/:id/click', checkAdController, async (req, res) => {
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

// Health check
router.get('/health', checkAdController, async (req, res) => {
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

// Get system status
router.get('/status', async (req, res) => {
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
            status.views_exist = fs.existsSync(path.join(viewsPath, 'ads.ejs'));
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

module.exports = router;