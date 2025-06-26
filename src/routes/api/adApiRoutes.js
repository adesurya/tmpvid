// src/routes/api/adApiRoutes.js - API routes for ad management
const express = require('express');
const router = express.Router();

// Import with proper error handling
let AdController;
let Ad;
try {
    AdController = require('../../controllers/adController');
    Ad = require('../../models/Ad');
    console.log('✅ API AdController and Ad model loaded successfully');
} catch (error) {
    console.error('❌ Failed to load API AdController or Ad model:', error);
    AdController = null;
    Ad = null;
}

// Middleware to check if Ad system is available
const checkAdSystem = (req, res, next) => {
    if (!AdController || !Ad) {
        return res.status(503).json({
            success: false,
            message: 'Advertisement API is not available',
            error: 'AdController or Ad model not loaded'
        });
    }
    next();
};

// === PUBLIC API ROUTES (for frontend/feed integration) ===

// Get ads for video feed
router.get('/feed', checkAdSystem, async (req, res) => {
    try {
        console.log('📺 API: Getting ads for feed...');
        await AdController.getAdsForFeed(req, res);
    } catch (error) {
        console.error('❌ API feed ads error:', error);
        res.status(500).json({
            success: false,
            showAd: false,
            data: null,
            message: 'Failed to get ads for feed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Record ad click
router.post('/click/:id', checkAdSystem, async (req, res) => {
    try {
        console.log('🖱️ API: Recording ad click...');
        await AdController.recordClick(req, res);
    } catch (error) {
        console.error('❌ API record click error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record ad click',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// === ADMIN API ROUTES ===

// Get ads summary for dashboard
router.get('/admin/ads/summary', checkAdSystem, async (req, res) => {
    try {
        console.log('📊 API: Getting ads summary...');
        await AdController.getAdsSummary(req, res);
    } catch (error) {
        console.error('❌ API ads summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get ads summary',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get ad analytics
router.get('/admin/ads/:id/analytics', checkAdSystem, async (req, res) => {
    try {
        console.log('📈 API: Getting ad analytics...');
        await AdController.getAnalytics(req, res);
    } catch (error) {
        console.error('❌ API ad analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get ad analytics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Clone ad
router.post('/admin/ads/:id/clone', checkAdSystem, async (req, res) => {
    try {
        console.log('📋 API: Cloning ad...');
        await AdController.cloneAd(req, res);
    } catch (error) {
        console.error('❌ API clone ad error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clone ad',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Bulk toggle status
router.post('/admin/ads/bulk/toggle', checkAdSystem, async (req, res) => {
    try {
        console.log('🔄 API: Bulk toggle ads status...');
        await AdController.bulkToggleStatus(req, res);
    } catch (error) {
        console.error('❌ API bulk toggle error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to perform bulk toggle',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Bulk delete ads
router.post('/admin/ads/bulk/delete', checkAdSystem, async (req, res) => {
    try {
        console.log('🗑️ API: Bulk delete ads...');
        await AdController.bulkDelete(req, res);
    } catch (error) {
        console.error('❌ API bulk delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to perform bulk delete',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Export ads data
router.get('/admin/ads/export', checkAdSystem, async (req, res) => {
    try {
        console.log('📤 API: Exporting ads data...');
        await AdController.exportAds(req, res);
    } catch (error) {
        console.error('❌ API export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export ads data',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Test Google Ads script
router.post('/admin/ads/test-google-script', checkAdSystem, async (req, res) => {
    try {
        console.log('🧪 API: Testing Google Ads script...');
        await AdController.testGoogleAdsScript(req, res);
    } catch (error) {
        console.error('❌ API test Google script error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to test Google Ads script',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get ad statistics
router.get('/admin/ads/:id/statistics', checkAdSystem, async (req, res) => {
    try {
        console.log('📊 API: Getting ad statistics...');
        await AdController.getAdStatistics(req, res);
    } catch (error) {
        console.error('❌ API ad statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get ad statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// === SLOT MANAGEMENT API ROUTES ===

// Get slots overview data
router.get('/admin/ads/slots/overview', checkAdSystem, async (req, res) => {
    try {
        console.log('🎯 API: Getting slots overview...');
        
        const adsBySlots = await Ad.getAdsBySlots();
        
        // Format slots data for frontend
        const slotsOverview = {};
        for (let i = 1; i <= 5; i++) {
            const slotAds = adsBySlots[i] || [];
            const activeAd = slotAds.find(ad => ad.is_active);
            
            slotsOverview[i] = {
                slot_number: i,
                has_active_ad: !!activeAd,
                active_ad: activeAd || null,
                total_ads: slotAds.length,
                timing: 'After every 3 videos'
            };
        }
        
        res.json({
            success: true,
            data: slotsOverview,
            message: 'Slots overview loaded successfully'
        });
        
    } catch (error) {
        console.error('❌ API slots overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get slots overview',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get specific slot data
router.get('/admin/ads/slots/:slotNumber', checkAdSystem, async (req, res) => {
    try {
        const { slotNumber } = req.params;
        const slot = parseInt(slotNumber);
        
        if (!slot || slot < 1 || slot > 5) {
            return res.status(400).json({
                success: false,
                message: 'Invalid slot number. Must be between 1 and 5.'
            });
        }
        
        console.log(`🎯 API: Getting slot ${slot} data...`);
        
        const adsBySlots = await Ad.getAdsBySlots();
        const slotAds = adsBySlots[slot] || [];
        const activeAd = slotAds.find(ad => ad.is_active);
        
        res.json({
            success: true,
            data: {
                slot_number: slot,
                has_active_ad: !!activeAd,
                active_ad: activeAd || null,
                all_ads: slotAds,
                total_ads: slotAds.length,
                timing: 'After every 3 videos'
            },
            message: `Slot ${slot} data loaded successfully`
        });
        
    } catch (error) {
        console.error('❌ API slot data error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get slot data',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Update slot ad assignment
router.post('/admin/ads/slots/:slotNumber/assign', checkAdSystem, async (req, res) => {
    try {
        const { slotNumber } = req.params;
        const { adId } = req.body;
        
        const slot = parseInt(slotNumber);
        const targetAdId = parseInt(adId);
        
        if (!slot || slot < 1 || slot > 5) {
            return res.status(400).json({
                success: false,
                message: 'Invalid slot number. Must be between 1 and 5.'
            });
        }
        
        if (!targetAdId) {
            return res.status(400).json({
                success: false,
                message: 'Ad ID is required'
            });
        }
        
        console.log(`🎯 API: Assigning ad ${targetAdId} to slot ${slot}...`);
        
        // Check if ad exists
        const ad = await Ad.findById(targetAdId);
        if (!ad) {
            return res.status(404).json({
                success: false,
                message: 'Advertisement not found'
            });
        }
        
        // Update ad slot position
        const updatedAd = await Ad.update(targetAdId, { 
            slot_position: slot,
            is_active: true // Ensure it's active when assigned
        });
        
        if (!updatedAd) {
            return res.status(500).json({
                success: false,
                message: 'Failed to assign ad to slot'
            });
        }
        
        res.json({
            success: true,
            data: {
                ad: updatedAd,
                slot_number: slot
            },
            message: `Ad "${ad.title}" assigned to Slot ${slot} successfully`
        });
        
    } catch (error) {
        console.error('❌ API assign slot error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign ad to slot',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Remove ad from slot
router.delete('/admin/ads/slots/:slotNumber/remove', checkAdSystem, async (req, res) => {
    try {
        const { slotNumber } = req.params;
        const slot = parseInt(slotNumber);
        
        if (!slot || slot < 1 || slot > 5) {
            return res.status(400).json({
                success: false,
                message: 'Invalid slot number. Must be between 1 and 5.'
            });
        }
        
        console.log(`🗑️ API: Removing ad from slot ${slot}...`);
        
        // Find active ad in this slot
        const adsBySlots = await Ad.getAdsBySlots();
        const slotAds = adsBySlots[slot] || [];
        const activeAd = slotAds.find(ad => ad.is_active);
        
        if (!activeAd) {
            return res.status(404).json({
                success: false,
                message: `No active ad found in Slot ${slot}`
            });
        }
        
        // Deactivate the ad instead of deleting it
        const updatedAd = await Ad.update(activeAd.id, { is_active: false });
        
        if (!updatedAd) {
            return res.status(500).json({
                success: false,
                message: 'Failed to remove ad from slot'
            });
        }
        
        res.json({
            success: true,
            data: {
                removed_ad: activeAd,
                slot_number: slot
            },
            message: `Ad removed from Slot ${slot} successfully`
        });
        
    } catch (error) {
        console.error('❌ API remove slot error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove ad from slot',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// === SYSTEM HEALTH & STATUS ===

// Health check endpoint
router.get('/health', checkAdSystem, async (req, res) => {
    try {
        console.log('🏥 API: Running health check...');
        await AdController.healthCheck(req, res);
    } catch (error) {
        console.error('❌ API health check error:', error);
        res.status(500).json({
            success: false,
            message: 'Health check failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get system status
router.get('/status', async (req, res) => {
    try {
        const status = {
            timestamp: new Date().toISOString(),
            ad_system: {
                available: !!(AdController && Ad),
                controller_loaded: !!AdController,
                model_loaded: !!Ad
            },
            database: {
                connected: false,
                ads_table_exists: false
            },
            features: {
                ad_creation: !!(AdController && Ad),
                slot_management: !!(AdController && Ad),
                analytics: !!(AdController && Ad),
                bulk_operations: !!(AdController && Ad),
                google_ads_support: !!(AdController && Ad)
            }
        };
        
        // Test database connection if Ad system is available
        if (Ad) {
            try {
                const count = await Ad.getCount();
                status.database.connected = true;
                status.database.ads_table_exists = true;
                status.database.total_ads = count;
            } catch (dbError) {
                console.warn('Database test failed:', dbError.message);
                status.database.error = dbError.message;
            }
        }
        
        const httpStatus = status.ad_system.available && status.database.connected ? 200 : 503;
        
        res.status(httpStatus).json({
            success: status.ad_system.available,
            data: status,
            message: status.ad_system.available ? 'Ad API is operational' : 'Ad API is not available'
        });
        
    } catch (error) {
        console.error('❌ API status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get system status',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// === ERROR HANDLING ===

// Handle 404 for API routes
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        available_endpoints: [
            'GET /api/ads/feed - Get ads for video feed',
            'POST /api/ads/click/:id - Record ad click',
            'GET /api/ads/admin/ads/summary - Get ads summary',
            'GET /api/ads/admin/ads/:id/analytics - Get ad analytics',
            'GET /api/ads/admin/ads/slots/overview - Get slots overview',
            'GET /api/ads/admin/ads/slots/:slotNumber - Get specific slot data',
            'POST /api/ads/admin/ads/slots/:slotNumber/assign - Assign ad to slot',
            'DELETE /api/ads/admin/ads/slots/:slotNumber/remove - Remove ad from slot',
            'GET /api/ads/health - Health check',
            'GET /api/ads/status - System status'
        ]
    });
});

module.exports = router;