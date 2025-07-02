// src/routes/api/admin/storage.js - NEW FILE
const express = require('express');
const router = express.Router();
const storageService = require('../../../services/storageService');
const { isS3Configured, getBucketInfo, s3Service } = require('../../../config/aws');

// Get storage system status
router.get('/status', async (req, res) => {
    try {
        console.log('Getting storage status...');
        
        const storageInfo = storageService.getStorageInfo();
        const response = {
            success: true,
            data: {
                ...storageInfo,
                timestamp: new Date().toISOString()
            }
        };
        
        // Add S3 specific information if configured
        if (storageInfo.s3_enabled) {
            try {
                const bucketInfo = await getBucketInfo();
                if (bucketInfo.success) {
                    response.data.s3_bucket = bucketInfo.bucket;
                    response.data.s3_region = bucketInfo.region;
                    response.data.s3_versioning = bucketInfo.versioning;
                }
            } catch (s3Error) {
                console.warn('Failed to get S3 bucket info:', s3Error);
                response.data.s3_error = s3Error.message;
            }
        }
        
        res.json(response);
    } catch (error) {
        console.error('Storage status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get storage status',
            error: error.message
        });
    }
});

// Get storage statistics
router.get('/stats', async (req, res) => {
    try {
        console.log('Getting storage statistics...');
        
        const stats = await storageService.getStorageStats();
        
        if (!stats) {
            throw new Error('Failed to retrieve storage statistics');
        }
        
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Storage stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get storage statistics',
            error: error.message
        });
    }
});

// Test S3 connectivity
router.get('/test-s3', async (req, res) => {
    try {
        if (!isS3Configured()) {
            return res.json({
                success: false,
                message: 'S3 not configured',
                configured: false
            });
        }
        
        const bucketInfo = await getBucketInfo();
        
        res.json({
            success: bucketInfo.success,
            message: bucketInfo.success ? 'S3 connection successful' : 'S3 connection failed',
            configured: true,
            data: bucketInfo.success ? {
                bucket: bucketInfo.bucket,
                region: bucketInfo.region,
                versioning: bucketInfo.versioning
            } : null,
            error: bucketInfo.success ? null : bucketInfo.error
        });
    } catch (error) {
        console.error('S3 test error:', error);
        res.status(500).json({
            success: false,
            message: 'S3 test failed',
            error: error.message,
            configured: true
        });
    }
});

// List S3 files (for debugging/admin purposes)
router.get('/s3/list', async (req, res) => {
    try {
        if (!isS3Configured()) {
            return res.status(400).json({
                success: false,
                message: 'S3 not configured'
            });
        }
        
        const { prefix, limit } = req.query;
        const maxKeys = Math.min(parseInt(limit) || 100, 1000);
        
        const listResult = await s3Service.listFiles(prefix || '', maxKeys);
        
        if (listResult.success) {
            res.json({
                success: true,
                data: {
                    files: listResult.files,
                    total: listResult.files.length,
                    isTruncated: listResult.isTruncated,
                    prefix: prefix || ''
                }
            });
        } else {
            throw new Error(listResult.error);
        }
    } catch (error) {
        console.error('S3 list error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list S3 files',
            error: error.message
        });
    }
});

// Migrate local file to S3
router.post('/migrate-to-s3', async (req, res) => {
    try {
        const { localPath } = req.body;
        
        if (!localPath) {
            return res.status(400).json({
                success: false,
                message: 'Local path is required'
            });
        }
        
        if (!isS3Configured()) {
            return res.status(400).json({
                success: false,
                message: 'S3 not configured'
            });
        }
        
        const migrationResult = await storageService.migrateToS3(localPath);
        
        if (migrationResult.success) {
            res.json({
                success: true,
                message: 'File migrated to S3 successfully',
                data: {
                    original_path: localPath,
                    s3_url: migrationResult.url,
                    s3_key: migrationResult.key
                }
            });
        } else {
            throw new Error(migrationResult.error);
        }
    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({
            success: false,
            message: 'Migration failed',
            error: error.message
        });
    }
});

// Clean up old files
router.delete('/cleanup', async (req, res) => {
    try {
        const { days, storage_type } = req.query;
        const cleanupDays = parseInt(days) || 30;
        
        // This would need to be implemented in storageService
        const cleanupResult = await storageService.cleanupOldFiles(cleanupDays);
        
        if (cleanupResult.success) {
            res.json({
                success: true,
                message: 'Cleanup completed successfully',
                data: {
                    files_cleaned: cleanupResult.cleanedFiles,
                    space_freed: storageService.formatFileSize(cleanupResult.freedSpace),
                    days: cleanupDays
                }
            });
        } else {
            throw new Error(cleanupResult.error);
        }
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({
            success: false,
            message: 'Cleanup failed',
            error: error.message
        });
    }
});

// Get presigned URL for S3 file
router.post('/presigned-url', async (req, res) => {
    try {
        const { key, expiresIn } = req.body;
        
        if (!key) {
            return res.status(400).json({
                success: false,
                message: 'S3 key is required'
            });
        }
        
        if (!isS3Configured()) {
            return res.status(400).json({
                success: false,
                message: 'S3 not configured'
            });
        }
        
        const urlResult = await s3Service.generatePresignedUrl(key, expiresIn || 3600);
        
        if (urlResult.success) {
            res.json({
                success: true,
                data: {
                    url: urlResult.url,
                    expires_in: urlResult.expiresIn,
                    key: key
                }
            });
        } else {
            throw new Error(urlResult.error);
        }
    } catch (error) {
        console.error('Presigned URL error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate presigned URL',
            error: error.message
        });
    }
});

module.exports = router;