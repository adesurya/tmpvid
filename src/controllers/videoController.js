// src/controllers/videoController.js
const Video = require('../models/Video');
const Category = require('../models/Category');
const storageService = require('../services/storageService');
const videoService = require('../services/videoService');
const Joi = require('joi');

// Validation schemas
const videoSchema = Joi.object({
    title: Joi.string().min(3).max(255).required(),
    description: Joi.string().max(2000).allow(''),
    category_id: Joi.number().integer().positive().allow(null),
    series_id: Joi.number().integer().positive().allow(null),
    status: Joi.string().valid('draft', 'published', 'private').default('draft'),
    video_quality: Joi.string().valid('360p', '720p', '1080p', '4K').default('720p')
});

class VideoController {
    // Get video feed (for main page)
    static async getFeed(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            const videos = await Video.getRandomVideos(limit);
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: videos,
                    hasMore: videos.length === limit
                });
            }
            
            res.render('index', {
                title: 'Video Platform',
                videos: videos,
                page: page
            });
        } catch (error) {
            console.error('Get feed error:', error);
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to load videos'
                });
            }
            
            res.render('index', {
                title: 'Video Platform',
                videos: [],
                error: 'Failed to load videos'
            });
        }
    }

    // Get single video
    static async getVideo(req, res) {
        try {
            const { slug } = req.params;
            const video = await Video.findBySlug(slug);
            
            if (!video) {
                return res.status(404).render('404', {
                    title: 'Video Not Found',
                    message: 'The video you are looking for does not exist.'
                });
            }
            
            // Increment view count
            const userId = req.session.user ? req.session.user.id : null;
            const ipAddress = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');
            
            await Video.incrementViews(video.id, userId, ipAddress, userAgent);
            
            // Get related videos
            const relatedVideos = await Video.getRandomVideos(5, video.id);
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: {
                        video: video,
                        related: relatedVideos
                    }
                });
            }
            
            res.render('video', {
                title: video.title,
                video: video,
                relatedVideos: relatedVideos
            });
        } catch (error) {
            console.error('Get video error:', error);
            res.status(500).render('error', {
                title: 'Server Error',
                message: 'Failed to load video'
            });
        }
    }

    // Search videos
    static async search(req, res) {
        try {
            const { q, category, sort, page } = req.query;
            
            if (!q || q.trim().length === 0) {
                return res.redirect('/');
            }
            
            const searchOptions = {
                page: parseInt(page) || 1,
                limit: 20,
                category: category ? parseInt(category) : null,
                sortBy: sort || 'relevance'
            };
            
            const result = await Video.search(q.trim(), searchOptions);
            const categories = await Category.getAll();
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: result.data,
                    pagination: result.pagination
                });
            }
            
            res.render('search', {
                title: `Search Results for "${q}"`,
                videos: result.data,
                pagination: result.pagination,
                categories: categories,
                searchQuery: q,
                selectedCategory: searchOptions.category,
                selectedSort: searchOptions.sortBy
            });
        } catch (error) {
            console.error('Search error:', error);
            res.status(500).render('error', {
                title: 'Search Error',
                message: 'Failed to search videos'
            });
        }
    }

    // Get trending videos
    static async getTrending(req, res) {
        try {
            const timeFrame = req.query.timeFrame || '7';
            const limit = parseInt(req.query.limit) || 20;
            
            const videos = await Video.getTrending(limit, timeFrame);
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: videos
                });
            }
            
            res.render('trending', {
                title: 'Trending Videos',
                videos: videos,
                timeFrame: timeFrame
            });
        } catch (error) {
            console.error('Get trending error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get trending videos'
            });
        }
    }

    // Get videos by category
    static async getByCategory(req, res) {
        try {
            const { slug } = req.params;
            const { page, sort } = req.query;
            
            const category = await Category.findBySlug(slug);
            if (!category) {
                return res.status(404).render('404', {
                    title: 'Category Not Found',
                    message: 'The category you are looking for does not exist.'
                });
            }
            
            const options = {
                page: parseInt(page) || 1,
                limit: 20,
                sortBy: sort || 'latest'
            };
            
            const result = await Video.getByCategory(category.id, options);
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: result.data,
                    pagination: result.pagination
                });
            }
            
            res.render('category', {
                title: `${category.name} Videos`,
                category: category,
                videos: result.data,
                pagination: result.pagination,
                selectedSort: options.sortBy
            });
        } catch (error) {
            console.error('Get by category error:', error);
            res.status(500).render('error', {
                title: 'Category Error',
                message: 'Failed to load category videos'
            });
        }
    }

    // Like/Unlike video
    static async toggleLike(req, res) {
        try {
            const { id } = req.params;
            const userId = req.session.user ? req.session.user.id : null;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'You must be logged in to like videos'
                });
            }
            
            const result = await Video.toggleLike(parseInt(id), userId);
            
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Toggle like error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle like'
            });
        }
    }

    // Share video
    static async share(req, res) {
        try {
            const { id } = req.params;
            const { platform } = req.body;
            const userId = req.session.user ? req.session.user.id : null;
            
            await Video.recordShare(parseInt(id), userId, platform);
            
            res.json({
                success: true,
                message: 'Share recorded successfully'
            });
        } catch (error) {
            console.error('Share video error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to record share'
            });
        }
    }

    // Upload video (Admin)
    static async upload(req, res) {
        try {
            // Validate request
            const { error, value } = videoSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error.details[0].message
                });
            }
            
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Video file is required'
                });
            }
            
            // Upload video file
            const uploadResult = await storageService.uploadVideo(req.file);
            if (!uploadResult.success) {
                return res.status(500).json({
                    success: false,
                    message: uploadResult.error
                });
            }
            
            // Get video metadata
            const metadata = await videoService.getVideoMetadata(req.file.path);
            
            // Create video record
            const videoData = {
                ...value,
                video_url: uploadResult.url,
                duration: metadata.duration,
                file_size: req.file.size,
                storage_type: uploadResult.storage_type,
                user_id: req.session.user.id
            };
            
            // Generate thumbnail if needed
            if (!req.body.thumbnail && req.file.path) {
                const thumbnailResult = await videoService.generateThumbnail(req.file.path);
                if (thumbnailResult.success) {
                    videoData.thumbnail = thumbnailResult.url;
                }
            }
            
            const video = await Video.create(videoData);
            
            res.json({
                success: true,
                data: video,
                message: 'Video uploaded successfully'
            });
        } catch (error) {
            console.error('Upload video error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload video'
            });
        }
    }

    // Update video (Admin)
    static async update(req, res) {
        try {
            const { id } = req.params;
            
            // Validate request
            const { error, value } = videoSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error.details[0].message
                });
            }
            
            const video = await Video.update(parseInt(id), value);
            
            if (!video) {
                return res.status(404).json({
                    success: false,
                    message: 'Video not found'
                });
            }
            
            res.json({
                success: true,
                data: video,
                message: 'Video updated successfully'
            });
        } catch (error) {
            console.error('Update video error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update video'
            });
        }
    }

    // Delete video (Admin)
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const video = await Video.findById(parseInt(id));
            
            if (!video) {
                return res.status(404).json({
                    success: false,
                    message: 'Video not found'
                });
            }
            
            // Delete file from storage
            await storageService.deleteVideo(video.video_url, video.storage_type);
            
            // Delete thumbnail if exists
            if (video.thumbnail) {
                await storageService.deleteFile(video.thumbnail, video.storage_type);
            }
            
            // Delete video record
            const deleted = await Video.delete(parseInt(id));
            
            if (!deleted) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete video'
                });
            }
            
            res.json({
                success: true,
                message: 'Video deleted successfully'
            });
        } catch (error) {
            console.error('Delete video error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete video'
            });
        }
    }

    // Get video analytics (Admin)
    static async getAnalytics(req, res) {
        try {
            const { id } = req.params;
            const days = parseInt(req.query.days) || 30;
            
            const analytics = await Video.getAnalytics(parseInt(id), days);
            
            res.json({
                success: true,
                data: analytics
            });
        } catch (error) {
            console.error('Get analytics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get analytics'
            });
        }
    }

    // Get admin videos list
    static async getAdminList(req, res) {
        try {
            const { page, status, category, search } = req.query;
            
            const options = {
                page: parseInt(page) || 1,
                limit: 20,
                status: status || null,
                category: category ? parseInt(category) : null,
                search: search || null
            };
            
            const result = await Video.getAdminVideos(options);
            const categories = await Category.getAll();
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: result.data,
                    pagination: result.pagination
                });
            }
            
            res.render('admin/videos', {
                title: 'Manage Videos',
                videos: result.data,
                pagination: result.pagination,
                categories: categories,
                filters: {
                    status: options.status,
                    category: options.category,
                    search: options.search
                }
            });
        } catch (error) {
            console.error('Get admin videos error:', error);
            res.status(500).render('error', {
                title: 'Admin Error',
                message: 'Failed to load admin videos'
            });
        }
    }
}

module.exports = VideoController;