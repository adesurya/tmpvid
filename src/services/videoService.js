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