// src/models/Video.js
const { query, queryOne, transaction, dbUtils } = require('../config/database');
const slugify = require('slugify');

class Video {
    constructor(data = {}) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
        this.slug = data.slug;
        this.video_url = data.video_url;
        this.thumbnail = data.thumbnail;
        this.duration = data.duration;
        this.file_size = data.file_size;
        this.video_quality = data.video_quality;
        this.storage_type = data.storage_type;
        this.category_id = data.category_id;
        this.series_id = data.series_id;
        this.user_id = data.user_id;
        this.views_count = data.views_count || 0;
        this.likes_count = data.likes_count || 0;
        this.shares_count = data.shares_count || 0;
        this.status = data.status || 'draft';
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

static async initializeTables() {
    try {
        await Promise.all([
            this.ensureViewTablesExist(),
            this.ensureLikeTablesExist(),
            this.ensureShareTablesExist()
        ]);
        console.log('All video interaction tables initialized');
    } catch (error) {
        console.error('Error initializing video tables:', error);
    }
}

// Create new video
static async create(videoData) {
    try {
        // Enhanced slug generation
        const slug = await this.generateUniqueSlug(videoData.title);
        
        const sql = `
            INSERT INTO videos (
                title, description, slug, video_url, thumbnail, duration,
                file_size, video_quality, storage_type, storage_metadata, 
                category_id, series_id, user_id, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            videoData.title,
            videoData.description || null,
            slug,
            videoData.video_url,
            videoData.thumbnail || null,
            videoData.duration || 0,
            videoData.file_size || 0,
            videoData.video_quality || '720p',
            videoData.storage_type || 'local',
            videoData.storage_metadata || null, // JSON field for S3 metadata
            videoData.category_id || null,
            videoData.series_id || null,
            videoData.user_id,
            videoData.status || 'draft'
        ];
        
        const result = await query(sql, params);
        const createdVideo = await this.findById(result.insertId);
        
        console.log(`✅ Video created: ${createdVideo.id} (${createdVideo.storage_type})`);
        return createdVideo;
    } catch (error) {
        console.error('Enhanced video creation error:', error);
        throw error;
    }
}

// Find video by ID
static async findById(id) {
    try {
        const sql = `
            SELECT v.*, 
                   c.name as category_name,
                   s.title as series_title,
                   u.username
            FROM videos v
            LEFT JOIN categories c ON v.category_id = c.id
            LEFT JOIN series s ON v.series_id = s.id
            LEFT JOIN users u ON v.user_id = u.id
            WHERE v.id = ?
        `;
        
        const video = await queryOne(sql, [id]);
        return video ? new Video(video) : null;
    } catch (error) {
        console.error('Find video by ID error:', error);
        throw error;
    }
}

// Find video by slug
static async findBySlug(slug) {
        try {
            const sql = `
                SELECT v.*, 
                       c.name as category_name,
                       s.title as series_title,
                       u.username
                FROM videos v
                LEFT JOIN categories c ON v.category_id = c.id
                LEFT JOIN series s ON v.series_id = s.id
                LEFT JOIN users u ON v.user_id = u.id
                WHERE v.slug = ? AND v.status = 'published'
            `;
            
            const video = await queryOne(sql, [slug]);
            return video ? new Video(video) : null;
        } catch (error) {
            console.error('Find video by slug error:', error);
            throw error;
        }
    }

// Get random videos for feed
static async getRandomVideos(limit = 10, excludeId = null) {
    try {
        let sql = `
            SELECT v.*, 
                   c.name as category_name,
                   u.username,
                   (COALESCE(v.views_count, 0) * 0.6 + COALESCE(v.likes_count, 0) * 0.3 + COALESCE(v.shares_count, 0) * 0.1) as engagement_score
            FROM videos v
            LEFT JOIN categories c ON v.category_id = c.id
            LEFT JOIN users u ON v.user_id = u.id
            WHERE v.status = 'published'
        `;
        
        const params = [];
        
        if (excludeId) {
            sql += ' AND v.id != ?';
            params.push(parseInt(excludeId));
        }
        
        sql += ` ORDER BY engagement_score DESC, RAND() LIMIT ${parseInt(limit)}`;
        
        console.log('getRandomVideos SQL:', sql);
        console.log('getRandomVideos params:', params);
        
        const videos = await query(sql, params);
        console.log('getRandomVideos result count:', videos.length);
        
        if (videos.length === 0) {
            console.log('No videos found, returning demo data');
            return this.getDemoVideos(limit);
        }
        
        return videos.map(video => new Video(video));
    } catch (error) {
        console.error('Get random videos error:', error);
        
        // Fallback to simple query
        try {
            console.log('Trying fallback query...');
            const fallbackSql = `SELECT * FROM videos WHERE status = 'published' ORDER BY created_at DESC LIMIT ${parseInt(limit)}`;
            const fallbackVideos = await query(fallbackSql, []);
            
            if (fallbackVideos.length === 0) {
                return this.getDemoVideos(limit);
            }
            
            return fallbackVideos.map(video => new Video(video));
        } catch (fallbackError) {
            console.error('Fallback query also failed:', fallbackError);
            return this.getDemoVideos(limit);
        }
    }
}

static async getStreamingInfo(videoId) {
    try {
        const video = await this.findById(videoId);
        if (!video) {
            return null;
        }
        
        const streamingInfo = {
            video_id: video.id,
            title: video.title,
            duration: video.duration,
            file_size: video.file_size,
            video_quality: video.video_quality,
            storage_type: video.storage_type,
            streaming_urls: {
                direct: video.video_url
            },
            thumbnail: video.thumbnail,
            metadata: {}
        };
        
        // Add storage-specific information
        if (video.storage_type === 's3') {
            const { extractKeyFromUrl } = require('../config/aws');
            const s3Key = extractKeyFromUrl(video.video_url);
            
            if (s3Key) {
                streamingInfo.s3_key = s3Key;
                
                // Generate different expiry URLs for different use cases
                const { generatePresignedUrl } = require('../config/aws');
                
                try {
                    const shortTermUrl = await generatePresignedUrl(s3Key, 3600); // 1 hour
                    const longTermUrl = await generatePresignedUrl(s3Key, 86400); // 24 hours
                    
                    if (shortTermUrl.success && longTermUrl.success) {
                        streamingInfo.streaming_urls = {
                            direct: video.video_url, // Public URL if available
                            short_term: shortTermUrl.url, // 1 hour access
                            long_term: longTermUrl.url, // 24 hour access
                            expires_short: 3600,
                            expires_long: 86400
                        };
                    }
                } catch (urlError) {
                    console.warn('Failed to generate streaming URLs:', urlError);
                }
            }
        }
        
        // Add metadata if available
        if (video.storage_metadata) {
            try {
                streamingInfo.metadata = typeof video.storage_metadata === 'string' 
                    ? JSON.parse(video.storage_metadata) 
                    : video.storage_metadata;
            } catch (parseError) {
                console.warn('Failed to parse storage metadata:', parseError);
            }
        }
        
        return streamingInfo;
    } catch (error) {
        console.error('Get video streaming info error:', error);
        throw error;
    }
}

// Alternative method tanpa JOIN untuk debugging
static async getRandomVideosSimple(limit = 10) {
    try {
        const sql = `SELECT * FROM videos WHERE status = 'published' ORDER BY created_at DESC LIMIT ${parseInt(limit)}`;
        console.log('Simple query SQL:', sql);
        
        const videos = await query(sql, []);
        return videos.map(video => new Video(video));
    } catch (error) {
        console.error('Get random videos simple error:', error);
        return [];
    }
}

static getDemoVideos(limit = 10) {
    const demoVideos = [
        {
            id: 'demo-1',
            title: 'Amazing Nature Documentary',
            description: 'Explore the wonders of wildlife in this breathtaking documentary.',
            slug: 'amazing-nature-documentary',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            thumbnail: 'https://via.placeholder.com/300x400/4ecdc4/white?text=Nature+Doc',
            views_count: 15420,
            likes_count: 892,
            shares_count: 156,
            status: 'published',
            category_name: 'Documentary',
            username: 'NatureExplorer',
            duration: 596,
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'demo-2',
            title: 'Cooking Masterclass: Italian Pasta',
            description: 'Learn to make authentic Italian pasta from scratch with professional techniques.',
            slug: 'cooking-masterclass-italian-pasta',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            thumbnail: 'https://via.placeholder.com/300x400/ff6b6b/white?text=Cooking+Class',
            views_count: 8734,
            likes_count: 567,
            shares_count: 89,
            status: 'published',
            category_name: 'Food',
            username: 'ChefMario',
            duration: 847,
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'demo-3',
            title: 'Travel Vlog: Tokyo Adventures',
            description: 'Join me on an incredible journey through the streets of Tokyo, Japan.',
            slug: 'travel-vlog-tokyo-adventures',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            thumbnail: 'https://via.placeholder.com/300x400/45b7d1/white?text=Tokyo+Vlog',
            views_count: 12156,
            likes_count: 743,
            shares_count: 234,
            status: 'published',
            category_name: 'Travel',
            username: 'WanderlustSarah',
            duration: 423,
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'demo-4',
            title: 'Fitness Challenge: 30-Day Workout',
            description: 'Transform your body with this intensive 30-day fitness challenge program.',
            slug: 'fitness-challenge-30-day-workout',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            thumbnail: 'https://via.placeholder.com/300x400/2ecc71/white?text=Fitness+Challenge',
            views_count: 9876,
            likes_count: 654,
            shares_count: 123,
            status: 'published',
            category_name: 'Fitness',
            username: 'FitCoachMike',
            duration: 1245,
            created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'demo-5',
            title: 'Tech Review: Latest Smartphone',
            description: 'Complete review of the newest smartphone with all features tested.',
            slug: 'tech-review-latest-smartphone',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            thumbnail: 'https://via.placeholder.com/300x400/9b59b6/white?text=Tech+Review',
            views_count: 18543,
            likes_count: 1123,
            shares_count: 267,
            status: 'published',
            category_name: 'Technology',
            username: 'TechGuru99',
            duration: 756,
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 'demo-6',
            title: 'Music Production Tutorial',
            description: 'Learn professional music production techniques using modern software.',
            slug: 'music-production-tutorial',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            thumbnail: 'https://via.placeholder.com/300x400/e67e22/white?text=Music+Tutorial',
            views_count: 6789,
            likes_count: 445,
            shares_count: 78,
            status: 'published',
            category_name: 'Music',
            username: 'BeatMakerPro',
            duration: 934,
            created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
        }
    ];
        return demoVideos.slice(0, limit).map(video => new Video(video));
}
        

// Search videos
static async search(searchTerm, options = {}) {
    try {
        const { page = 1, limit = 20, category = null, sortBy = 'relevance' } = options;
        
        let sql = `
            SELECT v.*, 
                   c.name as category_name,
                   u.username
            FROM videos v
            LEFT JOIN categories c ON v.category_id = c.id
            LEFT JOIN users u ON v.user_id = u.id
            WHERE v.status = 'published'
            AND (v.title LIKE ? OR v.description LIKE ?)
        `;
        
        const params = [
            `%${searchTerm}%`,
            `%${searchTerm}%`
        ];
        
        if (category) {
            sql += ' AND v.category_id = ?';
            params.push(category);
        }
        
        // Add sorting
        switch (sortBy) {
            case 'latest':
                sql += ' ORDER BY v.created_at DESC';
                break;
            case 'popular':
                sql += ' ORDER BY v.views_count DESC';
                break;
            case 'engagement':
                sql += ' ORDER BY (v.views_count + v.likes_count + v.shares_count) DESC';
                break;
            default:
                sql += ' ORDER BY v.views_count DESC, v.created_at DESC';
        }
        
        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        sql += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);
        
        // Count query
        let countSql = `
            SELECT COUNT(*) as total FROM videos v
            LEFT JOIN categories c ON v.category_id = c.id
            LEFT JOIN users u ON v.user_id = u.id
            WHERE v.status = 'published'
            AND (v.title LIKE ? OR v.description LIKE ?)
        `;
        
        const countParams = [`%${searchTerm}%`, `%${searchTerm}%`];
        
        if (category) {
            countSql += ' AND v.category_id = ?';
            countParams.push(category);
        }
        
        const [results, countResult] = await Promise.all([
            query(sql, params),
            query(countSql, countParams)
        ]);
        
        const total = countResult[0]?.total || 0;
        const totalPages = Math.ceil(total / parseInt(limit));
        
        return {
            data: results.map(video => new Video(video)),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: totalPages,
                hasNext: parseInt(page) < totalPages,
                hasPrev: parseInt(page) > 1
            }
        };
    } catch (error) {
        console.error('Search videos error:', error);
        return {
            data: [],
            pagination: {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false
            }
        };
    }
}

// Get trending videos
static async getTrending(limit = 20, timeFrame = '7') {
    try {
        console.log(`Video.getTrending called with limit: ${limit}, timeFrame: ${timeFrame}`);
        
        // Calculate date threshold
        const daysAgo = parseInt(timeFrame);
        
        // First try: Get trending videos with interaction data
        try {
            await this.ensureViewTablesExist();
            await this.ensureLikeTablesExist();
            await this.ensureShareTablesExist();
            
            const trendingQuery = `
                SELECT v.*, 
                       c.name as category_name,
                       u.username,
                       COALESCE(v.views_count, 0) as views_count,
                       COALESCE(v.likes_count, 0) as likes_count,
                       COALESCE(v.shares_count, 0) as shares_count,
                       (
                           SELECT COUNT(*) FROM video_views vv 
                           WHERE vv.video_id = v.id 
                           AND vv.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                       ) as recent_views,
                       (
                           SELECT COUNT(*) FROM video_likes vl 
                           WHERE vl.video_id = v.id 
                           AND vl.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                       ) as recent_likes,
                       (
                           SELECT COUNT(*) FROM video_shares vs 
                           WHERE vs.video_id = v.id 
                           AND vs.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                       ) as recent_shares,
                       (
                           (SELECT COUNT(*) FROM video_views vv WHERE vv.video_id = v.id AND vv.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) * 0.5 +
                           (SELECT COUNT(*) FROM video_likes vl WHERE vl.video_id = v.id AND vl.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) * 0.3 +
                           (SELECT COUNT(*) FROM video_shares vs WHERE vs.video_id = v.id AND vs.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)) * 0.2 +
                           (DATEDIFF(NOW(), v.created_at) * -0.1)
                       ) as trending_score
                FROM videos v
                LEFT JOIN categories c ON v.category_id = c.id
                LEFT JOIN users u ON v.user_id = u.id
                WHERE v.status = 'published'
                    AND v.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                HAVING trending_score > 0
                ORDER BY trending_score DESC, v.views_count DESC
                LIMIT ?
            `;
            
            const videos = await query(trendingQuery, [daysAgo, daysAgo, daysAgo, daysAgo, Math.min(daysAgo * 2, 365), limit]);
            
            if (videos && videos.length > 0) {
                console.log(`Trending query successful: ${videos.length} videos found`);
                return videos.map(video => new Video(video));
            }
        } catch (interactionError) {
            console.log('Interaction-based trending failed:', interactionError.message);
        }
        
        // Second try: Simple trending based on engagement in timeframe
        try {
            const simpleQuery = `
                SELECT v.*, 
                       c.name as category_name,
                       u.username,
                       COALESCE(v.views_count, 0) as views_count,
                       COALESCE(v.likes_count, 0) as likes_count,
                       COALESCE(v.shares_count, 0) as shares_count,
                       (COALESCE(v.views_count, 0) * 0.6 + COALESCE(v.likes_count, 0) * 0.3 + COALESCE(v.shares_count, 0) * 0.1) as engagement_score
                FROM videos v
                LEFT JOIN categories c ON v.category_id = c.id
                LEFT JOIN users u ON v.user_id = u.id
                WHERE v.status = 'published'
                    AND v.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                ORDER BY engagement_score DESC, v.views_count DESC, v.created_at DESC
                LIMIT ?
            `;
            
            const videos = await query(simpleQuery, [daysAgo, limit]);
            
            if (videos && videos.length > 0) {
                console.log(`Simple trending query successful: ${videos.length} videos found`);
                return videos.map(video => new Video(video));
            }
        } catch (simpleError) {
            console.log('Simple trending query failed:', simpleError.message);
        }
        
        // Third try: Most viewed videos in timeframe
        try {
            const viewsQuery = `
                SELECT v.*, 
                       c.name as category_name,
                       u.username
                FROM videos v
                LEFT JOIN categories c ON v.category_id = c.id
                LEFT JOIN users u ON v.user_id = u.id
                WHERE v.status = 'published'
                    AND v.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                ORDER BY v.views_count DESC, v.created_at DESC
                LIMIT ?
            `;
            
            const videos = await query(viewsQuery, [daysAgo, limit]);
            
            if (videos && videos.length > 0) {
                console.log(`Views-based query successful: ${videos.length} videos found`);
                return videos.map(video => new Video(video));
            }
        } catch (viewsError) {
            console.log('Views-based query failed:', viewsError.message);
        }
        
        // Fourth try: All published videos sorted by views (ignore timeframe)
        try {
            const allQuery = `
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
            
            const videos = await query(allQuery, [limit]);
            
            if (videos && videos.length > 0) {
                console.log(`All videos query successful: ${videos.length} videos found`);
                return videos.map(video => new Video(video));
            }
        } catch (allError) {
            console.log('All videos query failed:', allError.message);
        }
        
        // Final fallback: Return demo videos
        console.log('All database queries failed, returning demo videos');
        return this.getDemoVideos(limit);
        
    } catch (error) {
        console.error('Get trending videos complete failure:', error);
        
        // Return demo videos as ultimate fallback
        return this.getDemoVideos(limit);
    }
}

// FIXED: Get current like status for user
static async getUserLikeStatus(videoId, userId) {
    try {
        if (!userId) return false;
        
        await this.ensureLikeTablesExist();
        
        const result = await queryOne(
            'SELECT id FROM video_likes WHERE video_id = ? AND user_id = ?',
            [videoId, userId]
        );
        
        return !!result;
    } catch (error) {
        console.error('Get user like status error:', error);
        return false;
    }
}

// FIXED: Get video with user interaction status
static async findBySlugWithUserStatus(slug, userId = null) {
    try {
        const video = await this.findBySlug(slug);
        if (!video || !userId) return video;
        
        // Get user's like status
        const isLiked = await this.getUserLikeStatus(video.id, userId);
        video.userLiked = isLiked;
        
        return video;
    } catch (error) {
        console.error('Find video with user status error:', error);
        return await this.findBySlug(slug);
    }
}

// FIXED: Helper methods to ensure tables exist
static async ensureLikeTablesExist() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS video_likes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                video_id INT NOT NULL,
                user_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_video_user_like (video_id, user_id),
                FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
                INDEX idx_video_likes_video_id (video_id),
                INDEX idx_video_likes_user_id (user_id),
                INDEX idx_video_likes_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('Video likes table ensured');
    } catch (error) {
        console.error('Error ensuring likes table:', error);
    }
}

static async ensureViewTablesExist() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS video_views (
                id INT AUTO_INCREMENT PRIMARY KEY,
                video_id INT NOT NULL,
                user_id INT NULL,
                ip_address VARCHAR(45) NULL,
                user_agent TEXT NULL,
                watch_duration INT DEFAULT 0,
                source VARCHAR(50) DEFAULT 'web',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
                INDEX idx_video_views_video_id (video_id),
                INDEX idx_video_views_created_at (created_at),
                INDEX idx_video_views_user_id (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('Video views table ensured');
    } catch (error) {
        console.error('Error ensuring views table:', error);
    }
}

static async ensureShareTablesExist() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS video_shares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                video_id INT NOT NULL,
                user_id INT NULL,
                platform VARCHAR(50) NOT NULL DEFAULT 'unknown',
                user_agent TEXT NULL,
                referrer VARCHAR(500) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
                INDEX idx_video_shares_video_id (video_id),
                INDEX idx_video_shares_platform (platform),
                INDEX idx_video_shares_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('Video shares table ensured');
    } catch (error) {
        console.error('Error ensuring shares table:', error);
    }
}

// Get videos by category
static async getByCategory(categoryId, options = {}) {
        try {
            const { page = 1, limit = 20, sortBy = 'latest' } = options;
            
            let sql = `
                SELECT v.*, 
                       c.name as category_name,
                       u.username
                FROM videos v
                LEFT JOIN categories c ON v.category_id = c.id
                LEFT JOIN users u ON v.user_id = u.id
                WHERE v.status = 'published' AND v.category_id = ?
            `;
            
            const params = [categoryId];
            
            switch (sortBy) {
                case 'popular':
                    sql += ' ORDER BY v.views_count DESC';
                    break;
                case 'engagement':
                    sql += ' ORDER BY (v.views_count + v.likes_count + v.shares_count) DESC';
                    break;
                default:
                    sql += ' ORDER BY v.created_at DESC';
            }
            
            const result = await dbUtils.paginate(sql, params, page, limit);
            result.data = result.data.map(video => new Video(video));
            
            return result;
        } catch (error) {
            console.error('Get videos by category error:', error);
            throw error;
        }
    }

// Update video
static async update(id, updateData) {
        try {
            // Generate new slug if title changed
            if (updateData.title) {
                const currentVideo = await this.findById(id);
                if (currentVideo && currentVideo.title !== updateData.title) {
                    updateData.slug = await this.generateUniqueSlug(updateData.title, id);
                }
            }
            
            const fields = [];
            const params = [];
            
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined) {
                    fields.push(`${key} = ?`);
                    params.push(updateData[key]);
                }
            });
            
            if (fields.length === 0) {
                throw new Error('No fields to update');
            }
            
            params.push(id);
            
            const sql = `UPDATE videos SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`;
            await query(sql, params);
            
            return await this.findById(id);
        } catch (error) {
            console.error('Update video error:', error);
            throw error;
        }
    }

// Delete video
static async delete(id) {
    try {
        // Get video info before deletion for cleanup
        const video = await this.findById(id);
        if (!video) {
            return false;
        }
        
        // Delete from database first
        const sql = 'DELETE FROM videos WHERE id = ?';
        const result = await query(sql, [id]);
        
        if (result.affectedRows > 0) {
            // Clean up storage files after successful database deletion
            const storageService = require('../services/storageService');
            
            try {
                // Delete main video file
                if (video.video_url) {
                    await storageService.deleteVideo(video.video_url, video.storage_type);
                    console.log(`Deleted video file: ${video.video_url}`);
                }
                
                // Delete thumbnail if exists
                if (video.thumbnail) {
                    await storageService.deleteFile(video.thumbnail, video.storage_type);
                    console.log(`Deleted thumbnail: ${video.thumbnail}`);
                }
            } catch (cleanupError) {
                console.error('File cleanup error after video deletion:', cleanupError);
                // Don't fail the deletion if cleanup fails
            }
            
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Delete video error:', error);
        throw error;
    }
}

static async recordView(viewData) {
    try {
        // FIXED: Map viewData to match actual database table structure
        const sql = `
            INSERT INTO video_views (
                video_id, user_id, watch_duration, 
                ip_address, user_agent, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        // FIXED: Use only columns that exist in the table
        const values = [
            viewData.video_id,
            viewData.user_id || null,
            parseInt(viewData.watch_duration) || 0,
            viewData.ip_address || '127.0.0.1',
            viewData.user_agent ? viewData.user_agent.substring(0, 1000) : 'Unknown', // Limit length for TEXT field
            new Date() // Use current timestamp for created_at
        ];
        
        console.log('📊 Recording view with SQL:', sql);
        console.log('📊 Recording view with values:', values);
        
        const result = await query(sql, values);
        
        if (result && result.insertId) {
            console.log(`✅ View recorded successfully with ID: ${result.insertId}`);
            return result.insertId;
        } else {
            console.warn('⚠️ View insert returned no ID');
            return null;
        }
    } catch (error) {
        console.error('❌ Database error in recordView:', error);
        throw error;
    }
}

static async recordViewSimple(videoId, userId = null, ipAddress = null, userAgent = null, watchDuration = 0) {
    try {
        const { query } = require('../config/database'); // Pastikan import ini ada
        
        const sql = `
            INSERT INTO video_views (
                video_id, user_id, watch_duration, 
                ip_address, user_agent
            ) VALUES (?, ?, ?, ?, ?)
        `;
        
        const values = [
            parseInt(videoId),
            userId ? parseInt(userId) : null,
            parseInt(watchDuration) || 0,
            ipAddress || '127.0.0.1',
            userAgent ? userAgent.substring(0, 1000) : 'Unknown'
        ];
        
        console.log('📊 Recording view with SQL:', sql);
        console.log('📊 Recording view with values:', values);
        
        const result = await query(sql, values);
        return result.insertId || null;
    } catch (error) {
        console.error('❌ Simple view recording failed:', error);
        throw error;
    }
}


// Increment views (FIXED to handle missing tables)
static async incrementViews(videoId, userId = null, ipAddress = null, userAgent = null, watchDuration = 0) {
    try {
        // Ensure tables exist first
        await this.ensureViewTablesExist();
        
        return await transaction(async (connection) => {
            // Always update video views count
            await connection.query(
                'UPDATE videos SET views_count = views_count + 1, updated_at = NOW() WHERE id = ?',
                [videoId]
            );
            
            // Log the detailed view record
            await connection.query(`
                INSERT INTO video_views (video_id, user_id, ip_address, user_agent, watch_duration, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            `, [videoId, userId, ipAddress, userAgent, watchDuration]);
            
            console.log(`View recorded for video ${videoId}, user: ${userId}, duration: ${watchDuration}s`);
            
            return true;
        });
        
    } catch (error) {
        console.error('Increment views error:', error);
        
        // Fallback: at least update the main count
        try {
            await query('UPDATE videos SET views_count = views_count + 1, updated_at = NOW() WHERE id = ?', [videoId]);
            console.log(`Fallback view count updated for video ${videoId}`);
            return true;
        } catch (fallbackError) {
            console.error('View fallback also failed:', fallbackError);
            return false;
        }
    }
}

// Toggle like
static async toggleLike(videoId, userId) {
    try {
        // Ensure tables exist first
        await this.ensureLikeTablesExist();
        
        return await transaction(async (connection) => {
            // Check if already liked
            const [existing] = await connection.query(
                'SELECT id FROM video_likes WHERE video_id = ? AND user_id = ?',
                [videoId, userId]
            );
            
            if (existing.length > 0) {
                // Remove like
                await connection.query(
                    'DELETE FROM video_likes WHERE video_id = ? AND user_id = ?',
                    [videoId, userId]
                );
                
                // Update likes count
                await connection.query(
                    'UPDATE videos SET likes_count = GREATEST(likes_count - 1, 0), updated_at = NOW() WHERE id = ?',
                    [videoId]
                );
                
                console.log(`User ${userId} unliked video ${videoId}`);
                
                return { liked: false, action: 'unliked' };
            } else {
                // Add like
                await connection.query(
                    'INSERT INTO video_likes (video_id, user_id, created_at) VALUES (?, ?, NOW())',
                    [videoId, userId]
                );
                
                // Update likes count
                await connection.query(
                    'UPDATE videos SET likes_count = likes_count + 1, updated_at = NOW() WHERE id = ?',
                    [videoId]
                );
                
                console.log(`User ${userId} liked video ${videoId}`);
                
                return { liked: true, action: 'liked' };
            }
        });
    } catch (error) {
        console.error('Toggle like error:', error);
        throw error;
    }
}

// NEW: Get S3 metadata for video
static async getS3Metadata(videoId) {
    try {
        const video = await this.findById(videoId);
        if (!video || video.storage_type !== 's3') {
            return null;
        }
        
        let metadata = {};
        if (video.storage_metadata) {
            try {
                metadata = JSON.parse(video.storage_metadata);
            } catch (parseError) {
                console.warn('Failed to parse storage metadata:', parseError);
            }
        }
        
        return {
            storage_type: video.storage_type,
            video_url: video.video_url,
            thumbnail: video.thumbnail,
            s3_key: metadata.s3_key || null,
            s3_bucket: metadata.s3_bucket || null,
            s3_etag: metadata.s3_etag || null,
            upload_timestamp: metadata.upload_timestamp || video.created_at,
            original_filename: metadata.original_filename || null,
            content_type: metadata.content_type || null
        };
    } catch (error) {
        console.error('Get S3 metadata error:', error);
        return null;
    }
}

// NEW: Update storage metadata
static async updateStorageMetadata(videoId, metadata) {
    try {
        const updateData = {
            storage_metadata: JSON.stringify({
                ...metadata,
                updated_at: new Date().toISOString()
            })
        };
        
        return await this.update(videoId, updateData);
    } catch (error) {
        console.error('Update storage metadata error:', error);
        throw error;
    }
}

// NEW: Migrate video from local to S3
static async migrateVideoToS3(videoId) {
    try {
        const video = await this.findById(videoId);
        if (!video) {
            throw new Error('Video not found');
        }
        
        if (video.storage_type === 's3') {
            return {
                success: true,
                message: 'Video already in S3',
                video: video
            };
        }
        
        if (video.storage_type !== 'local') {
            throw new Error('Can only migrate from local storage');
        }
        
        const storageService = require('../services/storageService');
        const path = require('path');
        const fs = require('fs').promises;
        
        // Get local file path
        const localPath = path.join(__dirname, '../../public', video.video_url);
        
        // Check if local file exists
        try {
            await fs.access(localPath);
        } catch (error) {
            throw new Error('Local video file not found');
        }
        
        // Read local file
        const fileBuffer = await fs.readFile(localPath);
        const fileStats = await fs.stat(localPath);
        
        // Create file object for S3 upload
        const fileForUpload = {
            buffer: fileBuffer,
            originalname: path.basename(localPath),
            mimetype: storageService.getMimeType(path.basename(localPath)),
            size: fileStats.size
        };
        
        // Upload to S3
        const uploadResult = await storageService.uploadVideo(fileForUpload, {
            forceLocal: false,
            generateThumbnail: false // Don't regenerate if already exists
        });
        
        if (!uploadResult.success) {
            throw new Error('S3 upload failed: ' + uploadResult.error);
        }
        
        // Update video record
        const updateData = {
            video_url: uploadResult.url,
            storage_type: 's3',
            storage_metadata: JSON.stringify({
                storage_type: 's3',
                s3_key: uploadResult.key,
                s3_bucket: uploadResult.bucket,
                s3_etag: uploadResult.etag,
                migration_timestamp: new Date().toISOString(),
                original_local_path: video.video_url,
                migrated_from: 'local'
            })
        };
        
        // Update thumbnail if it was also uploaded to S3
        if (uploadResult.thumbnail) {
            updateData.thumbnail = uploadResult.thumbnail;
        }
        
        const updatedVideo = await this.update(videoId, updateData);
        
        // Optionally delete local file after successful migration
        // (You might want to keep it as backup initially)
        /*
        try {
            await fs.unlink(localPath);
            console.log(`Local file deleted: ${localPath}`);
        } catch (deleteError) {
            console.warn(`Failed to delete local file: ${deleteError.message}`);
        }
        */
        
        return {
            success: true,
            message: 'Video migrated to S3 successfully',
            video: updatedVideo,
            migration_info: {
                old_url: video.video_url,
                new_url: uploadResult.url,
                s3_key: uploadResult.key,
                file_size: uploadResult.size
            }
        };
        
    } catch (error) {
        console.error('Migrate video to S3 error:', error);
        throw error;
    }
}

// NEW: Get videos by storage type
static async getVideosByStorageType(storageType, options = {}) {
    try {
        const { page = 1, limit = 20 } = options;
        
        let sql = `
            SELECT v.*, 
                   c.name as category_name,
                   u.username
            FROM videos v
            LEFT JOIN categories c ON v.category_id = c.id
            LEFT JOIN users u ON v.user_id = u.id
            WHERE v.storage_type = ?
            ORDER BY v.created_at DESC
        `;
        
        const params = [storageType];
        
        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        sql += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);
        
        // Count query
        const countSql = `SELECT COUNT(*) as total FROM videos WHERE storage_type = ?`;
        
        const [videos, countResult] = await Promise.all([
            query(sql, params),
            query(countSql, [storageType])
        ]);
        
        const total = countResult[0]?.total || 0;
        const totalPages = Math.ceil(total / parseInt(limit));
        
        return {
            data: videos.map(video => new Video(video)),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: totalPages,
                hasNext: parseInt(page) < totalPages,
                hasPrev: parseInt(page) > 1
            }
        };
    } catch (error) {
        console.error('Get videos by storage type error:', error);
        throw error;
    }
}

// NEW: Get storage statistics
static async getStorageStatistics() {
    try {
        const sql = `
            SELECT 
                storage_type,
                COUNT(*) as video_count,
                COALESCE(SUM(file_size), 0) as total_size,
                COALESCE(AVG(file_size), 0) as avg_size,
                MIN(created_at) as earliest_video,
                MAX(created_at) as latest_video
            FROM videos 
            GROUP BY storage_type
        `;
        
        const results = await query(sql);
        
        const statistics = {
            by_storage_type: results,
            totals: {
                total_videos: results.reduce((sum, row) => sum + row.video_count, 0),
                total_size: results.reduce((sum, row) => sum + parseInt(row.total_size), 0)
            }
        };
        
        return statistics;
    } catch (error) {
        console.error('Get storage statistics error:', error);
        throw error;
    }
}

// NEW: Validate S3 video accessibility
static async validateS3Videos() {
    try {
        const s3Videos = await this.getVideosByStorageType('s3', { limit: 1000 });
        const { extractKeyFromUrl, getFileInfo } = require('../config/aws');
        
        const results = {
            total_checked: s3Videos.data.length,
            accessible: 0,
            inaccessible: 0,
            errors: []
        };
        
        for (const video of s3Videos.data) {
            try {
                const s3Key = extractKeyFromUrl(video.video_url);
                if (!s3Key) {
                    results.errors.push({
                        video_id: video.id,
                        error: 'Could not extract S3 key from URL',
                        url: video.video_url
                    });
                    results.inaccessible++;
                    continue;
                }
                
                const fileInfo = await getFileInfo(s3Key);
                if (fileInfo.success && fileInfo.exists) {
                    results.accessible++;
                } else {
                    results.errors.push({
                        video_id: video.id,
                        error: 'File not found in S3',
                        s3_key: s3Key
                    });
                    results.inaccessible++;
                }
            } catch (error) {
                results.errors.push({
                    video_id: video.id,
                    error: error.message
                });
                results.inaccessible++;
            }
        }
        
        return results;
    } catch (error) {
        console.error('Validate S3 videos error:', error);
        throw error;
    }
}

static async delete(id) {
    try {
        // Get video info before deletion for cleanup
        const video = await this.findById(id);
        if (!video) {
            return false;
        }
        
        // Delete from database first
        const sql = 'DELETE FROM videos WHERE id = ?';
        const result = await query(sql, [id]);
        
        if (result.affectedRows > 0) {
            // Clean up storage files after successful database deletion
            const storageService = require('../services/storageService');
            
            try {
                // Delete main video file
                if (video.video_url) {
                    await storageService.deleteVideo(video.video_url, video.storage_type);
                    console.log(`Deleted video file: ${video.video_url}`);
                }
                
                // Delete thumbnail if exists
                if (video.thumbnail) {
                    await storageService.deleteFile(video.thumbnail, video.storage_type);
                    console.log(`Deleted thumbnail: ${video.thumbnail}`);
                }
            } catch (cleanupError) {
                console.error('File cleanup error after video deletion:', cleanupError);
                // Don't fail the deletion if cleanup fails
            }
            
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Delete video error:', error);
        throw error;
    }
}

// Record share (FIXED to handle missing tables)
static async recordShare(videoId, userId = null, platform = 'unknown') {
    try {
        // Ensure tables exist first
        await this.ensureShareTablesExist();
        
        await transaction(async (connection) => {
            // Record detailed share
            await connection.query(
                'INSERT INTO video_shares (video_id, user_id, platform, created_at) VALUES (?, ?, ?, NOW())',
                [videoId, userId, platform]
            );
            
            // Update shares count
            await connection.query(
                'UPDATE videos SET shares_count = shares_count + 1, updated_at = NOW() WHERE id = ?',
                [videoId]
            );
            
            console.log(`Share recorded for video ${videoId}, platform: ${platform}, user: ${userId}`);
        });
        
        return true;
    } catch (error) {
        console.error('Record share error:', error);
        
        // Fallback: at least update the main count
        try {
            await query('UPDATE videos SET shares_count = shares_count + 1, updated_at = NOW() WHERE id = ?', [videoId]);
            console.log(`Fallback share count updated for video ${videoId}`);
            return true;
        } catch (fallbackError) {
            console.error('Share fallback also failed:', fallbackError);
            return false;
        }
    }
}

// Generate unique slug
static async generateUniqueSlug(title, excludeId = null) {
        try {
            let baseSlug = slugify(title, { lower: true, strict: true });
            let slug = baseSlug;
            let counter = 1;
            
            while (true) {
                let sql = 'SELECT id FROM videos WHERE slug = ?';
                const params = [slug];
                
                if (excludeId) {
                    sql += ' AND id != ?';
                    params.push(excludeId);
                }
                
                const existing = await queryOne(sql, params);
                
                if (!existing) {
                    break;
                }
                
                slug = `${baseSlug}-${counter}`;
                counter++;
            }
            
            return slug;
        } catch (error) {
            console.error('Generate unique slug error:', error);
            throw error;
        }
    }

// Get admin videos with pagination
static async getAdminVideos(options = {}) {
    try {
        const { page = 1, limit = 20, status = null, category = null, search = null } = options;
        
        let sql = `
            SELECT v.*, 
                   c.name as category_name,
                   s.title as series_title,
                   u.username
            FROM videos v
            LEFT JOIN categories c ON v.category_id = c.id
            LEFT JOIN series s ON v.series_id = s.id
            LEFT JOIN users u ON v.user_id = u.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (status) {
            sql += ' AND v.status = ?';
            params.push(status);
        }
        
        if (category) {
            sql += ' AND v.category_id = ?';
            params.push(parseInt(category));
        }
        
        if (search) {
            sql += ' AND (v.title LIKE ? OR v.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        sql += ' ORDER BY v.created_at DESC';
        
        console.log('getAdminVideos SQL:', sql);
        console.log('getAdminVideos params:', params);
        
        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const paginatedSql = sql + ` LIMIT ? OFFSET ?`;
        const paginatedParams = [...params, parseInt(limit), offset];
        
        // Count query
        const countSql = `SELECT COUNT(*) as total FROM videos v
                         LEFT JOIN categories c ON v.category_id = c.id
                         LEFT JOIN series s ON v.series_id = s.id
                         LEFT JOIN users u ON v.user_id = u.id
                         WHERE 1=1` + 
                         (status ? ' AND v.status = ?' : '') +
                         (category ? ' AND v.category_id = ?' : '') +
                         (search ? ' AND (v.title LIKE ? OR v.description LIKE ?)' : '');
        
        const [videos, countResult] = await Promise.all([
            query(paginatedSql, paginatedParams),
            query(countSql, params)
        ]);
        
        const total = countResult[0]?.total || 0;
        const totalPages = Math.ceil(total / parseInt(limit));
        
        return {
            data: videos.map(video => new Video(video)),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: totalPages,
                hasNext: parseInt(page) < totalPages,
                hasPrev: parseInt(page) > 1
            }
        };
    } catch (error) {
        console.error('Get admin videos error:', error);
        return {
            data: [],
            pagination: {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false
            }
        };
    }
}

// Get video analytics
static async getAnalytics(id, days = 30) {
        try {
            const sql = `
                SELECT 
                    DATE(vv.created_at) as date,
                    COUNT(*) as views,
                    COUNT(DISTINCT vv.user_id) as unique_viewers,
                    AVG(vv.watch_duration) as avg_watch_duration
                FROM video_views vv
                WHERE vv.video_id = ? 
                    AND vv.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY DATE(vv.created_at)
                ORDER BY date DESC
            `;
            
            const analytics = await query(sql, [id, days]);
            return analytics;
        } catch (error) {
            console.error('Get video analytics error:', error);
            throw error;
        }
    }

// Get video count
static async getCount() {
        try {
            const result = await queryOne('SELECT COUNT(*) as count FROM videos');
            return result.count;
        } catch (error) {
            console.error('Get video count error:', error);
            return 0;
        }
    }

// Get detailed video statistics
static async getDetailedStats(videoId) {
    try {
        const sql = `
            SELECT 
                v.*,
                (
                    SELECT COUNT(*) FROM video_views vv 
                    WHERE vv.video_id = v.id 
                    AND vv.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                ) as views_today,
                (
                    SELECT COUNT(*) FROM video_views vv 
                    WHERE vv.video_id = v.id 
                    AND vv.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                ) as views_week,
                (
                    SELECT COUNT(*) FROM video_views vv 
                    WHERE vv.video_id = v.id 
                    AND vv.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                ) as views_month,
                (
                    SELECT COALESCE(AVG(vv.watch_duration), 0) FROM video_views vv 
                    WHERE vv.video_id = v.id AND vv.watch_duration > 0
                ) as avg_watch_duration,
                (
                    SELECT COUNT(DISTINCT COALESCE(vv.user_id, vv.ip_address)) FROM video_views vv 
                    WHERE vv.video_id = v.id
                ) as unique_viewers,
                COALESCE(v.likes_count, 0) as total_likes,
                COALESCE(v.shares_count, 0) as total_shares,
                (
                    SELECT COUNT(*) FROM video_views vv 
                    WHERE vv.video_id = v.id 
                    AND vv.watch_duration >= (v.duration * 0.8)
                ) as completion_rate
            FROM videos v 
            WHERE v.id = ?
        `;
        
        const result = await queryOne(sql, [videoId]);
        return result;
    } catch (error) {
        console.error('Get detailed stats error:', error);
        throw error;
    }
}

// Get analytics for admin dashboard
static async getAnalyticsOverview(days = 30) {
    try {
        console.log(`Getting analytics overview for ${days} days`);
        
        // Ensure tables exist
        await Promise.all([
            this.ensureViewTablesExist(),
            this.ensureLikeTablesExist(),
            this.ensureShareTablesExist()
        ]);
        
        // Views over time
        const viewsQuery = `
            SELECT 
                DATE(vv.created_at) as date,
                COUNT(*) as total_views,
                COUNT(DISTINCT vv.video_id) as videos_viewed,
                COUNT(DISTINCT COALESCE(vv.user_id, vv.ip_address)) as unique_users,
                COALESCE(AVG(vv.watch_duration), 0) as avg_duration
            FROM video_views vv 
            WHERE vv.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE(vv.created_at)
            ORDER BY date DESC
        `;
        
        let viewsData = [];
        try {
            viewsData = await query(viewsQuery, [days]);
        } catch (error) {
            console.log('Views query failed:', error);
        }
        
        // Top performing videos
        const topVideosQuery = `
            SELECT 
                v.id, 
                v.title, 
                v.slug,
                COALESCE(v.views_count, 0) as views_count, 
                COALESCE(v.likes_count, 0) as likes_count, 
                COALESCE(v.shares_count, 0) as shares_count,
                (COALESCE(v.views_count, 0) * 0.5 + COALESCE(v.likes_count, 0) * 0.3 + COALESCE(v.shares_count, 0) * 0.2) as engagement_score
            FROM videos v 
            WHERE v.status = 'published'
                AND v.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            ORDER BY engagement_score DESC 
            LIMIT 10
        `;
        
        let topVideos = [];
        try {
            topVideos = await query(topVideosQuery, [days]);
        } catch (error) {
            console.log('Top videos query failed:', error);
        }
        
        // Platform share stats
        const platformQuery = `
            SELECT 
                COALESCE(vs.platform, 'unknown') as platform,
                COUNT(*) as share_count
            FROM video_shares vs 
            WHERE vs.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY vs.platform
            ORDER BY share_count DESC
        `;
        
        let platformStats = [];
        try {
            platformStats = await query(platformQuery, [days]);
        } catch (error) {
            console.log('Platform stats query failed:', error);
        }
        
        return {
            viewsOverTime: viewsData,
            topVideos: topVideos,
            sharesByPlatform: platformStats
        };
    } catch (error) {
        console.error('Get analytics overview error:', error);
        return {
            viewsOverTime: [],
            topVideos: [],
            sharesByPlatform: []
        };
    }
}

}

module.exports = Video;