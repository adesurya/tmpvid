// src/middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Pastikan folder upload ada
const uploadDirs = [
    'public/uploads',
    'public/uploads/videos',
    'public/uploads/images',
    'public/uploads/thumbnails'
];

uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
    }
});

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
        const filename = uniqueSuffix + extension;
        console.log('Saving file as:', filename);
        cb(null, filename);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    console.log('File filter - checking file:', file.originalname, file.mimetype);
    
    const allowedVideoTypes = [
        'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 
        'video/x-flv', 'video/quicktime', 'video/x-msvideo'
    ];
    const allowedImageTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
    ];
    
    if (file.fieldname === 'video') {
        if (allowedVideoTypes.includes(file.mimetype)) {
            console.log('Video file accepted:', file.mimetype);
            cb(null, true);
        } else {
            console.log('Video file rejected:', file.mimetype);
            cb(new Error(`Invalid video format: ${file.mimetype}. Allowed: ${allowedVideoTypes.join(', ')}`), false);
        }
    } else if (file.fieldname === 'thumbnail' || file.fieldname === 'image') {
        if (allowedImageTypes.includes(file.mimetype)) {
            console.log('Image file accepted:', file.mimetype);
            cb(null, true);
        } else {
            console.log('Image file rejected:', file.mimetype);
            cb(new Error(`Invalid image format: ${file.mimetype}. Allowed: ${allowedImageTypes.join(', ')}`), false);
        }
    } else {
        cb(new Error('Invalid field name: ' + file.fieldname), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB
        files: 5
    }
});

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
    console.error('Upload error:', error);
    
    if (error instanceof multer.MulterError) {
        let message = 'Upload error';
        
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                message = 'File too large. Maximum size allowed is 500MB';
                break;
            case 'LIMIT_FILE_COUNT':
                message = 'Too many files. Maximum 5 files allowed';
                break;
            case 'LIMIT_UNEXPECTED_FILE':
                message = 'Unexpected field name: ' + error.field;
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

module.exports = upload;
module.exports.handleUploadError = handleUploadError;