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
            // Generate slug
            const slug = await this.generateUniqueSlug(videoData.title);
            
            const sql = `
                INSERT INTO videos (
                    title, description, slug, video_url, thumbnail, duration,
                    file_size, video_quality, storage_type, category_id, series_id,
                    user_id, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                videoData.category_id || null,
                videoData.series_id || null,
                videoData.user_id,
                videoData.status || 'draft'
            ];
            
            const result = await query(sql, params);
            return await this.findById(result.insertId);
        } catch (error) {
            console.error('Video creation error:', error);
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
            title: 'Welcome to VideoApp!',
            description: 'This is a demo video. Upload your own videos to get started.',
            slug: 'welcome-to-videoapp',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            thumbnail: 'https://via.placeholder.com/300x400/ff6b6b/white?text=Demo+Video',
            views_count: 1000,
            likes_count: 50,
            shares_count: 10,
            status: 'published',
            category_name: 'Demo',
            username: 'VideoApp',
            created_at: new Date().toISOString()
        },
        {
            id: 'demo-2',
            title: 'Sample Video Content',
            description: 'Another demo video to showcase the platform features.',
            slug: 'sample-video-content',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            thumbnail: 'https://via.placeholder.com/300x400/4ecdc4/white?text=Sample+Video',
            views_count: 750,
            likes_count: 35,
            shares_count: 8,
            status: 'published',
            category_name: 'Demo',
            username: 'VideoApp',
            created_at: new Date().toISOString()
        },
        {
            id: 'demo-3',
            title: 'Getting Started Tutorial',
            description: 'Learn how to use VideoApp with this quick tutorial.',
            slug: 'getting-started-tutorial',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            thumbnail: 'https://via.placeholder.com/300x400/45b7d1/white?text=Tutorial',
            views_count: 500,
            likes_count: 25,
            shares_count: 5,
            status: 'published',
            category_name: 'Tutorial',
            username: 'VideoApp',
            created_at: new Date().toISOString()
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
        // Calculate date threshold
        const daysAgo = parseInt(timeFrame);
        
        const sql = `
            SELECT v.*, 
                   c.name as category_name,
                   u.username,
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
        
        const videos = await query(sql, [daysAgo, daysAgo, daysAgo, daysAgo, Math.min(daysAgo * 2, 60), limit]);
        return videos.map(video => new Video(video));
    } catch (error) {
        console.error('Get trending videos error:', error);
        
        // Fallback: return most viewed recent videos
        try {
            const fallbackSql = `
                SELECT v.*, c.name as category_name, u.username
                FROM videos v
                LEFT JOIN categories c ON v.category_id = c.id
                LEFT JOIN users u ON v.user_id = u.id
                WHERE v.status = 'published'
                    AND v.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                ORDER BY v.views_count DESC, v.created_at DESC
                LIMIT ?
            `;
            
            const videos = await query(fallbackSql, [parseInt(timeFrame), limit]);
            return videos.map(video => new Video(video));
        } catch (fallbackError) {
            console.error('Fallback trending query failed:', fallbackError);
            return [];
        }
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
            const sql = 'DELETE FROM videos WHERE id = ?';
            const result = await query(sql, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Delete video error:', error);
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