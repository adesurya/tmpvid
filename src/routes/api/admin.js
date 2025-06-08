// src/routes/api/admin.js
const express = require('express');
const router = express.Router();
const VideoController = require('../../controllers/videoController');
const CategoryController = require('../../controllers/categoryController');
const SeriesController = require('../../controllers/seriesController');
const AdminController = require('../../controllers/adminController');
const { adminAuth } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

// Apply admin authentication to all routes
router.use(adminAuth);

// Dashboard
router.get('/dashboard/stats', AdminController.getDashboardStats);

// Video management
router.get('/videos', VideoController.getAdminList);
router.get('/videos/:id', VideoController.getVideo);
router.post('/videos/upload', upload.single('video'), VideoController.upload);
router.put('/videos/:id', VideoController.update);
router.delete('/videos/:id', VideoController.delete);
router.get('/videos/:id/analytics', VideoController.getAnalytics);

// Category management
router.get('/categories', CategoryController.getAll);
router.post('/categories', CategoryController.create);
router.put('/categories/:id', CategoryController.update);
router.delete('/categories/:id', CategoryController.delete);

// Series management
router.get('/series', SeriesController.getAll);
router.post('/series', SeriesController.create);
router.put('/series/:id', SeriesController.update);
router.delete('/series/:id', SeriesController.delete);

// User management
router.get('/users', AdminController.getUsers);
router.post('/users', AdminController.createUser);
router.put('/users/:id', AdminController.updateUser);
router.delete('/users/:id', AdminController.deleteUser);

// Analytics
router.get('/analytics/overview', AdminController.getAnalyticsOverview);
router.get('/analytics/videos', AdminController.getVideoAnalytics);
router.get('/analytics/users', AdminController.getUserAnalytics);

// Settings
router.get('/settings', AdminController.getSettings);
router.put('/settings', AdminController.updateSettings);

module.exports = router;