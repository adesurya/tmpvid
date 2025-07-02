// src/routes/api/admin/index.js - UPDATED with storage routes
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Import controllers
const VideoController = require('../../../controllers/videoController');
const CategoryController = require('../../../controllers/categoryController');

// Import storage routes
const storageRoutes = require('./storage');

// Middleware for admin authentication
const adminAuth = (req, res, next) => {
    const isAuthenticated = req.session && req.session.user && req.session.user.role === 'admin';
    
    if (!isAuthenticated) {
        return res.status(401).json({
            success: false,
            message: 'Admin authentication required'
        });
    }
    
    req.user = req.session.user;
    next();
};

// Apply admin auth to all routes
router.use(adminAuth);

// Enhanced multer configuration for video uploads
const storage = multer.memoryStorage(); // Use memory storage for S3 compatibility

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB limit
        files: 1
    },
    fileFilter: (req, file, cb) => {
        console.log('Multer fileFilter - File:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size
        });
        
        // Enhanced file validation
        const allowedMimeTypes = [
            'video/mp4',
            'video/avi', 
            'video/mov',
            'video/quicktime',
            'video/x-msvideo',
            'video/x-ms-wmv',
            'video/x-flv'
        ];
        
        const allowedExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv'];
        const fileExtension = path.extname(file.originalname).toLowerCase();
        
        if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only video files are allowed.'), false);
        }
    }
});

// Debug middleware
router.use((req, res, next) => {
    console.log(`[ADMIN-API] ${req.method} ${req.path} - User: ${req.user?.username}`);
    next();
});

// === VIDEO ROUTES ===
// Get all videos for admin
router.get('/videos', VideoController.getAdminList);

// Upload new video with enhanced S3 support
router.post('/videos/upload', (req, res, next) => {
    console.log('📤 Admin video upload initiated');
    
    upload.single('video')(req, res, (err) => {
        if (err) {
            console.error('Multer upload error:', err);
            
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File size exceeds 500MB limit',
                    code: 'FILE_TOO_LARGE'
                });
            }
            
            if (err.message.includes('Invalid file type')) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid file type. Please upload MP4, AVI, MOV, WMV, or FLV files only.',
                    code: 'INVALID_FILE_TYPE'
                });
            }
            
            return res.status(400).json({
                success: false,
                message: 'Upload error: ' + err.message,
                code: 'UPLOAD_ERROR'
            });
        }
        
        console.log('✅ Multer processing completed, forwarding to VideoController');
        next();
    });
}, VideoController.upload);

// Update video
router.put('/videos/:id', VideoController.update);

// Delete video
router.delete('/videos/:id', VideoController.delete);

// Get video analytics
router.get('/videos/:id/analytics', VideoController.getAnalytics);

// Get video statistics
router.get('/videos/:id/stats', VideoController.getVideoStats);

// === CATEGORY ROUTES ===
// Get all categories
router.get('/categories', CategoryController.getAll);

// Create new category
router.post('/categories', CategoryController.create);

// Update category
router.put('/categories/:id', CategoryController.update);

// Delete category
router.delete('/categories/:id', CategoryController.delete);

// === STORAGE ROUTES ===
// Register storage management routes
router.use('/storage', storageRoutes);

// === DASHBOARD & ANALYTICS ===
// Get dashboard overview
router.get('/dashboard/overview', async (req, res) => {
    try {
        console.log('Getting admin dashboard overview...');
        
        // Get basic statistics
        const Video = require('../../../models/Video');
        const Category = require('../../../models/Category');
        const storageService = require('../../../services/storageService');
        
        const [
            totalVideos,
            totalCategories,
            storageStats,
            recentVideos,
            analyticsOverview
        ] = await Promise.all([
            Video.getCount().catch(() => 0),
            Category.getCount().catch(() => 0),
            storageService.getStorageStats().catch(() => null),
            Video.getAdminVideos({ page: 1, limit: 5 }).catch(() => ({ data: [] })),
            Video.getAnalyticsOverview(30).catch(() => ({ viewsOverTime: [], topVideos: [] }))
        ]);
        
        const overview = {
            statistics: {
                total_videos: totalVideos,
                total_categories: totalCategories,
                total_views: analyticsOverview.viewsOverTime.reduce((sum, day) => sum + (day.total_views || 0), 0),
                total_storage_used: storageStats ? storageStats.total.size : 0
            },
            storage: storageStats ? {
                type: storageStats.storage_type,
                s3_enabled: storageStats.s3_enabled,
                videos: storageStats.videos,
                images: storageStats.images,
                thumbnails: storageStats.thumbnails,
                total: storageStats.total
            } : null,
            recent_videos: recentVideos.data,
            analytics: {
                views_over_time: analyticsOverview.viewsOverTime,
                top_videos: analyticsOverview.topVideos,
                shares_by_platform: analyticsOverview.sharesByPlatform
            }
        };
        
        res.json({
            success: true,
            data: overview,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Dashboard overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get dashboard overview',
            error: error.message
        });
    }
});

// Get system health status
router.get('/system/health', async (req, res) => {
    try {
        const { isS3Configured } = require('../../../config/aws');
        const storageService = require('../../../services/storageService');
        
        const health = {
            timestamp: new Date().toISOString(),
            status: 'healthy',
            services: {
                database: true,
                storage: true,
                s3: isS3Configured(),
                video_processing: true
            },
            storage_info: storageService.getStorageInfo(),
            version: process.env.APP_VERSION || '1.0.0',
            uptime: process.uptime(),
            memory_usage: process.memoryUsage(),
            node_version: process.version
        };
        
        // Test database connection
        try {
            const { queryOne } = require('../../../config/database');
            await queryOne('SELECT 1 + 1 AS result');
        } catch (dbError) {
            health.services.database = false;
            health.status = 'degraded';
            health.database_error = dbError.message;
        }
        
        // Test S3 if configured
        if (isS3Configured()) {
            try {
                const { getBucketInfo } = require('../../../config/aws');
                const bucketInfo = await getBucketInfo();
                health.s3_info = bucketInfo;
                if (!bucketInfo.success) {
                    health.services.s3 = false;
                    health.status = 'degraded';
                }
            } catch (s3Error) {
                health.services.s3 = false;
                health.status = 'degraded';
                health.s3_error = s3Error.message;
            }
        }
        
        res.json({
            success: true,
            data: health
        });
        
    } catch (error) {
        console.error('System health check error:', error);
        res.status(500).json({
            success: false,
            message: 'Health check failed',
            error: error.message,
            data: {
                timestamp: new Date().toISOString(),
                status: 'unhealthy'
            }
        });
    }
});

// === CONFIGURATION ===
// Get current configuration
router.get('/config', (req, res) => {
    const config = {
        storage: {
            s3_enabled: require('../../../config/aws').isS3Configured(),
            default_storage: process.env.DEFAULT_STORAGE_TYPE || 'auto',
            max_file_size: '500MB',
            supported_formats: ['mp4', 'avi', 'mov', 'wmv', 'flv']
        },
        video_processing: {
            thumbnail_generation: process.env.ENABLE_AUTOMATIC_THUMBNAILS !== 'false',
            video_optimization: process.env.ENABLE_VIDEO_OPTIMIZATION === 'true',
            ffmpeg_available: true // You might want to check this dynamically
        },
        features: {
            s3_migration: process.env.ENABLE_S3_MIGRATION === 'true',
            analytics: true,
            multi_quality: true
        },
        limits: {
            max_duration: parseInt(process.env.MAX_VIDEO_DURATION) || 600,
            max_file_size: 500 * 1024 * 1024,
            max_width: parseInt(process.env.MAX_VIDEO_WIDTH) || 4096,
            max_height: parseInt(process.env.MAX_VIDEO_HEIGHT) || 2160
        }
    };
    
    res.json({
        success: true,
        data: config
    });
});

// Update configuration
router.put('/config', (req, res) => {
    // This would typically update environment variables or a config file
    // For now, we'll just return the current config
    res.json({
        success: true,
        message: 'Configuration update not implemented yet',
        data: req.body
    });
});

// === BULK OPERATIONS ===
// Bulk delete videos
router.delete('/videos/bulk', async (req, res) => {
    try {
        const { video_ids } = req.body;
        
        if (!Array.isArray(video_ids) || video_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'video_ids array is required'
            });
        }
        
        const Video = require('../../../models/Video');
        const storageService = require('../../../services/storageService');
        
        let deletedCount = 0;
        let failedCount = 0;
        const results = [];
        
        for (const videoId of video_ids) {
            try {
                const video = await Video.findById(parseInt(videoId));
                
                if (video) {
                    // Delete files from storage
                    if (video.video_url) {
                        await storageService.deleteVideo(video.video_url, video.storage_type);
                    }
                    if (video.thumbnail) {
                        await storageService.deleteFile(video.thumbnail, video.storage_type);
                    }
                    
                    // Delete from database
                    const deleted = await Video.delete(parseInt(videoId));
                    
                    if (deleted) {
                        deletedCount++;
                        results.push({ id: videoId, status: 'deleted' });
                    } else {
                        failedCount++;
                        results.push({ id: videoId, status: 'failed', error: 'Database deletion failed' });
                    }
                } else {
                    failedCount++;
                    results.push({ id: videoId, status: 'failed', error: 'Video not found' });
                }
            } catch (error) {
                failedCount++;
                results.push({ id: videoId, status: 'failed', error: error.message });
            }
        }
        
        res.json({
            success: true,
            message: `Bulk deletion completed: ${deletedCount} deleted, ${failedCount} failed`,
            data: {
                deleted_count: deletedCount,
                failed_count: failedCount,
                total_requested: video_ids.length,
                results: results
            }
        });
        
    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Bulk deletion failed',
            error: error.message
        });
    }
});

// Bulk update video status
router.patch('/videos/bulk/status', async (req, res) => {
    try {
        const { video_ids, status } = req.body;
        
        if (!Array.isArray(video_ids) || video_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'video_ids array is required'
            });
        }
        
        if (!['draft', 'published', 'private'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be: draft, published, or private'
            });
        }
        
        const Video = require('../../../models/Video');
        
        let updatedCount = 0;
        let failedCount = 0;
        const results = [];
        
        for (const videoId of video_ids) {
            try {
                const updated = await Video.update(parseInt(videoId), { status });
                
                if (updated) {
                    updatedCount++;
                    results.push({ id: videoId, status: 'updated' });
                } else {
                    failedCount++;
                    results.push({ id: videoId, status: 'failed', error: 'Video not found or update failed' });
                }
            } catch (error) {
                failedCount++;
                results.push({ id: videoId, status: 'failed', error: error.message });
            }
        }
        
        res.json({
            success: true,
            message: `Bulk status update completed: ${updatedCount} updated, ${failedCount} failed`,
            data: {
                updated_count: updatedCount,
                failed_count: failedCount,
                total_requested: video_ids.length,
                new_status: status,
                results: results
            }
        });
        
    } catch (error) {
        console.error('Bulk status update error:', error);
        res.status(500).json({
            success: false,
            message: 'Bulk status update failed',
            error: error.message
        });
    }
});

// === ERROR HANDLING ===
// Handle multer errors specifically
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        console.error('Multer error:', error);
        
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size exceeds 500MB limit',
                code: 'FILE_TOO_LARGE'
            });
        }
        
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Unexpected file field',
                code: 'UNEXPECTED_FILE'
            });
        }
        
        return res.status(400).json({
            success: false,
            message: 'File upload error: ' + error.message,
            code: error.code
        });
    }
    
    next(error);
});

// General error handler
router.use((error, req, res, next) => {
    console.error('Admin API error:', error);
    
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

module.exports = router;