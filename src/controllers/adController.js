// src/controllers/adController.js - COMPLETELY FIXED VERSION
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Joi = require('joi');

console.log('🔧 Loading AdController...');

// PERBAIKAN 1: Import Ad model with error handling
let Ad;
try {
    Ad = require('../models/Ad');
    console.log('✅ Ad model imported successfully');
} catch (error) {
    console.error('❌ Failed to import Ad model:', error);
    Ad = null;
}

// PERBAIKAN 2: Setup paths dan directories
const uploadDir = path.join(__dirname, '../../public/uploads/ads');

// Helper function untuk ensure directory
function ensureUploadDir() {
    try {
        const fsSync = require('fs');
        if (!fsSync.existsSync(uploadDir)) {
            fsSync.mkdirSync(uploadDir, { recursive: true });
            console.log('✅ Upload directory created:', uploadDir);
        }
        return true;
    } catch (error) {
        console.error('❌ Failed to create upload directory:', error);
        return false;
    }
}

// PERBAIKAN 3: Definisikan fileFilter sebagai FUNCTION DECLARATION (hoisted)
function fileFilter(req, file, cb) {
    console.log('📎 File filter check:', {
        originalName: file.originalname,
        mimetype: file.mimetype
    });
    
    const allowedMimes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
        'video/mp4', 'video/avi', 'video/mov', 'video/webm'
    ];
    
    const allowedExts = /\.(jpe?g|png|gif|mp4|avi|mov|webm)$/i;
    
    const extname = allowedExts.test(path.extname(file.originalname));
    const mimetype = allowedMimes.includes(file.mimetype);
    
    if (mimetype && extname) {
        console.log('✅ File validation passed');
        return cb(null, true);
    } else {
        console.log('❌ File validation failed');
        cb(new Error(`Invalid file type. Allowed: ${allowedMimes.join(', ')}`));
    }
}

// PERBAIKAN 4: Initialize directory sebelum multer config
ensureUploadDir();

// PERBAIKAN 5: Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!ensureUploadDir()) {
            return cb(new Error('Upload directory not accessible'));
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = 'ad-' + uniqueSuffix + ext;
        
        console.log('📁 Generating filename:', filename);
        cb(null, filename);
    }
});

// PERBAIKAN 6: Multer configuration dengan fileFilter yang sudah didefinisikan
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
        files: 1
    },
    fileFilter: fileFilter // Sekarang fileFilter sudah terdefinisi
});

// PERBAIKAN 7: Validation schema
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

// Helper functions
function processFormData(formData) {
    const processed = { ...formData };
    
    processed.open_new_tab = convertToBoolean(formData.open_new_tab);
    processed.is_active = convertToBoolean(formData.is_active);
    
    if (processed.duration) {
        processed.duration = parseInt(processed.duration) || 0;
    } else {
        processed.duration = 0;
    }
    
    if (processed.slot_position) {
        processed.slot_position = parseInt(processed.slot_position);
    }
    
    if (processed.start_date === '') {
        processed.start_date = null;
    }
    if (processed.end_date === '') {
        processed.end_date = null;
    }
    
    if (processed.description === '') {
        processed.description = null;
    }
    
    if (processed.type === 'google_ads') {
        if (processed.google_ads_script) {
            processed.google_ads_script = processed.google_ads_script.trim();
        }
        if (!processed.click_url) {
            processed.click_url = null;
        }
    } else {
        processed.google_ads_script = null;
    }
    
    return processed;
}

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

// PERBAIKAN 8: AdController class dengan implementasi lengkap
class AdController {
    static async initialize() {
        try {
            console.log('🔧 Initializing AdController...');
            
            const dirCreated = ensureUploadDir();
            if (!dirCreated) {
                console.warn('⚠️ Upload directory creation failed');
            }
            
            if (Ad && typeof Ad.initializeTable === 'function') {
                await Ad.initializeTable();
            }
            
            console.log('✅ AdController initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize AdController:', error);
        }
    }

    static getUploadMiddleware() {
        return (req, res, next) => {
            console.log('🔧 Upload middleware called');
            console.log('📋 Request body type:', req.body?.type);
            
            if (req.body && req.body.type === 'google_ads') {
                console.log('✅ Google Ads type - skipping file upload');
                return next();
            }
            
            const uploadSingle = upload.single('media_file');
            
            uploadSingle(req, res, (err) => {
                if (err) {
                    console.error('❌ Upload middleware error:', err);
                    
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        return res.status(400).json({
                            success: false,
                            message: 'File too large. Maximum size is 50MB.',
                            field: 'media_file'
                        });
                    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                        return res.status(400).json({
                            success: false,
                            message: 'Unexpected file field. Use "media_file" as field name.',
                            field: 'media_file'
                        });
                    } else if (err.message.includes('Invalid file type')) {
                        return res.status(400).json({
                            success: false,
                            message: err.message,
                            field: 'media_file'
                        });
                    } else {
                        return res.status(500).json({
                            success: false,
                            message: 'File upload error: ' + err.message,
                            field: 'media_file'
                        });
                    }
                }
                
                console.log('✅ Upload middleware completed');
                console.log('📎 Uploaded file:', req.file ? req.file.filename : 'None');
                next();
            });
        };
    }

    // PERBAIKAN UTAMA: Implementasi getAdsForFeed yang hilang
    static async getAdsForFeed(req, res) {
        try {
            console.log('📺 Getting ads for feed...');
            console.log('📋 Query params:', req.query);
            
            if (!Ad) {
                return res.status(503).json({
                    success: false,
                    showAd: false,
                    data: null,
                    message: 'Ad system not available'
                });
            }
            
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
    }

    // PERBAIKAN UTAMA: Implementasi recordClick yang hilang
    static async recordClick(req, res) {
        try {
            const { id } = req.params;
            const adId = parseInt(id);
            
            console.log(`🖱️ Recording click for ad ${adId}`);
            console.log('📋 Request body:', req.body);
            
            if (!Ad) {
                return res.status(503).json({
                    success: false,
                    message: 'Ad system not available'
                });
            }
            
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
    }

    static async showCreateForm(req, res) {
        try {
            console.log('📝 Loading create ad form...');
            
            const uploadDirExists = await fs.access(uploadDir).then(() => true).catch(() => false);
            
            if (!uploadDirExists) {
                console.warn('⚠️ Upload directory not accessible');
                ensureUploadDir();
            }
            
            const presetSlot = req.query.slot ? parseInt(req.query.slot) : null;
            
            res.render('admin/ads-create', {
                title: 'Create New Advertisement',
                presetSlot: presetSlot,
                uploadDirExists: uploadDirExists || ensureUploadDir(),
                layout: 'layouts/admin'
            });
        } catch (error) {
            console.error('❌ Show create form error:', error);
            res.status(500).render('error', {
                title: 'Error',
                message: 'Failed to load create form: ' + error.message,
                layout: 'layouts/admin'
            });
        }
    }

    static async getAdminList(req, res) {
        try {
            console.log('🔍 Loading ads list...');
            
            if (!Ad) {
                throw new Error('Ad model not available');
            }
            
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
            
            let allActiveAds = [];
            try {
                const activeAdsResult = await Ad.getAll({
                    page: 1,
                    limit: 1000,
                    status: null
                });
                allActiveAds = Array.isArray(activeAdsResult.data) ? activeAdsResult.data : [];
            } catch (activeAdsError) {
                console.error('❌ Error fetching all ads for slots:', activeAdsError);
                allActiveAds = ads;
            }
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.originalUrl.startsWith('/api/')) {
                return res.json({
                    success: true,
                    data: ads,
                    pagination: result.pagination,
                    allActiveAds: allActiveAds
                });
            }
            
            const renderData = {
                title: 'Manage Advertisements',
                ads: ads,
                allActiveAds: allActiveAds,
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
                allActiveAds: [],
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

    static async create(req, res) {
        try {
            console.log('📝 Creating new ad...');
            console.log('📋 Raw form data:', req.body);
            console.log('📎 Uploaded file:', req.file ? req.file.filename : 'None');
            
            if (!Ad) {
                throw new Error('Ad model not available');
            }
            
            const processedData = processFormData(req.body);
            console.log('🔄 Processed form data:', processedData);
            
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
            
            if (value.type !== 'google_ads' && !req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Media file is required for image and video ads'
                });
            }
            
            if (value.type === 'google_ads') {
                const validation = Ad.validateGoogleAdsScript(value.google_ads_script);
                if (!validation.valid) {
                    return res.status(400).json({
                        success: false,
                        message: validation.message,
                        field: 'google_ads_script'
                    });
                }
            }
            
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
            
            if (req.flash) {
                req.flash('success_msg', 'Advertisement created successfully!');
            }
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
            
            if (req.flash) {
                req.flash('error_msg', 'Failed to create advertisement');
            }
            res.redirect('/admin/ads/create');
        }
    }

    // Additional methods untuk compatibility
    static async showEditForm(req, res) {
        try {
            const { id } = req.params;
            
            if (!Ad) {
                throw new Error('Ad model not available');
            }
            
            const ad = await Ad.findById(parseInt(id));
            
            if (!ad) {
                if (req.flash) {
                    req.flash('error_msg', 'Ad not found');
                }
                return res.redirect('/admin/ads');
            }
            
            res.render('admin/ads-edit', {
                title: 'Edit Advertisement',
                ad: ad,
                layout: 'layouts/admin'
            });
        } catch (error) {
            console.error('❌ Show edit ad form error:', error);
            if (req.flash) {
                req.flash('error_msg', 'Failed to load ad');
            }
            res.redirect('/admin/ads');
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            
            if (!Ad) {
                throw new Error('Ad model not available');
            }
            
            console.log('📝 Updating ad ID:', id);
            
            const processedData = processFormData(req.body);
            const { error, value } = adSchema.validate(processedData);
            
            if (error) {
                if (req.file) {
                    await fs.unlink(req.file.path).catch(console.error);
                }
                
                return res.status(400).json({
                    success: false,
                    message: error.details[0].message,
                    field: error.details[0].path[0]
                });
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
            
            if (req.file) {
                const oldAd = await Ad.findById(parseInt(id));
                if (oldAd && oldAd.media_url) {
                    const oldPath = path.join(__dirname, '../../public', oldAd.media_url);
                    await fs.unlink(oldPath).catch(console.error);
                }
                updateData.media_url = `/uploads/ads/${req.file.filename}`;
            }
            
            const ad = await Ad.update(parseInt(id), updateData);
            
            if (!ad) {
                return res.status(404).json({
                    success: false,
                    message: 'Advertisement not found'
                });
            }
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: ad,
                    message: 'Advertisement updated successfully!'
                });
            }
            
            if (req.flash) {
                req.flash('success_msg', 'Advertisement updated successfully!');
            }
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
            
            if (req.flash) {
                req.flash('error_msg', 'Failed to update advertisement');
            }
            res.redirect('/admin/ads');
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            
            if (!Ad) {
                throw new Error('Ad model not available');
            }
            
            const ad = await Ad.findById(parseInt(id));
            
            if (!ad) {
                return res.status(404).json({
                    success: false,
                    message: 'Advertisement not found'
                });
            }
            
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

    static async toggleStatus(req, res) {
        try {
            const { id } = req.params;
            
            if (!Ad) {
                throw new Error('Ad model not available');
            }
            
            const newStatus = await Ad.toggleStatus(parseInt(id));
            
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

    static async getPerformanceDashboard(req, res) {
        try {
            if (!Ad) {
                throw new Error('Ad model not available');
            }
            
            const summary = await Ad.getDashboardSummary();
            const ads = await Ad.getPerformanceSummary();
            
            if (req.xhr || req.headers.accept?.indexOf('json') > -1 || req.originalUrl.startsWith('/api/')) {
                return res.json({
                    success: true,
                    data: {
                        summary: summary,
                        ads: ads
                    }
                });
            }
            
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

    // Implementation methods yang sebelumnya stub
    static async getAdsSummary(req, res) {
        try {
            if (!Ad) {
                throw new Error('Ad model not available');
            }
            
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
                message: 'Failed to get ads summary'
            });
        }
    }

    static async getAnalytics(req, res) {
        try {
            const { id } = req.params;
            const { days = 30 } = req.query;
            
            if (!Ad) {
                throw new Error('Ad model not available');
            }
            
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
                message: 'Failed to get analytics'
            });
        }
    }

    static async bulkToggleStatus(req, res) {
        try {
            const { adIds } = req.body;
            
            if (!Ad) {
                throw new Error('Ad model not available');
            }
            
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
                message: 'Failed to perform bulk toggle'
            });
        }
    }

    static async bulkDelete(req, res) {
        try {
            const { adIds } = req.body;
            
            if (!Ad) {
                throw new Error('Ad model not available');
            }
            
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
                message: 'Failed to perform bulk delete'
            });
        }
    }

    static async exportAds(req, res) {
        try {
            if (!Ad) {
                throw new Error('Ad model not available');
            }
            
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
                message: 'Failed to export ads'
            });
        }
    }

    static async cloneAd(req, res) {
        try {
            const { id } = req.params;
            const { title } = req.body;
            
            if (!Ad) {
                throw new Error('Ad model not available');
            }
            
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
                message: 'Failed to clone advertisement'
            });
        }
    }

    static async testGoogleAdsScript(req, res) {
        try {
            const { script } = req.body;
            
            if (!Ad) {
                throw new Error('Ad model not available');
            }
            
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
                message: 'Failed to test Google Ads script'
            });
        }
    }

    static async getAdStatistics(req, res) {
        try {
            const { id } = req.params;
            
            if (!Ad) {
                throw new Error('Ad model not available');
            }
            
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
                message: 'Failed to get ad statistics'
            });
        }
    }

    static async healthCheck(req, res) {
        try {
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                controller_loaded: true,
                ad_model_available: !!Ad,
                upload_directory: ensureUploadDir() ? 'accessible' : 'not accessible'
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
                message: 'AdController health check passed'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Health check failed',
                error: error.message
            });
        }
    }
}

console.log('✅ AdController class defined');

// Initialize
AdController.initialize().catch(error => {
    console.error('❌ AdController initialization failed:', error);
});

module.exports = AdController;
console.log('✅ AdController exported');