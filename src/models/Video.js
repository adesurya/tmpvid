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
                       u.username,
                       MATCH(v.title, v.description) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance_score
                FROM videos v
                LEFT JOIN categories c ON v.category_id = c.id
                LEFT JOIN users u ON v.user_id = u.id
                WHERE v.status = 'published'
                AND (v.title LIKE ? OR v.description LIKE ? OR MATCH(v.title, v.description) AGAINST(? IN NATURAL LANGUAGE MODE))
            `;
            
            const params = [
                searchTerm,
                `%${searchTerm}%`,
                `%${searchTerm}%`,
                searchTerm
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
                    sql += ' ORDER BY relevance_score DESC, v.views_count DESC';
            }
            
            const result = await dbUtils.paginate(sql, params, page, limit);
            result.data = result.data.map(video => new Video(video));
            
            return result;
        } catch (error) {
            console.error('Search videos error:', error);
            throw error;
        }
    }

    // Get trending videos
    static async getTrending(limit = 20, timeFrame = '7') {
        try {
            const sql = `
                SELECT v.*, 
                       c.name as category_name,
                       u.username,
                       COUNT(vv.id) as recent_views,
                       (COUNT(vv.id) * 0.5 + v.likes_count * 0.3 + v.shares_count * 0.2) as trending_score
                FROM videos v
                LEFT JOIN categories c ON v.category_id = c.id
                LEFT JOIN users u ON v.user_id = u.id
                LEFT JOIN video_views vv ON v.id = vv.video_id 
                    AND vv.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                WHERE v.status = 'published'
                    AND v.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY v.id
                ORDER BY trending_score DESC, v.created_at DESC
                LIMIT ?
            `;
            
            const videos = await query(sql, [timeFrame, limit]);
            return videos.map(video => new Video(video));
        } catch (error) {
            console.error('Get trending videos error:', error);
            throw error;
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
        // Check if video_views table exists
        try {
            await query('SELECT 1 FROM video_views LIMIT 1');
        } catch (tableError) {
            console.log('video_views table does not exist, creating...');
            await query(`
                CREATE TABLE IF NOT EXISTS video_views (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    video_id INT NOT NULL,
                    user_id INT NULL,
                    ip_address VARCHAR(45) NULL,
                    user_agent TEXT NULL,
                    watch_duration INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
                )
            `);
        }
        
        return await transaction(async (connection) => {
            // Update video views count
            await connection.query(
                'UPDATE videos SET views_count = views_count + 1 WHERE id = ?',
                [videoId]
            );
            
            // Log the view
            await connection.query(`
                INSERT INTO video_views (video_id, user_id, ip_address, user_agent, watch_duration)
                VALUES (?, ?, ?, ?, ?)
            `, [videoId, userId, ipAddress, userAgent, watchDuration]);
        });
        
        return true;
    } catch (error) {
        console.error('Increment views error:', error);
        // Fallback: just update the count
        try {
            await query('UPDATE videos SET views_count = views_count + 1 WHERE id = ?', [videoId]);
            return true;
        } catch (fallbackError) {
            console.log('View fallback also failed:', fallbackError);
            return false;
        }
    }
}

// Toggle like
static async toggleLike(videoId, userId) {
    try {
        // First check if video_likes table exists
        try {
            await query('SELECT 1 FROM video_likes LIMIT 1');
        } catch (tableError) {
            console.log('video_likes table does not exist, creating...');
            await query(`
                CREATE TABLE IF NOT EXISTS video_likes (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    video_id INT NOT NULL,
                    user_id INT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_video_user_like (video_id, user_id),
                    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
                )
            `);
        }
        
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
                
                await connection.query(
                    'UPDATE videos SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?',
                    [videoId]
                );
                
                return { liked: false, action: 'unliked' };
            } else {
                // Add like
                await connection.query(
                    'INSERT INTO video_likes (video_id, user_id) VALUES (?, ?)',
                    [videoId, userId]
                );
                
                await connection.query(
                    'UPDATE videos SET likes_count = likes_count + 1 WHERE id = ?',
                    [videoId]
                );
                
                return { liked: true, action: 'liked' };
            }
        });
    } catch (error) {
        console.error('Toggle like error:', error);
        // Fallback: just update the count without tracking individual likes
        try {
            await query('UPDATE videos SET likes_count = likes_count + 1 WHERE id = ?', [videoId]);
            return { liked: true, action: 'liked' };
        } catch (fallbackError) {
            throw error;
        }
    }
}

// Record share (FIXED to handle missing tables)
static async recordShare(videoId, userId = null, platform = 'unknown') {
    try {
        // Check if video_shares table exists
        try {
            await query('SELECT 1 FROM video_shares LIMIT 1');
        } catch (tableError) {
            console.log('video_shares table does not exist, creating...');
            await query(`
                CREATE TABLE IF NOT EXISTS video_shares (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    video_id INT NOT NULL,
                    user_id INT NULL,
                    platform VARCHAR(50) NOT NULL DEFAULT 'unknown',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
                )
            `);
        }
        
        await transaction(async (connection) => {
            // Record share
            await connection.query(
                'INSERT INTO video_shares (video_id, user_id, platform, created_at) VALUES (?, ?, ?, NOW())',
                [videoId, userId, platform]
            );
            
            // Update shares count
            await connection.query(
                'UPDATE videos SET shares_count = shares_count + 1, updated_at = NOW() WHERE id = ?',
                [videoId]
            );
        });
        
        return true;
    } catch (error) {
        console.error('Record share error:', error);
        // Fallback: just update the count
        try {
            await query('UPDATE videos SET shares_count = shares_count + 1 WHERE id = ?', [videoId]);
            return true;
        } catch (fallbackError) {
            console.log('Share fallback also failed:', fallbackError);
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
        
        // Views over time with better error handling
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
        
        let viewsData;
        try {
            viewsData = await query(viewsQuery, [days]);
        } catch (error) {
            console.log('Views query failed, using fallback');
            viewsData = [];
        }
        
        // Top performing videos
        const topVideosQuery = `
            SELECT 
                v.id, 
                v.title, 
                COALESCE(v.views_count, 0) as views_count, 
                COALESCE(v.likes_count, 0) as likes_count, 
                COALESCE(v.shares_count, 0) as shares_count,
                (COALESCE(v.views_count, 0) * 0.5 + COALESCE(v.likes_count, 0) * 0.3 + COALESCE(v.shares_count, 0) * 0.2) as engagement_score
            FROM videos v 
            WHERE v.status = 'published'
            ORDER BY engagement_score DESC 
            LIMIT 10
        `;
        
        let topVideos;
        try {
            topVideos = await query(topVideosQuery);
        } catch (error) {
            console.log('Top videos query failed, using fallback');
            topVideos = [];
        }
        
        // Platform stats with better error handling
        const platformQuery = `
            SELECT 
                COALESCE(vs.platform, 'unknown') as platform,
                COUNT(*) as share_count
            FROM video_shares vs 
            WHERE vs.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY vs.platform
            ORDER BY share_count DESC
        `;
        
        let platformStats;
        try {
            platformStats = await query(platformQuery, [days]);
        } catch (error) {
            console.log('Platform stats query failed, using fallback');
            platformStats = [];
        }
        
        return {
            viewsOverTime: viewsData,
            topVideos: topVideos,
            sharesByPlatform: platformStats
        };
    } catch (error) {
        console.error('Get analytics overview error:', error);
        // Return safe fallback data
        return {
            viewsOverTime: [],
            topVideos: [],
            sharesByPlatform: []
        };
    }
}

}

module.exports = Video;