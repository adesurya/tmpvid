// src/middleware/upload.js
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = 'public/uploads/';
        
        if (file.fieldname === 'video') {
            uploadPath += 'videos/';
        } else if (file.fieldname === 'thumbnail' || file.fieldname === 'image') {
            uploadPath += 'images/';
        } else {
            uploadPath += 'misc/';
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = uuidv4();
        const extension = path.extname(file.originalname);
        cb(null, uniqueSuffix + extension);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    // Get allowed types from environment or use defaults
    const allowedVideoTypes = (process.env.ALLOWED_VIDEO_TYPES || 'video/mp4,video/avi,video/mov,video/wmv,video/flv').split(',');
    const allowedImageTypes = (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/jpg,image/png,image/gif,image/webp').split(',');
    
    if (file.fieldname === 'video') {
        if (allowedVideoTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid video format. Allowed formats: ${allowedVideoTypes.join(', ')}`), false);
        }
    } else if (file.fieldname === 'thumbnail' || file.fieldname === 'image') {
        if (allowedImageTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid image format. Allowed formats: ${allowedImageTypes.join(', ')}`), false);
        }
    } else {
        cb(new Error('Invalid field name'), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 524288000, // 500MB default
        files: 5 // Maximum 5 files
    }
});

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        let message = 'Upload error';
        
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                message = 'File too large. Maximum size allowed is ' + formatFileSize(parseInt(process.env.MAX_FILE_SIZE) || 524288000);
                break;
            case 'LIMIT_FILE_COUNT':
                message = 'Too many files. Maximum 5 files allowed';
                break;
            case 'LIMIT_UNEXPECTED_FILE':
                message = 'Unexpected field name';
                break;
            default:
                message = error.message;
        }
        
        return res.status(400).json({
            success: false,
            message: message
        });
    }
    
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
    
    next();
};

// Helper function to format file size
function formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Export configured upload middleware
module.exports = upload;
module.exports.handleUploadError = handleUploadError;