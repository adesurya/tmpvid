// app.js - Updated with ads integration
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const rateLimit = require('express-rate-limit');
const ejsMate = require('ejs-mate');
const { initDatabase } = require('./src/config/database');

// Import AdsController with error handling
let AdsController;
try {
    AdsController = require('./src/controllers/adsController');
    console.log('✅ AdsController loaded successfully');
} catch (error) {
    console.warn('⚠️ AdsController not found, ads features will be disabled');
    AdsController = null;
}

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const routes = require('./src/routes');
const adRoutes = require('./src/routes/adRoutes'); // NEW: Ad Routes

initDatabase().then(() => {
    console.log('✅ Database initialization complete');
}).catch(error => {
    console.error('❌ Database initialization failed:', error);
    // Don't exit the process, continue without database
});

// Security middleware - FIXED CSP settings to allow inline event handlers and ads
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            scriptSrc: [
                "'self'", 
                "'unsafe-inline'", 
                "'unsafe-eval'", 
                "https://cdnjs.cloudflare.com",
                "https://pagead2.googlesyndication.com",  // Google AdSense
                "https://www.googletagmanager.com",       // Google Tag Manager
                "https://www.google-analytics.com",       // Google Analytics
                "https://googleads.g.doubleclick.net",    // Google Ads
                "https://tpc.googlesyndication.com"       // Google AdSense
            ],
            scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
            imgSrc: [
                "'self'", 
                "data:", 
                "https:", 
                "blob:",
                "https://pagead2.googlesyndication.com",  // Google AdSense images
                "https://www.google.com",                  // Google services
                "https://www.gstatic.com"                  // Google static assets
            ],
            mediaSrc: ["'self'", "https:", "blob:", "data:"],
            connectSrc: [
                "'self'",
                "https://www.google-analytics.com",       // Google Analytics
                "https://region1.google-analytics.com",   // Google Analytics
                "https://pagead2.googlesyndication.com"   // Google AdSense
            ],
            fontSrc: [
                "'self'", 
                "https://cdnjs.cloudflare.com",
                "https://fonts.gstatic.com"               // Google Fonts
            ],
            objectSrc: ["'none'"],
            frameSrc: [
                "'self'",
                "https://googleads.g.doubleclick.net",    // Google Ads frames
                "https://tpc.googlesyndication.com"       // Google AdSense frames
            ],
            workerSrc: ["'self'", "blob:"],
            manifestSrc: ["'self'"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Middleware
app.use(compression());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(flash());

// View engine setup
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// NEW: Global middleware to inject ads into responses
app.use(async (req, res, next) => {
    // Store original render function
    const originalRender = res.render;
    
    // Override render function to inject ads
    res.render = async function(view, locals = {}, callback) {
        try {
            // Initialize empty ads object
            locals.ads = {
                header: [],
                footer: [],
                before_video: [],
                after_video: [],
                sidebar: []
            };
            
            // Only get ads if AdsController is available
            if (AdsController && typeof AdsController.getActiveAdsByPosition === 'function') {
                try {
                    // Get active ads for injection
                    const [headerAds, footerAds, beforeVideoAds, afterVideoAds, sidebarAds] = await Promise.all([
                        AdsController.getActiveAdsByPosition('header'),
                        AdsController.getActiveAdsByPosition('footer'),
                        AdsController.getActiveAdsByPosition('before_video'),
                        AdsController.getActiveAdsByPosition('after_video'),
                        AdsController.getActiveAdsByPosition('sidebar')
                    ]);
                    
                    // Inject ads into locals
                    locals.ads = {
                        header: headerAds || [],
                        footer: footerAds || [],
                        before_video: beforeVideoAds || [],
                        after_video: afterVideoAds || [],
                        sidebar: sidebarAds || []
                    };
                } catch (adsError) {
                    console.warn('Failed to load ads:', adsError.message);
                }
            }
            
        } catch (error) {
            console.error('Failed to process ads:', error);
            locals.ads = {
                header: [],
                footer: [],
                before_video: [],
                after_video: [],
                sidebar: []
            };
        }
        
        // Call original render function
        originalRender.call(this, view, locals, callback);
    };
    
    next();
});

// Global variables for views
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.session.user || null;
    res.locals.req = req; // Add req to locals for meta tags
    next();
});

// Routes
app.use('/', routes);
app.use('/', adRoutes);  

// 404 handler
app.use((req, res) => {
    res.status(404).render('404', {
        title: 'Page Not Found',
        message: 'The page you are looking for does not exist.',
        layout: 'layouts/main'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        res.status(500).json({
            success: false,
            message: process.env.NODE_ENV === 'production' 
                ? 'Something went wrong!' 
                : err.message
        });
    } else {
        res.status(500).render('error', {
            title: 'Server Error',
            message: process.env.NODE_ENV === 'production' 
                ? 'Something went wrong!' 
                : err.message,
            layout: 'layouts/main'
        });
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Access the app at: http://localhost:${PORT}`);
    console.log(`🔧 Admin dashboard: http://localhost:${PORT}/admin`);
    console.log(`🎯 Ads management: http://localhost:${PORT}/admin/ads`);
    console.log(`📡 Public API: http://localhost:${PORT}/api/public`);
    console.log(`🔗 RSS Feed: http://localhost:${PORT}/api/public/rss`);
    console.log(`📖 API Docs: http://localhost:${PORT}/api/public/docs`);
});

module.exports = app;