// src/routes/web/admin.js - FIXED VERSION (No duplicate flash middleware)
const express = require('express');
const router = express.Router();
const AdminController = require('../../controllers/adminController');

// Debug middleware
router.use((req, res, next) => {
    console.log(`[ADMIN-WEB] ${req.method} ${req.path}`);
    console.log('Session available:', !!req.session);
    console.log('Flash available:', typeof req.flash === 'function');
    next();
});

// FIXED: Don't add duplicate body parsing and flash middleware
// These should be handled at the app level

// Login routes (no auth required)
router.get('/login', (req, res) => {
    // If already logged in, redirect to dashboard
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return res.redirect('/admin');
    }
    
    console.log('Rendering login page...');
    
    res.render('admin/login', {
        title: 'Admin Login',
        layout: false
        // Flash messages will be available via res.locals from app.js
    });
});

// FIXED: Simplified login POST route
router.post('/login', AdminController.login);

// Logout
router.get('/logout', (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout error:', err);
            }
            res.redirect('/admin/login');
        });
    } else {
        res.redirect('/admin/login');
    }
});

// Admin authentication middleware
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
    if (req.flash && typeof req.flash === 'function') {
        req.flash('error_msg', 'Please login to access admin panel');
    }
    res.redirect('/admin/login');
};

// Apply admin authentication to all routes below
router.use(adminAuth);

// Admin dashboard
router.get('/', (req, res) => {
    res.render('admin/dashboard', {
        title: 'Admin Dashboard',
        layout: 'layouts/admin',
        user: req.user
    });
});

// Videos management
router.get('/videos', (req, res) => {
    res.render('admin/videos', {
        title: 'Manage Videos',
        layout: 'layouts/admin',
        user: req.user
    });
});

// Categories management
router.get('/categories', (req, res) => {
    res.render('admin/categories', {
        title: 'Manage Categories',
        layout: 'layouts/admin',
        user: req.user
    });
});

// Series management
router.get('/series', (req, res) => {
    res.render('admin/series', {
        title: 'Manage Series',
        layout: 'layouts/admin',
        user: req.user
    });
});

// Users management
router.get('/users', (req, res) => {
    res.render('admin/users', {
        title: 'Manage Users',
        layout: 'layouts/admin',
        user: req.user
    });
});

// Analytics
router.get('/analytics', (req, res) => {
    res.render('admin/analytics', {
        title: 'Analytics Dashboard',
        layout: 'layouts/admin',
        user: req.user
    });
});

// API Dashboard page
router.get('/api-dashboard', (req, res) => {
    try {
        res.render('admin/api-dashboard', {
            title: 'API & RSS Dashboard',
            layout: 'layouts/admin',
            user: req.user
        });
    } catch (error) {
        console.error('Error rendering API dashboard:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load API Dashboard.',
            layout: 'layouts/admin',
            user: req.user
        });
    }
});

// Ads management
router.get('/ads', (req, res) => {
    try {
        console.log('🔍 Loading ads management page...');
        
        // Try to load ads controller
        let AdsController;
        try {
            AdsController = require('../../controllers/adController');
            console.log('✅ AdController found');
        } catch (controllerError) {
            console.warn('⚠️ AdController not found:', controllerError.message);
            return res.render('admin/ads', {
                title: 'Ads Management - Setup Required',
                layout: 'layouts/admin',
                user: req.user,
                ads: [],
                pagination: {
                    page: 1,
                    limit: 20,
                    total: 0,
                    totalPages: 0,
                    hasNext: false,
                    hasPrev: false
                },
                filters: {
                    status: null,
                    slot: null,
                    type: null
                },
                error_msg: 'AdController not found. Please check system setup.'
            });
        }
        
        // Forward to ads controller if available
        if (AdsController && typeof AdsController.getAdminList === 'function') {
            return AdsController.getAdminList(req, res);
        } else {
            // Fallback render
            return res.render('admin/ads', {
                title: 'Manage Advertisements',
                ads: [],
                pagination: {
                    page: 1,
                    limit: 20,
                    total: 0,
                    totalPages: 0,
                    hasNext: false,
                    hasPrev: false
                },
                filters: {
                    status: null,
                    slot: null,
                    type: null
                },
                layout: 'layouts/admin',
                user: req.user
            });
        }
        
    } catch (error) {
        console.error('❌ Error in ads route:', error);
        
        res.render('admin/ads', {
            title: 'Manage Advertisements',
            ads: [],
            pagination: {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false
            },
            filters: {
                status: null,
                slot: null,
                type: null
            },
            layout: 'layouts/admin',
            user: req.user,
            error_msg: 'Failed to load ads data.'
        });
    }
});

// Settings
router.get('/settings', (req, res) => {
    res.render('admin/settings', {
        title: 'Platform Settings',
        layout: 'layouts/admin',
        user: req.user
    });
});

module.exports = router;