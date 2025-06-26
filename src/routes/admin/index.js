// src/routes/admin/index.js - Updated to include series routes
const express = require('express');
const router = express.Router();

// Import admin route modules
const seriesRoutes = require('./series');
// const categoriesRoutes = require('./categories'); // If you have admin categories routes
// const videosRoutes = require('./videos'); // If you have admin videos routes
// const usersRoutes = require('./users'); // If you have admin users routes
// const analyticsRoutes = require('./analytics'); // If you have admin analytics routes

// Admin authentication middleware (customize as needed)
router.use((req, res, next) => {
    // Add your admin authentication logic here
    // For example:
    // if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
    //     return res.redirect('/admin/login');
    // }
    
    console.log('[ADMIN] Access to admin route:', req.originalUrl);
    next();
});

// Admin dashboard home
router.get('/', (req, res) => {
    try {
        console.log('[ADMIN] Rendering admin dashboard');
        
        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            layout: 'layouts/admin',
            section: 'dashboard'
        });
    } catch (error) {
        console.error('Error rendering admin dashboard:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load admin dashboard',
            layout: 'layouts/admin'
        });
    }
});

// Register admin sub-routes
router.use('/series', seriesRoutes);
// router.use('/categories', categoriesRoutes);
// router.use('/videos', videosRoutes);
// router.use('/users', usersRoutes);
// router.use('/analytics', analyticsRoutes);

// Admin settings page
router.get('/settings', (req, res) => {
    try {
        console.log('[ADMIN] Rendering settings page');
        
        res.render('admin/settings', {
            title: 'Admin Settings',
            layout: 'layouts/admin',
            section: 'settings'
        });
    } catch (error) {
        console.error('Error rendering settings page:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load settings page',
            layout: 'layouts/admin'
        });
    }
});

// Admin profile page
router.get('/profile', (req, res) => {
    try {
        console.log('[ADMIN] Rendering profile page');
        
        res.render('admin/profile', {
            title: 'Admin Profile',
            layout: 'layouts/admin',
            section: 'profile'
        });
    } catch (error) {
        console.error('Error rendering profile page:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load profile page',
            layout: 'layouts/admin'
        });
    }
});

// Admin logout
router.post('/logout', (req, res) => {
    try {
        console.log('[ADMIN] Processing logout');
        
        // Clear session
        if (req.session) {
            req.session.destroy((err) => {
                if (err) {
                    console.error('Error destroying session:', err);
                }
            });
        }
        
        res.redirect('/admin/login');
    } catch (error) {
        console.error('Error during logout:', error);
        res.redirect('/admin/login');
    }
});

// Admin login page (GET)
router.get('/login', (req, res) => {
    try {
        console.log('[ADMIN] Rendering login page');
        
        // If already logged in, redirect to dashboard
        if (req.session && req.session.user && req.session.user.role === 'admin') {
            return res.redirect('/admin');
        }
        
        res.render('admin/login', {
            title: 'Admin Login',
            layout: 'layouts/auth',
            messages: {
                error: req.flash('error_msg'),
                success: req.flash('success_msg')
            }
        });
    } catch (error) {
        console.error('Error rendering login page:', error);
        res.status(500).send('Internal server error');
    }
});

// Admin login processing (POST)
router.post('/login', async (req, res) => {
    try {
        console.log('[ADMIN] Processing login attempt');
        
        const { username, password } = req.body;
        
        if (!username || !password) {
            req.flash('error_msg', 'Please provide both username and password');
            return res.redirect('/admin/login');
        }
        
        // Add your authentication logic here
        // For example:
        // const User = require('../../models/User');
        // const user = await User.authenticate(username, password);
        
        // if (user && user.role === 'admin') {
        //     req.session.user = user;
        //     req.flash('success_msg', 'Login successful');
        //     return res.redirect('/admin');
        // } else {
        //     req.flash('error_msg', 'Invalid credentials or insufficient permissions');
        //     return res.redirect('/admin/login');
        // }
        
        // Temporary fallback for development
        if (username === 'admin' && password === 'admin123') {
            req.session.user = {
                id: 1,
                username: 'admin',
                role: 'admin'
            };
            req.flash('success_msg', 'Login successful');
            return res.redirect('/admin');
        } else {
            req.flash('error_msg', 'Invalid credentials');
            return res.redirect('/admin/login');
        }
        
    } catch (error) {
        console.error('Error processing login:', error);
        req.flash('error_msg', 'Login failed. Please try again.');
        res.redirect('/admin/login');
    }
});

module.exports = router;