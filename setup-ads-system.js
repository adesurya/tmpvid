#!/usr/bin/env node

/**
 * Ads System Setup Script
 * 
 * This script helps set up the advertisement management system
 * Run with: node setup-ads-system.js
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(colors[color] + message + colors.reset);
}

function checkFileExists(filePath) {
    try {
        return fs.existsSync(filePath);
    } catch (error) {
        return false;
    }
}

function createDirectory(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            log(`✅ Created directory: ${dirPath}`, 'green');
            return true;
        } else {
            log(`📁 Directory already exists: ${dirPath}`, 'yellow');
            return true;
        }
    } catch (error) {
        log(`❌ Failed to create directory ${dirPath}: ${error.message}`, 'red');
        return false;
    }
}

function checkRequiredFiles() {
    log('\n🔍 Checking required files...', 'cyan');
    
    const requiredFiles = [
        {
            path: 'src/controllers/adController.js',
            description: 'Ad Controller'
        },
        {
            path: 'src/models/Ad.js',
            description: 'Ad Model'
        },
        {
            path: 'src/routes/adRoutes.js',
            description: 'Ad Routes'
        },
        {
            path: 'views/admin/ads.ejs',
            description: 'Ads List View'
        },
        {
            path: 'views/admin/ads-create.ejs',
            description: 'Create Ad View'
        },
        {
            path: 'views/admin/ads-edit.ejs',
            description: 'Edit Ad View'
        },
        {
            path: 'views/admin/ads-fallback.ejs',
            description: 'Fallback View'
        }
    ];
    
    let allFilesExist = true;
    
    requiredFiles.forEach(file => {
        const exists = checkFileExists(file.path);
        if (exists) {
            log(`✅ ${file.description}: ${file.path}`, 'green');
        } else {
            log(`❌ Missing ${file.description}: ${file.path}`, 'red');
            allFilesExist = false;
        }
    });
    
    return allFilesExist;
}

function checkRequiredDirectories() {
    log('\n📁 Checking/creating required directories...', 'cyan');
    
    const requiredDirs = [
        'src/controllers',
        'src/models',
        'src/routes',
        'views/admin',
        'public/uploads',
        'public/uploads/ads'
    ];
    
    let allDirsCreated = true;
    
    requiredDirs.forEach(dir => {
        if (!createDirectory(dir)) {
            allDirsCreated = false;
        }
    });
    
    return allDirsCreated;
}

function checkPackageDependencies() {
    log('\n📦 Checking package dependencies...', 'cyan');
    
    try {
        const packageJsonPath = 'package.json';
        if (!checkFileExists(packageJsonPath)) {
            log('❌ package.json not found', 'red');
            return false;
        }
        
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        const requiredPackages = [
            'express',
            'multer',
            'joi',
            'mysql2'
        ];
        
        const missingPackages = [];
        
        requiredPackages.forEach(pkg => {
            if (dependencies[pkg]) {
                log(`✅ ${pkg}: ${dependencies[pkg]}`, 'green');
            } else {
                log(`❌ Missing package: ${pkg}`, 'red');
                missingPackages.push(pkg);
            }
        });
        
        if (missingPackages.length > 0) {
            log('\n📋 To install missing packages, run:', 'yellow');
            log(`npm install ${missingPackages.join(' ')}`, 'cyan');
            return false;
        }
        
        return true;
    } catch (error) {
        log(`❌ Error checking dependencies: ${error.message}`, 'red');
        return false;
    }
}

function generateSampleEnv() {
    log('\n⚙️ Generating sample environment configuration...', 'cyan');
    
    const sampleEnvContent = `
# Ads System Configuration
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database

# Upload Configuration
MAX_FILE_SIZE=52428800
UPLOAD_PATH=public/uploads/ads

# Security
SESSION_SECRET=your_session_secret_here
`;
    
    try {
        if (!checkFileExists('.env.example')) {
            fs.writeFileSync('.env.example', sampleEnvContent.trim());
            log('✅ Created .env.example file', 'green');
        } else {
            log('📄 .env.example already exists', 'yellow');
        }
        
        if (!checkFileExists('.env')) {
            log('⚠️ Don\'t forget to create .env file based on .env.example', 'yellow');
        }
        
        return true;
    } catch (error) {
        log(`❌ Failed to create .env.example: ${error.message}`, 'red');
        return false;
    }
}

function generateMigrationScript() {
    log('\n🗄️ Generating database migration script...', 'cyan');
    
    const migrationContent = `
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
        await connection.execute(\`
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
        \`);
        
        console.log('✅ Created ads table');
        
        // Create ad_impressions table
        await connection.execute(\`
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
        \`);
        
        console.log('✅ Created ad_impressions table');
        
        // Create ad_clicks table
        await connection.execute(\`
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
        \`);
        
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
`;
    
    try {
        const migrationPath = 'migrate-ads-tables.js';
        if (!checkFileExists(migrationPath)) {
            fs.writeFileSync(migrationPath, migrationContent.trim());
            log('✅ Created migrate-ads-tables.js', 'green');
            log('💡 Run migration with: node migrate-ads-tables.js', 'blue');
        } else {
            log('📄 Migration script already exists', 'yellow');
        }
        
        return true;
    } catch (error) {
        log(`❌ Failed to create migration script: ${error.message}`, 'red');
        return false;
    }
}

function generateRouteRegistration() {
    log('\n🛣️ Route registration instructions...', 'cyan');
    
    const routeRegistrationCode = `
// Add this to your main app.js or server.js file

// Import ad routes
const adRoutes = require('./src/routes/adRoutes');

// Register ad routes
app.use('/', adRoutes);

// Make sure this is added after other middleware but before error handlers
`;
    
    log('📋 Add the following to your main app.js file:', 'yellow');
    log(routeRegistrationCode, 'cyan');
    
    // Check if app.js exists and show specific instructions
    const appFiles = ['app.js', 'server.js', 'index.js'];
    let mainAppFile = null;
    
    for (const file of appFiles) {
        if (checkFileExists(file)) {
            mainAppFile = file;
            break;
        }
    }
    
    if (mainAppFile) {
        log(`💡 Detected main app file: ${mainAppFile}`, 'blue');
        
        try {
            const appContent = fs.readFileSync(mainAppFile, 'utf8');
            if (appContent.includes('adRoutes') || appContent.includes('./src/routes/adRoutes')) {
                log('✅ Ad routes appear to be already registered', 'green');
            } else {
                log('⚠️ Please add the ad routes registration to your app file', 'yellow');
            }
        } catch (error) {
            log(`⚠️ Could not read ${mainAppFile} to check route registration`, 'yellow');
        }
    } else {
        log('⚠️ Could not find main app file (app.js, server.js, or index.js)', 'yellow');
    }
}

function showCompletionInstructions() {
    log('\n🎉 Setup Analysis Complete!', 'green');
    log('\n📋 Next Steps:', 'cyan');
    log('1. Ensure all required files are in place', 'yellow');
    log('2. Install missing npm packages if any', 'yellow');
    log('3. Configure your .env file with database credentials', 'yellow');
    log('4. Run the database migration: node migrate-ads-tables.js', 'yellow');
    log('5. Register ad routes in your main app file', 'yellow');
    log('6. Restart your server', 'yellow');
    log('7. Navigate to /admin/ads to test the system', 'yellow');
    
    log('\n🔗 Test URLs:', 'blue');
    log('- Admin Ads List: http://localhost:3000/admin/ads', 'cyan');
    log('- Health Check: http://localhost:3000/api/admin/ads/health', 'cyan');
    log('- System Status: http://localhost:3000/api/admin/ads/status', 'cyan');
}

// Main setup function
async function main() {
    log('🚀 Ads System Setup Script', 'bright');
    log('================================', 'bright');
    
    let allChecksPass = true;
    
    // Check and create directories
    if (!checkRequiredDirectories()) {
        allChecksPass = false;
    }
    
    // Check required files
    if (!checkRequiredFiles()) {
        allChecksPass = false;
    }
    
    // Check package dependencies
    if (!checkPackageDependencies()) {
        allChecksPass = false;
    }
    
    // Generate configuration files
    generateSampleEnv();
    generateMigrationScript();
    generateRouteRegistration();
    
    // Show completion instructions
    showCompletionInstructions();
    
    if (allChecksPass) {
        log('\n✅ All checks passed! Your ads system should be ready.', 'green');
    } else {
        log('\n⚠️ Some issues need to be resolved before the system is ready.', 'yellow');
    }
}

// Run the setup
if (require.main === module) {
    main().catch(error => {
        log(`❌ Setup failed: ${error.message}`, 'red');
        process.exit(1);
    });
}

module.exports = { main, checkFileExists, createDirectory };