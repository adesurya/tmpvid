const express = require('express');
const router = express.Router();
const VideoController = require('../../controllers/videoController');
const { optionalAuth } = require('../../middleware/auth');

// Debug middleware
router.use((req, res, next) => {
    console.log(`[VIDEO-API] ${req.method} ${req.path}`);
    next();
});

// Ensure all responses are JSON
router.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});

router.get('/:id/streaming-url', async (req, res) => {
    try {
        const { id } = req.params;
        const video = await Video.findById(parseInt(id));
        
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }
        
        if (video.status !== 'published') {
            return res.status(403).json({
                success: false,
                message: 'Video not available'
            });
        }
        
        let streamingUrl = video.video_url;
        let expiresIn = null;
        
        // Generate presigned URL for S3 videos
        if (video.storage_type === 's3') {
            try {
                const { extractKeyFromUrl, generatePresignedUrl } = require('../../config/aws');
                const s3Key = extractKeyFromUrl(video.video_url);
                
                if (s3Key) {
                    const presignedResult = await generatePresignedUrl(s3Key, 7200); // 2 hours
                    
                    if (presignedResult.success) {
                        streamingUrl = presignedResult.url;
                        expiresIn = 7200;
                        console.log(`🔗 Generated presigned URL for video ${id}`);
                    } else {
                        console.warn(`⚠️ Failed to generate presigned URL for video ${id}`);
                    }
                } else {
                    console.warn(`⚠️ Could not extract S3 key from URL: ${video.video_url}`);
                }
            } catch (s3Error) {
                console.error('S3 presigned URL error:', s3Error);
                // Fall back to original URL
            }
        }
        
        res.json({
            success: true,
            video_id: video.id,
            streaming_url: streamingUrl,
            storage_type: video.storage_type,
            expires_in: expiresIn,
            quality: video.video_quality,
            duration: video.duration,
            thumbnail: video.thumbnail
        });
        
    } catch (error) {
        console.error('Get streaming URL error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get streaming URL'
        });
    }
});

// Public video routes
router.get('/feed', VideoController.getFeed);
router.get('/search', VideoController.search);
router.get('/trending', VideoController.getTrending);
router.get('/category/:categoryId', VideoController.getByCategory);
router.get('/:slug', VideoController.getVideo);

// Semi-protected routes (work with or without authentication)
router.post('/:id/like', optionalAuth, VideoController.toggleLike);
router.post('/:id/share', optionalAuth, VideoController.share);
router.post('/:id/view', optionalAuth, VideoController.recordView);

router.get('/test', (req, res) => {
    console.log('[VIDEO-API] Test endpoint called');
    res.json({
        success: true,
        message: 'Video API is working',
        timestamp: new Date().toISOString(),
        requestInfo: {
            method: req.method,
            path: req.path,
            originalUrl: req.originalUrl,
            headers: {
                accept: req.headers.accept,
                'content-type': req.headers['content-type']
            }
        }
    });
});

module.exports = router;