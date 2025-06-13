// src/controllers/adController.js
const Ad = require('../models/Ad');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Joi = require('joi');

// Validation schema
const adSchema = Joi.object({
    title: Joi.string().min(3).max(255).required(),
    description: Joi.string().max(1000).allow(''),
    type: Joi.string().valid('video', 'image').required(),
    click_url: Joi.string().uri().allow(''),
    duration: Joi.number().integer().min(0).max(60).default(0),
    slot_position: Joi.number().integer().min(1).max(5).required(),
    is_active: Joi.boolean().default(true),
    start_date: Joi.date().allow(''),
    end_date: Joi.date().allow('')
});

// Configure multer for ad media uploads
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
            cb(new Error('Only image and video files are allowed'));
        }
    }
});

class AdController {
    // Initialize ad system
    static async initialize() {
        try {
            await Ad.initializeTable();
            console.log('Ad controller initialized successfully');
        } catch (error) {
            console.error('Get ad analytics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get ad analytics'
            });
        }
    }

    // Get ads performance dashboard
    static async getPerformanceDashboard(req, res) {
        try {
            const performanceData = await Ad.getPerformanceSummary();
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: performanceData
                });
            }
            
            res.render('admin/ads-performance', {
                title: 'Ads Performance',
                ads: performanceData,
                layout: 'layouts/admin'
            });
        } catch (error) {
            console.error('Get ads performance error:', error);
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to get performance data'
                });
            }
            
            res.status(500).render('error', {
                title: 'Performance Error',
                message: 'Failed to load performance data',
                layout: 'layouts/admin'
            });
        }
    }

    // Middleware for file upload
    static getUploadMiddleware() {
        return upload.single('media_file');
    }
}

// Initialize ad controller
AdController.initialize().catch(console.error);

module.exports = AdController;error('Failed to initialize ad controller:', error);
        }
    }

    // Get ads for video feed integration
    static async getAdsForFeed(req, res) {
        try {
            const { videoIndex } = req.query;
            const index = parseInt(videoIndex) || 0;
            
            // Calculate which ad slot to show (every 2 videos, cycle through 5 slots)
            const shouldShowAd = (index + 1) % 3 === 0; // Show ad after every 2 videos
            
            if (!shouldShowAd) {
                return res.json({
                    success: true,
                    showAd: false,
                    data: null
                });
            }
            
            // Calculate which slot (1-5) to show
            const adCycle = Math.floor((index + 1) / 3); // Which ad cycle we're in
            const slotPosition = (adCycle % 5) + 1; // Cycle through slots 1-5
            
            console.log(`Video index: ${index}, Ad cycle: ${adCycle}, Slot: ${slotPosition}`);
            
            const ad = await Ad.getAdBySlot(slotPosition);
            
            if (!ad) {
                return res.json({
                    success: true,
                    showAd: false,
                    data: null
                });
            }
            
            // Record impression
            const userId = req.session?.user?.id || null;
            const ipAddress = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');
            
            await Ad.recordImpression(ad.id, userId, ipAddress, userAgent);
            
            res.json({
                success: true,
                showAd: true,
                data: {
                    id: ad.id,
                    title: ad.title,
                    description: ad.description,
                    type: ad.type,
                    media_url: ad.media_url,
                    click_url: ad.click_url,
                    duration: ad.duration,
                    slot_position: ad.slot_position
                }
            });
        } catch (error) {
            console.error('Get ads for feed error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get ads for feed'
            });
        }
    }

    // Record ad click
    static async recordClick(req, res) {
        try {
            const { id } = req.params;
            const userId = req.session?.user?.id || null;
            const ipAddress = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');
            const referrer = req.get('Referrer');
            
            console.log(`Recording ad click for ad ${id}`);
            
            const success = await Ad.recordClick(parseInt(id), userId, ipAddress, userAgent, referrer);
            
            if (success) {
                res.json({
                    success: true,
                    message: 'Ad click recorded successfully'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Failed to record ad click'
                });
            }
        } catch (error) {
            console.error('Record ad click error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to record ad click'
            });
        }
    }

    // ADMIN METHODS

    // Get admin ads list
    static async getAdminList(req, res) {
        try {
            const { page, status, slot, type } = req.query;
            
            const options = {
                page: parseInt(page) || 1,
                limit: 20,
                status: status || null,
                slot: slot ? parseInt(slot) : null,
                type: type || null
            };
            
            const result = await Ad.getAdminAds(options);
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1 || req.originalUrl.startsWith('/api/')) {
                return res.json({
                    success: true,
                    data: result.data,
                    pagination: result.pagination
                });
            }
            
            res.render('admin/ads', {
                title: 'Manage Ads',
                ads: result.data,
                pagination: result.pagination,
                filters: {
                    status: options.status,
                    slot: options.slot,
                    type: options.type
                },
                layout: 'layouts/admin'
            });
        } catch (error) {
            console.error('Get admin ads error:', error);
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1 || req.originalUrl.startsWith('/api/')) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to load ads'
                });
            }
            
            res.status(500).render('error', {
                title: 'Admin Error',
                message: 'Failed to load ads',
                layout: 'layouts/admin'
            });
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
            console.error('Show create ad form error:', error);
            res.status(500).render('error', {
                title: 'Admin Error',
                message: 'Failed to load create form',
                layout: 'layouts/admin'
            });
        }
    }

    // Create new ad
    static async create(req, res) {
        try {
            console.log('Creating new ad...');
            
            // Validate form data
            const { error, value } = adSchema.validate(req.body);
            if (error) {
                if (req.file) {
                    // Delete uploaded file if validation fails
                    await fs.unlink(req.file.path).catch(console.error);
                }
                
                return res.status(400).json({
                    success: false,
                    message: error.details[0].message
                });
            }
            
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Media file is required'
                });
            }
            
            // Create ad data
            const adData = {
                ...value,
                media_url: `/uploads/ads/${req.file.filename}`,
                start_date: value.start_date || new Date(),
                end_date: value.end_date || null
            };
            
            console.log('Creating ad with data:', adData);
            
            const ad = await Ad.create(adData);
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: ad,
                    message: 'Ad created successfully'
                });
            }
            
            req.flash('success_msg', 'Ad created successfully');
            res.redirect('/admin/ads');
        } catch (error) {
            console.error('Create ad error:', error);
            
            // Delete uploaded file on error
            if (req.file) {
                await fs.unlink(req.file.path).catch(console.error);
            }
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create ad: ' + error.message
                });
            }
            
            req.flash('error_msg', 'Failed to create ad');
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
                title: 'Edit Ad',
                ad: ad,
                layout: 'layouts/admin'
            });
        } catch (error) {
            console.error('Show edit ad form error:', error);
            req.flash('error_msg', 'Failed to load ad');
            res.redirect('/admin/ads');
        }
    }

    // Update ad
    static async update(req, res) {
        try {
            const { id } = req.params;
            
            // Validate request
            const { error, value } = adSchema.validate(req.body);
            if (error) {
                if (req.file) {
                    await fs.unlink(req.file.path).catch(console.error);
                }
                
                return res.status(400).json({
                    success: false,
                    message: error.details[0].message
                });
            }
            
            const updateData = { ...value };
            
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
            
            const ad = await Ad.update(parseInt(id), updateData);
            
            if (!ad) {
                return res.status(404).json({
                    success: false,
                    message: 'Ad not found'
                });
            }
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: ad,
                    message: 'Ad updated successfully'
                });
            }
            
            req.flash('success_msg', 'Ad updated successfully');
            res.redirect('/admin/ads');
        } catch (error) {
            console.error('Update ad error:', error);
            
            if (req.file) {
                await fs.unlink(req.file.path).catch(console.error);
            }
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update ad'
                });
            }
            
            req.flash('error_msg', 'Failed to update ad');
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
                    message: 'Ad not found'
                });
            }
            
            // Delete media file
            if (ad.media_url) {
                const filePath = path.join(__dirname, '../../public', ad.media_url);
                await fs.unlink(filePath).catch(console.error);
            }
            
            const deleted = await Ad.delete(parseInt(id));
            
            if (!deleted) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete ad'
                });
            }
            
            res.json({
                success: true,
                message: 'Ad deleted successfully'
            });
        } catch (error) {
            console.error('Delete ad error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete ad'
            });
        }
    }

    // Toggle ad status
    static async toggleStatus(req, res) {
        try {
            const { id } = req.params;
            const newStatus = await Ad.toggleStatus(parseInt(id));
            
            res.json({
                success: true,
                data: { is_active: newStatus },
                message: `Ad ${newStatus ? 'activated' : 'deactivated'} successfully`
            });
        } catch (error) {
            console.error('Toggle ad status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle ad status'
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
            console.