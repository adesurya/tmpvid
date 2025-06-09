// FIXED: Complete videoController.js with proper database integration

const Video = require('../models/Video');
const Category = require('../models/Category');
const storageService = require('../services/storageService');
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
    // Initialize video tables on startup
    static async initialize() {
        try {
            await Video.initializeTables();
            console.log('Video controller initialized with database tables');
        } catch (error) {
            console.error('Failed to initialize video controller:', error);
        }
    }

    // Get video feed (for main page)
    static async getFeed(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            
            console.log('getFeed - requesting videos with limit:', limit);
            
            let videos;
            try {
                videos = await Video.getRandomVideos(limit);
            } catch (error) {
                console.log('getRandomVideos failed, trying simple method...');
                videos = await Video.getRandomVideosSimple(limit);
            }
            
            console.log('getFeed - got videos count:', videos.length);
            
            // ALWAYS return JSON for API requests
            if (req.originalUrl.startsWith('/api/')) {
                return res.json({
                    success: true,
                    data: videos || [],
                    hasMore: videos ? videos.length === limit : false,
                    pagination: {
                        page: page,
                        limit: limit,
                        total: videos ? videos.length : 0
                    }
                });
            }
            
            // Return JSON for AJAX requests
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: videos || [],
                    hasMore: videos ? videos.length === limit : false
                });
            }
            
            // Render HTML for browser requests
            res.render('index', {
                title: 'Video Platform',
                videos: videos || [],
                page: page,
                layout: 'layouts/main'
            });
            
        } catch (error) {
            console.error('Get feed error:', error);
            
            if (req.originalUrl.startsWith('/api/') || req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to load videos: ' + error.message,
                    data: []
                });
            }
            
            res.render('index', {
                title: 'Video Platform',
                videos: [],
                error: 'Failed to load videos',
                layout: 'layouts/main'
            });
        }
    }

    // Get single video
    static async getVideo(req, res) {
        try {
            const { slug } = req.params;
            const userId = req.session?.user?.id || req.user?.id || null;
            
            console.log('Getting video with slug:', slug, 'for user:', userId);
            
            // Get video with user status if logged in
            const video = userId ? 
                await Video.findBySlugWithUserStatus(slug, userId) : 
                await Video.findBySlug(slug);
            
            if (!video) {
                return res.status(404).render('404', {
                    title: 'Video Not Found',
                    message: 'The video you are looking for does not exist.',
                    layout: 'layouts/main'
                });
            }
            
            // Record view with detailed tracking
            const ipAddress = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');
            
            try {
                await Video.incrementViews(video.id, userId, ipAddress, userAgent);
                console.log(`View recorded for video ${video.id}`);
            } catch (error) {
                console.error('Failed to increment views:', error);
            }
            
            // Get related videos
            let relatedVideos = [];
            try {
                relatedVideos = await Video.getRandomVideos(5, video.id);
            } catch (error) {
                console.log('Failed to get related videos:', error);
            }
            
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
                relatedVideos: relatedVideos,
                layout: 'layouts/main'
            });
        } catch (error) {
            console.error('Get video error:', error);
            res.status(500).render('error', {
                title: 'Server Error',
                message: 'Failed to load video',
                layout: 'layouts/main'
            });
        }
    }

    // FIXED: Toggle like with proper database storage
    static async toggleLike(req, res) {
        try {
            const { id } = req.params;
            const userId = req.session?.user?.id || req.user?.id || null;
            
            console.log('Toggle like for video:', id, 'user:', userId);
            
            if (!userId) {
                // Guest mode - return success but indicate login required
                return res.status(200).json({
                    success: true,
                    requiresLogin: true,
                    message: 'Like recorded locally (login to save permanently)',
                    data: {
                        liked: true,
                        action: 'guest_liked'
                    }
                });
            }
            
            // Authenticated user - save to database
            const result = await Video.toggleLike(parseInt(id), userId);
            
            console.log(`Like toggle result for video ${id}:`, result);
            
            res.json({
                success: true,
                data: result,
                message: result.liked ? 'Video liked!' : 'Video unliked!'
            });
        } catch (error) {
            console.error('Toggle like error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle like: ' + error.message
            });
        }
    }

    // FIXED: Record view with proper database storage
    static async recordView(req, res) {
        try {
            const { id } = req.params;
            const { watchDuration = 0, source = 'web' } = req.body;
            const userId = req.session?.user?.id || req.user?.id || null;
            const ipAddress = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');
            
            console.log(`Recording view for video ${id}, duration: ${watchDuration}s, source: ${source}, user: ${userId}`);
            
            // Record view (count as view if watched for at least 2 seconds or from embed)
            if (watchDuration >= 2 || source === 'embed') {
                const success = await Video.incrementViews(
                    parseInt(id), 
                    userId, 
                    ipAddress, 
                    userAgent, 
                    parseInt(watchDuration)
                );
                
                if (success) {
                    console.log(`View successfully recorded for video ${id}`);
                } else {
                    console.warn(`View recording failed for video ${id}`);
                }
            }
            
            res.json({
                success: true,
                message: 'View recorded successfully'
            });
        } catch (error) {
            console.error('Record view error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to record view: ' + error.message
            });
        }
    }

    // FIXED: Share video with proper database storage
    static async share(req, res) {
        try {
            const { id } = req.params;
            const { platform = 'unknown' } = req.body;
            const userId = req.session?.user?.id || req.user?.id || null;
            
            console.log('Share video:', id, 'platform:', platform, 'user:', userId);
            
            const success = await Video.recordShare(parseInt(id), userId, platform);
            
            if (success) {
                console.log(`Share successfully recorded for video ${id} on ${platform}`);
            } else {
                console.warn(`Share recording failed for video ${id}`);
            }
            
            res.json({
                success: true,
                message: 'Share recorded successfully'
            });
        } catch (error) {
            console.error('Share video error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to record share: ' + error.message
            });
        }
    }

    // FIXED: Search videos
    static async search(req, res) {
        try {
            const { q, category, sort, page } = req.query;
            
            console.log('Search request:', { q, category, sort, page });
            
            if (!q || q.trim().length === 0) {
                if (req.originalUrl.startsWith('/api/')) {
                    return res.json({
                        success: false,
                        message: 'Search query is required',
                        data: []
                    });
                }
                return res.redirect('/');
            }
            
            const searchOptions = {
                page: parseInt(page) || 1,
                limit: 20,
                category: category ? parseInt(category) : null,
                sortBy: sort || 'relevance'
            };
            
            console.log('Searching with options:', searchOptions);
            
            const result = await Video.search(q.trim(), searchOptions);
            
            console.log('Search result:', result.data?.length || 0, 'videos found');
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1 || req.originalUrl.startsWith('/api/')) {
                return res.json({
                    success: true,
                    data: result.data,
                    pagination: result.pagination,
                    searchQuery: q.trim()
                });
            }
            
            // Render HTML for non-API requests
            const categories = await Category.getAll();
            
            res.render('search', {
                title: `Search Results for "${q}"`,
                videos: result.data,
                pagination: result.pagination,
                categories: categories,
                searchQuery: q,
                selectedCategory: searchOptions.category,
                selectedSort: searchOptions.sortBy,
                layout: 'layouts/main'
            });
            
        } catch (error) {
            console.error('Search error:', error);
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1 || req.originalUrl.startsWith('/api/')) {
                return res.status(500).json({
                    success: false,
                    message: 'Search failed: ' + error.message,
                    data: []
                });
            }
            
            res.status(500).render('error', {
                title: 'Search Error',
                message: 'Failed to search videos',
                layout: 'layouts/main'
            });
        }
    }

    // FIXED: Get trending videos
    static async getTrending(req, res) {
    try {
        const timeFrame = req.query.timeFrame || '7';
        const limit = parseInt(req.query.limit) || 20;
        
        console.log(`Getting trending videos for timeframe: ${timeFrame} days, limit: ${limit}`);
        
        let videos = [];
        
        try {
            // Try to get trending videos using the Video model
            videos = await Video.getTrending(limit, timeFrame);
            console.log(`Trending query returned ${videos.length} videos`);
        } catch (error) {
            console.log('Trending query failed, trying fallback methods:', error.message);
        }
        
        // If no trending videos found, try popular videos based on views
        if (!videos || videos.length === 0) {
            console.log('No trending videos found, trying popular videos...');
            
            try {
                const popularQuery = `
                    SELECT v.*, 
                           c.name as category_name,
                           u.username,
                           v.views_count,
                           v.likes_count,
                           v.shares_count,
                           (COALESCE(v.views_count, 0) * 0.6 + COALESCE(v.likes_count, 0) * 0.3 + COALESCE(v.shares_count, 0) * 0.1) as engagement_score
                    FROM videos v
                    LEFT JOIN categories c ON v.category_id = c.id
                    LEFT JOIN users u ON v.user_id = u.id
                    WHERE v.status = 'published'
                        AND v.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                    ORDER BY engagement_score DESC, v.views_count DESC, v.created_at DESC
                    LIMIT ?
                `;
                
                const { query } = require('../config/database');
                videos = await query(popularQuery, [Math.min(parseInt(timeFrame) * 2, 365), limit]);
                console.log(`Popular videos query returned ${videos.length} videos`);
                
                videos = videos.map(video => new Video(video));
            } catch (popularError) {
                console.log('Popular videos query failed, trying simple recent videos:', popularError.message);
                
                // Final fallback: get recent videos with highest views
                try {
                    const recentQuery = `
                        SELECT v.*, 
                               c.name as category_name,
                               u.username
                        FROM videos v
                        LEFT JOIN categories c ON v.category_id = c.id
                        LEFT JOIN users u ON v.user_id = u.id
                        WHERE v.status = 'published'
                        ORDER BY v.views_count DESC, v.created_at DESC
                        LIMIT ?
                    `;
                    
                    videos = await query(recentQuery, [limit]);
                    console.log(`Recent videos fallback returned ${videos.length} videos`);
                    
                    videos = videos.map(video => new Video(video));
                } catch (recentError) {
                    console.log('All queries failed, using demo videos:', recentError.message);
                    videos = Video.getDemoVideos(limit);
                }
            }
        }
        
        // Helper function for number formatting
        const formatNumber = (num) => {
            if (num >= 1000000) {
                return (num / 1000000).toFixed(1) + 'M';
            } else if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'K';
            }
            return num.toString();
        };
        
        console.log(`Final result: ${videos.length} videos for trending`);
        
        if (req.xhr || req.headers.accept.indexOf('json') > -1 || req.originalUrl.startsWith('/api/')) {
            return res.json({
                success: true,
                data: videos,
                meta: {
                    timeFrame: timeFrame,
                    limit: limit,
                    total: videos.length,
                    fallbackUsed: videos.length > 0 && videos[0].id === 'demo-1'
                }
            });
        }
        
        res.render('trending', {
            title: 'Trending Videos',
            videos: videos,
            timeFrame: timeFrame,
            formatNumber: formatNumber,
            layout: 'layouts/main'
        });
    } catch (error) {
        console.error('Get trending error:', error);
        
        if (req.xhr || req.headers.accept.indexOf('json') > -1 || req.originalUrl.startsWith('/api/')) {
            return res.status(500).json({
                success: false,
                message: 'Failed to get trending videos: ' + error.message,
                data: []
            });
        }
        
        res.status(500).render('error', {
            title: 'Trending Error',
            message: 'Failed to load trending videos',
            layout: 'layouts/main'
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
                    message: 'The category you are looking for does not exist.',
                    layout: 'layouts/main'
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
                selectedSort: options.sortBy,
                layout: 'layouts/main'
            });
        } catch (error) {
            console.error('Get by category error:', error);
            res.status(500).render('error', {
                title: 'Category Error',
                message: 'Failed to load category videos',
                layout: 'layouts/main'
            });
        }
    }

    // Get embed video (for sharing and social media)
    static async getEmbedVideo(req, res) {
        try {
            const { slug } = req.params;
            console.log('Getting embed video for slug:', slug);
            
            const video = await Video.findBySlug(slug);
            
            if (!video) {
                return res.status(404).send(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>Video Not Found</title></head>
                    <body style="background: #000; color: #fff; text-align: center; padding: 50px;">
                        <h1>Video Not Found</h1>
                        <p>The video you are looking for does not exist.</p>
                    </body>
                    </html>
                `);
            }
            
            // Record view for embed
            const userId = req.session?.user?.id || null;
            const ipAddress = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');
            
            try {
                await Video.incrementViews(video.id, userId, ipAddress, userAgent, 0);
            } catch (error) {
                console.log('Failed to record embed view:', error);
            }
            
            // Return inline HTML for embed
            res.send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${video.title} - VideoApp</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { background: #000; font-family: Arial, sans-serif; overflow: hidden; }
                        .embed-container { position: relative; width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; }
                        .embed-video { width: 100%; height: 100%; object-fit: contain; }
                        .embed-overlay { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.7)); padding: 20px; color: white; transition: opacity 0.5s; }
                        .embed-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
                        .embed-meta { font-size: 14px; opacity: 0.8; }
                        .embed-branding { position: absolute; top: 10px; right: 10px; background: rgba(254, 44, 85, 0.9); color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; font-weight: 600; text-decoration: none; }
                        .embed-branding:hover { background: rgba(254, 44, 85, 1); }
                    </style>
                </head>
                <body>
                    <div class="embed-container">
                        <video class="embed-video" src="${video.video_url}" controls autoplay muted playsinline ${video.thumbnail ? `poster="${video.thumbnail}"` : ''}></video>
                        <div class="embed-overlay" id="overlay">
                            <div class="embed-title">${video.title}</div>
                            <div class="embed-meta">${video.views_count || 0} views${video.username ? ` • @${video.username}` : ''}</div>
                        </div>
                        <a href="/video/${video.slug}" target="_blank" class="embed-branding">VideoApp</a>
                    </div>
                    <script>
                        setTimeout(() => { const overlay = document.getElementById('overlay'); if (overlay) overlay.style.opacity = '0'; }, 3000);
                        document.addEventListener('mouseover', () => { const overlay = document.getElementById('overlay'); if (overlay) overlay.style.opacity = '1'; });
                        document.addEventListener('mouseout', () => { const overlay = document.getElementById('overlay'); if (overlay) overlay.style.opacity = '0'; });
                    </script>
                </body>
                </html>
            `);
        } catch (error) {
            console.error('Get embed video error:', error);
            res.status(500).send(`
                <!DOCTYPE html>
                <html>
                <head><title>Server Error</title></head>
                <body style="background: #000; color: #fff; text-align: center; padding: 50px;">
                    <h1>Server Error</h1>
                    <p>Failed to load video</p>
                </body>
                </html>
            `);
        }
    }

    // Upload video (Admin)
    static async upload(req, res) {
        try {
            console.log('Upload request received');
            
            // Validate form data
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
            
            // Create video data
            const videoData = {
                ...value,
                video_url: `/uploads/videos/${req.file.filename}`,
                duration: 0, // Will be filled later with FFmpeg
                file_size: req.file.size,
                storage_type: 'local',
                user_id: req.session.user.id,
                status: value.status || 'published'
            };
            
            console.log('Creating video with data:', videoData);
            
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
                message: 'Failed to upload video: ' + error.message
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
            
            // Delete file from storage if exists
            if (storageService && video.video_url) {
                try {
                    await storageService.deleteVideo(video.video_url, video.storage_type);
                } catch (error) {
                    console.log('Failed to delete video file:', error);
                }
            }
            
            // Delete thumbnail if exists
            if (storageService && video.thumbnail) {
                try {
                    await storageService.deleteFile(video.thumbnail, video.storage_type);
                } catch (error) {
                    console.log('Failed to delete thumbnail:', error);
                }
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

    // Get video statistics (Admin)
    static async getVideoStats(req, res) {
        try {
            const { id } = req.params;
            
            const stats = await Video.getDetailedStats(parseInt(id));
            
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Get video stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get video statistics'
            });
        }
    }

    // Get admin videos list
    static async getAdminList(req, res) {
        try {
            console.log('VideoController.getAdminList - Request path:', req.originalUrl);
            
            const { page, status, category, search } = req.query;
            
            const options = {
                page: parseInt(page) || 1,
                limit: 20,
                status: status || null,
                category: category ? parseInt(category) : null,
                search: search || null
            };
            
            console.log('VideoController.getAdminList - Options:', options);
            
            const result = await Video.getAdminVideos(options);
            const categories = await Category.getAll();
            
            console.log('VideoController.getAdminList - Found videos:', result.data?.length || 0);
            
            // ALWAYS return JSON for API requests
            if (req.originalUrl.startsWith('/api/')) {
                return res.json({
                    success: true,
                    data: result.data || [],
                    pagination: result.pagination || {},
                    categories: categories || []
                });
            }
            
            // Only render if it's NOT an API request
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: result.data || [],
                    pagination: result.pagination || {},
                    categories: categories || []
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
                },
                layout: 'layouts/admin'
            });
        } catch (error) {
            console.error('Get admin videos error:', error);
            
            // ALWAYS return JSON for API requests
            if (req.originalUrl.startsWith('/api/') || req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to load videos',
                    error: error.message,
                    data: []
                });
            }
            
            res.status(500).render('error', {
                title: 'Admin Error',
                message: 'Failed to load admin videos',
                layout: 'layouts/main'
            });
        }
    }
}

// Initialize video controller
VideoController.initialize().catch(console.error);

module.exports = VideoController;