const express = require('express');
const router = express.Router();
const VideoController = require('../../controllers/videoController');
const CategoryController = require('../../controllers/categoryController');
const SeriesController = require('../../controllers/seriesController');
const AdminController = require('../../controllers/adminController');
const { adminAuth } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

// Add debug middleware
router.use((req, res, next) => {
    console.log(`Admin API - ${req.method} ${req.path}`);
    next();
});

// Apply admin authentication to all routes
router.use(adminAuth);

// Dashboard
router.get('/dashboard/stats', AdminController.getDashboardStats);

// Enhanced Analytics Routes
router.get('/analytics/overview', AdminController.getAnalyticsOverview);
router.get('/analytics/detailed', AdminController.getDetailedAnalytics);
router.get('/analytics/videos', AdminController.getVideoAnalytics);
router.get('/analytics/users', AdminController.getUserAnalytics);

// Video management
router.get('/videos', VideoController.getAdminList);
router.get('/videos/:id', VideoController.getVideo);
router.get('/videos/:id/stats', VideoController.getVideoStats);
router.post('/videos/upload', upload.single('video'), upload.handleUploadError, VideoController.upload);
router.put('/videos/:id', VideoController.update);
router.delete('/videos/:id', VideoController.delete);
router.get('/videos/:id/analytics', VideoController.getAnalytics);

// User management
router.get('/users', AdminController.getUsers);
router.post('/users', AdminController.createUser);
router.put('/users/:id', AdminController.updateUser);
router.delete('/users/:id', AdminController.deleteUser);

// Settings
router.get('/settings', AdminController.getSettings);
router.put('/settings', AdminController.updateSettings);

module.exports = router;