// src/models/Ad.js - FIXED Ad Model
const { query, queryOne, transaction } = require('../database/connection');

class Ad {
    constructor(data) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
        this.type = data.type;
        this.media_url = data.media_url;
        this.google_ads_script = data.google_ads_script;
        this.click_url = data.click_url;
        this.open_new_tab = Boolean(data.open_new_tab);
        this.duration = parseInt(data.duration) || 0;
        this.slot_position = parseInt(data.slot_position);
        this.impressions_count = parseInt(data.impressions_count) || 0;
        this.clicks_count = parseInt(data.clicks_count) || 0;
        this.is_active = Boolean(data.is_active);
        this.start_date = data.start_date;
        this.end_date = data.end_date;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Initialize tables (create if not exist)
    static async initializeTable() {
        try {
            console.log('🔧 Initializing ads tables...');
            
            // The tables already exist according to your DDL, so we just need to verify
            const result = await queryOne(`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                AND table_name = 'ads'
            `);
            
            if (result.count === 0) {
                throw new Error('Ads table does not exist. Please run the DDL script first.');
            }
            
            console.log('✅ Ads tables verified successfully');
            return true;
        } catch (error) {
            console.error('❌ Initialize ads table error:', error);
            throw error;
        }
    }

    // Create new ad
    static async create(adData) {
        try {
            console.log('📝 Creating ad with data:', adData);
            
            const sql = `
                INSERT INTO ads (
                    title, description, type, media_url, google_ads_script,
                    click_url, open_new_tab, duration, slot_position,
                    is_active, start_date, end_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const values = [
                adData.title,
                adData.description || null,
                adData.type,
                adData.media_url || null,
                adData.google_ads_script || null,
                adData.click_url || null,
                adData.open_new_tab ? 1 : 0,
                parseInt(adData.duration) || 0,
                parseInt(adData.slot_position),
                adData.is_active ? 1 : 0,
                adData.start_date || new Date(),
                adData.end_date || null
            ];
            
            const result = await query(sql, values);
            
            if (result.insertId) {
                console.log('✅ Ad created with ID:', result.insertId);
                return await this.findById(result.insertId);
            } else {
                throw new Error('Failed to create ad - no insert ID returned');
            }
        } catch (error) {
            console.error('❌ Create ad error:', error);
            throw error;
        }
    }

    // Find ad by ID
    static async findById(id) {
        try {
            if (!id || isNaN(parseInt(id))) {
                throw new Error('Invalid ad ID');
            }

            const sql = 'SELECT * FROM ads WHERE id = ?';
            const result = await queryOne(sql, [parseInt(id)]);
            
            if (result) {
                return new Ad(result);
            }
            
            return null;
        } catch (error) {
            console.error('❌ Find ad by ID error:', error);
            throw error;
        }
    }

    // Update ad
    static async update(id, updateData) {
        try {
            if (!id || isNaN(parseInt(id))) {
                throw new Error('Invalid ad ID');
            }

            console.log('📝 Updating ad ID:', id, 'with data:', updateData);
            
            const setParts = [];
            const values = [];
            
            // Build dynamic update query
            const allowedFields = [
                'title', 'description', 'type', 'media_url', 'google_ads_script',
                'click_url', 'open_new_tab', 'duration', 'slot_position',
                'is_active', 'start_date', 'end_date'
            ];
            
            for (const field of allowedFields) {
                if (updateData.hasOwnProperty(field)) {
                    setParts.push(`${field} = ?`);
                    
                    if (field === 'open_new_tab' || field === 'is_active') {
                        values.push(updateData[field] ? 1 : 0);
                    } else if (field === 'duration' || field === 'slot_position') {
                        values.push(parseInt(updateData[field]) || 0);
                    } else {
                        values.push(updateData[field]);
                    }
                }
            }
            
            if (setParts.length === 0) {
                throw new Error('No valid fields to update');
            }
            
            setParts.push('updated_at = NOW()');
            values.push(parseInt(id));
            
            const sql = `UPDATE ads SET ${setParts.join(', ')} WHERE id = ?`;
            
            const result = await query(sql, values);
            
            if (result.affectedRows > 0) {
                console.log('✅ Ad updated successfully');
                return await this.findById(id);
            } else {
                throw new Error('Ad not found or no changes made');
            }
        } catch (error) {
            console.error('❌ Update ad error:', error);
            throw error;
        }
    }

    // Delete ad
    static async delete(id) {
        try {
            if (!id || isNaN(parseInt(id))) {
                throw new Error('Invalid ad ID');
            }

            const sql = 'DELETE FROM ads WHERE id = ?';
            const result = await query(sql, [parseInt(id)]);
            
            console.log('🗑️ Delete result:', result);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('❌ Delete ad error:', error);
            throw error;
        }
    }

    // Get all ads with pagination and filters
    static async getAll(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                status = null,
                type = null,
                slot = null
            } = options;

            let sql = 'SELECT * FROM ads WHERE 1=1';
            const values = [];

            // Apply filters
            if (status === 'active') {
                sql += ' AND is_active = 1';
            } else if (status === 'inactive') {
                sql += ' AND is_active = 0';
            }

            if (type && ['image', 'video', 'google_ads'].includes(type)) {
                sql += ' AND type = ?';
                values.push(type);
            }

            if (slot && !isNaN(parseInt(slot))) {
                sql += ' AND slot_position = ?';
                values.push(parseInt(slot));
            }

            // Add ordering
            sql += ' ORDER BY slot_position ASC, created_at DESC';

            // Add pagination
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
            const offset = (pageNum - 1) * limitNum;

            const paginatedSql = sql + ' LIMIT ? OFFSET ?';
            const paginatedValues = [...values, limitNum, offset];

            // Get total count
            const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
            
            const [ads, countResult] = await Promise.all([
                query(paginatedSql, paginatedValues),
                query(countSql, values)
            ]);

            const total = countResult[0]?.total || 0;
            const totalPages = Math.ceil(total / limitNum);

            return {
                data: ads.map(ad => new Ad(ad)),
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: total,
                    totalPages: totalPages,
                    hasNext: pageNum < totalPages,
                    hasPrev: pageNum > 1
                }
            };
        } catch (error) {
            console.error('❌ Get all ads error:', error);
            return {
                data: [],
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 0,
                    totalPages: 0,
                    hasNext: false,
                    hasPrev: false
                }
            };
        }
    }

    // Get admin ads (alias for getAll)
    static async getAdminAds(options = {}) {
        return await this.getAll(options);
    }

    // Get ad by slot position
    static async getAdBySlot(slotPosition) {
        try {
            if (!slotPosition || isNaN(parseInt(slotPosition))) {
                console.warn('⚠️ Invalid slot position:', slotPosition);
                return null;
            }

            const slot = parseInt(slotPosition);
            if (slot < 1 || slot > 5) {
                console.warn('⚠️ Slot position out of range:', slot);
                return null;
            }

            const sql = `
                SELECT * FROM ads 
                WHERE slot_position = ? 
                    AND is_active = 1 
                    AND (start_date IS NULL OR start_date <= NOW())
                    AND (end_date IS NULL OR end_date >= NOW())
                ORDER BY created_at DESC 
                LIMIT 1
            `;
            
            const result = await queryOne(sql, [slot]);
            
            if (result) {
                console.log(`✅ Found ad for slot ${slot}: ${result.title} (${result.type})`);
                return new Ad(result);
            } else {
                console.log(`❌ No active ad found for slot ${slot}`);
                return null;
            }
        } catch (error) {
            console.error('❌ Get ad by slot error:', error);
            return null;
        }
    }

    // Record ad impression
    static async recordImpression(adId, userId = null, ipAddress = null, userAgent = null, videoIndex = null) {
        try {
            if (!adId || isNaN(parseInt(adId))) {
                console.warn('⚠️ Invalid ad ID for impression:', adId);
                return false;
            }

            // Validate ad exists and is active
            const ad = await this.findById(adId);
            if (!ad) {
                console.warn('⚠️ Ad not found for impression:', adId);
                return false;
            }
            
            if (!ad.is_active) {
                console.warn('⚠️ Ad is inactive for impression:', adId);
                return false;
            }

            await transaction(async (connection) => {
                try {
                    // Record detailed impression
                    await connection.query(
                        `INSERT INTO ad_impressions (ad_id, user_id, ip_address, user_agent, video_index, created_at) 
                        VALUES (?, ?, ?, ?, ?, NOW())`,
                        [
                            parseInt(adId), 
                            userId ? parseInt(userId) : null, 
                            ipAddress || '127.0.0.1', 
                            userAgent ? userAgent.substring(0, 500) : 'Unknown',
                            videoIndex ? parseInt(videoIndex) : null
                        ]
                    );
                    
                    // Update impressions count
                    await connection.query(
                        'UPDATE ads SET impressions_count = impressions_count + 1, updated_at = NOW() WHERE id = ?',
                        [parseInt(adId)]
                    );
                    
                    console.log(`📊 Ad impression recorded for ad ${adId}`);
                } catch (innerError) {
                    console.error('❌ Failed to record impression in transaction:', innerError);
                    throw innerError;
                }
            });
            
            return true;
        } catch (error) {
            console.error('❌ Record impression error:', error);
            
            // Try to at least update the counter if detailed tracking fails
            try {
                await query(
                    'UPDATE ads SET impressions_count = impressions_count + 1, updated_at = NOW() WHERE id = ? AND is_active = 1',
                    [parseInt(adId)]
                );
                console.log(`📊 Basic impression count updated for ad ${adId}`);
                return true;
            } catch (fallbackError) {
                console.error('❌ Fallback impression recording also failed:', fallbackError);
                return false;
            }
        }
    }

    // Record ad click
    static async recordClick(adId, userId = null, ipAddress = null, userAgent = null, referrer = null) {
        try {
            if (!adId || isNaN(parseInt(adId))) {
                console.warn('⚠️ Invalid ad ID for click:', adId);
                return false;
            }

            const ad = await this.findById(adId);
            if (!ad) {
                console.warn('⚠️ Ad not found for click:', adId);
                return false;
            }
            
            if (!ad.is_active) {
                console.warn('⚠️ Ad is inactive for click:', adId);
                return false;
            }

            if (ad.type === 'google_ads') {
                console.log(`⚠️ Ad ${adId} is Google Ads - clicks managed by Google`);
                return false;
            }

            if (!ad.click_url) {
                console.warn('⚠️ Ad has no click URL:', adId);
                return false;
            }

            await transaction(async (connection) => {
                try {
                    // Record detailed click
                    await connection.query(
                        `INSERT INTO ad_clicks (ad_id, user_id, ip_address, user_agent, referrer, created_at) 
                        VALUES (?, ?, ?, ?, ?, NOW())`,
                        [
                            parseInt(adId), 
                            userId ? parseInt(userId) : null, 
                            ipAddress || '127.0.0.1', 
                            userAgent ? userAgent.substring(0, 500) : 'Unknown',
                            referrer ? referrer.substring(0, 500) : ''
                        ]
                    );
                    
                    // Update clicks count
                    await connection.query(
                        'UPDATE ads SET clicks_count = clicks_count + 1, updated_at = NOW() WHERE id = ?',
                        [parseInt(adId)]
                    );
                    
                    console.log(`🖱️ Ad click recorded for ad ${adId}`);
                } catch (innerError) {
                    console.error('❌ Failed to record click in transaction:', innerError);
                    throw innerError;
                }
            });
            
            return true;
        } catch (error) {
            console.error('❌ Record click error:', error);
            
            // Try to at least update the counter if detailed tracking fails
            try {
                await query(
                    'UPDATE ads SET clicks_count = clicks_count + 1, updated_at = NOW() WHERE id = ? AND is_active = 1',
                    [parseInt(adId)]
                );
                console.log(`🖱️ Basic click count updated for ad ${adId}`);
                return true;
            } catch (fallbackError) {
                console.error('❌ Fallback click recording also failed:', fallbackError);
                return false;
            }
        }
    }

    // Get ads by slots
    static async getAdsBySlots() {
        try {
            const sql = `
                SELECT * FROM ads 
                WHERE is_active = 1 
                    AND (start_date IS NULL OR start_date <= NOW())
                    AND (end_date IS NULL OR end_date >= NOW())
                ORDER BY slot_position ASC, created_at DESC
            `;
            
            const results = await query(sql);
            
            // Group ads by slot position
            const adsBySlots = {};
            
            // Initialize all slots
            for (let i = 1; i <= 5; i++) {
                adsBySlots[i] = [];
            }
            
            // Group results by slot
            if (Array.isArray(results)) {
                results.forEach(adData => {
                    const ad = new Ad(adData);
                    const slot = ad.slot_position;
                    
                    if (slot >= 1 && slot <= 5) {
                        adsBySlots[slot].push(ad);
                    }
                });
            }
            
            console.log('📊 Ads by slots loaded:', {
                slot1: adsBySlots[1].length,
                slot2: adsBySlots[2].length,
                slot3: adsBySlots[3].length,
                slot4: adsBySlots[4].length,
                slot5: adsBySlots[5].length
            });
            
            return adsBySlots;
        } catch (error) {
            console.error('❌ Get ads by slots error:', error);
            
            // Return empty structure on error
            const emptySlots = {};
            for (let i = 1; i <= 5; i++) {
                emptySlots[i] = [];
            }
            return emptySlots;
        }
    }

    // Get dashboard summary
    static async getDashboardSummary() {
        try {
            const sql = `
                SELECT 
                    COUNT(*) as total_ads,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_ads,
                    SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_ads,
                    COALESCE(SUM(impressions_count), 0) as total_impressions,
                    COALESCE(SUM(clicks_count), 0) as total_clicks,
                    CASE 
                        WHEN SUM(impressions_count) > 0 
                        THEN ROUND((SUM(clicks_count) / SUM(impressions_count)) * 100, 2)
                        ELSE 0 
                    END as overall_ctr,
                    COUNT(CASE WHEN type = 'google_ads' THEN 1 END) as google_ads_count,
                    COUNT(CASE WHEN type = 'image' THEN 1 END) as image_ads_count,
                    COUNT(CASE WHEN type = 'video' THEN 1 END) as video_ads_count
                FROM ads
            `;
            
            const result = await queryOne(sql);
            
            if (!result) {
                return {
                    total_ads: 0, active_ads: 0, inactive_ads: 0,
                    total_impressions: 0, total_clicks: 0, overall_ctr: 0,
                    google_ads_count: 0, image_ads_count: 0, video_ads_count: 0
                };
            }
            
            return {
                total_ads: parseInt(result.total_ads) || 0,
                active_ads: parseInt(result.active_ads) || 0,
                inactive_ads: parseInt(result.inactive_ads) || 0,
                total_impressions: parseInt(result.total_impressions) || 0,
                total_clicks: parseInt(result.total_clicks) || 0,
                overall_ctr: parseFloat(result.overall_ctr) || 0,
                google_ads_count: parseInt(result.google_ads_count) || 0,
                image_ads_count: parseInt(result.image_ads_count) || 0,
                video_ads_count: parseInt(result.video_ads_count) || 0
            };
        } catch (error) {
            console.error('❌ Get dashboard summary error:', error);
            return {
                total_ads: 0, active_ads: 0, inactive_ads: 0,
                total_impressions: 0, total_clicks: 0, overall_ctr: 0,
                google_ads_count: 0, image_ads_count: 0, video_ads_count: 0
            };
        }
    }

    // Get performance summary
    static async getPerformanceSummary() {
        try {
            const sql = `
                SELECT 
                    a.id, a.title, a.slot_position, a.type,
                    a.impressions_count, a.clicks_count,
                    CASE 
                        WHEN a.impressions_count > 0 
                        THEN ROUND((a.clicks_count / a.impressions_count) * 100, 2)
                        ELSE 0 
                    END as ctr_percentage,
                    a.is_active, a.created_at, a.click_url, a.open_new_tab,
                    a.media_url, a.google_ads_script
                FROM ads a
                ORDER BY a.slot_position ASC, a.impressions_count DESC
            `;
            
            const results = await query(sql);
            return results.map(ad => new Ad(ad));
        } catch (error) {
            console.error('❌ Get performance summary error:', error);
            return [];
        }
    }

    // Toggle ad status
    static async toggleStatus(id) {
        try {
            if (!id || isNaN(parseInt(id))) {
                throw new Error('Invalid ad ID');
            }

            const ad = await this.findById(id);
            if (!ad) {
                throw new Error('Advertisement not found');
            }
            
            const newStatus = !ad.is_active;
            await this.update(id, { is_active: newStatus });
            
            console.log(`🔄 Ad ${id} status toggled to: ${newStatus}`);
            return newStatus;
        } catch (error) {
            console.error('❌ Toggle status error:', error);
            throw error;
        }
    }

    // Get analytics
    static async getAnalytics(adId, days = 30) {
        try {
            if (!adId || isNaN(parseInt(adId))) {
                throw new Error('Invalid ad ID');
            }

            const daysNum = Math.max(1, Math.min(365, parseInt(days)));
            
            const impressionsSql = `
                SELECT 
                    DATE(ai.created_at) as date,
                    COUNT(*) as impressions
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
                query(impressionsSql, [parseInt(adId), daysNum]),
                query(clicksSql, [parseInt(adId), daysNum])
            ]);
            
            return { 
                impressions: impressions || [], 
                clicks: clicks || [],
                period_days: daysNum
            };
        } catch (error) {
            console.error('❌ Get analytics error:', error);
            return { impressions: [], clicks: [], period_days: days };
        }
    }

    // Validate Google Ads script
    static validateGoogleAdsScript(script) {
        try {
            if (!script || typeof script !== 'string') {
                return { valid: false, message: 'Script is required' };
            }

            const trimmedScript = script.trim();
            
            if (trimmedScript.length < 10) {
                return { valid: false, message: 'Script is too short' };
            }

            if (trimmedScript.length > 50000) {
                return { valid: false, message: 'Script is too long' };
            }

            // Check for Google Ads patterns
            const googleAdsPatterns = [
                /googlesyndication/i,
                /googleadservices/i,
                /adsbygoogle/i,
                /data-ad-client/i,
                /data-ad-slot/i
            ];

            const hasGoogleAdsPattern = googleAdsPatterns.some(pattern => pattern.test(trimmedScript));
            
            if (!hasGoogleAdsPattern) {
                return { 
                    valid: true, 
                    message: 'Script appears valid but may not be from Google Ads',
                    warning: true 
                };
            }

            return { valid: true, message: 'Google Ads script is valid' };
        } catch (error) {
            return { valid: false, message: 'Error validating script: ' + error.message };
        }
    }

    // Clone ad
    static async cloneAd(adId, newTitle = null) {
        try {
            if (!adId || isNaN(parseInt(adId))) {
                throw new Error('Invalid ad ID for cloning');
            }

            const originalAd = await this.findById(adId);
            if (!originalAd) {
                throw new Error('Original advertisement not found');
            }
            
            const cloneData = {
                title: newTitle || `${originalAd.title} (Copy)`,
                description: originalAd.description,
                type: originalAd.type,
                media_url: originalAd.media_url,
                google_ads_script: originalAd.google_ads_script,
                click_url: originalAd.click_url,
                open_new_tab: originalAd.open_new_tab,
                duration: originalAd.duration,
                slot_position: originalAd.slot_position,
                is_active: false, // Start inactive
                start_date: null,
                end_date: null
            };
            
            return await this.create(cloneData);
        } catch (error) {
            console.error('❌ Clone ad error:', error);
            throw error;
        }
    }

    // Get count
    static async getCount() {
        try {
            const result = await queryOne('SELECT COUNT(*) as count FROM ads');
            return parseInt(result.count) || 0;
        } catch (error) {
            console.error('❌ Get count error:', error);
            return 0;
        }
    }

    // Health check
    static async healthCheck() {
        try {
            // Test basic database connection
            const testQuery = 'SELECT COUNT(*) as count FROM ads LIMIT 1';
            const result = await query(testQuery);
            
            if (result && result[0]) {
                console.log('✅ Ad model health check passed');
                return {
                    healthy: true,
                    message: 'Ad model is working correctly',
                    total_ads: result[0].count
                };
            } else {
                console.warn('⚠️ Ad model health check warning: no results');
                return {
                    healthy: false,
                    message: 'Database query returned no results',
                    total_ads: 0
                };
            }
        } catch (error) {
            console.error('❌ Ad model health check failed:', error);
            return {
                healthy: false,
                message: `Health check failed: ${error.message}`,
                error: error.message
            };
        }
    }
}

module.exports = Ad;