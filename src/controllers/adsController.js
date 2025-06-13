// src/controllers/adsController.js - Complete version with migration and fallback
// Part 1/4: Imports, initialization, and basic CRUD operations

const { query, queryOne } = require('../config/database');

// Import with fallback
let AdsValidator, AdsMigration;
try {
    AdsValidator = require('../utils/adsValidator');
    AdsMigration = require('../utils/adsMigration');
    console.log('✅ Ads utilities loaded successfully');
} catch (error) {
    console.warn('⚠️ Validation utils not found, using basic functionality');
    AdsValidator = null;
    AdsMigration = null;
}

class AdsController {
    // Initialize and migrate ads table
    static async initializeAdsTable() {
        try {
            // Try migration first if available
            if (AdsMigration) {
                console.log('🔧 Running ads table migration...');
                const migrationSuccess = await AdsMigration.runFullMigration();
                if (migrationSuccess) {
                    console.log('✅ Ads table migration completed');
                    return;
                }
            }
            
            // Fallback: Create basic table
            console.log('📄 Creating basic ads_settings table...');
            await query(`
                CREATE TABLE IF NOT EXISTS ads_settings (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    type ENUM('google_adsense', 'google_ads', 'custom', 'analytics') DEFAULT 'google_adsense',
                    code TEXT NOT NULL,
                    position ENUM('header', 'footer', 'before_video', 'after_video', 'sidebar') DEFAULT 'header',
                    status ENUM('active', 'inactive', 'pending_review') DEFAULT 'active',
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ Basic ads settings table initialized');
        } catch (error) {
            console.error('❌ Failed to initialize ads table:', error);
        }
    }

    // Get available columns in ads_settings table
    static async getAvailableColumns() {
        try {
            const columns = await query('DESCRIBE ads_settings');
            return columns.map(col => col.Field);
        } catch (error) {
            console.error('Error getting table columns:', error);
            return ['id', 'name', 'type', 'code', 'position', 'status', 'description', 'created_at', 'updated_at'];
        }
    }

    // Get all ads settings with safe column selection
    static async getAllAds(req, res) {
        try {
            console.log('📊 Getting all ads settings...');
            
            // Check if table exists first
            try {
                await query('SELECT 1 FROM ads_settings LIMIT 1');
            } catch (tableError) {
                console.log('⚠️ Ads table does not exist, initializing...');
                await AdsController.initializeAdsTable();
            }
            
            // Check which columns exist
            const columns = await AdsController.getAvailableColumns();
            console.log('📊 Available columns:', columns);
            
            // Build safe SELECT query
            const selectColumns = [
                'id', 'name', 'type', 'position', 'status', 'description', 'created_at', 'updated_at'
            ];
            
            // Add validation columns if they exist
            if (columns.includes('publisher_id')) selectColumns.push('publisher_id');
            if (columns.includes('ad_slot')) selectColumns.push('ad_slot');
            if (columns.includes('validation_status')) selectColumns.push('validation_status');
            if (columns.includes('validation_score')) selectColumns.push('validation_score');
            if (columns.includes('validation_errors')) selectColumns.push('validation_errors');
            if (columns.includes('validation_warnings')) selectColumns.push('validation_warnings');
            if (columns.includes('last_validated')) selectColumns.push('last_validated');
            
            const sql = `SELECT ${selectColumns.join(', ')} FROM ads_settings ORDER BY created_at DESC`;
            const ads = await query(sql);
            
            // Process ads data safely
            const processedAds = ads.map(ad => {
                const processed = { ...ad };
                
                // Parse JSON fields safely
                try {
                    if (ad.validation_errors && typeof ad.validation_errors === 'string') {
                        processed.validation_errors = JSON.parse(ad.validation_errors);
                    } else {
                        processed.validation_errors = ad.validation_errors || [];
                    }
                } catch (e) {
                    processed.validation_errors = [];
                }
                
                try {
                    if (ad.validation_warnings && typeof ad.validation_warnings === 'string') {
                        processed.validation_warnings = JSON.parse(ad.validation_warnings);
                    } else {
                        processed.validation_warnings = ad.validation_warnings || [];
                    }
                } catch (e) {
                    processed.validation_warnings = [];
                }
                
                // Set defaults for missing validation fields
                if (!columns.includes('validation_status')) {
                    processed.validation_status = 'pending';
                }
                if (!columns.includes('validation_score')) {
                    processed.validation_score = 0;
                }
                
                return processed;
            });
            
            console.log(`✅ Found ${ads.length} ads settings`);
            
            return res.json({
                success: true,
                data: processedAds || [],
                meta: {
                    hasValidation: columns.includes('validation_status'),
                    totalCount: ads.length
                }
            });
            
        } catch (error) {
            console.error('❌ Get ads error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get ads settings',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
                data: []
            });
        }
    }

    // src/controllers/adsController.js - Part 2/4: Create, Update, Delete operations

    // Create new ads setting with optional validation
    static async createAds(req, res) {
        try {
            const { name, type, code, position, status, description, validateCode = true } = req.body;
            
            console.log('📝 Creating new ads setting:', { name, type, position, status });
            
            if (!name || !code) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and code are required'
                });
            }

            // Check available columns
            const columns = await AdsController.getAvailableColumns();
            const hasValidation = columns.includes('validation_status');
            
            let validationResult = null;
            let finalStatus = status || 'active';
            
            // Validate the ads code if validator is available and validation columns exist
            if (validateCode && AdsValidator && hasValidation) {
                console.log('🔍 Validating ads code...');
                const validator = new AdsValidator();
                validationResult = await validator.validateAdsCode(code, type, {
                    verifySiteRegistration: true
                });
                
                console.log('📊 Validation result:', {
                    valid: validationResult.valid,
                    errorsCount: validationResult.errors.length,
                    warningsCount: validationResult.warnings.length,
                    securityScore: validationResult.securityScore
                });
                
                // Auto-set status based on validation
                if (validationResult.valid) {
                    finalStatus = status || 'active';
                } else if (validationResult.errors.length > 0) {
                    finalStatus = 'inactive';
                } else {
                    finalStatus = 'pending_review';
                }
            }

            // Check if table exists
            try {
                await query('SELECT 1 FROM ads_settings LIMIT 1');
            } catch (tableError) {
                console.log('⚠️ Ads table does not exist, initializing...');
                await AdsController.initializeAdsTable();
            }

            // Build INSERT query based on available columns
            let sql = `
                INSERT INTO ads_settings (name, type, code, position, status, description`;
            
            let values = [name, type || 'google_adsense', code, position || 'header', finalStatus, description || null];
            let placeholders = '?, ?, ?, ?, ?, ?';
            
            if (hasValidation && validationResult && AdsValidator) {
                const validator = new AdsValidator();
                const codeHash = validator.generateCodeHash(code);
                
                sql += `, publisher_id, ad_slot, validation_status, validation_score, validation_errors, validation_warnings, validation_data, code_hash, last_validated`;
                placeholders += ', ?, ?, ?, ?, ?, ?, ?, ?, ?';
                values.push(
                    validationResult.extractedData?.publisherId || null,
                    validationResult.extractedData?.adSlot || null,
                    validationResult.valid ? 'valid' : (validationResult.errors.length > 0 ? 'invalid' : 'warning'),
                    validationResult.securityScore || 0,
                    JSON.stringify(validationResult.errors),
                    JSON.stringify(validationResult.warnings),
                    JSON.stringify(validationResult.extractedData),
                    codeHash,
                    new Date()
                );
            }
            
            sql += `) VALUES (${placeholders})`;
            
            const result = await query(sql, values);
            
            // Auto-create ads.txt if AdSense code with publisher ID
            if (validationResult?.extractedData?.publisherId && type === 'google_adsense' && AdsValidator) {
                console.log('📄 Auto-creating ads.txt file...');
                const validator = new AdsValidator();
                const adsTxtResult = await validator.createAdsTxt(validationResult.extractedData.publisherId, {
                    domain: req.get('host')
                });
                
                if (adsTxtResult.success) {
                    console.log('✅ ads.txt file created successfully');
                } else {
                    console.log('⚠️ Failed to create ads.txt:', adsTxtResult.error);
                }
            }
            
            // Get the created ads
            const newAds = await queryOne('SELECT * FROM ads_settings WHERE id = ?', [result.insertId]);
            
            console.log('✅ Created ads setting with ID:', result.insertId);
            
            res.json({
                success: true,
                data: newAds,
                validation: validationResult,
                message: validationResult ? 
                    (validationResult.valid ? 'Ads code validated and created successfully' : 'Ads code created with validation issues') :
                    'Ads code created successfully'
            });
        } catch (error) {
            console.error('❌ Create ads error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create ads setting',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Update ads setting
    static async updateAds(req, res) {
        try {
            const { id } = req.params;
            const { name, type, code, position, status, description, revalidate = true } = req.body;
            
            console.log('📝 Updating ads setting:', id);
            
            const existingAds = await queryOne('SELECT * FROM ads_settings WHERE id = ?', [id]);
            
            if (!existingAds) {
                return res.status(404).json({
                    success: false,
                    message: 'Ads setting not found'
                });
            }
            
            // Check available columns
            const columns = await AdsController.getAvailableColumns();
            const hasValidation = columns.includes('validation_status');
            
            // Check if code was modified
            const codeModified = code && code !== existingAds.code;
            let validationResult = null;
            let newCodeHash = existingAds.code_hash;
            
            if (codeModified && revalidate && AdsValidator && hasValidation) {
                console.log('🔍 Code modified, re-validating...');
                const validator = new AdsValidator();
                validationResult = await validator.validateAdsCode(code, type || existingAds.type, {
                    verifySiteRegistration: true
                });
                newCodeHash = validator.generateCodeHash(code);
            }
            
            // Build update query based on available columns
            let sql = `UPDATE ads_settings SET name = ?, type = ?, code = ?, position = ?, status = ?, description = ?, updated_at = NOW()`;
            let values = [
                name || existingAds.name,
                type || existingAds.type,
                code || existingAds.code,
                position || existingAds.position,
                status || existingAds.status,
                description !== undefined ? description : existingAds.description
            ];
            
            if (hasValidation && validationResult) {
                sql += `, publisher_id = ?, ad_slot = ?, validation_status = ?, validation_score = ?, validation_errors = ?, validation_warnings = ?, validation_data = ?, code_hash = ?, last_validated = ?`;
                values.push(
                    validationResult.extractedData?.publisherId || existingAds.publisher_id,
                    validationResult.extractedData?.adSlot || existingAds.ad_slot,
                    validationResult.valid ? 'valid' : (validationResult.errors.length > 0 ? 'invalid' : 'warning'),
                    validationResult.securityScore || existingAds.validation_score,
                    JSON.stringify(validationResult.errors),
                    JSON.stringify(validationResult.warnings),
                    JSON.stringify(validationResult.extractedData),
                    newCodeHash,
                    new Date()
                );
            } else if (hasValidation && newCodeHash !== existingAds.code_hash) {
                sql += `, code_hash = ?`;
                values.push(newCodeHash);
            }
            
            sql += ` WHERE id = ?`;
            values.push(id);
            
            await query(sql, values);
            
            const updatedAds = await queryOne('SELECT * FROM ads_settings WHERE id = ?', [id]);
            
            console.log('✅ Updated ads setting:', id);
            
            res.json({
                success: true,
                data: {
                    ...updatedAds,
                    validation_errors: updatedAds.validation_errors ? JSON.parse(updatedAds.validation_errors) : [],
                    validation_warnings: updatedAds.validation_warnings ? JSON.parse(updatedAds.validation_warnings) : [],
                    validation_data: updatedAds.validation_data ? JSON.parse(updatedAds.validation_data) : {}
                },
                validation: validationResult,
                message: validationResult ? 'Ads setting updated with validation' : 'Ads setting updated successfully'
            });
        } catch (error) {
            console.error('❌ Update ads error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update ads setting',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Delete ads setting
    static async deleteAds(req, res) {
        try {
            const { id } = req.params;
            
            console.log('🗑️ Deleting ads setting:', id);
            
            const result = await query('DELETE FROM ads_settings WHERE id = ?', [id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Ads setting not found'
                });
            }
            
            console.log('✅ Deleted ads setting:', id);
            
            res.json({
                success: true,
                message: 'Ads setting deleted successfully'
            });
        } catch (error) {
            console.error('❌ Delete ads error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete ads setting',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Toggle ads status
    static async toggleAdsStatus(req, res) {
        try {
            const { id } = req.params;
            
            console.log('🔄 Toggling ads status:', id);
            
            const currentAds = await queryOne('SELECT * FROM ads_settings WHERE id = ?', [id]);
            
            if (!currentAds) {
                return res.status(404).json({
                    success: false,
                    message: 'Ads setting not found'
                });
            }
            
            const newStatus = currentAds.status === 'active' ? 'inactive' : 'active';
            
            await query('UPDATE ads_settings SET status = ?, updated_at = NOW() WHERE id = ?', [newStatus, id]);
            
            console.log(`✅ Toggled ads status to ${newStatus}:`, id);
            
            res.json({
                success: true,
                data: { ...currentAds, status: newStatus },
                message: `Ads setting ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`
            });
        } catch (error) {
            console.error('❌ Toggle ads status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle ads status',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // src/controllers/adsController.js - Part 3/4: Validation, Reports, and Core Features

    // Validate existing ads code
    static async validateAdsCode(req, res) {
        try {
            const { id } = req.params;
            
            if (!AdsValidator) {
                return res.status(503).json({
                    success: false,
                    message: 'Validation service not available. Please install adsValidator.js'
                });
            }
            
            console.log('🔍 Validating ads code:', id);
            
            const ads = await queryOne('SELECT * FROM ads_settings WHERE id = ?', [id]);
            
            if (!ads) {
                return res.status(404).json({
                    success: false,
                    message: 'Ads setting not found'
                });
            }
            
            const validator = new AdsValidator();
            const validationResult = await validator.validateAdsCode(ads.code, ads.type, {
                verifySiteRegistration: true
            });
            
            // Check if validation columns exist
            const columns = await AdsController.getAvailableColumns();
            
            if (columns.includes('validation_status')) {
                // Update validation results
                const updateSql = `
                    UPDATE ads_settings 
                    SET validation_status = ?, validation_score = ?, validation_errors = ?, 
                        validation_warnings = ?, validation_data = ?, last_validated = NOW()
                    WHERE id = ?
                `;
                
                await query(updateSql, [
                    validationResult.valid ? 'valid' : (validationResult.errors.length > 0 ? 'invalid' : 'warning'),
                    validationResult.securityScore,
                    JSON.stringify(validationResult.errors),
                    JSON.stringify(validationResult.warnings),
                    JSON.stringify(validationResult.extractedData),
                    id
                ]);
                
                console.log('✅ Validation completed and saved');
            } else {
                console.log('⚠️ Validation completed but not saved (no validation columns)');
            }
            
            res.json({
                success: true,
                data: validationResult,
                message: 'Ads code validation completed'
            });
            
        } catch (error) {
            console.error('❌ Validate ads error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to validate ads code',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Get validation report with fallback
    static async getValidationReport(req, res) {
        try {
            console.log('📊 Generating validation report...');
            
            const columns = await AdsController.getAvailableColumns();
            const hasValidation = columns.includes('validation_status');
            
            if (!hasValidation) {
                // Return basic report for tables without validation
                const basicStats = await queryOne('SELECT COUNT(*) as total_codes FROM ads_settings');
                
                return res.json({
                    success: true,
                    data: {
                        overview: {
                            total_codes: basicStats?.total_codes || 0,
                            valid_codes: 0,
                            invalid_codes: 0,
                            warning_codes: 0,
                            pending_codes: basicStats?.total_codes || 0,
                            avg_security_score: 0,
                            last_validation_date: null
                        },
                        byType: [],
                        recentValidations: [],
                        message: 'Validation features not available. Please migrate database.'
                    },
                    message: 'Basic report generated (validation features not available)'
                });
            }
            
            const validationStats = await queryOne(`
                SELECT 
                    COUNT(*) as total_codes,
                    SUM(CASE WHEN validation_status = 'valid' THEN 1 ELSE 0 END) as valid_codes,
                    SUM(CASE WHEN validation_status = 'invalid' THEN 1 ELSE 0 END) as invalid_codes,
                    SUM(CASE WHEN validation_status = 'warning' THEN 1 ELSE 0 END) as warning_codes,
                    SUM(CASE WHEN validation_status = 'pending' THEN 1 ELSE 0 END) as pending_codes,
                    AVG(validation_score) as avg_security_score,
                    MAX(last_validated) as last_validation_date
                FROM ads_settings
            `);
            
            const typeBreakdown = await query(`
                SELECT 
                    type,
                    COUNT(*) as count,
                    AVG(validation_score) as avg_score,
                    SUM(CASE WHEN validation_status = 'valid' THEN 1 ELSE 0 END) as valid_count
                FROM ads_settings 
                GROUP BY type
            `);
            
            const recentValidations = await query(`
                SELECT id, name, type, validation_status, validation_score, last_validated
                FROM ads_settings 
                WHERE last_validated IS NOT NULL 
                ORDER BY last_validated DESC 
                LIMIT 10
            `);
            
            res.json({
                success: true,
                data: {
                    overview: validationStats,
                    byType: typeBreakdown,
                    recentValidations: recentValidations,
                    generatedAt: new Date().toISOString()
                },
                message: 'Validation report generated successfully'
            });
            
        } catch (error) {
            console.error('❌ Get validation report error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate validation report',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Bulk validate all ads codes
    static async bulkValidateAds(req, res) {
        try {
            if (!AdsValidator) {
                return res.status(503).json({
                    success: false,
                    message: 'Bulk validation not available. Please install adsValidator.js'
                });
            }
            
            console.log('🔍 Starting bulk validation of all ads codes...');
            
            const allAds = await query('SELECT id, code, type FROM ads_settings');
            const validator = new AdsValidator();
            const results = [];
            const columns = await AdsController.getAvailableColumns();
            const hasValidation = columns.includes('validation_status');
            
            for (const ad of allAds) {
                try {
                    console.log(`Validating ad ${ad.id}...`);
                    const validationResult = await validator.validateAdsCode(ad.code, ad.type, {
                        verifySiteRegistration: true
                    });
                    
                    // Update validation results if columns exist
                    if (hasValidation) {
                        await query(`
                            UPDATE ads_settings 
                            SET validation_status = ?, validation_score = ?, validation_errors = ?, 
                                validation_warnings = ?, validation_data = ?, last_validated = NOW()
                            WHERE id = ?
                        `, [
                            validationResult.valid ? 'valid' : (validationResult.errors.length > 0 ? 'invalid' : 'warning'),
                            validationResult.securityScore,
                            JSON.stringify(validationResult.errors),
                            JSON.stringify(validationResult.warnings),
                            JSON.stringify(validationResult.extractedData),
                            ad.id
                        ]);
                    }
                    
                    results.push({
                        id: ad.id,
                        valid: validationResult.valid,
                        errorsCount: validationResult.errors.length,
                        warningsCount: validationResult.warnings.length,
                        securityScore: validationResult.securityScore
                    });
                    
                } catch (validationError) {
                    console.error(`Validation failed for ad ${ad.id}:`, validationError.message);
                    results.push({
                        id: ad.id,
                        valid: false,
                        error: validationError.message
                    });
                }
            }
            
            console.log('✅ Bulk validation completed');
            
            res.json({
                success: true,
                data: {
                    totalProcessed: allAds.length,
                    validCodes: results.filter(r => r.valid).length,
                    invalidCodes: results.filter(r => !r.valid && !r.error).length,
                    errorCodes: results.filter(r => r.error).length,
                    results: results,
                    hasValidation: hasValidation
                },
                message: 'Bulk validation completed successfully'
            });
            
        } catch (error) {
            console.error('❌ Bulk validate error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to perform bulk validation',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Generate ads.txt file
    static async generateAdsTxt(req, res) {
        try {
            if (!AdsValidator) {
                return res.status(503).json({
                    success: false,
                    message: 'ads.txt generation not available. Please install adsValidator.js'
                });
            }
            
            console.log('📄 Generating ads.txt file...');
            
            // Get all active AdSense codes
            const columns = await AdsController.getAvailableColumns();
            
            let adsenseAds = [];
            if (columns.includes('publisher_id')) {
                adsenseAds = await query(`
                    SELECT publisher_id, validation_data
                    FROM ads_settings 
                    WHERE type = 'google_adsense' 
                    AND status = 'active' 
                    AND publisher_id IS NOT NULL
                `);
            } else {
                // Fallback: Extract publisher ID from code
                const allAdsense = await query(`
                    SELECT code FROM ads_settings 
                    WHERE type = 'google_adsense' AND status = 'active'
                `);
                
                for (const ad of allAdsense) {
                    const pubIdMatch = ad.code.match(/ca-pub-(\d+)/);
                    if (pubIdMatch) {
                        adsenseAds.push({ publisher_id: pubIdMatch[1] });
                    }
                }
            }
            
            if (adsenseAds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No valid AdSense codes found. Add and validate AdSense code first.'
                });
            }
            
            const validator = new AdsValidator();
            const publisherIds = [...new Set(adsenseAds.map(ad => ad.publisher_id).filter(Boolean))];
            
            // Use the first publisher ID as primary
            const primaryPublisherId = publisherIds[0];
            
            const adsTxtResult = await validator.createAdsTxt(primaryPublisherId, {
                domain: req.get('host'),
                additionalNetworks: req.body.additionalNetworks || []
            });
            
            if (adsTxtResult.success) {
                console.log('✅ ads.txt file generated successfully');
                res.json({
                    success: true,
                    data: {
                        path: adsTxtResult.path,
                        content: adsTxtResult.content,
                        publisherIds: publisherIds
                    },
                    message: 'ads.txt file generated successfully'
                });
            } else {
                throw new Error(adsTxtResult.error);
            }
            
        } catch (error) {
            console.error('❌ Generate ads.txt error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate ads.txt file',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Get active ads by position (for frontend use) - safe version
    static async getActiveAdsByPosition(position) {
        try {
            console.log(`📊 Getting active ads for position: ${position}`);
            
            // Check if table exists first
            try {
                await query('SELECT 1 FROM ads_settings LIMIT 1');
            } catch (tableError) {
                console.log('⚠️ Ads table does not exist, returning empty array');
                return [];
            }
            
            // Get available columns
            const columns = await AdsController.getAvailableColumns();
            const hasValidation = columns.includes('validation_status');
            
            let sql = `SELECT id, name, type, code, position, created_at FROM ads_settings WHERE position = ? AND status = 'active'`;
            let whereCondition = '';
            
            if (hasValidation) {
                // Only get validated ads if validation columns exist
                whereCondition = ` AND validation_status IN ('valid', 'warning')`;
                sql = `SELECT id, name, type, code, position, validation_status, validation_score, created_at FROM ads_settings WHERE position = ? AND status = 'active'${whereCondition} ORDER BY validation_score DESC, created_at ASC`;
            } else {
                sql += ' ORDER BY created_at ASC';
            }
            
            const ads = await query(sql, [position]);
            
            console.log(`✅ Found ${ads.length} active ads for position: ${position}`);
            return ads;
        } catch (error) {
            console.error('❌ Get active ads error:', error);
            return [];
        }
    }

    // Get all active ads for injection - safe version
    static async getActiveAdsForInjection(req, res) {
        try {
            console.log('📊 Getting all active ads for injection...');
            
            // Check if table exists first
            try {
                await query('SELECT 1 FROM ads_settings LIMIT 1');
            } catch (tableError) {
                console.log('⚠️ Ads table does not exist, returning empty structure');
                return res.json({
                    success: true,
                    data: {
                        header: [],
                        footer: [],
                        before_video: [],
                        after_video: [],
                        sidebar: []
                    }
                });
            }
            
            // Get available columns
            const columns = await AdsController.getAvailableColumns();
            const hasValidation = columns.includes('validation_status');
            
            let sql = `SELECT id, name, type, code, position, created_at FROM ads_settings WHERE status = 'active'`;
            
            if (hasValidation) {
                sql = `SELECT id, name, type, code, position, validation_status, validation_score, created_at FROM ads_settings WHERE status = 'active' AND validation_status IN ('valid', 'warning') ORDER BY position, validation_score DESC, created_at ASC`;
            } else {
                sql += ' ORDER BY position, created_at ASC';
            }
            
            const ads = await query(sql);
            
            const adsByPosition = {
                header: [],
                footer: [],
                before_video: [],
                after_video: [],
                sidebar: []
            };
            
            ads.forEach(ad => {
                if (adsByPosition[ad.position]) {
                    adsByPosition[ad.position].push({
                        id: ad.id,
                        name: ad.name,
                        type: ad.type,
                        code: ad.code,
                        validation_status: ad.validation_status || 'pending',
                        validation_score: ad.validation_score || 0
                    });
                }
            });
            
            console.log('✅ Prepared ads by position:', 
                Object.keys(adsByPosition).map(key => `${key}: ${adsByPosition[key].length}`)
            );
            
            res.json({
                success: true,
                data: adsByPosition,
                meta: {
                    totalAds: ads.length,
                    validatedAds: hasValidation ? ads.filter(ad => ad.validation_status === 'valid').length : 0,
                    hasValidation: hasValidation,
                    lastUpdated: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('❌ Get ads for injection error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get ads for injection',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
                data: {
                    header: [],
                    footer: [],
                    before_video: [],
                    after_video: [],
                    sidebar: []
                }
            });
        }
    }

    // src/controllers/adsController.js - Part 4/4: Advanced Features, Analytics, and Module Export

            res.status(500).json({
                success: false,
                message: 'Failed to generate ads.txt file',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Get active ads by position (for frontend use) - safe version
    static async getActiveAdsByPosition(position) {
        try {
            console.log(`📊 Getting active ads for position: ${position}`);
            
            // Check if table exists first
            try {
                await query('SELECT 1 FROM ads_settings LIMIT 1');
            } catch (tableError) {
                console.log('⚠️ Ads table does not exist, returning empty array');
                return [];
            }
            
            // Get available columns
            const columns = await AdsController.getAvailableColumns();
            const hasValidation = columns.includes('validation_status');
            
            let sql = `SELECT id, name, type, code, position, created_at FROM ads_settings WHERE position = ? AND status = 'active'`;
            let whereCondition = '';
            
            if (hasValidation) {
                // Only get validated ads if validation columns exist
                whereCondition = ` AND validation_status IN ('valid', 'warning')`;
                sql = `SELECT id, name, type, code, position, validation_status, validation_score, created_at FROM ads_settings WHERE position = ? AND status = 'active'${whereCondition} ORDER BY validation_score DESC, created_at ASC`;
            } else {
                sql += ' ORDER BY created_at ASC';
            }
            
            const ads = await query(sql, [position]);
            
            console.log(`✅ Found ${ads.length} active ads for position: ${position}`);
            return ads;
        } catch (error) {
            console.error('❌ Get active ads error:', error);
            return [];
        }
    }

    // Get all active ads for injection - safe version
    static async getActiveAdsForInjection(req, res) {
        try {
            console.log('📊 Getting all active ads for injection...');
            
            // Check if table exists first
            try {
                await query('SELECT 1 FROM ads_settings LIMIT 1');
            } catch (tableError) {
                console.log('⚠️ Ads table does not exist, returning empty structure');
                return res.json({
                    success: true,
                    data: {
                        header: [],
                        footer: [],
                        before_video: [],
                        after_video: [],
                        sidebar: []
                    }
                });
            }
            
            // Get available columns
            const columns = await AdsController.getAvailableColumns();
            const hasValidation = columns.includes('validation_status');
            
            let sql = `SELECT id, name, type, code, position, created_at FROM ads_settings WHERE status = 'active'`;
            
            if (hasValidation) {
                sql = `SELECT id, name, type, code, position, validation_status, validation_score, created_at FROM ads_settings WHERE status = 'active' AND validation_status IN ('valid', 'warning') ORDER BY position, validation_score DESC, created_at ASC`;
            } else {
                sql += ' ORDER BY position, created_at ASC';
            }
            
            const ads = await query(sql);
            
            const adsByPosition = {
                header: [],
                footer: [],
                before_video: [],
                after_video: [],
                sidebar: []
            };
            
            ads.forEach(ad => {
                if (adsByPosition[ad.position]) {
                    adsByPosition[ad.position].push({
                        id: ad.id,
                        name: ad.name,
                        type: ad.type,
                        code: ad.code,
                        validation_status: ad.validation_status || 'pending',
                        validation_score: ad.validation_score || 0
                    });
                }
            });
            
            console.log('✅ Prepared ads by position:', 
                Object.keys(adsByPosition).map(key => `${key}: ${adsByPosition[key].length}`)
            );
            
            res.json({
                success: true,
                data: adsByPosition,
                meta: {
                    totalAds: ads.length,
                    validatedAds: hasValidation ? ads.filter(ad => ad.validation_status === 'valid').length : 0,
                    hasValidation: hasValidation,
                    lastUpdated: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('❌ Get ads for injection error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get ads for injection',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
                data: {
                    header: [],
                    footer: [],
                    before_video: [],
                    after_video: [],
                    sidebar: []
                }
            });
        }
    }

    // Migration helper endpoint
    static async runMigration(req, res) {
        try {
            if (!AdsMigration) {
                return res.status(503).json({
                    success: false,
                    message: 'Migration service not available. Please install adsMigration.js'
                });
            }
            
            console.log('🔧 Starting manual migration...');
            
            const migrationSuccess = await AdsMigration.runFullMigration();
            
            if (migrationSuccess) {
                res.json({
                    success: true,
                    message: 'Migration completed successfully!'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Migration failed. Check server logs for details.'
                });
            }
            
        } catch (error) {
            console.error('❌ Migration error:', error);
            res.status(500).json({
                success: false,
                message: 'Migration failed',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Get ads performance analytics
    static async getAdsAnalytics(req, res) {
        try {
            console.log('📊 Getting ads performance analytics...');
            
            const columns = await AdsController.getAvailableColumns();
            const hasValidation = columns.includes('validation_status');
            
            if (!hasValidation) {
                const totalAds = await queryOne('SELECT COUNT(*) as count FROM ads_settings');
                const activeAds = await queryOne("SELECT COUNT(*) as count FROM ads_settings WHERE status = 'active'");
                
                return res.json({
                    success: true,
                    data: {
                        message: 'Analytics not available. Please migrate database for validation features.',
                        basic: {
                            totalAds: totalAds?.count || 0,
                            activeAds: activeAds?.count || 0
                        }
                    }
                });
            }
            
            // Performance metrics
            const performanceData = await query(`
                SELECT 
                    position,
                    COUNT(*) as total_ads,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_ads,
                    SUM(CASE WHEN validation_status = 'valid' THEN 1 ELSE 0 END) as valid_ads,
                    AVG(validation_score) as avg_security_score
                FROM ads_settings 
                GROUP BY position
                ORDER BY total_ads DESC
            `);
            
            // Type distribution
            const typeDistribution = await query(`
                SELECT 
                    type,
                    COUNT(*) as count,
                    AVG(validation_score) as avg_score,
                    SUM(CASE WHEN validation_status = 'valid' THEN 1 ELSE 0 END) as valid_count
                FROM ads_settings 
                GROUP BY type
                ORDER BY count DESC
            `);
            
            // Recent activity
            const recentActivity = await query(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as ads_created
                FROM ads_settings 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                LIMIT 30
            `);
            
            res.json({
                success: true,
                data: {
                    performance: performanceData,
                    typeDistribution: typeDistribution,
                    recentActivity: recentActivity,
                    generatedAt: new Date().toISOString()
                },
                message: 'Ads analytics generated successfully'
            });
            
        } catch (error) {
            console.error('❌ Get ads analytics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get ads analytics',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Export ads settings
    static async exportAds(req, res) {
        try {
            console.log('📤 Exporting ads settings...');
            
            const { format = 'json' } = req.query;
            const columns = await AdsController.getAvailableColumns();
            
            // Get all ads
            const selectFields = ['id', 'name', 'type', 'code', 'position', 'status', 'description', 'created_at'];
            if (columns.includes('validation_status')) selectFields.push('validation_status', 'validation_score');
            if (columns.includes('publisher_id')) selectFields.push('publisher_id', 'ad_slot');
            
            const ads = await query(`SELECT ${selectFields.join(', ')} FROM ads_settings ORDER BY created_at DESC`);
            
            if (format === 'csv') {
                // Generate CSV
                const csv = [
                    selectFields.join(','), // Headers
                    ...ads.map(ad => selectFields.map(field => 
                        typeof ad[field] === 'string' ? `"${ad[field].replace(/"/g, '""')}"` : ad[field]
                    ).join(','))
                ].join('\n');
                
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename="ads_export.csv"');
                res.send(csv);
                
            } else {
                // JSON export
                const exportData = {
                    exportedAt: new Date().toISOString(),
                    totalAds: ads.length,
                    hasValidation: columns.includes('validation_status'),
                    ads: ads
                };
                
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', 'attachment; filename="ads_export.json"');
                res.json(exportData);
            }
            
            console.log(`✅ Exported ${ads.length} ads in ${format} format`);
            
        } catch (error) {
            console.error('❌ Export ads error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export ads settings',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Import ads settings
    static async importAds(req, res) {
        try {
            console.log('📥 Importing ads settings...');
            
            const { ads, overwrite = false } = req.body;
            
            if (!ads || !Array.isArray(ads)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid import data. Expected array of ads.'
                });
            }
            
            const columns = await AdsController.getAvailableColumns();
            const hasValidation = columns.includes('validation_status');
            
            let imported = 0;
            let skipped = 0;
            let errors = 0;
            
            for (const adData of ads) {
                try {
                    // Check if ad already exists
                    if (!overwrite && adData.name) {
                        const existing = await queryOne('SELECT id FROM ads_settings WHERE name = ?', [adData.name]);
                        if (existing) {
                            skipped++;
                            continue;
                        }
                    }
                    
                    // Validate required fields
                    if (!adData.name || !adData.code) {
                        errors++;
                        continue;
                    }
                    
                    // Prepare insert data
                    let sql = 'INSERT INTO ads_settings (name, type, code, position, status, description';
                    let values = [
                        adData.name,
                        adData.type || 'custom',
                        adData.code,
                        adData.position || 'header',
                        adData.status || 'active',
                        adData.description || null
                    ];
                    let placeholders = '?, ?, ?, ?, ?, ?';
                    
                    // Add validation fields if available
                    if (hasValidation && adData.validation_status) {
                        sql += ', validation_status, validation_score, publisher_id, ad_slot';
                        placeholders += ', ?, ?, ?, ?';
                        values.push(
                            adData.validation_status,
                            adData.validation_score || 0,
                            adData.publisher_id || null,
                            adData.ad_slot || null
                        );
                    }
                    
                    sql += `) VALUES (${placeholders})`;
                    
                    await query(sql, values);
                    imported++;
                    
                } catch (importError) {
                    console.error('Import error for ad:', adData.name, importError.message);
                    errors++;
                }
            }
            
            console.log(`✅ Import completed: ${imported} imported, ${skipped} skipped, ${errors} errors`);
            
            res.json({
                success: true,
                data: {
                    imported,
                    skipped,
                    errors,
                    total: ads.length
                },
                message: `Import completed: ${imported} ads imported successfully`
            });
            
        } catch (error) {
            console.error('❌ Import ads error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to import ads settings',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Health check for ads system
    static async healthCheck(req, res) {
        try {
            console.log('🏥 Running ads system health check...');
            
            const healthData = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                checks: {
                    database: false,
                    table: false,
                    validation: false,
                    migration: false,
                    validator: false
                },
                stats: {
                    totalAds: 0,
                    activeAds: 0,
                    validatedAds: 0
                }
            };
            
            // Check database connection
            try {
                await query('SELECT 1');
                healthData.checks.database = true;
            } catch (dbError) {
                healthData.status = 'unhealthy';
                healthData.errors = healthData.errors || [];
                healthData.errors.push('Database connection failed');
            }
            
            // Check table exists
            try {
                await query('SELECT 1 FROM ads_settings LIMIT 1');
                healthData.checks.table = true;
                
                // Get basic stats
                const totalAds = await queryOne('SELECT COUNT(*) as count FROM ads_settings');
                const activeAds = await queryOne("SELECT COUNT(*) as count FROM ads_settings WHERE status = 'active'");
                
                healthData.stats.totalAds = totalAds?.count || 0;
                healthData.stats.activeAds = activeAds?.count || 0;
                
            } catch (tableError) {
                healthData.status = 'degraded';
                healthData.warnings = healthData.warnings || [];
                healthData.warnings.push('Ads table not found or accessible');
            }
            
            // Check validation features
            const columns = await AdsController.getAvailableColumns();
            if (columns.includes('validation_status')) {
                healthData.checks.validation = true;
                
                try {
                    const validatedAds = await queryOne("SELECT COUNT(*) as count FROM ads_settings WHERE validation_status = 'valid'");
                    healthData.stats.validatedAds = validatedAds?.count || 0;
                } catch (validationError) {
                    healthData.warnings = healthData.warnings || [];
                    healthData.warnings.push('Validation stats unavailable');
                }
            }
            
            // Check migration availability
            if (AdsMigration) {
                healthData.checks.migration = true;
            }
            
            // Check validator availability
            if (AdsValidator) {
                healthData.checks.validator = true;
            }
            
            console.log('✅ Health check completed:', healthData.status);
            
            const statusCode = healthData.status === 'healthy' ? 200 : 
                              healthData.status === 'degraded' ? 206 : 503;
            
            res.status(statusCode).json({
                success: healthData.status !== 'unhealthy',
                data: healthData,
                message: `Ads system status: ${healthData.status}`
            });
            
        } catch (error) {
            console.error('❌ Health check error:', error);
            res.status(500).json({
                success: false,
                message: 'Health check failed',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }
}

// Initialize table on startup
AdsController.initializeAdsTable().catch(console.error);

module.exports = AdsController;