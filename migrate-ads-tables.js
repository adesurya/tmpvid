/**
 * Ads System Database Migration
 * Run this script to create the required database tables
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
    let connection;
    
    try {
        // Create connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        
        console.log('✅ Connected to database');
        
        // Create ads table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS ads (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                type ENUM('video', 'image', 'google_ads') NOT NULL DEFAULT 'image',
                media_url VARCHAR(500) NULL,
                google_ads_script TEXT NULL,
                click_url VARCHAR(500) NULL,
                open_new_tab BOOLEAN DEFAULT true,
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
                INDEX idx_ads_dates (start_date, end_date),
                INDEX idx_ads_type (type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        console.log('✅ Created ads table');
        
        // Create ad_impressions table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS ad_impressions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ad_id INT NOT NULL,
                user_id INT NULL,
                video_index INT NULL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE,
                INDEX idx_ad_impressions_ad_id (ad_id),
                INDEX idx_ad_impressions_created_at (created_at),
                INDEX idx_ad_impressions_video_index (video_index)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        console.log('✅ Created ad_impressions table');
        
        // Create ad_clicks table
        await connection.execute(`
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
        
        console.log('✅ Created ad_clicks table');
        
        console.log('🎉 Migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run migration if called directly
if (require.main === module) {
    runMigration();
}

module.exports = { runMigration };