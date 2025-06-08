// src/services/storageService.js
const fs = require('fs').promises;
const path = require('path');
const { uploadToS3, deleteFromS3, isS3Configured } = require('../config/aws');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

class StorageService {
    constructor() {
        this.useS3 = isS3Configured();
        this.localUploadPath = path.join(__dirname, '../../public/uploads');
        this.initLocalStorage();
    }

    async initLocalStorage() {
        try {
            // Create upload directories if they don't exist
            const directories = [
                this.localUploadPath,
                path.join(this.localUploadPath, 'videos'),
                path.join(this.localUploadPath, 'thumbnails'),
                path.join(this.localUploadPath, 'images')
            ];

            for (const dir of directories) {
                await fs.mkdir(dir, { recursive: true });
            }
        } catch (error) {
            console.error('Failed to initialize local storage:', error);
        }
    }

    // Upload video file
    async uploadVideo(file) {
        try {
            if (this.useS3) {
                return await this.uploadToS3(file, 'videos');
            } else {
                return await this.uploadToLocal(file, 'videos');
            }
        } catch (error) {
            console.error('Video upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Upload image file
    async uploadImage(file) {
        try {
            // Optimize image before upload
            const optimizedBuffer = await this.optimizeImage(file.buffer);
            const optimizedFile = {
                ...file,
                buffer: optimizedBuffer
            };

            if (this.useS3) {
                return await this.uploadToS3(optimizedFile, 'images');
            } else {
                return await this.uploadToLocal(optimizedFile, 'images');
            }
        } catch (error) {
            console.error('Image upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Upload thumbnail
    async uploadThumbnail(file) {
        try {
            // Optimize thumbnail
            const thumbnailBuffer = await this.generateThumbnail(file.buffer);
            const thumbnailFile = {
                ...file,
                buffer: thumbnailBuffer,
                originalname: `thumb_${file.originalname}`,
                mimetype: 'image/jpeg'
            };

            if (this.useS3) {
                return await this.uploadToS3(thumbnailFile, 'thumbnails');
            } else {
                return await this.uploadToLocal(thumbnailFile, 'thumbnails');
            }
        } catch (error) {
            console.error('Thumbnail upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Upload to S3
    async uploadToS3(file, folder) {
        try {
            const result = await uploadToS3(file, folder);
            
            if (result.success) {
                return {
                    success: true,
                    url: result.url,
                    key: result.key,
                    storage_type: 's3'
                };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('S3 upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Upload to local storage
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
            console.error('Local upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Delete file
    async deleteFile(fileUrl, storageType = 'local') {
        try {
            if (storageType === 'local' && fileUrl.startsWith('/uploads/')) {
                const filePath = path.join(__dirname, '../../public', fileUrl);
                await fs.unlink(filePath);
                return true;
            }
            return true;
        } catch (error) {
            console.error('Delete file error:', error);
            return false;
        }
    }


    // Delete video
    async deleteVideo(videoUrl, storageType = 'local') {
        try {
            if (storageType === 'local' && videoUrl.startsWith('/uploads/')) {
                const filePath = path.join(__dirname, '../../public', videoUrl);
                await fs.unlink(filePath);
                return true;
            }
            return true;
        } catch (error) {
            console.error('Delete video error:', error);
            return false;
        }
    }

    // Optimize image using Sharp
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
            console.error('Image optimization error:', error);
            return buffer; // Return original if optimization fails
        }
    }

    // Generate thumbnail from image
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
            console.error('Thumbnail generation error:', error);
            return buffer;
        }
    }

    // Generate video thumbnail from video file
    async generateVideoThumbnail(videoPath, outputPath = null) {
        const ffmpeg = require('fluent-ffmpeg');
        
        return new Promise((resolve, reject) => {
            try {
                const thumbnailName = `${uuidv4()}.jpg`;
                const thumbnailPath = outputPath || path.join(this.localUploadPath, 'thumbnails', thumbnailName);
                
                ffmpeg(videoPath)
                    .screenshots({
                        timestamps: ['00:00:02'],
                        filename: thumbnailName,
                        folder: path.dirname(thumbnailPath),
                        size: '300x400'
                    })
                    .on('end', async () => {
                        try {
                            // If using S3, upload the generated thumbnail
                            if (this.useS3) {
                                const thumbnailBuffer = await fs.readFile(thumbnailPath);
                                const thumbnailFile = {
                                    buffer: thumbnailBuffer,
                                    originalname: thumbnailName,
                                    mimetype: 'image/jpeg'
                                };
                                
                                const uploadResult = await this.uploadToS3(thumbnailFile, 'thumbnails');
                                
                                // Delete local file after S3 upload
                                await fs.unlink(thumbnailPath).catch(() => {});
                                
                                resolve({
                                    success: true,
                                    url: uploadResult.url,
                                    storage_type: 's3'
                                });
                            } else {
                                resolve({
                                    success: true,
                                    url: `/uploads/thumbnails/${thumbnailName}`,
                                    storage_type: 'local'
                                });
                            }
                        } catch (uploadError) {
                            reject(uploadError);
                        }
                    })
                    .on('error', (err) => {
                        reject(err);
                    });
            } catch (error) {
                reject(error);
            }
        });
    }

    // Get file info
    async getFileInfo(url, storageType) {
        try {
            if (storageType === 's3') {
                // For S3, we'd need to implement getFileInfo from aws.js
                return { exists: true }; // Simplified
            } else {
                const filePath = path.join(__dirname, '../../public', url);
                const stats = await fs.stat(filePath);
                return {
                    exists: true,
                    size: stats.size,
                    modified: stats.mtime
                };
            }
        } catch (error) {
            return { exists: false };
        }
    }

    // Check if file exists
    async fileExists(url, storageType) {
        const info = await this.getFileInfo(url, storageType);
        return info.exists;
    }

    // Get storage stats
    async getStorageStats() {
        try {
            const stats = {
                videos: { count: 0, size: 0 },
                images: { count: 0, size: 0 },
                thumbnails: { count: 0, size: 0 },
                total: { count: 0, size: 0 }
            };

            if (!this.useS3) {
                // Local storage stats
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
                        console.error(`Error reading ${folder} folder:`, error);
                    }
                }
            }

            return stats;
        } catch (error) {
            console.error('Get storage stats error:', error);
            return null;
        }
    }

    // Clean up old files
    async cleanupOldFiles(days = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            let cleanedFiles = 0;
            let freedSpace = 0;

            if (!this.useS3) {
                const folders = ['videos', 'images', 'thumbnails'];
                
                for (const folder of folders) {
                    const folderPath = path.join(this.localUploadPath, folder);
                    
                    try {
                        const files = await fs.readdir(folderPath);
                        
                        for (const file of files) {
                            const filePath = path.join(folderPath, file);
                            const fileStat = await fs.stat(filePath);
                            
                            if (fileStat.isFile() && fileStat.mtime < cutoffDate) {
                                freedSpace += fileStat.size;
                                await fs.unlink(filePath);
                                cleanedFiles++;
                            }
                        }
                    } catch (error) {
                        console.error(`Error cleaning ${folder} folder:`, error);
                    }
                }
            }

            return {
                success: true,
                cleanedFiles,
                freedSpace
            };
        } catch (error) {
            console.error('Cleanup error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Create backup
    async createBackup(backupPath) {
        try {
            if (!this.useS3) {
                const archiver = require('archiver');
                const fs = require('fs');
                
                const output = fs.createWriteStream(backupPath);
                const archive = archiver('zip', { zlib: { level: 9 } });
                
                return new Promise((resolve, reject) => {
                    output.on('close', () => {
                        resolve({
                            success: true,
                            size: archive.pointer()
                        });
                    });
                    
                    archive.on('error', reject);
                    archive.pipe(output);
                    archive.directory(this.localUploadPath, false);
                    archive.finalize();
                });
            } else {
                // For S3, we'd implement S3 backup logic
                return {
                    success: true,
                    message: 'S3 backup not implemented'
                };
            }
        } catch (error) {
            console.error('Backup error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Validate file type
    validateFileType(file, allowedTypes) {
        return allowedTypes.includes(file.mimetype);
    }

    // Validate file size
    validateFileSize(file, maxSize) {
        return file.size <= maxSize;
    }

    // Get file extension
    getFileExtension(filename) {
        return path.extname(filename).toLowerCase();
    }

    // Generate unique filename
    generateUniqueFilename(originalname) {
        const extension = this.getFileExtension(originalname);
        return `${uuidv4()}${extension}`;
    }

    // Format file size
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Byte';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
}

module.exports = new StorageService();