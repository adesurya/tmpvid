// src/services/storageService.js - UPDATED with enhanced S3 support
const fs = require('fs').promises;
const path = require('path');
const { s3Service, uploadToS3, deleteFromS3, isS3Configured, extractKeyFromUrl } = require('../config/aws');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

class StorageService {
    constructor() {
        this.useS3 = isS3Configured();
        this.localUploadPath = path.join(__dirname, '../../public/uploads');
        this.initLocalStorage();
        
        console.log(`📦 Storage Service initialized - S3: ${this.useS3 ? 'Enabled' : 'Disabled'}`);
    }

    async initLocalStorage() {
        try {
            // Create upload directories if they don't exist
            const directories = [
                this.localUploadPath,
                path.join(this.localUploadPath, 'videos'),
                path.join(this.localUploadPath, 'thumbnails'),
                path.join(this.localUploadPath, 'images'),
                path.join(this.localUploadPath, 'temp')
            ];

            for (const dir of directories) {
                await fs.mkdir(dir, { recursive: true });
            }
            
            console.log('✅ Local storage directories initialized');
        } catch (error) {
            console.error('❌ Failed to initialize local storage:', error);
        }
    }

    // ENHANCED: Upload video file with S3 support
    async uploadVideo(file, options = {}) {
        try {
            const {
                forceLocal = false,
                generateThumbnail = true,
                quality = 'original'
            } = options;

            console.log(`📹 Uploading video: ${file.originalname} (${this.formatFileSize(file.size)})`);

            // Determine storage method
            const useS3ForThisUpload = this.useS3 && !forceLocal;

            if (useS3ForThisUpload) {
                return await this.uploadVideoToS3(file, options);
            } else {
                return await this.uploadVideoToLocal(file, options);
            }
        } catch (error) {
            console.error('❌ Video upload error:', error);
            return {
                success: false,
                error: error.message,
                storage_type: 'unknown'
            };
        }
    }

    // NEW: Upload video to S3
    async uploadVideoToS3(file, options = {}) {
        try {
            console.log('📤 Uploading video to S3...');

            // Upload main video file
            const uploadResult = await uploadToS3(file, 'videos');
            
            if (!uploadResult.success) {
                throw new Error(uploadResult.error);
            }

            console.log(`✅ Video uploaded to S3: ${uploadResult.url}`);

            // Generate thumbnail if requested
            let thumbnailUrl = null;
            if (options.generateThumbnail && file.mimetype.startsWith('video/')) {
                try {
                    const thumbnailResult = await this.generateVideoThumbnailFromS3(uploadResult.key);
                    if (thumbnailResult.success) {
                        thumbnailUrl = thumbnailResult.url;
                        console.log(`✅ Thumbnail generated: ${thumbnailUrl}`);
                    }
                } catch (thumbError) {
                    console.warn('⚠️ Thumbnail generation failed:', thumbError.message);
                }
            }

            return {
                success: true,
                url: uploadResult.url,
                thumbnail: thumbnailUrl,
                key: uploadResult.key,
                storage_type: 's3',
                bucket: uploadResult.bucket,
                size: uploadResult.size,
                etag: uploadResult.etag,
                meta: {
                    original_name: file.originalname,
                    mime_type: file.mimetype,
                    upload_timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('❌ S3 video upload error:', error);
            
            // Fallback to local storage if S3 fails
            console.log('🔄 Falling back to local storage...');
            return await this.uploadVideoToLocal(file, options);
        }
    }

    // ENHANCED: Upload video to local storage
    async uploadVideoToLocal(file, options = {}) {
        try {
            console.log('💾 Uploading video to local storage...');

            const fileExtension = path.extname(file.originalname);
            const fileName = `${uuidv4()}${fileExtension}`;
            const filePath = path.join(this.localUploadPath, 'videos', fileName);
            const webPath = `/uploads/videos/${fileName}`;

            // Write file to local storage
            await fs.writeFile(filePath, file.buffer);

            console.log(`✅ Video uploaded locally: ${webPath}`);

            // Generate thumbnail if requested
            let thumbnailUrl = null;
            if (options.generateThumbnail && file.mimetype.startsWith('video/')) {
                try {
                    const thumbnailResult = await this.generateVideoThumbnailFromLocal(filePath);
                    if (thumbnailResult.success) {
                        thumbnailUrl = thumbnailResult.url;
                        console.log(`✅ Thumbnail generated: ${thumbnailUrl}`);
                    }
                } catch (thumbError) {
                    console.warn('⚠️ Thumbnail generation failed:', thumbError.message);
                }
            }

            return {
                success: true,
                url: webPath,
                thumbnail: thumbnailUrl,
                path: filePath,
                storage_type: 'local',
                size: file.size,
                meta: {
                    original_name: file.originalname,
                    mime_type: file.mimetype,
                    upload_timestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('❌ Local video upload error:', error);
            return {
                success: false,
                error: error.message,
                storage_type: 'local'
            };
        }
    }

    // NEW: Generate thumbnail from S3 video
    async generateVideoThumbnailFromS3(videoKey) {
        try {
            console.log(`🖼️ Generating thumbnail from S3 video: ${videoKey}`);

            // For S3 videos, we need to either:
            // 1. Download video temporarily to generate thumbnail, or
            // 2. Use a service like AWS Lambda with FFmpeg
            // 3. Use AWS MediaConvert for thumbnail generation

            // For now, we'll implement option 1 (temporary download)
            // In production, you might want to use AWS Lambda or MediaConvert

            const presignedResult = await s3Service.generatePresignedUrl(videoKey, 300); // 5 minutes
            if (!presignedResult.success) {
                throw new Error('Failed to generate presigned URL');
            }

            // Download video temporarily
            const response = await fetch(presignedResult.url);
            if (!response.ok) {
                throw new Error('Failed to download video from S3');
            }

            const videoBuffer = await response.buffer();
            const tempVideoPath = path.join(this.localUploadPath, 'temp', `${uuidv4()}.mp4`);
            
            // Save temporarily
            await fs.writeFile(tempVideoPath, videoBuffer);

            try {
                // Generate thumbnail from temporary file
                const thumbnailResult = await this.generateVideoThumbnailFromLocal(tempVideoPath);
                
                if (thumbnailResult.success && thumbnailResult.storage_type === 'local') {
                    // Upload thumbnail to S3
                    const thumbnailBuffer = await fs.readFile(path.join(__dirname, '../../public', thumbnailResult.url));
                    const thumbnailFile = {
                        buffer: thumbnailBuffer,
                        originalname: `thumb_${videoKey}.jpg`,
                        mimetype: 'image/jpeg'
                    };

                    const s3ThumbnailResult = await uploadToS3(thumbnailFile, 'thumbnails');
                    
                    // Clean up local thumbnail
                    try {
                        await fs.unlink(path.join(__dirname, '../../public', thumbnailResult.url));
                    } catch (cleanupError) {
                        console.warn('⚠️ Failed to cleanup local thumbnail:', cleanupError.message);
                    }

                    return {
                        success: true,
                        url: s3ThumbnailResult.url,
                        storage_type: 's3'
                    };
                } else {
                    return thumbnailResult;
                }

            } finally {
                // Clean up temporary video file
                try {
                    await fs.unlink(tempVideoPath);
                } catch (cleanupError) {
                    console.warn('⚠️ Failed to cleanup temporary video file:', cleanupError.message);
                }
            }

        } catch (error) {
            console.error('❌ S3 thumbnail generation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ENHANCED: Generate thumbnail from local video
    async generateVideoThumbnailFromLocal(videoPath) {
        try {
            // Check if FFmpeg is available
            const ffmpeg = require('fluent-ffmpeg');
            
            return new Promise((resolve, reject) => {
                const thumbnailName = `${uuidv4()}.jpg`;
                const thumbnailPath = path.join(this.localUploadPath, 'thumbnails', thumbnailName);
                const webPath = `/uploads/thumbnails/${thumbnailName}`;
                
                ffmpeg(videoPath)
                    .screenshots({
                        timestamps: ['00:00:02'],
                        filename: thumbnailName,
                        folder: path.dirname(thumbnailPath),
                        size: '300x400'
                    })
                    .on('end', () => {
                        resolve({
                            success: true,
                            url: webPath,
                            path: thumbnailPath,
                            storage_type: 'local'
                        });
                    })
                    .on('error', (err) => {
                        console.error('❌ FFmpeg thumbnail error:', err);
                        resolve({
                            success: false,
                            error: err.message
                        });
                    });
            });

        } catch (error) {
            console.error('❌ Local thumbnail generation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ENHANCED: Upload image with S3 support
    async uploadImage(file, options = {}) {
        try {
            const { forceLocal = false } = options;

            // Optimize image before upload
            const optimizedBuffer = await this.optimizeImage(file.buffer);
            const optimizedFile = {
                ...file,
                buffer: optimizedBuffer
            };

            if (this.useS3 && !forceLocal) {
                const result = await uploadToS3(optimizedFile, 'images');
                return {
                    ...result,
                    storage_type: 's3'
                };
            } else {
                return await this.uploadToLocal(optimizedFile, 'images');
            }
        } catch (error) {
            console.error('❌ Image upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ENHANCED: Delete file with S3 support
    async deleteFile(fileUrl, storageType = 'local') {
        try {
            console.log(`🗑️ Deleting file: ${fileUrl} (${storageType})`);

            if (storageType === 's3') {
                const key = extractKeyFromUrl(fileUrl);
                if (key) {
                    const result = await deleteFromS3(key);
                    return result.success;
                }
                return false;
            } else if (storageType === 'local' && fileUrl.startsWith('/uploads/')) {
                const filePath = path.join(__dirname, '../../public', fileUrl);
                await fs.unlink(filePath);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ Delete file error:', error);
            return false;
        }
    }

    // ENHANCED: Delete video with S3 support
    async deleteVideo(videoUrl, storageType = 'local') {
        return await this.deleteFile(videoUrl, storageType);
    }

    // Upload to local storage (existing method, enhanced)
    async uploadToLocal(file, folder) {
        try {
            const fileExtension = path.extname(file.originalname);
            const fileName = `${uuidv4()}${fileExtension}`;
            const filePath = path.join(this.localUploadPath, folder, fileName);
            const webPath = `/uploads/${folder}/${fileName}`;

            await fs.writeFile(filePath, file.buffer);

            return {
                success: true,
                url: webPath,
                path: filePath,
                storage_type: 'local'
            };
        } catch (error) {
            console.error('❌ Local upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // NEW: Get storage configuration info
    getStorageInfo() {
        return {
            s3_enabled: this.useS3,
            s3_configured: isS3Configured(),
            default_storage: this.useS3 ? 's3' : 'local',
            local_path: this.localUploadPath,
            supported_formats: {
                video: ['mp4', 'avi', 'mov', 'wmv', 'flv'],
                image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
                thumbnail: ['jpg', 'jpeg', 'png']
            }
        };
    }

    // NEW: Migrate files between storage types
    async migrateToS3(localPath) {
        try {
            if (!this.useS3) {
                throw new Error('S3 not configured');
            }

            // Read local file
            const fileBuffer = await fs.readFile(localPath);
            const fileName = path.basename(localPath);
            const folder = path.dirname(localPath).split('/').pop();

            // Create file object
            const file = {
                buffer: fileBuffer,
                originalname: fileName,
                mimetype: this.getMimeType(fileName)
            };

            // Upload to S3
            const result = await uploadToS3(file, folder);

            if (result.success) {
                console.log(`✅ Migrated to S3: ${localPath} -> ${result.url}`);
                return result;
            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error(`❌ Migration to S3 failed for ${localPath}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // NEW: Get MIME type from file extension
    getMimeType(fileName) {
        const ext = path.extname(fileName).toLowerCase();
        const mimeTypes = {
            '.mp4': 'video/mp4',
            '.avi': 'video/x-msvideo',
            '.mov': 'video/quicktime',
            '.wmv': 'video/x-ms-wmv',
            '.flv': 'video/x-flv',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    // Existing methods remain the same...
    async optimizeImage(buffer, options = {}) {
        try {
            const {
                width = 800,
                height = 600,
                quality = 80,
                format = 'jpeg'
            } = options;

            return await sharp(buffer)
                .resize(width, height, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({ quality })
                .toBuffer();
        } catch (error) {
            console.error('❌ Image optimization error:', error);
            return buffer; // Return original if optimization fails
        }
    }

    async generateThumbnail(buffer, options = {}) {
        try {
            const {
                width = 300,
                height = 400,
                quality = 75
            } = options;

            return await sharp(buffer)
                .resize(width, height, {
                    fit: 'cover',
                    position: 'center'
                })
                .jpeg({ quality })
                .toBuffer();
        } catch (error) {
            console.error('❌ Thumbnail generation error:', error);
            return buffer;
        }
    }

    // Enhanced storage stats with S3 support
    async getStorageStats() {
        try {
            const stats = {
                storage_type: this.useS3 ? 's3' : 'local',
                s3_enabled: this.useS3,
                videos: { count: 0, size: 0 },
                images: { count: 0, size: 0 },
                thumbnails: { count: 0, size: 0 },
                total: { count: 0, size: 0 }
            };

            if (this.useS3) {
                // Get S3 stats
                const bucketInfo = await s3Service.getBucketInfo();
                stats.s3_info = bucketInfo;

                // List files in different folders
                const folders = ['videos', 'images', 'thumbnails'];
                for (const folder of folders) {
                    try {
                        const listResult = await s3Service.listFiles(`${folder}/`);
                        if (listResult.success) {
                            stats[folder].count = listResult.files.length;
                            stats[folder].size = listResult.files.reduce((sum, file) => sum + file.size, 0);
                            stats.total.count += listResult.files.length;
                            stats.total.size += stats[folder].size;
                        }
                    } catch (error) {
                        console.error(`❌ Error getting S3 stats for ${folder}:`, error);
                    }
                }
            } else {
                // Local storage stats (existing implementation)
                const folders = ['videos', 'images', 'thumbnails'];
                
                for (const folder of folders) {
                    const folderPath = path.join(this.localUploadPath, folder);
                    
                    try {
                        const files = await fs.readdir(folderPath);
                        
                        for (const file of files) {
                            const filePath = path.join(folderPath, file);
                            const fileStat = await fs.stat(filePath);
                            
                            if (fileStat.isFile()) {
                                stats[folder].count++;
                                stats[folder].size += fileStat.size;
                                stats.total.count++;
                                stats.total.size += fileStat.size;
                            }
                        }
                    } catch (error) {
                        console.error(`❌ Error reading ${folder} folder:`, error);
                    }
                }
            }

            return stats;
        } catch (error) {
            console.error('❌ Get storage stats error:', error);
            return null;
        }
    }

    // Existing utility methods...
    validateFileType(file, allowedTypes) {
        return allowedTypes.includes(file.mimetype);
    }

    validateFileSize(file, maxSize) {
        return file.size <= maxSize;
    }

    getFileExtension(filename) {
        return path.extname(filename).toLowerCase();
    }

    generateUniqueFilename(originalname) {
        const extension = this.getFileExtension(originalname);
        return `${uuidv4()}${extension}`;
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Byte';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
}

module.exports = new StorageService();