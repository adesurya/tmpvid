// src/routes/web/admin.js - Fixed version
const express = require('express');
const router = express.Router();
const AdminController = require('../../controllers/adminController');

// Debug middleware
router.use((req, res, next) => {
    console.log(`[ADMIN-WEB] ${req.method} ${req.path}`);
    next();
});

// Login routes (no auth required)
router.get('/login', (req, res) => {
    // If already logged in, redirect to dashboard
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return res.redirect('/admin');
    }
    res.render('admin/login', {
        title: 'Admin Login',
        layout: false
    });
});

router.post('/login', AdminController.login);

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/admin/login');
    });
});

// Admin authentication middleware (inline to avoid import issues)
const adminAuth = (req, res, next) => {
    console.log('🔐 Admin auth check:', {
        hasSession: !!req.session,
        hasUser: !!(req.session && req.session.user),
        userRole: req.session && req.session.user && req.session.user.role,
        path: req.path
    });

    if (req.session && req.session.user && req.session.user.role === 'admin') {
        req.user = req.session.user;
        return next();
    }
    
    // If this is an API request, return JSON error
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(401).json({
            success: false,
            message: 'Admin access required'
        });
    }
    
    // Redirect to login page for web requests
    res.redirect('/admin/login');
};

// Apply admin authentication to all routes below
router.use(adminAuth);

// Admin dashboard
router.get('/', (req, res) => {
    res.render('admin/dashboard', {
        title: 'Admin Dashboard',
        layout: 'layouts/admin'
    });
});

// Videos management
router.get('/videos', (req, res) => {
    res.render('admin/videos', {
        title: 'Manage Videos',
        layout: 'layouts/admin'
    });
});

// Categories management
router.get('/categories', (req, res) => {
    res.render('admin/categories', {
        title: 'Manage Categories',
        layout: 'layouts/admin'
    });
});

// Series management
router.get('/series', (req, res) => {
    res.render('admin/series', {
        title: 'Manage Series',
        layout: 'layouts/admin'
    });
});

// Users management
router.get('/users', (req, res) => {
    res.render('admin/users', {
        title: 'Manage Users',
        layout: 'layouts/admin'
    });
});

// Analytics
router.get('/analytics', (req, res) => {
    res.render('admin/analytics', {
        title: 'Analytics Dashboard',
        layout: 'layouts/admin'
    });
});

// API Dashboard page
router.get('/api-dashboard', (req, res) => {
    try {
        res.render('admin/api-dashboard', {
            title: 'API & RSS Dashboard',
            layout: 'layouts/admin'
        });
    } catch (error) {
        console.error('Error rendering API dashboard:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load API Dashboard. Please check if views/admin/api-dashboard.ejs exists.',
            layout: 'layouts/admin'
        });
    }
});

// Google Ads Management page - with safe error handling
router.get('/ads', (req, res) => {
    try {
        console.log('🔍 Attempting to load ads management page...');
        
        // Try to check if adsController exists
        let adsControllerExists = false;
        try {
            require('../../controllers/adsController');
            adsControllerExists = true;
            console.log('✅ AdsController found');
        } catch (controllerError) {
            console.warn('⚠️ AdsController not found:', controllerError.message);
        }
        
        // Try to check if ads view exists
        let adsViewExists = false;
        try {
            const fs = require('fs');
            const path = require('path');
            const viewPath = path.join(__dirname, '../../views/admin/ads.ejs');
            adsViewExists = fs.existsSync(viewPath);
            console.log('📄 Ads view exists:', adsViewExists);
        } catch (viewError) {
            console.warn('⚠️ Error checking ads view:', viewError.message);
        }
        
        // If controller doesn't exist, show fallback page
        if (!adsControllerExists) {
            return res.render('admin/ads-fallback', {
                title: 'Ads Management - Setup Required',
                layout: 'layouts/admin',
                error: 'AdsController not found',
                instructions: [
                    'Create file: src/controllers/adsController.js',
                    'Create file: src/utils/adsValidator.js', 
                    'Create file: src/utils/adsMigration.js',
                    'Restart the server'
                ]
            });
        }
        
        // If view doesn't exist, show fallback
        if (!adsViewExists) {
            return res.render('admin/ads-fallback', {
                title: 'Ads Management - View Missing',
                layout: 'layouts/admin',
                error: 'Ads view template not found',
                instructions: [
                    'Create file: views/admin/ads.ejs',
                    'Copy the enhanced ads management template',
                    'Refresh this page'
                ]
            });
        }
        
        // Render the ads management page
        res.render('admin/ads', {
            title: 'Google Ads & Analytics Management',
            layout: 'layouts/admin'
        });
        
    } catch (error) {
        console.error('❌ Error rendering ads page:', error);
        
        // Fallback error page
        res.status(500).render('admin/ads-fallback', {
            title: 'Ads Management - Error',
            layout: 'layouts/admin',
            error: error.message,
            instructions: [
                'Check server console for detailed error',
                'Ensure all required files exist',
                'Try restarting the server',
                'Contact administrator if issue persists'
            ]
        });
    }
});

// Settings
router.get('/settings', (req, res) => {
    res.render('admin/settings', {
        title: 'Platform Settings',
        layout: 'layouts/admin'
    });
});

module.exports = router;