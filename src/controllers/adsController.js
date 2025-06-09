// Save this as: src/controllers/adsController.js
const { query, queryOne } = require('../config/database');

class AdsController {
    // Initialize ads table
    static async initializeAdsTable() {
        try {
            await query(`
                CREATE TABLE IF NOT EXISTS ads_settings (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    type ENUM('google_adsense', 'google_ads', 'custom', 'analytics') DEFAULT 'google_adsense',
                    code TEXT NOT NULL,
                    position ENUM('header', 'footer', 'before_video', 'after_video', 'sidebar') DEFAULT 'header',
                    status ENUM('active', 'inactive') DEFAULT 'active',
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ Ads settings table initialized');
        } catch (error) {
            console.error('❌ Failed to initialize ads table:', error);
        }
    }

    // Get all ads settings
    static async getAllAds(req, res) {
        try {
            const ads = await query('SELECT * FROM ads_settings ORDER BY created_at DESC');
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: ads
                });
            }
            
            res.render('admin/ads', {
                title: 'Google Ads Management',
                ads: ads,
                layout: 'layouts/admin'
            });
        } catch (error) {
            console.error('Get ads error:', error);
            
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to get ads settings'
                });
            }
            
            res.status(500).render('error', {
                title: 'Error',
                message: 'Failed to load ads settings',
                layout: 'layouts/main'
            });
        }
    }

    // Create new ads setting
    static async createAds(req, res) {
        try {
            const { name, type, code, position, status, description } = req.body;
            
            if (!name || !code) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and code are required'
                });
            }

            const sql = `
                INSERT INTO ads_settings (name, type, code, position, status, description)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            const result = await query(sql, [
                name,
                type || 'google_adsense',
                code,
                position || 'header',
                status || 'active',
                description || null
            ]);
            
            const newAds = await queryOne('SELECT * FROM ads_settings WHERE id = ?', [result.insertId]);
            
            res.json({
                success: true,
                data: newAds,
                message: 'Ads setting created successfully'
            });
        } catch (error) {
            console.error('Create ads error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create ads setting'
            });
        }
    }

    // Update ads setting
    static async updateAds(req, res) {
        try {
            const { id } = req.params;
            const { name, type, code, position, status, description } = req.body;
            
            const sql = `
                UPDATE ads_settings 
                SET name = ?, type = ?, code = ?, position = ?, status = ?, description = ?, updated_at = NOW()
                WHERE id = ?
            `;
            
            await query(sql, [name, type, code, position, status, description, id]);
            
            const updatedAds = await queryOne('SELECT * FROM ads_settings WHERE id = ?', [id]);
            
            if (!updatedAds) {
                return res.status(404).json({
                    success: false,
                    message: 'Ads setting not found'
                });
            }
            
            res.json({
                success: true,
                data: updatedAds,
                message: 'Ads setting updated successfully'
            });
        } catch (error) {
            console.error('Update ads error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update ads setting'
            });
        }
    }

    // Delete ads setting
    static async deleteAds(req, res) {
        try {
            const { id } = req.params;
            
            const result = await query('DELETE FROM ads_settings WHERE id = ?', [id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Ads setting not found'
                });
            }
            
            res.json({
                success: true,
                message: 'Ads setting deleted successfully'
            });
        } catch (error) {
            console.error('Delete ads error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete ads setting'
            });
        }
    }

    // Toggle ads status
    static async toggleAdsStatus(req, res) {
        try {
            const { id } = req.params;
            
            const currentAds = await queryOne('SELECT * FROM ads_settings WHERE id = ?', [id]);
            
            if (!currentAds) {
                return res.status(404).json({
                    success: false,
                    message: 'Ads setting not found'
                });
            }
            
            const newStatus = currentAds.status === 'active' ? 'inactive' : 'active';
            
            await query('UPDATE ads_settings SET status = ?, updated_at = NOW() WHERE id = ?', [newStatus, id]);
            
            res.json({
                success: true,
                data: { ...currentAds, status: newStatus },
                message: `Ads setting ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`
            });
        } catch (error) {
            console.error('Toggle ads status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle ads status'
            });
        }
    }

    // Get active ads by position (for frontend use)
    static async getActiveAdsByPosition(position) {
        try {
            const ads = await query(
                'SELECT * FROM ads_settings WHERE position = ? AND status = ? ORDER BY created_at ASC',
                [position, 'active']
            );
            return ads;
        } catch (error) {
            console.error('Get active ads error:', error);
            return [];
        }
    }

    // Get all active ads for injection
    static async getActiveAdsForInjection(req, res) {
        try {
            const ads = await query('SELECT * FROM ads_settings WHERE status = ? ORDER BY position, created_at ASC', ['active']);
            
            const adsByPosition = {
                header: [],
                footer: [],
                before_video: [],
                after_video: [],
                sidebar: []
            };
            
            ads.forEach(ad => {
                if (adsByPosition[ad.position]) {
                    adsByPosition[ad.position].push(ad);
                }
            });
            
            res.json({
                success: true,
                data: adsByPosition
            });
        } catch (error) {
            console.error('Get ads for injection error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get ads for injection'
            });
        }
    }
}

// Initialize table on startup
AdsController.initializeAdsTable().catch(console.error);

module.exports = AdsController;