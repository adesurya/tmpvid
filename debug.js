// ===== CREATE debug.js - Run this to check your project =====
// debug.js

const fs = require('fs');
const path = require('path');

console.log('🔍 VideoApp Debug Script');
console.log('========================\n');

// 1. Check Node.js version
console.log('📋 System Information:');
console.log(`Node.js Version: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`Working Directory: ${process.cwd()}\n`);

// 2. Check critical files
console.log('📁 Critical Files Check:');
const criticalFiles = [
    // Controllers
    './src/controllers/videoController.js',
    './src/controllers/adminController.js', 
    './src/controllers/categoryController.js',
    './src/controllers/seriesController.js',
    
    // Models
    './src/models/Video.js',
    './src/models/User.js',
    './src/models/Category.js',
    './src/models/Series.js',
    
    // Routes
    './src/routes/api/admin.js',
    
    // Config
    './src/config/database.js',
    './src/config/aws.js',
    
    // Middleware
    './src/middleware/auth.js',
    './src/middleware/upload.js',
    
    // Services
    './src/services/storageService.js',
    './src/services/videoService.js',
    
    // Views
    './views/index.ejs',
    './views/layouts/main.ejs',
    './views/layouts/admin.ejs',
    './views/admin/dashboard.ejs',
    './views/admin/videos.ejs',
    './views/admin/categories.ejs',
    
    // Main files
    './app.js',
    './package.json',
    './.env'
];

let missingFiles = [];
let existingFiles = [];

criticalFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
        existingFiles.push(file);
    } else {
        console.log(`❌ ${file} - MISSING!`);
        missingFiles.push(file);
    }
});

console.log(`\n📊 Files Summary: ${existingFiles.length}/${criticalFiles.length} files exist\n`);

// 3. Check package.json dependencies
console.log('📦 Package Dependencies Check:');
try {
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const requiredDeps = [
        'express', 'mysql2', 'bcryptjs', 'joi', 'multer', 
        'express-session', 'ejs', 'ejs-mate', 'slugify'
    ];
    
    requiredDeps.forEach(dep => {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
            console.log(`✅ ${dep} - ${packageJson.dependencies[dep]}`);
        } else {
            console.log(`❌ ${dep} - MISSING! Run: npm install ${dep}`);
        }
    });
} catch (error) {
    console.log('❌ Could not read package.json');
}

// 4. Check .env file
console.log('\n🔧 Environment Variables Check:');
if (fs.existsSync('./.env')) {
    const envContent = fs.readFileSync('./.env', 'utf8');
    const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    
    requiredEnvVars.forEach(envVar => {
        if (envContent.includes(envVar)) {
            console.log(`✅ ${envVar} - Configured`);
        } else {
            console.log(`⚠️  ${envVar} - Missing or not configured`);
        }
    });
} else {
    console.log('❌ .env file not found!');
}

// 5. Check directories
console.log('\n📂 Directory Structure Check:');
const requiredDirs = [
    './src',
    './src/controllers',
    './src/models', 
    './src/routes',
    './src/routes/web',
    './src/routes/api',
    './src/config',
    './src/middleware',
    './src/services',
    './views',
    './views/admin',
    './views/layouts',
    './public',
    './public/css',
    './public/js',
    './public/uploads',
    './public/uploads/videos'
];

requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        console.log(`✅ ${dir}/`);
    } else {
        console.log(`❌ ${dir}/ - MISSING!`);
        try {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`   🔧 Created directory: ${dir}/`);
        } catch (error) {
            console.log(`   ❌ Failed to create: ${dir}/`);
        }
    }
});

// 6. Generate missing files
console.log('\n🛠️  Generating Missing Files:');

// Generate basic Video model if missing
if (!fs.existsSync('./src/models/Video.js')) {
    const videoModelContent = `// src/models/Video.js - Auto-generated
const { query, queryOne } = require('../config/database');
const slugify = require('slugify');

class Video {
    constructor(data = {}) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
        this.slug = data.slug;
        this.video_url = data.video_url;
        this.views_count = data.views_count || 0;
        this.likes_count = data.likes_count || 0;
        this.shares_count = data.shares_count || 0;
        this.status = data.status || 'draft';
        this.created_at = data.created_at;
    }

    static async getRandomVideos(limit = 10, excludeId = null) {
        try {
            let sql = 'SELECT * FROM videos WHERE status = "published"';
            const params = [];
            
            if (excludeId) {
                sql += ' AND id != ?';
                params.push(parseInt(excludeId));
            }
            
            sql += ' ORDER BY created_at DESC LIMIT ?';
            params.push(parseInt(limit));
            
            const videos = await query(sql, params);
            return videos.map(video => new Video(video));
        } catch (error) {
            console.error('Get random videos error:', error);
            return [];
        }
    }

    static async getRandomVideosSimple(limit = 10) {
        try {
            const sql = 'SELECT * FROM videos WHERE status = "published" ORDER BY created_at DESC LIMIT ?';
            const videos = await query(sql, [parseInt(limit)]);
            return videos.map(video => new Video(video));
        } catch (error) {
            console.error('Get simple videos error:', error);
            return [];
        }
    }

    static async findBySlug(slug) {
        try {
            const sql = 'SELECT * FROM videos WHERE slug = ? AND status = "published"';
            const video = await queryOne(sql, [slug]);
            return video ? new Video(video) : null;
        } catch (error) {
            console.error('Find video by slug error:', error);
            return null;
        }
    }

    static async findById(id) {
        try {
            const sql = 'SELECT * FROM videos WHERE id = ?';
            const video = await queryOne(sql, [id]);
            return video ? new Video(video) : null;
        } catch (error) {
            console.error('Find video by ID error:', error);
            return null;
        }
    }

    static async getCount() {
        try {
            const result = await queryOne('SELECT COUNT(*) as count FROM videos');
            return result.count;
        } catch (error) {
            console.error('Get video count error:', error);
            return 0;
        }
    }

    static async incrementViews(videoId, userId = null, ipAddress = null, userAgent = null, watchDuration = 0) {
        try {
            await query('UPDATE videos SET views_count = views_count + 1 WHERE id = ?', [videoId]);
            return true;
        } catch (error) {
            console.error('Increment views error:', error);
            return false;
        }
    }

    static async getAnalyticsOverview(days = 30) {
        return {
            viewsOverTime: [],
            topVideos: [],
            sharesByPlatform: []
        };
    }

    static async getAdminVideos(options = {}) {
        try {
            const { page = 1, limit = 20 } = options;
            const offset = (page - 1) * limit;
            
            const sql = 'SELECT * FROM videos ORDER BY created_at DESC LIMIT ? OFFSET ?';
            const videos = await query(sql, [limit, offset]);
            
            const countSql = 'SELECT COUNT(*) as total FROM videos';
            const countResult = await query(countSql);
            const total = countResult[0]?.total || 0;
            
            return {
                data: videos.map(video => new Video(video)),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page < Math.ceil(total / limit),
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            console.error('Get admin videos error:', error);
            return {
                data: [],
                pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
            };
        }
    }
}

module.exports = Video;`;

    try {
        fs.writeFileSync('./src/models/Video.js', videoModelContent);
        console.log('✅ Generated ./src/models/Video.js');
    } catch (error) {
        console.log('❌ Failed to generate Video.js');
    }
}

// Generate basic User model if missing
if (!fs.existsSync('./src/models/User.js')) {
    const userModelContent = `// src/models/User.js - Auto-generated
const { query, queryOne } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    constructor(data = {}) {
        this.id = data.id;
        this.username = data.username;
        this.email = data.email;
        this.role = data.role;
        this.created_at = data.created_at;
    }

    static async findById(id) {
        try {
            const user = await queryOne('SELECT * FROM users WHERE id = ?', [id]);
            return user ? new User(user) : null;
        } catch (error) {
            console.error('Find user by ID error:', error);
            return null;
        }
    }

    static async findByUsername(username) {
        try {
            const user = await queryOne('SELECT * FROM users WHERE username = ?', [username]);
            return user ? new User(user) : null;
        } catch (error) {
            console.error('Find user by username error:', error);
            return null;
        }
    }

    static async authenticate(username, password) {
        try {
            const user = await queryOne('SELECT * FROM users WHERE username = ?', [username]);
            if (!user) return null;
            
            const isValid = await bcrypt.compare(password, user.password);
            return isValid ? new User(user) : null;
        } catch (error) {
            console.error('User authentication error:', error);
            return null;
        }
    }

    static async getCount() {
        try {
            const result = await queryOne('SELECT COUNT(*) as count FROM users');
            return result.count;
        } catch (error) {
            console.error('Get user count error:', error);
            return 0;
        }
    }
}

module.exports = User;`;

    try {
        fs.writeFileSync('./src/models/User.js', userModelContent);
        console.log('✅ Generated ./src/models/User.js');
    } catch (error) {
        console.log('❌ Failed to generate User.js');
    }
}

// Generate basic Category model if missing
if (!fs.existsSync('./src/models/Category.js')) {
    const categoryModelContent = `// src/models/Category.js - Auto-generated
const { query, queryOne } = require('../config/database');
const slugify = require('slugify');

class Category {
    constructor(data = {}) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.slug = data.slug;
        this.created_at = data.created_at;
    }

    static async getAll() {
        try {
            const categories = await query('SELECT * FROM categories ORDER BY name ASC');
            return categories.map(cat => new Category(cat));
        } catch (error) {
            console.error('Get all categories error:', error);
            return [];
        }
    }

    static async findBySlug(slug) {
        try {
            const category = await queryOne('SELECT * FROM categories WHERE slug = ?', [slug]);
            return category ? new Category(category) : null;
        } catch (error) {
            console.error('Find category by slug error:', error);
            return null;
        }
    }

    static async create(categoryData) {
        try {
            const slug = slugify(categoryData.name, { lower: true, strict: true });
            const sql = 'INSERT INTO categories (name, description, slug) VALUES (?, ?, ?)';
            const params = [categoryData.name, categoryData.description || null, slug];
            
            const result = await query(sql, params);
            return await this.findById(result.insertId);
        } catch (error) {
            console.error('Category creation error:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const category = await queryOne('SELECT * FROM categories WHERE id = ?', [id]);
            return category ? new Category(category) : null;
        } catch (error) {
            console.error('Find category by ID error:', error);
            return null;
        }
    }

    static async getCount() {
        try {
            const result = await queryOne('SELECT COUNT(*) as count FROM categories');
            return result.count;
        } catch (error) {
            console.error('Get category count error:', error);
            return 0;
        }
    }
}

module.exports = Category;`;

    try {
        fs.writeFileSync('./src/models/Category.js', categoryModelContent);
        console.log('✅ Generated ./src/models/Category.js');
    } catch (error) {
        console.log('❌ Failed to generate Category.js');
    }
}

// Generate basic database config if missing
if (!fs.existsSync('./src/config/database.js')) {
    const dbConfigContent = `// src/config/database.js - Auto-generated
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
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

const query = async (sql, params = []) => {
    try {
        const [results] = await pool.query(sql, params);
        return results;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

const queryOne = async (sql, params = []) => {
    try {
        const [results] = await pool.query(sql, params);
        return results[0] || null;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

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

module.exports = {
    pool,
    query,
    queryOne,
    testConnection
};`;

    try {
        fs.writeFileSync('./src/config/database.js', dbConfigContent);
        console.log('✅ Generated ./src/config/database.js');
    } catch (error) {
        console.log('❌ Failed to generate database.js');
    }
}

// Generate .env if missing
if (!fs.existsSync('./.env')) {
    const envContent = `# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=video_platform

# Application Configuration
PORT=3000
NODE_ENV=development
SESSION_SECRET=your-secret-key-here

# Base URL for meta tags
BASE_URL=http://localhost:3000

# Storage Configuration
STORAGE_TYPE=local

# Optional: AWS Configuration (if using S3)
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=us-east-1
# AWS_S3_BUCKET=`;

    try {
        fs.writeFileSync('./.env', envContent);
        console.log('✅ Generated ./.env file');
    } catch (error) {
        console.log('❌ Failed to generate .env file');
    }
}

// 7. Recommendations
console.log('\n💡 Recommendations:');

if (missingFiles.length > 0) {
    console.log('📋 Missing Files Found:');
    missingFiles.forEach(file => {
        console.log(`   - ${file}`);
    });
    console.log('\n🔧 To fix:');
    console.log('   1. Run this debug script: node debug.js');
    console.log('   2. Check generated files and modify as needed');
    console.log('   3. Install missing dependencies: npm install');
    console.log('   4. Configure your .env file with correct database credentials');
    console.log('   5. Create database tables (see SQL schema in documentation)');
}

console.log('\n📝 Next Steps:');
console.log('1. Configure your database settings in .env');
console.log('2. Create the database tables');
console.log('3. Run: npm install');
console.log('4. Test the application: npm start');
console.log('5. Visit: http://localhost:3000');

console.log('\n🎯 Quick Database Setup:');
console.log('CREATE DATABASE video_platform;');
console.log('USE video_platform;');
console.log(`
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(255) UNIQUE NOT NULL,
    video_url VARCHAR(500) NOT NULL,
    thumbnail VARCHAR(500),
    duration INT DEFAULT 0,
    file_size BIGINT DEFAULT 0,
    views_count INT DEFAULT 0,
    likes_count INT DEFAULT 0,
    shares_count INT DEFAULT 0,
    status ENUM('draft', 'published', 'private') DEFAULT 'draft',
    category_id INT,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password, role) VALUES 
('admin', 'admin@videoapp.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeXgaWn4HGQR8xNOy', 'admin');

-- Insert sample categories
INSERT INTO categories (name, description, slug) VALUES 
('Entertainment', 'Fun and entertaining videos', 'entertainment'),
('Education', 'Educational and learning content', 'education'),
('Music', 'Music videos and performances', 'music'),
('Technology', 'Tech reviews and tutorials', 'technology');
`);

console.log('\n✨ Debug complete! Check the output above for any issues.');
