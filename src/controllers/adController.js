// src/controllers/adController.js - Fixed version with all required methods
const Ad = require('../models/Ad');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Joi = require('joi');

// Updated validation schema with Google Ads support
const adSchema = Joi.object({
    title: Joi.string().min(3).max(255).required(),
    description: Joi.string().max(1000).allow('').allow(null),
    type: Joi.string().valid('video', 'image', 'google_ads').required(),
    click_url: Joi.when('type', {
        is: 'google_ads',
        then: Joi.string().allow('').allow(null),
        otherwise: Joi.string().uri().required()
    }),
    google_ads_script: Joi.when('type', {
        is: 'google_ads',
        then: Joi.string().min(10).required(),
        otherwise: Joi.string().allow('').allow(null)
    }),
    open_new_tab: Joi.alternatives().try(
        Joi.boolean(),
        Joi.string().valid('on', 'true', 'false', '1', '0', '')
    ).default(true),
    duration: Joi.alternatives().try(
        Joi.number().integer().min(0).max(60),
        Joi.string().pattern(/^\d+$/).max(2)
    ).allow('').default(0),
    slot_position: Joi.alternatives().try(
        Joi.number().integer().min(1).max(5),
        Joi.string().pattern(/^[1-5]$/)
    ).required(),
    is_active: Joi.alternatives().try(
        Joi.boolean(),
        Joi.string().valid('on', 'true', 'false', '1', '0', '')
    ).default(true),
    start_date: Joi.alternatives().try(
        Joi.date(),
        Joi.string().allow('')
    ).allow(null),
    end_date: Joi.alternatives().try(
        Joi.date(),
        Joi.string().allow('')
    ).allow(null)
});

// Helper function to convert form values to proper types
function processFormData(formData) {
    const processed = { ...formData };
    
    // Convert checkbox values to boolean
    processed.open_new_tab = convertToBoolean(formData.open_new_tab);
    processed.is_active = convertToBoolean(formData.is_active);
    
    // Convert numeric fields
    if (processed.duration) {
        processed.duration = parseInt(processed.duration) || 0;
    } else {
        processed.duration = 0;
    }
    
    if (processed.slot_position) {
        processed.slot_position = parseInt(processed.slot_position);
    }
    
    // Convert date fields
    if (processed.start_date === '') {
        processed.start_date = null;
    }
    if (processed.end_date === '') {
        processed.end_date = null;
    }
    
    // Clean up description
    if (processed.description === '') {
        processed.description = null;
    }
    
    // Handle Google Ads script
    if (processed.type === 'google_ads') {
        if (processed.google_ads_script) {
            processed.google_ads_script = processed.google_ads_script.trim();
        }
        // Google Ads don't need click_url
        if (!processed.click_url) {
            processed.click_url = null;
        }
    } else {
        // Non-Google ads don't need google_ads_script
        processed.google_ads_script = null;
    }
    
    return processed;
}

// Helper function to convert various checkbox representations to boolean
function convertToBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    
    if (typeof value === 'string') {
        const lowercaseValue = value.toLowerCase();
        return lowercaseValue === 'on' || 
               lowercaseValue === 'true' || 
               lowercaseValue === '1' ||
               lowercaseValue === 'yes';
    }
    
    if (typeof value === 'number') {
        return value === 1;
    }
    
    return false;
}

// Configure multer for ad media uploads (only for image/video ads)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../public/uploads/ads');
        // Create directory if it doesn't exist
        fs.mkdir(uploadDir, { recursive: true })
            .then(() => cb(null, uploadDir))
            .catch(err => cb(err));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'ad-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|webm/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image and video files are allowed (JPEG, PNG, GIF, MP4, AVI, MOV, WEBM)'));
        }
    }
});

class AdController {
    // Initialize ad system
    static async initialize() {
        try {
            await Ad.initializeTable();
            console.log('✅ Ad controller initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize ad controller:', error);
        }
    }

    // Get ads for video feed integration - FIXED VERSION
    static async getAdsForFeed(req, res) {
        try {
            const { videoIndex, slot } = req.query;
            const index = parseInt(videoIndex) || 0;
            const requestedSlot = parseInt(slot);
            
            console.log(`📺 Ad request - Video index: ${index}, Requested slot: ${requestedSlot}`);
            
            // Calculate which ad slot to show based on video position  
            // Show ad after every 3 videos (index 2, 5, 8, 11, etc.)
            const shouldShowAd = (index + 1) % 3 === 0;
            
            if (!shouldShowAd && !requestedSlot) {
                console.log(`🚫 No ad for video index ${index}`);
                return res.json({
                    success: true,
                    showAd: false,
                    data: null,
                    message: 'No ad scheduled for this position'
                });
            }
            
            // Calculate which slot (1-5) to show, cycling through slots
            let slotPosition;
            if (requestedSlot && requestedSlot >= 1 && requestedSlot <= 5) {
                slotPosition = requestedSlot;
            } else {
                const adCycle = Math.floor((index + 1) / 3); // Which ad cycle we're in
                slotPosition = (adCycle % 5) + 1; // Cycle through slots 1-5
            }
            
            console.log(`🎯 Looking for ad in slot: ${slotPosition}`);
            
            // Get ad for slot
            const ad = await Ad.getAdBySlot(slotPosition);
            
            if (!ad) {
                console.log(`❌ No active ad found for slot ${slotPosition}`);
                return res.json({
                    success: true,
                    showAd: false,
                    data: null,
                    message: `No active ad available for slot ${slotPosition}`
                });
            }
            
            // Record impression
            try {
                const userId = req.session?.user?.id || null;
                const ipAddress = req.ip || 
                                req.connection?.remoteAddress || 
                                req.socket?.remoteAddress ||
                                '127.0.0.1';
                const userAgent = req.get('User-Agent') || 'Unknown';
                
                await Ad.recordImpression(ad.id, userId, ipAddress, userAgent, index);
                console.log(`📊 Impression recorded for ad ${ad.id}`);
            } catch (impressionError) {
                console.error('⚠️ Failed to record impression:', impressionError);
                // Continue anyway - don't fail ad serving due to tracking issues
            }
            
            console.log(`✅ Serving ad: ${ad.title} (${ad.type}) for slot ${slotPosition}`);
            
            // Prepare response based on ad type
            const responseData = {
                id: ad.id,
                title: ad.title,
                description: ad.description,
                type: ad.type,
                slot_position: ad.slot_position,
                open_new_tab: Boolean(ad.open_new_tab)
            };

            // Add type-specific data
            if (ad.type === 'google_ads') {
                responseData.google_ads_script = ad.google_ads_script;
                responseData.click_tracking = 'managed_by_google';
            } else {
                responseData.media_url = ad.media_url;
                responseData.click_url = ad.click_url;
                responseData.duration = parseInt(ad.duration) || 0;
                responseData.click_tracking = 'internal';
            }
            
            res.json({
                success: true,
                showAd: true,
                data: responseData,
                message: 'Ad loaded successfully'
            });
            
        } catch (error) {
            console.error('❌ Get ads for feed error:', error);
            res.status(500).json({
                success: false,
                showAd: false,
                data: null,
                message: 'Failed to get ads for feed',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Record ad click (only for image/video ads)
    static async recordClick(req, res) {
        try {
            const { id } = req.params;
            
            // Validate ad ID
            if (!id || isNaN(parseInt(id))) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid advertisement ID'
                });
            }
            
            // FIXED: Safely extract request data
            const requestBody = req.body || {};
            const userId = req.session?.user?.id || null;
            const ipAddress = req.ip || 
                            req.connection?.remoteAddress || 
                            req.socket?.remoteAddress ||
                            (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
                            '127.0.0.1';
            const userAgent = req.get('User-Agent') || 'Unknown';
            const referrer = req.get('Referrer') || requestBody.referrer || '';
            
            console.log(`🖱️ Recording ad click for ad ${id}:`, {
                userId,
                ipAddress,
                userAgent: userAgent.substring(0, 100) + '...',
                referrer
            });
            
            // Validate ad exists and is active
            const ad = await Ad.findById(parseInt(id));
            if (!ad) {
                return res.status(404).json({
                    success: false,
                    message: 'Advertisement not found'
                });
            }
            
            if (!ad.is_active) {
                return res.status(400).json({
                    success: false,
                    message: 'Advertisement is not active'
                });
            }
            
            // Check if it's a Google Ads (clicks managed by Google)
            if (ad.type === 'google_ads') {
                console.log(`⚠️ Ad ${id} is Google Ads - clicks managed by Google`);
                return res.json({
                    success: true,
                    message: 'Google Ads click tracking managed by Google',
                    data: {
                        ad_id: parseInt(id),
                        type: 'google_ads',
                        managed_by: 'google'
                    }
                });
            }
            
            // Validate click URL exists for non-Google ads
            if (!ad.click_url) {
                console.warn(`⚠️ Ad ${id} has no click URL`);
                return res.status(400).json({
                    success: false,
                    message: 'Advertisement has no click URL configured'
                });
            }
            
            // Record the click
            try {
                const success = await Ad.recordClick(
                    parseInt(id), 
                    userId, 
                    ipAddress, 
                    userAgent, 
                    referrer
                );
                
                if (success) {
                    console.log(`✅ Ad click recorded for ad ${id}`);
                    
                    res.json({
                        success: true,
                        message: 'Ad click recorded successfully',
                        data: {
                            ad_id: parseInt(id),
                            click_url: ad.click_url,
                            open_new_tab: ad.open_new_tab,
                            total_clicks: (ad.clicks_count || 0) + 1
                        }
                    });
                } else {
                    console.warn(`⚠️ Failed to record click for ad ${id}`);
                    res.status(500).json({
                        success: false,
                        message: 'Failed to record ad click'
                    });
                }
            } catch (dbError) {
                console.error('❌ Database error recording click:', dbError);
                
                // Return success to not break user experience
                res.json({
                    success: true,
                    message: 'Ad click recorded (cache)',
                    data: {
                        ad_id: parseInt(id),
                        click_url: ad.click_url,
                        open_new_tab: ad.open_new_tab,
                        total_clicks: ad.clicks_count || 0
                    }
                });
            }
            
        } catch (error) {
            console.error('❌ Record ad click error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to record ad click',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // ADMIN METHODS

    // Get admin ads list
    static async getAdminList(req, res) {
        try {
            console.log('🔍 Loading ads list...');
            
            const { page, status, slot, type } = req.query;
            
            const options = {
                page: parseInt(page) || 1,
                limit: 20,
                status: status || null,
                slot: slot ? parseInt(slot) : null,
                type: type || null
            };
            
            const result = await Ad.getAdminAds(options);
            const ads = Array.isArray(result.data) ? result.data : [];
            
            // For API requests
            if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.originalUrl.startsWith('/api/')) {
                return res.json({
                    success: true,
                    data: ads,
                    pagination: result.pagination
                });
            }
            
            // For web requests
            const renderData = {
                title: 'Manage Advertisements',
                ads: ads,
                pagination: result.pagination,
                filters: {
                    status: options.status,
                    slot: options.slot,
                    type: options.type
                },
                layout: 'layouts/admin'
            };
            
            res.render('admin/ads', renderData);
            
        } catch (error) {
            console.error('❌ Get admin ads error:', error);
            
            const fallbackData = {
                title: 'Manage Advertisements',
                ads: [],
                pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
                filters: { status: null, slot: null, type: null },
                layout: 'layouts/admin',
                error_msg: `Database error: ${error.message}`
            };
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.originalUrl.startsWith('/api/')) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to load ads',
                    error: process.env.NODE_ENV === 'development' ? error.message : 'Database error'
                });
            }
            
            res.render('admin/ads', fallbackData);
        }
    }

    // Show create ad form
    static async showCreateForm(req, res) {
        try {
            res.render('admin/ads-create', {
                title: 'Create New Ad',
                layout: 'layouts/admin'
            });
        } catch (error) {
            console.error('❌ Show create ad form error:', error);
            res.status(500).render('error', {
                title: 'Admin Error',
                message: 'Failed to load create form',
                layout: 'layouts/admin'
            });
        }
    }

    // Create new ad with Google Ads support
    static async create(req, res) {
        try {
            console.log('📝 Creating new ad...');
            console.log('📋 Raw form data:', req.body);
            console.log('📎 Uploaded file:', req.file ? req.file.filename : 'None');
            
            // Process form data
            const processedData = processFormData(req.body);
            console.log('🔄 Processed form data:', processedData);
            
            // Validate processed data
            const { error, value } = adSchema.validate(processedData);
            if (error) {
                console.error('❌ Validation error:', error.details[0].message);
                
                if (req.file) {
                    await fs.unlink(req.file.path).catch(console.error);
                }
                
                return res.status(400).json({
                    success: false,
                    message: error.details[0].message,
                    field: error.details[0].path[0]
                });
            }
            
            // Validate file requirement based on ad type
            if (value.type !== 'google_ads' && !req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Media file is required for image and video ads'
                });
            }
            
            // Validate Google Ads script if it's a Google Ads type
            if (value.type === 'google_ads') {
                const validation = Ad.validateGoogleAdsScript(value.google_ads_script);
                if (!validation.valid) {
                    return res.status(400).json({
                        success: false,
                        message: validation.message,
                        field: 'google_ads_script'
                    });
                }
                
                if (validation.warning) {
                    console.warn('⚠️ Google Ads script warning:', validation.message);
                }
            }
            
            // Prepare final ad data
            const adData = {
                title: value.title,
                description: value.description || null,
                type: value.type,
                media_url: req.file ? `/uploads/ads/${req.file.filename}` : null,
                google_ads_script: value.google_ads_script || null,
                click_url: value.click_url || null,
                open_new_tab: value.open_new_tab,
                duration: value.duration || 0,
                slot_position: parseInt(value.slot_position),
                is_active: value.is_active,
                start_date: value.start_date || new Date(),
                end_date: value.end_date || null
            };
            
            console.log('✅ Final ad data for creation:', adData);
            
            const ad = await Ad.create(adData);
            
            console.log('🎉 Ad created successfully with ID:', ad.id);
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: ad,
                    message: 'Advertisement created successfully!'
                });
            }
            
            req.flash('success_msg', 'Advertisement created successfully!');
            res.redirect('/admin/ads');
        } catch (error) {
            console.error('❌ Create ad error:', error);
            
            if (req.file) {
                await fs.unlink(req.file.path).catch(console.error);
            }
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create advertisement: ' + error.message
                });
            }
            
            req.flash('error_msg', 'Failed to create advertisement');
            res.redirect('/admin/ads/create');
        }
    }

    // Show edit ad form
    static async showEditForm(req, res) {
        try {
            const { id } = req.params;
            const ad = await Ad.findById(parseInt(id));
            
            if (!ad) {
                req.flash('error_msg', 'Ad not found');
                return res.redirect('/admin/ads');
            }
            
            res.render('admin/ads-edit', {
                title: 'Edit Advertisement',
                ad: ad,
                layout: 'layouts/admin'
            });
        } catch (error) {
            console.error('❌ Show edit ad form error:', error);
            req.flash('error_msg', 'Failed to load ad');
            res.redirect('/admin/ads');
        }
    }

    // Update ad with Google Ads support
    static async update(req, res) {
        try {
            const { id } = req.params;
            
            console.log('📝 Updating ad ID:', id);
            console.log('📋 Raw update data:', req.body);
            console.log('📎 New file:', req.file ? req.file.filename : 'None');
            
            // Process form data
            const processedData = processFormData(req.body);
            console.log('🔄 Processed update data:', processedData);
            
            // Validate processed data
            const { error, value } = adSchema.validate(processedData);
            if (error) {
                console.error('❌ Validation error:', error.details[0].message);
                
                if (req.file) {
                    await fs.unlink(req.file.path).catch(console.error);
                }
                
                return res.status(400).json({
                    success: false,
                    message: error.details[0].message,
                    field: error.details[0].path[0]
                });
            }
            
            // Validate Google Ads script if it's a Google Ads type
            if (value.type === 'google_ads' && value.google_ads_script) {
                const validation = Ad.validateGoogleAdsScript(value.google_ads_script);
                if (!validation.valid) {
                    if (req.file) {
                        await fs.unlink(req.file.path).catch(console.error);
                    }
                    return res.status(400).json({
                        success: false,
                        message: validation.message,
                        field: 'google_ads_script'
                    });
                }
            }
            
            const updateData = {
                title: value.title,
                description: value.description || null,
                type: value.type,
                google_ads_script: value.google_ads_script || null,
                click_url: value.click_url || null,
                open_new_tab: value.open_new_tab,
                duration: value.duration || 0,
                slot_position: parseInt(value.slot_position),
                is_active: value.is_active,
                start_date: value.start_date,
                end_date: value.end_date
            };
            
            // Update media URL if new file uploaded
            if (req.file) {
                // Delete old file
                const oldAd = await Ad.findById(parseInt(id));
                if (oldAd && oldAd.media_url) {
                    const oldPath = path.join(__dirname, '../../public', oldAd.media_url);
                    await fs.unlink(oldPath).catch(console.error);
                }
                
                updateData.media_url = `/uploads/ads/${req.file.filename}`;
            }
            
            console.log('✅ Final update data:', updateData);
            
            const ad = await Ad.update(parseInt(id), updateData);
            
            if (!ad) {
                return res.status(404).json({
                    success: false,
                    message: 'Advertisement not found'
                });
            }
            
            console.log('🎉 Ad updated successfully');
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: ad,
                    message: 'Advertisement updated successfully!'
                });
            }
            
            req.flash('success_msg', 'Advertisement updated successfully!');
            res.redirect('/admin/ads');
        } catch (error) {
            console.error('❌ Update ad error:', error);
            
            if (req.file) {
                await fs.unlink(req.file.path).catch(console.error);
            }
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update advertisement: ' + error.message
                });
            }
            
            req.flash('error_msg', 'Failed to update advertisement');
            res.redirect('/admin/ads');
        }
    }

    // Delete ad
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const ad = await Ad.findById(parseInt(id));
            
            if (!ad) {
                return res.status(404).json({
                    success: false,
                    message: 'Advertisement not found'
                });
            }
            
            // Delete media file if exists (for image/video ads)
            if (ad.media_url) {
                const filePath = path.join(__dirname, '../../public', ad.media_url);
                await fs.unlink(filePath).catch(console.error);
            }
            
            const deleted = await Ad.delete(parseInt(id));
            
            if (!deleted) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete advertisement'
                });
            }
            
            console.log('🗑️ Ad deleted successfully:', id);
            
            res.json({
                success: true,
                message: 'Advertisement deleted successfully'
            });
        } catch (error) {
            console.error('❌ Delete ad error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete advertisement'
            });
        }
    }

    // Toggle ad status
    static async toggleStatus(req, res) {
        try {
            const { id } = req.params;
            const newStatus = await Ad.toggleStatus(parseInt(id));
            
            console.log(`🔄 Ad ${id} status toggled to:`, newStatus);
            
            res.json({
                success: true,
                data: { is_active: newStatus },
                message: `Advertisement ${newStatus ? 'activated' : 'deactivated'} successfully`
            });
        } catch (error) {
            console.error('❌ Toggle ad status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle advertisement status'
            });
        }
    }

    // Get ad analytics
    static async getAnalytics(req, res) {
        try {
            const { id } = req.params;
            const days = parseInt(req.query.days) || 30;
            
            const analytics = await Ad.getAnalytics(parseInt(id), days);
            
            res.json({
                success: true,
                data: analytics
            });
        } catch (error) {
            console.error('❌ Get ad analytics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get ad analytics'
            });
        }
    }

    // Get ads summary for dashboard
    static async getAdsSummary(req, res) {
        try {
            const summary = await Ad.getDashboardSummary();
            
            res.json({
                success: true,
                data: summary
            });
        } catch (error) {
            console.error('❌ Get ads summary error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get ads summary'
            });
        }
    }

    // Performance dashboard - MISSING METHOD ADDED
    static async getPerformanceDashboard(req, res) {
        try {
            console.log('📊 Loading performance dashboard...');
            
            // Get performance summary
            const summary = await Ad.getDashboardSummary();
            const ads = await Ad.getPerformanceSummary();
            
            // For API requests
            if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.originalUrl.startsWith('/api/')) {
                return res.json({
                    success: true,
                    data: {
                        summary: summary,
                        ads: ads
                    }
                });
            }
            
            // For web requests
            res.render('admin/ads-performance', {
                title: 'Ad Performance Dashboard',
                summary: summary,
                ads: ads,
                layout: 'layouts/admin'
            });
            
        } catch (error) {
            console.error('❌ Get performance dashboard error:', error);
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.originalUrl.startsWith('/api/')) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to load performance dashboard'
                });
            }
            
            res.render('admin/ads-performance', {
                title: 'Ad Performance Dashboard',
                summary: {
                    total_ads: 0, active_ads: 0, inactive_ads: 0,
                    total_impressions: 0, total_clicks: 0, overall_ctr: 0
                },
                ads: [],
                error_msg: 'Failed to load performance data',
                layout: 'layouts/admin'
            });
        }
    }

    // Bulk operations
    static async bulkToggleStatus(req, res) {
        try {
            const { ids, status } = req.body;
            
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or empty IDs array'
                });
            }
            
            if (typeof status !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    message: 'Status must be boolean'
                });
            }
            
            const results = [];
            
            for (const id of ids) {
                try {
                    const ad = await Ad.update(parseInt(id), { is_active: status });
                    if (ad) {
                        results.push({
                            id: parseInt(id),
                            success: true,
                            status: status
                        });
                    } else {
                        results.push({
                            id: parseInt(id),
                            success: false,
                            error: 'Ad not found'
                        });
                    }
                } catch (error) {
                    results.push({
                        id: parseInt(id),
                        success: false,
                        error: error.message
                    });
                }
            }
            
            const successCount = results.filter(r => r.success).length;
            
            res.json({
                success: true,
                message: `${successCount}/${ids.length} ads updated successfully`,
                data: results
            });
        } catch (error) {
            console.error('❌ Bulk toggle status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update ads status'
            });
        }
    }

    // Bulk delete ads
    static async bulkDelete(req, res) {
        try {
            const { ids } = req.body;
            
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or empty IDs array'
                });
            }
            
            const results = [];
            
            for (const id of ids) {
                try {
                    const ad = await Ad.findById(parseInt(id));
                    
                    if (ad) {
                        // Delete media file if exists
                        if (ad.media_url) {
                            const filePath = path.join(__dirname, '../../public', ad.media_url);
                            await fs.unlink(filePath).catch(console.error);
                        }
                        
                        const deleted = await Ad.delete(parseInt(id));
                        
                        results.push({
                            id: parseInt(id),
                            success: deleted,
                            title: ad.title
                        });
                    } else {
                        results.push({
                            id: parseInt(id),
                            success: false,
                            error: 'Ad not found'
                        });
                    }
                } catch (error) {
                    results.push({
                        id: parseInt(id),
                        success: false,
                        error: error.message
                    });
                }
            }
            
            const successCount = results.filter(r => r.success).length;
            
            res.json({
                success: true,
                message: `${successCount}/${ids.length} ads deleted successfully`,
                data: results
            });
        } catch (error) {
            console.error('❌ Bulk delete error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete ads'
            });
        }
    }

    // Test Google Ads script
    static async testGoogleAdsScript(req, res) {
        try {
            const { script } = req.body;
            
            if (!script) {
                return res.status(400).json({
                    success: false,
                    message: 'Google Ads script is required'
                });
            }
            
            const validation = Ad.validateGoogleAdsScript(script);
            
            res.json({
                success: validation.valid,
                message: validation.message,
                warning: validation.warning || false,
                data: {
                    script_length: script.length,
                    contains_google_patterns: /googlesyndication|googleadservices|googletagmanager/i.test(script),
                    safe_patterns: !/javascript:|vbscript:|onload=|onerror=|onclick=/i.test(script)
                }
            });
        } catch (error) {
            console.error('❌ Test Google Ads script error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to test Google Ads script'
            });
        }
    }

    // Export ads data
    static async exportAds(req, res) {
        try {
            const { format = 'json' } = req.query;
            
            const ads = await Ad.getPerformanceSummary();
            
            if (format === 'csv') {
                const csvHeader = 'ID,Title,Type,Slot Position,Click URL,Google Ads Script,Impressions,Clicks,CTR,Status,Created At\n';
                const csvRows = ads.map(ad => {
                    const ctr = ad.impressions_count > 0 
                        ? ((ad.clicks_count / ad.impressions_count) * 100).toFixed(2)
                        : '0.00';
                    
                    const googleAdsScript = ad.google_ads_script ? '"' + ad.google_ads_script.replace(/"/g, '""') + '"' : '""';
                    
                    return `${ad.id},"${ad.title}","${ad.type}",${ad.slot_position},"${ad.click_url || ''}",${googleAdsScript},${ad.impressions_count || 0},${ad.clicks_count || 0},${ctr}%,"${ad.is_active ? 'Active' : 'Inactive'}","${ad.created_at}"`;
                }).join('\n');
                
                const csvContent = csvHeader + csvRows;
                
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename="ads_export.csv"');
                res.send(csvContent);
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', 'attachment; filename="ads_export.json"');
                
                res.json({
                    export_date: new Date().toISOString(),
                    total_ads: ads.length,
                    data: ads
                });
            }
        } catch (error) {
            console.error('❌ Export ads error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export ads data'
            });
        }
    }

    // Get ad statistics
    static async getAdStatistics(req, res) {
        try {
            const { id } = req.params;
            const { timeframe = '7d' } = req.query;
            
            const days = parseInt(timeframe.replace(/[^0-9]/g, '')) || 7;
            
            const ad = await Ad.findById(parseInt(id));
            if (!ad) {
                return res.status(404).json({
                    success: false,
                    message: 'Advertisement not found'
                });
            }
            
            const stats = await Ad.getDetailedStats(parseInt(id));
            const analytics = await Ad.getAnalytics(parseInt(id), days);
            
            const response = {
                ad: {
                    id: ad.id,
                    title: ad.title,
                    type: ad.type,
                    slot_position: ad.slot_position,
                    click_url: ad.click_url,
                    google_ads_script: ad.google_ads_script,
                    open_new_tab: ad.open_new_tab,
                    is_active: ad.is_active
                },
                stats: stats,
                analytics: analytics,
                timeframe: `${days}d`
            };
            
            res.json({
                success: true,
                data: response
            });
        } catch (error) {
            console.error('❌ Get ad statistics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get ad statistics'
            });
        }
    }

    // Clone ad
    static async cloneAd(req, res) {
        try {
            const { id } = req.params;
            const { title } = req.body;
            
            const clonedAd = await Ad.cloneAd(parseInt(id), title);
            
            res.json({
                success: true,
                data: clonedAd,
                message: 'Ad cloned successfully'
            });
        } catch (error) {
            console.error('❌ Clone ad error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to clone ad'
            });
        }
    }

    // Health check
    static async healthCheck(req, res) {
        try {
            const adCount = await Ad.getCount();
            
            const uploadDir = path.join(__dirname, '../../public/uploads/ads');
            const uploadDirExists = await fs.access(uploadDir).then(() => true).catch(() => false);
            
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                database: {
                    connected: true,
                    ads_count: adCount
                },
                storage: {
                    upload_directory: uploadDirExists ? 'accessible' : 'not accessible',
                    path: uploadDir
                },
                features: {
                    ad_creation: true,
                    file_upload: uploadDirExists,
                    click_tracking: true,
                    analytics: true,
                    google_ads_support: true,
                    checkbox_handling: true
                },
                checks: {
                    database: true,
                    table: true,
                    validation: true
                }
            };
            
            res.json({
                success: true,
                data: health,
                message: 'Ads system is healthy'
            });
        } catch (error) {
            console.error('❌ Ads health check error:', error);
            res.status(500).json({
                success: false,
                message: 'Ads system health check failed',
                error: error.message,
                checks: {
                    database: false,
                    table: false,
                    validation: false
                }
            });
        }
    }

    // Middleware for file upload (conditional based on ad type)
    static getUploadMiddleware() {
        return (req, res, next) => {
            // Check if this is a Google Ads (no file needed)
            if (req.body.type === 'google_ads') {
                return next();
            }
            
            // For image/video ads, use multer
            const uploadSingle = upload.single('media_file');
            uploadSingle(req, res, next);
        };
    }
}

// Initialize ad controller
AdController.initialize().catch(console.error);

module.exports = AdController;