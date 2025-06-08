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
                       (v.views_count * 0.6 + v.likes_count * 0.3 + v.shares_count * 0.1) as engagement_score
                FROM videos v
                LEFT JOIN categories c ON v.category_id = c.id
                LEFT JOIN users u ON v.user_id = u.id
                WHERE v.status = 'published'
            `;
            
            const params = [];
            
            if (excludeId) {
                sql += ' AND v.id != ?';
                params.push(excludeId);
            }
            
            sql += ' ORDER BY engagement_score DESC, RAND() LIMIT ?';
            params.push(limit);
            
            const videos = await query(sql, params);
            return videos.map(video => new Video(video));
        } catch (error) {
            console.error('Get random videos error:', error);
            throw error;
        }
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

    // Increment view count
    static async incrementViews(id, userId = null, ipAddress = null, userAgent = null, watchDuration = 0) {
        try {
            await transaction(async (connection) => {
                // Update video views count
                await connection.execute(
                    'UPDATE videos SET views_count = views_count + 1 WHERE id = ?',
                    [id]
                );
                
                // Log the view
                await connection.execute(`
                    INSERT INTO video_views (video_id, user_id, ip_address, user_agent, watch_duration)
                    VALUES (?, ?, ?, ?, ?)
                `, [id, userId, ipAddress, userAgent, watchDuration]);
            });
            
            return true;
        } catch (error) {
            console.error('Increment views error:', error);
            throw error;
        }
    }

    // Toggle like
    static async toggleLike(videoId, userId) {
        try {
            return await transaction(async (connection) => {
                // Check if already liked
                const [existing] = await connection.execute(
                    'SELECT id FROM video_likes WHERE video_id = ? AND user_id = ?',
                    [videoId, userId]
                );
                
                if (existing.length > 0) {
                    // Remove like
                    await connection.execute(
                        'DELETE FROM video_likes WHERE video_id = ? AND user_id = ?',
                        [videoId, userId]
                    );
                    
                    await connection.execute(
                        'UPDATE videos SET likes_count = likes_count - 1 WHERE id = ?',
                        [videoId]
                    );
                    
                    return { liked: false, action: 'unliked' };
                } else {
                    // Add like
                    await connection.execute(
                        'INSERT INTO video_likes (video_id, user_id) VALUES (?, ?)',
                        [videoId, userId]
                    );
                    
                    await connection.execute(
                        'UPDATE videos SET likes_count = likes_count + 1 WHERE id = ?',
                        [videoId]
                    );
                    
                    return { liked: true, action: 'liked' };
                }
            });
        } catch (error) {
            console.error('Toggle like error:', error);
            throw error;
        }
    }

    // Record share
    static async recordShare(videoId, userId = null, platform = 'unknown') {
        try {
            await transaction(async (connection) => {
                // Record share
                await connection.execute(
                    'INSERT INTO video_shares (video_id, user_id, platform) VALUES (?, ?, ?)',
                    [videoId, userId, platform]
                );
                
                // Update shares count
                await connection.execute(
                    'UPDATE videos SET shares_count = shares_count + 1 WHERE id = ?',
                    [videoId]
                );
            });
            
            return true;
        } catch (error) {
            console.error('Record share error:', error);
            throw error;
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
                params.push(category);
            }
            
            if (search) {
                sql += ' AND (v.title LIKE ? OR v.description LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }
            
            sql += ' ORDER BY v.created_at DESC';
            
            const result = await dbUtils.paginate(sql, params, page, limit);
            result.data = result.data.map(video => new Video(video));
            
            return result;
        } catch (error) {
            console.error('Get admin videos error:', error);
            throw error;
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
}

module.exports = Video;