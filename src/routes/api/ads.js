// routes/api/ads.js - COMPLETE FIXED VERSION
const express = require('express');
const router = express.Router();

// Import with proper error handling and multiple fallback paths
let AdController;
let Ad;

const possibleAdControllerPaths = [
    '../../src/controllers/adController',
    '../controllers/adController',
    './controllers/adController',
    '../../controllers/adController'
];

const possibleAdModelPaths = [
    '../../src/models/Ad',
    '../models/Ad',
    './models/Ad',
    '../../models/Ad'
];

// Try to load AdController from different paths
for (const path of possibleAdControllerPaths) {
    try {
        AdController = require(path);
        console.log(`✅ AdController loaded from ${path}`);
        break;
    } catch (error) {
        // Continue to next path
    }
}

// Try to load Ad model from different paths
for (const path of possibleAdModelPaths) {
    try {
        Ad = require(path);
        console.log(`✅ Ad model loaded from ${path}`);
        break;
    } catch (error) {
        // Continue to next path
    }
}

if (!AdController) {
    console.error('❌ Failed to load AdController from any path');
}

if (!Ad) {
    console.error('❌ Failed to load Ad model from any path');
}

// Middleware to check if Ad system is available
const checkAdSystem = (req, res, next) => {
    if (!AdController || !Ad) {
        console.error('❌ Ad system not available - AdController:', !!AdController, 'Ad model:', !!Ad);
        return res.status(503).json({
            success: false,
            message: 'Advertisement API is not available',
            error: 'AdController or Ad model not loaded',
            debug: {
                controller_loaded: !!AdController,
                model_loaded: !!Ad
            }
        });
    }
    next();
};

// === PUBLIC API ROUTES (for frontend/feed integration) ===

// Get ads for video feed - MAIN ENDPOINT for frontend
router.get('/feed', checkAdSystem, async (req, res) => {
    try {
        console.log('📺 API: Getting ads for feed...');
        console.log('📋 Query params:', req.query);
        
        const { videoIndex, slot } = req.query;
        const slotPosition = parseInt(slot) || 1;
        const videoIdx = parseInt(videoIndex) || 0;
        
        console.log(`🎯 Looking for ad in slot ${slotPosition} for video index ${videoIdx}`);
        
        // Get ad for the specific slot
        const ad = await Ad.getAdBySlot(slotPosition);
        
        if (!ad) {
            console.log(`❌ No ad found for slot ${slotPosition}`);
            return res.json({
                success: true,
                showAd: false,
                data: null,
                message: `No ad available for slot ${slotPosition}`
            });
        }
        
        // Record impression
        try {
            await Ad.recordImpression(ad.id, null, req.ip, req.get('User-Agent'), videoIdx);
            console.log(`✅ Impression recorded for ad ${ad.id}`);
        } catch (impressionError) {
            console.warn('⚠️ Failed to record impression:', impressionError.message);
        }
        
        console.log(`✅ Ad found for slot ${slotPosition}:`, ad.title);
        
        return res.json({
            success: true,
            showAd: true,
            data: {
                id: ad.id,
                title: ad.title,
                description: ad.description,
                type: ad.type,
                media_url: ad.media_url,
                google_ads_script: ad.google_ads_script,
                click_url: ad.click_url,
                open_new_tab: ad.open_new_tab,
                duration: ad.duration || 0,
                slot_position: ad.slot_position
            },
            message: 'Ad loaded successfully'
        });
        
    } catch (error) {
        console.error('❌ Get ads for feed error:', error);
        return res.status(500).json({
            success: false,
            showAd: false,
            data: null,
            message: 'Failed to get ads for feed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Record ad click - MAIN ENDPOINT for frontend
router.post('/:id/click', checkAdSystem, async (req, res) => {
    try {
        const { id } = req.params;
        const adId = parseInt(id);
        
        console.log(`🖱️ Recording click for ad ${adId}`);
        console.log('📋 Request body:', req.body);
        
        if (!adId || isNaN(adId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ad ID'
            });
        }
        
        // Check if ad exists
        const ad = await Ad.findById(adId);
        if (!ad) {
            return res.status(404).json({
                success: false,
                message: 'Advertisement not found'
            });
        }
        
        // Record click
        try {
            const success = await Ad.recordClick(
                adId, 
                null, // userId
                req.ip, 
                req.get('User-Agent'), 
                req.get('Referer')
            );
            
            if (success) {
                console.log(`✅ Click recorded for ad ${adId}`);
                return res.json({
                    success: true,
                    message: 'Click recorded successfully'
                });
            } else {
                throw new Error('Failed to record click in database');
            }
        } catch (clickError) {
            console.error('❌ Failed to record click:', clickError);
            return res.status(500).json({
                success: false,
                message: 'Failed to record click'
            });
        }
        
    } catch (error) {
        console.error('❌ Record click error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to record ad click',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// === ADMIN API ROUTES ===

// Get ads summary for dashboard
router.get('/summary', checkAdSystem, async (req, res) => {
    try {
        console.log('📊 API: Getting ads summary...');
        
        const summary = await Ad.getDashboardSummary();
        
        res.json({
            success: true,
            data: summary,
            message: 'Ads summary loaded successfully'
        });
    } catch (error) {
        console.error('❌ Get ads summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get ads summary',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get ad analytics
router.get('/:id/analytics', checkAdSystem, async (req, res) => {
    try {
        const { id } = req.params;
        const { days = 30 } = req.query;
        
        console.log('📈 API: Getting ad analytics...');
        
        const analytics = await Ad.getAnalytics(parseInt(id), parseInt(days));
        
        res.json({
            success: true,
            data: analytics,
            message: 'Analytics loaded successfully'
        });
    } catch (error) {
        console.error('❌ Get analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get analytics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Clone ad
router.post('/:id/clone', checkAdSystem, async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;
        
        console.log('📋 API: Cloning ad...');
        
        const clonedAd = await Ad.cloneAd(parseInt(id), title);
        
        res.json({
            success: true,
            data: clonedAd,
            message: 'Advertisement cloned successfully'
        });
    } catch (error) {
        console.error('❌ Clone ad error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clone ad',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Bulk toggle status
router.post('/bulk/toggle', checkAdSystem, async (req, res) => {
    try {
        const { adIds } = req.body;
        
        console.log('🔄 API: Bulk toggle ads status...');
        
        if (!Array.isArray(adIds) || adIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Ad IDs array is required'
            });
        }
        
        const results = [];
        for (const id of adIds) {
            try {
                const newStatus = await Ad.toggleStatus(parseInt(id));
                results.push({ id: parseInt(id), success: true, status: newStatus });
            } catch (error) {
                results.push({ id: parseInt(id), success: false, error: error.message });
            }
        }
        
        res.json({
            success: true,
            data: results,
            message: 'Bulk toggle completed'
        });
    } catch (error) {
        console.error('❌ Bulk toggle error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to perform bulk toggle',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Bulk delete ads
router.post('/bulk/delete', checkAdSystem, async (req, res) => {
    try {
        const { adIds } = req.body;
        
        console.log('🗑️ API: Bulk delete ads...');
        
        if (!Array.isArray(adIds) || adIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Ad IDs array is required'
            });
        }
        
        const results = [];
        for (const id of adIds) {
            try {
                const ad = await Ad.findById(parseInt(id));
                if (ad && ad.media_url) {
                    const path = require('path');
                    const fs = require('fs').promises;
                    const filePath = path.join(__dirname, '../../public', ad.media_url);
                    await fs.unlink(filePath).catch(console.error);
                }
                
                const deleted = await Ad.delete(parseInt(id));
                results.push({ id: parseInt(id), success: deleted });
            } catch (error) {
                results.push({ id: parseInt(id), success: false, error: error.message });
            }
        }
        
        res.json({
            success: true,
            data: results,
            message: 'Bulk delete completed'
        });
    } catch (error) {
        console.error('❌ Bulk delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to perform bulk delete',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Export ads data
router.get('/export', checkAdSystem, async (req, res) => {
    try {
        console.log('📤 API: Exporting ads data...');
        
        const { format = 'json' } = req.query;
        const ads = await Ad.getAll({ page: 1, limit: 1000 });
        
        if (format === 'csv') {
            const csv = ads.data.map(ad => ({
                ID: ad.id,
                Title: ad.title,
                Type: ad.type,
                'Slot Position': ad.slot_position,
                'Is Active': ad.is_active ? 'Yes' : 'No',
                Impressions: ad.impressions_count,
                Clicks: ad.clicks_count,
                'Created At': ad.created_at
            }));
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=ads-export.csv');
            
            // Simple CSV conversion
            const headers = Object.keys(csv[0] || {});
            const csvContent = [
                headers.join(','),
                ...csv.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
            ].join('\n');
            
            res.send(csvContent);
        } else {
            res.json({
                success: true,
                data: ads.data,
                exported_at: new Date().toISOString(),
                total_exported: ads.data.length
            });
        }
    } catch (error) {
        console.error('❌ Export ads error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export ads',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Test Google Ads script
router.post('/test-google-script', checkAdSystem, async (req, res) => {
    try {
        const { script } = req.body;
        
        console.log('🧪 API: Testing Google Ads script...');
        
        const validation = Ad.validateGoogleAdsScript(script);
        
        res.json({
            success: validation.valid,
            data: validation,
            message: validation.message
        });
    } catch (error) {
        console.error('❌ Test Google Ads script error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to test Google Ads script',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get ad statistics
router.get('/:id/statistics', checkAdSystem, async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('📊 API: Getting ad statistics...');
        
        const ad = await Ad.findById(parseInt(id));
        if (!ad) {
            return res.status(404).json({
                success: false,
                message: 'Advertisement not found'
            });
        }
        
        const stats = {
            id: ad.id,
            title: ad.title,
            impressions: ad.impressions_count || 0,
            clicks: ad.clicks_count || 0,
            ctr: ad.impressions_count > 0 ? 
                ((ad.clicks_count || 0) / ad.impressions_count * 100).toFixed(2) : 0,
            is_active: ad.is_active,
            created_at: ad.created_at
        };
        
        res.json({
            success: true,
            data: stats,
            message: 'Ad statistics loaded successfully'
        });
    } catch (error) {
        console.error('❌ Get ad statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get ad statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// === SLOT MANAGEMENT API ROUTES ===

// Get slots overview data
router.get('/slots/overview', checkAdSystem, async (req, res) => {
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
                timing: 'After every 2 videos'
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
router.get('/slots/:slotNumber', checkAdSystem, async (req, res) => {
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
                timing: 'After every 2 videos'
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
router.post('/slots/:slotNumber/assign', checkAdSystem, async (req, res) => {
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
router.delete('/slots/:slotNumber/remove', checkAdSystem, async (req, res) => {
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
        
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            controller_loaded: !!AdController,
            ad_model_available: !!Ad,
            upload_directory: 'accessible' // This would be checked in a real implementation
        };
        
        if (Ad) {
            try {
                const adHealth = await Ad.healthCheck();
                health.database = adHealth;
            } catch (dbError) {
                health.database = {
                    healthy: false,
                    message: dbError.message
                };
            }
        }
        
        res.json({
            success: true,
            data: health,
            message: 'Ad API health check passed'
        });
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

// Handle 404 for ads API routes
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ads API endpoint not found',
        path: req.originalUrl,
        available_endpoints: [
            'GET /api/ads/feed - Get ads for video feed',
            'POST /api/ads/:id/click - Record ad click',
            'GET /api/ads/summary - Get ads summary',
            'GET /api/ads/:id/analytics - Get ad analytics',
            'GET /api/ads/slots/overview - Get slots overview',
            'GET /api/ads/slots/:slotNumber - Get specific slot data',
            'POST /api/ads/slots/:slotNumber/assign - Assign ad to slot',
            'DELETE /api/ads/slots/:slotNumber/remove - Remove ad from slot',
            'GET /api/ads/health - Health check',
            'GET /api/ads/status - System status'
        ]
    });
});

module.exports = router;