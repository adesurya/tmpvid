// src/routes/web/admin.js
const express = require('express');
const router = express.Router();
const AdminController = require('../../controllers/adminController');

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

// Admin authentication middleware
const adminAuth = (req, res, next) => {
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
        title: 'Analytics',
        layout: 'layouts/admin'
    });
});

// Settings
router.get('/settings', (req, res) => {
    res.render('admin/settings', {
        title: 'Settings',
        layout: 'layouts/admin'
    });
});

module.exports = router;