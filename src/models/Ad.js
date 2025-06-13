// src/models/Ad.js
const { query, queryOne, transaction } = require('../config/database');

class Ad {
    constructor(data = {}) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
        this.type = data.type; // 'video' or 'image'
        this.media_url = data.media_url; // video or image URL
        this.click_url = data.click_url; // destination URL when clicked
        this.duration = data.duration; // in seconds for video ads
        this.slot_position = data.slot_position; // 1-5
        this.impressions_count = data.impressions_count || 0;
        this.clicks_count = data.clicks_count || 0;
        this.is_active = data.is_active;
        this.start_date = data.start_date;
        this.end_date = data.end_date;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Initialize ads table
    static async initializeTable() {
        try {
            await query(`
                CREATE TABLE IF NOT EXISTS ads (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    type ENUM('video', 'image') NOT NULL DEFAULT 'image',
                    media_url VARCHAR(500) NOT NULL,
                    click_url VARCHAR(500),
                    duration INT DEFAULT 0,
                    slot_position INT NOT NULL CHECK (slot_position BETWEEN 1 AND 5),
                    impressions_count INT DEFAULT 0,
                    clicks_count INT DEFAULT 0,
                    is_active BOOLEAN DEFAULT true,
                    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    end_date DATETIME NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_ads_slot_position (slot_position),
                    INDEX idx_ads_is_active (is_active),
                    INDEX idx_ads_dates (start_date, end_date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            // Create ad impressions tracking table
            await query(`
                CREATE TABLE IF NOT EXISTS ad_impressions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    ad_id INT NOT NULL,
                    user_id INT NULL,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE,
                    INDEX idx_ad_impressions_ad_id (ad_id),
                    INDEX idx_ad_impressions_created_at (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            // Create ad clicks tracking table
            await query(`
                CREATE TABLE IF NOT EXISTS ad_clicks (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    ad_id INT NOT NULL,
                    user_id INT NULL,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    referrer VARCHAR(500),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE,
                    INDEX idx_ad_clicks_ad_id (ad_id),
                    INDEX idx_ad_clicks_created_at (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            console.log('✅ Ads tables initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing ads tables:', error);
            throw error;
        }
    }

    // Create new ad
    static async create(adData) {
        try {
            const sql = `
                INSERT INTO ads (
                    title, description, type, media_url, click_url, 
                    duration, slot_position, is_active, start_date, end_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const params = [
                adData.title,
                adData.description || null,
                adData.type,
                adData.media_url,
                adData.click_url || null,
                adData.duration || 0,
                adData.slot_position,
                adData.is_active !== undefined ? adData.is_active : true,
                adData.start_date || new Date(),
                adData.end_date || null
            ];
            
            const result = await query(sql, params);
            return await this.findById(result.insertId);
        } catch (error) {
            console.error('Create ad error:', error);
            throw error;
        }
    }

    // Find ad by ID
    static async findById(id) {
        try {
            const sql = 'SELECT * FROM ads WHERE id = ?';
            const ad = await queryOne(sql, [id]);
            return ad ? new Ad(ad) : null;
        } catch (error) {
            console.error('Find ad by ID error:', error);
            throw error;
        }
    }

    // Get active ads for video feed (ordered by slot position)
    static async getActiveAdsForFeed() {
        try {
            const sql = `
                SELECT * FROM ads 
                WHERE is_active = true 
                    AND (start_date IS NULL OR start_date <= NOW())
                    AND (end_date IS NULL OR end_date >= NOW())
                ORDER BY slot_position ASC, created_at ASC
            `;
            
            const ads = await query(sql);
            return ads.map(ad => new Ad(ad));
        } catch (error) {
            console.error('Get active ads for feed error:', error);
            return [];
        }
    }

    // Get ad by slot position
    static async getAdBySlot(slotPosition) {
        try {
            const sql = `
                SELECT * FROM ads 
                WHERE slot_position = ? 
                    AND is_active = true 
                    AND (start_date IS NULL OR start_date <= NOW())
                    AND (end_date IS NULL OR end_date >= NOW())
                ORDER BY created_at DESC
                LIMIT 1
            `;
            
            const ad = await queryOne(sql, [slotPosition]);
            return ad ? new Ad(ad) : null;
        } catch (error) {
            console.error('Get ad by slot error:', error);
            return null;
        }
    }

    // Get all ads for admin (with pagination)
    static async getAdminAds(options = {}) {
        try {
            const { page = 1, limit = 20, status = null, slot = null, type = null } = options;
            
            let sql = 'SELECT * FROM ads WHERE 1=1';
            const params = [];
            
            if (status !== null) {
                sql += ' AND is_active = ?';
                params.push(status === 'active');
            }
            
            if (slot) {
                sql += ' AND slot_position = ?';
                params.push(parseInt(slot));
            }
            
            if (type) {
                sql += ' AND type = ?';
                params.push(type);
            }
            
            sql += ' ORDER BY slot_position ASC, created_at DESC';
            
            // Pagination
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const paginatedSql = sql + ` LIMIT ? OFFSET ?`;
            const paginatedParams = [...params, parseInt(limit), offset];
            
            // Count query
            const countSql = `SELECT COUNT(*) as total FROM ads WHERE 1=1` + 
                             (status !== null ? ' AND is_active = ?' : '') +
                             (slot ? ' AND slot_position = ?' : '') +
                             (type ? ' AND type = ?' : '');
            
            const [ads, countResult] = await Promise.all([
                query(paginatedSql, paginatedParams),
                query(countSql, params)
            ]);
            
            const total = countResult[0]?.total || 0;
            const totalPages = Math.ceil(total / parseInt(limit));
            
            return {
                data: ads.map(ad => new Ad(ad)),
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
            console.error('Get admin ads error:', error);
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

    // Update ad
    static async update(id, updateData) {
        try {
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
            
            const sql = `UPDATE ads SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`;
            await query(sql, params);
            
            return await this.findById(id);
        } catch (error) {
            console.error('Update ad error:', error);
            throw error;
        }
    }

    // Delete ad
    static async delete(id) {
        try {
            const sql = 'DELETE FROM ads WHERE id = ?';
            const result = await query(sql, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Delete ad error:', error);
            throw error;
        }
    }

    // Record ad impression
    static async recordImpression(adId, userId = null, ipAddress = null, userAgent = null) {
        try {
            await transaction(async (connection) => {
                // Record detailed impression
                await connection.query(
                    'INSERT INTO ad_impressions (ad_id, user_id, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, NOW())',
                    [adId, userId, ipAddress, userAgent]
                );
                
                // Update impressions count
                await connection.query(
                    'UPDATE ads SET impressions_count = impressions_count + 1 WHERE id = ?',
                    [adId]
                );
            });
            
            console.log(`Ad impression recorded for ad ${adId}`);
            return true;
        } catch (error) {
            console.error('Record ad impression error:', error);
            return false;
        }
    }

    // Record ad click
    static async recordClick(adId, userId = null, ipAddress = null, userAgent = null, referrer = null) {
        try {
            await transaction(async (connection) => {
                // Record detailed click
                await connection.query(
                    'INSERT INTO ad_clicks (ad_id, user_id, ip_address, user_agent, referrer, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                    [adId, userId, ipAddress, userAgent, referrer]
                );
                
                // Update clicks count
                await connection.query(
                    'UPDATE ads SET clicks_count = clicks_count + 1 WHERE id = ?',
                    [adId]
                );
            });
            
            console.log(`Ad click recorded for ad ${adId}`);
            return true;
        } catch (error) {
            console.error('Record ad click error:', error);
            return false;
        }
    }

    // Get ad analytics
    static async getAnalytics(adId, days = 30) {
        try {
            const sql = `
                SELECT 
                    DATE(ai.created_at) as date,
                    COUNT(*) as impressions,
                    COUNT(DISTINCT ai.user_id) as unique_viewers
                FROM ad_impressions ai
                WHERE ai.ad_id = ? 
                    AND ai.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY DATE(ai.created_at)
                ORDER BY date DESC
            `;
            
            const clicksSql = `
                SELECT 
                    DATE(ac.created_at) as date,
                    COUNT(*) as clicks
                FROM ad_clicks ac
                WHERE ac.ad_id = ? 
                    AND ac.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY DATE(ac.created_at)
                ORDER BY date DESC
            `;
            
            const [impressions, clicks] = await Promise.all([
                query(sql, [adId, days]),
                query(clicksSql, [adId, days])
            ]);
            
            return { impressions, clicks };
        } catch (error) {
            console.error('Get ad analytics error:', error);
            return { impressions: [], clicks: [] };
        }
    }

    // Get ads performance summary
    static async getPerformanceSummary() {
        try {
            const sql = `
                SELECT 
                    a.id,
                    a.title,
                    a.slot_position,
                    a.type,
                    a.impressions_count,
                    a.clicks_count,
                    CASE 
                        WHEN a.impressions_count > 0 
                        THEN ROUND((a.clicks_count / a.impressions_count) * 100, 2)
                        ELSE 0 
                    END as ctr_percentage,
                    a.is_active,
                    a.created_at
                FROM ads a
                ORDER BY a.impressions_count DESC, a.clicks_count DESC
            `;
            
            const results = await query(sql);
            return results.map(ad => new Ad(ad));
        } catch (error) {
            console.error('Get ads performance summary error:', error);
            return [];
        }
    }

    // Get ads count
    static async getCount() {
        try {
            const result = await queryOne('SELECT COUNT(*) as count FROM ads');
            return result.count;
        } catch (error) {
            console.error('Get ads count error:', error);
            return 0;
        }
    }

    // Toggle ad status
    static async toggleStatus(id) {
        try {
            const ad = await this.findById(id);
            if (!ad) throw new Error('Ad not found');
            
            const newStatus = !ad.is_active;
            await this.update(id, { is_active: newStatus });
            
            return newStatus;
        } catch (error) {
            console.error('Toggle ad status error:', error);
            throw error;
        }
    }
}

module.exports = Ad;