// src/services/videoService.js
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;

class VideoService {
    constructor() {
        // Set FFmpeg path if specified in environment
        if (process.env.FFMPEG_PATH) {
            ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
        }
    }

    // Get video metadata
    async getVideoMetadata(videoPath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) {
                    console.error('FFprobe error:', err);
                    resolve({
                        duration: 0,
                        width: 0,
                        height: 0,
                        bitrate: 0
                    });
                    return;
                }

                const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
                
                resolve({
                    duration: Math.floor(metadata.format.duration || 0),
                    width: videoStream ? videoStream.width : 0,
                    height: videoStream ? videoStream.height : 0,
                    bitrate: parseInt(metadata.format.bit_rate) || 0,
                    format: metadata.format.format_name,
                    size: parseInt(metadata.format.size) || 0
                });
            });
        });
    }

    // Generate thumbnail from video
    async generateThumbnail(videoPath, outputDir = null) {
        try {
            const outputDirectory = outputDir || path.join(__dirname, '../../public/uploads/thumbnails');
            const thumbnailName = `thumb_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const thumbnailPath = path.join(outputDirectory, thumbnailName);

            return new Promise((resolve, reject) => {
                ffmpeg(videoPath)
                    .screenshots({
                        timestamps: [process.env.THUMBNAIL_TIMESTAMP || '00:00:02'],
                        filename: thumbnailName,
                        folder: outputDirectory,
                        size: `${process.env.THUMBNAIL_WIDTH || 300}x${process.env.THUMBNAIL_HEIGHT || 400}`
                    })
                    .on('end', () => {
                        resolve({
                            success: true,
                            url: `/uploads/thumbnails/${thumbnailName}`,
                            path: thumbnailPath
                        });
                    })
                    .on('error', (err) => {
                        console.error('Thumbnail generation error:', err);
                        resolve({
                            success: false,
                            error: err.message
                        });
                    });
            });
        } catch (error) {
            console.error('Generate thumbnail error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Convert video to different qualities
    async convertVideo(inputPath, outputPath, quality = '720p') {
        return new Promise((resolve, reject) => {
            let ffmpegCommand = ffmpeg(inputPath);

            // Set quality settings
            switch (quality) {
                case '360p':
                    ffmpegCommand = ffmpegCommand
                        .size('640x360')
                        .videoBitrate('500k')
                        .audioBitrate('64k');
                    break;
                case '720p':
                    ffmpegCommand = ffmpegCommand
                        .size('1280x720')
                        .videoBitrate('1500k')
                        .audioBitrate('128k');
                    break;
                case '1080p':
                    ffmpegCommand = ffmpegCommand
                        .size('1920x1080')
                        .videoBitrate('3000k')
                        .audioBitrate('192k');
                    break;
                case '4K':
                    ffmpegCommand = ffmpegCommand
                        .size('3840x2160')
                        .videoBitrate('8000k')
                        .audioBitrate('256k');
                    break;
            }

            ffmpegCommand
                .format('mp4')
                .videoCodec('libx264')
                .audioCodec('aac')
                .output(outputPath)
                .on('end', () => {
                    resolve({
                        success: true,
                        path: outputPath
                    });
                })
                .on('error', (err) => {
                    console.error('Video conversion error:', err);
                    resolve({
                        success: false,
                        error: err.message
                    });
                })
                .run();
        });
    }

    // Validate video file
    async validateVideo(filePath) {
        try {
            const metadata = await this.getVideoMetadata(filePath);
            
            const validations = {
                isValid: true,
                errors: [],
                metadata: metadata
            };

            // Check duration (max 10 minutes for example)
            const maxDuration = parseInt(process.env.MAX_VIDEO_DURATION) || 600; // 10 minutes
            if (metadata.duration > maxDuration) {
                validations.isValid = false;
                validations.errors.push(`Video duration exceeds maximum of ${maxDuration} seconds`);
            }

            // Check resolution
            const maxWidth = parseInt(process.env.MAX_VIDEO_WIDTH) || 4096;
            const maxHeight = parseInt(process.env.MAX_VIDEO_HEIGHT) || 2160;
            
            if (metadata.width > maxWidth || metadata.height > maxHeight) {
                validations.isValid = false;
                validations.errors.push(`Video resolution exceeds maximum of ${maxWidth}x${maxHeight}`);
            }

            return validations;
        } catch (error) {
            return {
                isValid: false,
                errors: ['Failed to validate video file'],
                metadata: null
            };
        }
    }

    // Extract audio from video
    async extractAudio(videoPath, outputPath) {
        return new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .output(outputPath)
                .audioCodec('mp3')
                .noVideo()
                .on('end', () => {
                    resolve({
                        success: true,
                        path: outputPath
                    });
                })
                .on('error', (err) => {
                    console.error('Audio extraction error:', err);
                    resolve({
                        success: false,
                        error: err.message
                    });
                })
                .run();
        });
    }

    // Create video preview/teaser
    async createPreview(videoPath, outputPath, duration = 10) {
        return new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .seekInput(0)
                .duration(duration)
                .output(outputPath)
                .on('end', () => {
                    resolve({
                        success: true,
                        path: outputPath
                    });
                })
                .on('error', (err) => {
                    console.error('Preview creation error:', err);
                    resolve({
                        success: false,
                        error: err.message
                    });
                })
                .run();
        });
    }

    // Add watermark to video
    async addWatermark(videoPath, watermarkPath, outputPath) {
        return new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .input(watermarkPath)
                .complexFilter([
                    '[1:v]scale=100:50[watermark]',
                    '[0:v][watermark]overlay=W-w-10:H-h-10'
                ])
                .output(outputPath)
                .on('end', () => {
                    resolve({
                        success: true,
                        path: outputPath
                    });
                })
                .on('error', (err) => {
                    console.error('Watermark error:', err);
                    resolve({
                        success: false,
                        error: err.message
                    });
                })
                .run();
        });
    }

    // Get video frames for preview
    async generateFrames(videoPath, outputDir, count = 5) {
        try {
            const metadata = await this.getVideoMetadata(videoPath);
            const duration = metadata.duration;
            const interval = duration / (count + 1);
            
            const frames = [];
            
            for (let i = 1; i <= count; i++) {
                const timestamp = interval * i;
                const frameName = `frame_${i}_${Date.now()}.jpg`;
                const framePath = path.join(outputDir, frameName);
                
                await new Promise((resolve, reject) => {
                    ffmpeg(videoPath)
                        .seekInput(timestamp)
                        .frames(1)
                        .output(framePath)
                        .on('end', resolve)
                        .on('error', reject)
                        .run();
                });
                
                frames.push({
                    timestamp: timestamp,
                    path: framePath,
                    url: `/uploads/frames/${frameName}`
                });
            }
            
            return {
                success: true,
                frames: frames
            };
        } catch (error) {
            console.error('Generate frames error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Optimize video for web
    async optimizeForWeb(inputPath, outputPath) {
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .videoCodec('libx264')
                .audioCodec('aac')
                .format('mp4')
                .addOption('-profile:v', 'baseline')
                .addOption('-level', '3.0')
                .addOption('-pix_fmt', 'yuv420p')
                .addOption('-movflags', '+faststart')
                .output(outputPath)
                .on('end', () => {
                    resolve({
                        success: true,
                        path: outputPath
                    });
                })
                .on('error', (err) => {
                    console.error('Web optimization error:', err);
                    resolve({
                        success: false,
                        error: err.message
                    });
                })
                .run();
        });
    }

    async getVideoMetadataFromUrl(videoUrl) {
    return new Promise(async (resolve, reject) => {
        try {
            // Create temporary file for processing
            const tempDir = path.join(__dirname, '../../public/uploads/temp');
            const tempFile = path.join(tempDir, `temp_${Date.now()}.mp4`);
            
            // Ensure temp directory exists
            const fs = require('fs').promises;
            await fs.mkdir(tempDir, { recursive: true });
            
            // Download video to temporary location
            const response = await fetch(videoUrl);
            if (!response.ok) {
                throw new Error(`Failed to download video: ${response.statusText}`);
            }
            
            const videoBuffer = await response.buffer();
            await fs.writeFile(tempFile, videoBuffer);
            
            // Get metadata from temporary file
            ffmpeg.ffprobe(tempFile, async (err, metadata) => {
                try {
                    // Clean up temporary file
                    await fs.unlink(tempFile).catch(() => {});
                    
                    if (err) {
                        console.error('FFprobe error for URL:', err);
                        resolve({
                            duration: 0,
                            width: 0,
                            height: 0,
                            bitrate: 0
                        });
                        return;
                    }

                    const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
                    
                    resolve({
                        duration: Math.floor(metadata.format.duration || 0),
                        width: videoStream ? videoStream.width : 0,
                        height: videoStream ? videoStream.height : 0,
                        bitrate: parseInt(metadata.format.bit_rate) || 0,
                        format: metadata.format.format_name,
                        size: parseInt(metadata.format.size) || 0
                    });
                } catch (cleanupError) {
                    console.error('Cleanup error:', cleanupError);
                    reject(cleanupError);
                }
            });
        } catch (error) {
            console.error('Get video metadata from URL error:', error);
            resolve({
                duration: 0,
                width: 0,
                height: 0,
                bitrate: 0
            });
        }
    });
}

async generateThumbnailFromUrl(videoUrl, outputDir = null) {
    try {
        const outputDirectory = outputDir || path.join(__dirname, '../../public/uploads/thumbnails');
        const thumbnailName = `thumb_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const thumbnailPath = path.join(outputDirectory, thumbnailName);
        
        // Ensure output directory exists
        const fs = require('fs').promises;
        await fs.mkdir(outputDirectory, { recursive: true });

        return new Promise((resolve, reject) => {
            ffmpeg(videoUrl)
                .screenshots({
                    timestamps: [process.env.THUMBNAIL_TIMESTAMP || '00:00:02'],
                    filename: thumbnailName,
                    folder: outputDirectory,
                    size: `${process.env.THUMBNAIL_WIDTH || 300}x${process.env.THUMBNAIL_HEIGHT || 400}`
                })
                .on('end', () => {
                    resolve({
                        success: true,
                        url: `/uploads/thumbnails/${thumbnailName}`,
                        path: thumbnailPath
                    });
                })
                .on('error', (err) => {
                    console.error('Thumbnail generation from URL error:', err);
                    resolve({
                        success: false,
                        error: err.message
                    });
                });
        });
    } catch (error) {
        console.error('Generate thumbnail from URL error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async optimizeS3Video(s3Key, outputQuality = '720p') {
    try {
        const { generatePresignedUrl } = require('../config/aws');
        const { uploadToS3 } = require('../config/aws');
        
        // Generate presigned URL for input
        const inputUrlResult = await generatePresignedUrl(s3Key, 3600); // 1 hour
        if (!inputUrlResult.success) {
            throw new Error('Failed to generate input presigned URL');
        }
        
        // Create temporary files
        const tempDir = path.join(__dirname, '../../public/uploads/temp');
        const tempInputFile = path.join(tempDir, `input_${Date.now()}.mp4`);
        const tempOutputFile = path.join(tempDir, `output_${Date.now()}.mp4`);
        
        try {
            // Download input video
            const response = await fetch(inputUrlResult.url);
            if (!response.ok) {
                throw new Error(`Failed to download video: ${response.statusText}`);
            }
            
            const videoBuffer = await response.buffer();
            const fs = require('fs').promises;
            await fs.mkdir(tempDir, { recursive: true });
            await fs.writeFile(tempInputFile, videoBuffer);
            
            // Process video
            const conversionResult = await this.convertVideo(tempInputFile, tempOutputFile, outputQuality);
            
            if (conversionResult.success) {
                // Upload optimized video back to S3
                const optimizedBuffer = await fs.readFile(tempOutputFile);
                const optimizedFile = {
                    buffer: optimizedBuffer,
                    originalname: `optimized_${s3Key}`,
                    mimetype: 'video/mp4'
                };
                
                const uploadResult = await uploadToS3(optimizedFile, 'videos/optimized');
                
                return {
                    success: true,
                    original_key: s3Key,
                    optimized_key: uploadResult.key,
                    optimized_url: uploadResult.url,
                    quality: outputQuality
                };
            } else {
                throw new Error(conversionResult.error);
            }
            
        } finally {
            // Clean up temporary files
            const fs = require('fs').promises;
            try {
                await fs.unlink(tempInputFile);
                await fs.unlink(tempOutputFile);
            } catch (cleanupError) {
                console.warn('Failed to cleanup temporary files:', cleanupError);
            }
        }
        
    } catch (error) {
        console.error('S3 video optimization error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// NEW: Validate S3 video accessibility
async validateS3Video(s3Key) {
    try {
        const { getFileInfo } = require('../config/aws');
        
        const fileInfo = await getFileInfo(s3Key);
        
        if (!fileInfo.success || !fileInfo.exists) {
            return {
                valid: false,
                error: 'Video file not found in S3'
            };
        }
        
        // Check if file is a valid video
        const supportedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime'];
        if (!supportedTypes.includes(fileInfo.contentType)) {
            return {
                valid: false,
                error: 'Unsupported video format'
            };
        }
        
        return {
            valid: true,
            size: fileInfo.size,
            contentType: fileInfo.contentType,
            lastModified: fileInfo.lastModified
        };
        
    } catch (error) {
        console.error('S3 video validation error:', error);
        return {
            valid: false,
            error: error.message
        };
    }
}

    // Format duration for display
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
    }

    // Format file size
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Bytes';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
}

module.exports = new VideoService();