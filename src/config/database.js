// FIXED: Enhanced database.js with auto-initialization
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'video_platform',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    multipleStatements: true
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// Initialize database and create tables
const initDatabase = async () => {
    try {
        await testConnection();
        
        // Create database if it doesn't exist
        const tempConfig = { ...dbConfig };
        delete tempConfig.database;
        
        const tempPool = mysql.createPool(tempConfig);
        await tempPool.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        await tempPool.end();
        
        console.log(`✅ Database '${dbConfig.database}' ready`);
        
        // Create tables
        await createTables();
        
        // FIXED: Initialize video interaction tables
        await createVideoInteractionTables();
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        throw error;
    }
};

// Create required tables
const createTables = async () => {
    const tables = [
        // Users table
        `CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role ENUM('user', 'admin') DEFAULT 'user',
            profile_image VARCHAR(500) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

        // Categories table
        `CREATE TABLE IF NOT EXISTS categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            slug VARCHAR(255) UNIQUE NOT NULL,
            image VARCHAR(500) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

        // Series table
        `CREATE TABLE IF NOT EXISTS series (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            slug VARCHAR(255) UNIQUE NOT NULL,
            thumbnail VARCHAR(500) NULL,
            category_id INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

        // Videos table
        `CREATE TABLE IF NOT EXISTS videos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            slug VARCHAR(255) UNIQUE NOT NULL,
            video_url VARCHAR(500) NOT NULL,
            thumbnail VARCHAR(500),
            duration INT DEFAULT 0,
            file_size BIGINT DEFAULT 0,
            video_quality ENUM('360p', '720p', '1080p', '4K') DEFAULT '720p',
            storage_type ENUM('local', 's3') DEFAULT 'local',
            views_count INT DEFAULT 0,
            likes_count INT DEFAULT 0,
            shares_count INT DEFAULT 0,
            status ENUM('draft', 'published', 'private') DEFAULT 'draft',
            category_id INT NULL,
            series_id INT NULL,
            user_id INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
            FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE SET NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            INDEX idx_videos_status (status),
            INDEX idx_videos_created (created_at),
            INDEX idx_videos_views (views_count),
            INDEX idx_videos_likes (likes_count)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    ];

    try {
        for (const tableSQL of tables) {
            await pool.execute(tableSQL);
        }
        console.log('✅ Core database tables created successfully');
        
        // Insert default data
        await insertDefaultData();
        
    } catch (error) {
        console.error('❌ Failed to create core tables:', error.message);
    }
};

// FIXED: Create video interaction tables (likes, views, shares)
const createVideoInteractionTables = async () => {
    const interactionTables = [
        // Video views table
        `CREATE TABLE IF NOT EXISTS video_views (
            id INT AUTO_INCREMENT PRIMARY KEY,
            video_id INT NOT NULL,
            user_id INT NULL,
            ip_address VARCHAR(45) NULL,
            user_agent TEXT NULL,
            watch_duration INT DEFAULT 0,
            source VARCHAR(50) DEFAULT 'web',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            INDEX idx_video_views_video_id (video_id),
            INDEX idx_video_views_created_at (created_at),
            INDEX idx_video_views_user_id (user_id),
            INDEX idx_video_views_ip (ip_address)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

        // Video likes table
        `CREATE TABLE IF NOT EXISTS video_likes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            video_id INT NOT NULL,
            user_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_video_user_like (video_id, user_id),
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_video_likes_video_id (video_id),
            INDEX idx_video_likes_user_id (user_id),
            INDEX idx_video_likes_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

        // Video shares table
        `CREATE TABLE IF NOT EXISTS video_shares (
            id INT AUTO_INCREMENT PRIMARY KEY,
            video_id INT NOT NULL,
            user_id INT NULL,
            platform VARCHAR(50) NOT NULL DEFAULT 'unknown',
            user_agent TEXT NULL,
            referrer VARCHAR(500) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            INDEX idx_video_shares_video_id (video_id),
            INDEX idx_video_shares_platform (platform),
            INDEX idx_video_shares_created_at (created_at),
            INDEX idx_video_shares_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    ];

    try {
        for (const tableSQL of interactionTables) {
            await pool.execute(tableSQL);
        }
        console.log('✅ Video interaction tables created successfully');
    } catch (error) {
        console.error('❌ Failed to create interaction tables:', error.message);
        // Don't throw error, continue without interaction tables
    }
};

// Insert default data
const insertDefaultData = async () => {
    try {
        // Check if admin user exists
        const [adminExists] = await pool.execute('SELECT id FROM users WHERE username = ? LIMIT 1', ['admin']);
        
        if (adminExists.length === 0) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('admin123', 12);
            
            await pool.execute(
                'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                ['admin', 'admin@videoapp.com', hashedPassword, 'admin']
            );
            console.log('✅ Default admin user created (username: admin, password: admin123)');
        }

        // Check if categories exist
        const [categoriesExist] = await pool.execute('SELECT id FROM categories LIMIT 1');
        
        if (categoriesExist.length === 0) {
            const defaultCategories = [
                ['Entertainment', 'Fun and entertaining videos', 'entertainment'],
                ['Education', 'Educational and learning content', 'education'],
                ['Music', 'Music videos and performances', 'music'],
                ['Technology', 'Tech reviews and tutorials', 'technology'],
                ['Sports', 'Sports content and highlights', 'sports']
            ];
            
            for (const [name, description, slug] of defaultCategories) {
                await pool.execute(
                    'INSERT INTO categories (name, description, slug) VALUES (?, ?, ?)',
                    [name, description, slug]
                );
            }
            console.log('✅ Default categories created');
        }

    } catch (error) {
        console.error('❌ Failed to insert default data:', error.message);
    }
};

// Execute query with error handling
const query = async (sql, params = []) => {
    try {
        console.log('Executing SQL:', sql.replace(/\s+/g, ' ').trim().substring(0, 100) + '...');
        if (params.length > 0) {
            console.log('With params:', params);
        }
        
        const [results] = await pool.query(sql, params);
        return results;
    } catch (error) {
        console.error('Database query error:', error);
        console.error('SQL was:', sql.substring(0, 200) + '...');
        console.error('Params were:', params);
        throw error;
    }
};

// Get single record
const queryOne = async (sql, params = []) => {
    try {
        const [results] = await pool.query(sql, params);
        return results[0] || null;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

// Transaction helper
const transaction = async (callback) => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// Database utilities
const dbUtils = {
    // Get table row count
    async getCount(table, where = '', params = []) {
        const sql = `SELECT COUNT(*) as count FROM ${table} ${where}`;
        const result = await queryOne(sql, params);
        return result.count;
    },
    
    // Check if record exists
    async exists(table, where, params = []) {
        const count = await this.getCount(table, where, params);
        return count > 0;
    },
    
    // Get paginated results
    async paginate(sql, params = [], page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const paginatedSql = `${sql} LIMIT ${limit} OFFSET ${offset}`;
        
        const [results, countResult] = await Promise.all([
            query(paginatedSql, params),
            query(`SELECT COUNT(*) as total FROM (${sql}) as count_query`, params)
        ]);
        
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);
        
        return {
            data: results,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    },

    // FIXED: Ensure video interaction tables exist
    async ensureVideoTables() {
        try {
            await createVideoInteractionTables();
            console.log('✅ Video interaction tables verified');
        } catch (error) {
            console.error('❌ Failed to verify video tables:', error);
        }
    }
};

module.exports = {
    pool,
    query,
    queryOne,
    transaction,
    initDatabase,
    testConnection,
    createTables,
    createVideoInteractionTables,
    dbUtils
};