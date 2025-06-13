// src/utils/adsMigration.js - Database migration for ads validation features
const { query } = require('../config/database');

class AdsMigration {
    static async checkAndMigrateAdsTable() {
        try {
            console.log('🔍 Checking ads_settings table schema...');
            
            // Check if table exists
            const tableExists = await AdsMigration.checkTableExists('ads_settings');
            
            if (!tableExists) {
                console.log('📄 Creating new ads_settings table with validation columns...');
                await AdsMigration.createNewAdsTable();
                return;
            }
            
            // Check existing columns
            const columns = await AdsMigration.getTableColumns('ads_settings');
            const existingColumns = columns.map(col => col.Field);
            
            console.log('📊 Existing columns:', existingColumns);
            
            // Required new columns for validation
            const requiredColumns = [
                'publisher_id',
                'ad_slot', 
                'validation_status',
                'validation_score',
                'validation_errors',
                'validation_warnings',
                'validation_data',
                'code_hash',
                'last_validated'
            ];
            
            // Find missing columns
            const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
            
            if (missingColumns.length > 0) {
                console.log('🔧 Missing columns found:', missingColumns);
                await AdsMigration.addMissingColumns(missingColumns);
            } else {
                console.log('✅ ads_settings table schema is up to date');
            }
            
        } catch (error) {
            console.error('❌ Migration error:', error);
            throw error;
        }
    }
    
    static async checkTableExists(tableName) {
        try {
            const result = await query(`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                AND table_name = ?
            `, [tableName]);
            
            return result[0].count > 0;
        } catch (error) {
            console.error('Error checking table existence:', error);
            return false;
        }
    }
    
    static async getTableColumns(tableName) {
        try {
            const columns = await query(`DESCRIBE ${tableName}`);
            return columns;
        } catch (error) {
            console.error('Error getting table columns:', error);
            return [];
        }
    }
    
    static async createNewAdsTable() {
        try {
            await query(`
                CREATE TABLE IF NOT EXISTS ads_settings (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    type ENUM('google_adsense', 'google_ads', 'custom', 'analytics') DEFAULT 'google_adsense',
                    code TEXT NOT NULL,
                    position ENUM('header', 'footer', 'before_video', 'after_video', 'sidebar') DEFAULT 'header',
                    status ENUM('active', 'inactive', 'pending_review') DEFAULT 'pending_review',
                    description TEXT,
                    publisher_id VARCHAR(50),
                    ad_slot VARCHAR(50),
                    validation_status ENUM('valid', 'invalid', 'warning', 'pending') DEFAULT 'pending',
                    validation_score DECIMAL(3,1) DEFAULT 0.0,
                    validation_errors JSON,
                    validation_warnings JSON,
                    validation_data JSON,
                    code_hash VARCHAR(64),
                    last_validated TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_status (status),
                    INDEX idx_validation_status (validation_status),
                    INDEX idx_code_hash (code_hash)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ New ads_settings table created successfully');
        } catch (error) {
            console.error('❌ Failed to create new ads_settings table:', error);
            throw error;
        }
    }
    
    static async addMissingColumns(missingColumns) {
        try {
            console.log('🔧 Adding missing columns to ads_settings table...');
            
            const columnDefinitions = {
                'publisher_id': 'VARCHAR(50)',
                'ad_slot': 'VARCHAR(50)',
                'validation_status': "ENUM('valid', 'invalid', 'warning', 'pending') DEFAULT 'pending'",
                'validation_score': 'DECIMAL(3,1) DEFAULT 0.0',
                'validation_errors': 'JSON',
                'validation_warnings': 'JSON', 
                'validation_data': 'JSON',
                'code_hash': 'VARCHAR(64)',
                'last_validated': 'TIMESTAMP NULL'
            };
            
            for (const column of missingColumns) {
                if (columnDefinitions[column]) {
                    try {
                        await query(`
                            ALTER TABLE ads_settings 
                            ADD COLUMN ${column} ${columnDefinitions[column]}
                        `);
                        console.log(`✅ Added column: ${column}`);
                    } catch (error) {
                        console.error(`❌ Failed to add column ${column}:`, error.message);
                        // Continue with other columns
                    }
                }
            }
            
            // Add indexes for new columns
            try {
                await query('ALTER TABLE ads_settings ADD INDEX idx_validation_status (validation_status)');
                console.log('✅ Added validation_status index');
            } catch (error) {
                // Index might already exist
                console.log('ℹ️ Validation status index already exists or failed to create');
            }
            
            try {
                await query('ALTER TABLE ads_settings ADD INDEX idx_code_hash (code_hash)');
                console.log('✅ Added code_hash index');
            } catch (error) {
                // Index might already exist
                console.log('ℹ️ Code hash index already exists or failed to create');
            }
            
            console.log('✅ Migration completed successfully');
            
        } catch (error) {
            console.error('❌ Failed to add missing columns:', error);
            throw error;
        }
    }
    
    // Check MySQL version for JSON support
    static async checkMySQLVersion() {
        try {
            const result = await query('SELECT VERSION() as version');
            const version = result[0].version;
            const majorVersion = parseInt(version.split('.')[0]);
            const minorVersion = parseInt(version.split('.')[1]);
            
            console.log('📊 MySQL Version:', version);
            
            // JSON support requires MySQL 5.7.8+
            if (majorVersion < 5 || (majorVersion === 5 && minorVersion < 7)) {
                console.warn('⚠️ MySQL version < 5.7.8 detected. JSON columns will use TEXT instead.');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error checking MySQL version:', error);
            return false;
        }
    }
    
    // Migrate existing data to add validation fields
    static async migrateExistingData() {
        try {
            console.log('🔄 Migrating existing ads data...');
            
            // Get all existing ads without validation data
            const existingAds = await query(`
                SELECT id, code, type 
                FROM ads_settings 
                WHERE validation_status IS NULL OR validation_status = ''
            `);
            
            if (existingAds.length === 0) {
                console.log('ℹ️ No existing data to migrate');
                return;
            }
            
            console.log(`📊 Found ${existingAds.length} ads to migrate`);
            
            // Import validator
            const AdsValidator = require('./adsValidator');
            const validator = new AdsValidator();
            
            for (const ad of existingAds) {
                try {
                    console.log(`🔍 Validating ad ${ad.id}...`);
                    
                    const validation = await validator.validateAdsCode(ad.code, ad.type, {
                        verifySiteRegistration: false // Skip ads.txt check during migration
                    });
                    
                    const codeHash = validator.generateCodeHash(ad.code);
                    
                    await query(`
                        UPDATE ads_settings 
                        SET publisher_id = ?, ad_slot = ?, validation_status = ?, 
                            validation_score = ?, validation_errors = ?, validation_warnings = ?,
                            validation_data = ?, code_hash = ?, last_validated = NOW()
                        WHERE id = ?
                    `, [
                        validation.extractedData?.publisherId || null,
                        validation.extractedData?.adSlot || null,
                        validation.valid ? 'valid' : (validation.errors.length > 0 ? 'invalid' : 'warning'),
                        validation.securityScore,
                        JSON.stringify(validation.errors),
                        JSON.stringify(validation.warnings),
                        JSON.stringify(validation.extractedData),
                        codeHash,
                        ad.id
                    ]);
                    
                    console.log(`✅ Migrated ad ${ad.id}`);
                    
                } catch (validationError) {
                    console.error(`❌ Failed to validate ad ${ad.id}:`, validationError.message);
                    
                    // Set as pending validation
                    await query(`
                        UPDATE ads_settings 
                        SET validation_status = 'pending', validation_score = 0,
                            validation_errors = ?, last_validated = NOW()
                        WHERE id = ?
                    `, [JSON.stringify([validationError.message]), ad.id]);
                }
            }
            
            console.log('✅ Data migration completed');
            
        } catch (error) {
            console.error('❌ Data migration error:', error);
            throw error;
        }
    }
    
    // Full migration process
    static async runFullMigration() {
        try {
            console.log('🚀 Starting ads table migration...');
            
            // Step 1: Check and update schema
            await AdsMigration.checkAndMigrateAdsTable();
            
            // Step 2: Migrate existing data
            await AdsMigration.migrateExistingData();
            
            console.log('🎉 Migration completed successfully!');
            return true;
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
            return false;
        }
    }
}

module.exports = AdsMigration;