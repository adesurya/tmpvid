// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Admin authentication middleware
const adminAuth = async (req, res, next) => {
    try {
        // Check if user is logged in via session
        if (req.session && req.session.user && req.session.user.role === 'admin') {
            req.user = req.session.user;
            return next();
        }

        // Check for JWT token in headers
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
            const user = await User.findById(decoded.id);
            
            if (user && user.role === 'admin') {
                req.user = user;
                return next();
            }
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
    } catch (error) {
        console.error('Admin auth error:', error);
        
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(401).json({
                success: false,
                message: 'Authentication failed'
            });
        }
        
        res.redirect('/admin/login');
    }
};

// Optional authentication (doesn't require login)
const optionalAuth = async (req, res, next) => {
    try {
        // Check session first
        if (req.session && req.session.user) {
            req.user = req.session.user;
            return next();
        }

        // Check for JWT token
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
            const user = await User.findById(decoded.id);
            
            if (user) {
                req.user = user;
            }
        }

        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};

// Required authentication
const requireAuth = async (req, res, next) => {
    try {
        // Check session first
        if (req.session && req.session.user) {
            req.user = req.session.user;
            return next();
        }

        // Check for JWT token
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            throw new Error('No token provided');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        const user = await User.findById(decoded.id);
        
        if (!user) {
            throw new Error('User not found');
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        
        res.redirect('/login');
    }
};

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.id,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

module.exports = {
    adminAuth,
    optionalAuth,
    requireAuth,
    generateToken
};