// app.js - Server-side only (FIXED VERSION)
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
const adRoutes = require('./src/routes/adRoutes');
const routes = require('./src/routes');

// Import AdController with CORRECT name and error handling
let AdController;
let adsAvailable = false;

try {
    AdController = require('./src/controllers/adController');
    console.log('✅ AdController loaded successfully');
    adsAvailable = true;
} catch (error) {
    console.warn('⚠️ AdController not found, ads features will be disabled');
    console.warn('   Make sure src/controllers/adController.js exists');
    console.warn('   Error:', error.message);
    AdController = null;
    adsAvailable = false;
}

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
try {
    // Import and register main routes
    const routes = require('./src/routes');
    app.use('/', routes);
    
    // FIXED: Register ads routes only if available
    if (adsAvailable) {
        try {
            const adRoutes = require('./src/routes/adRoutes');
            app.use('/', adRoutes);
            console.log('✅ Ads routes registered successfully');
        } catch (routeError) {
            console.warn('⚠️ Failed to load ads routes:', routeError.message);
            adsAvailable = false;
        }
    }
} catch (error) {
    console.error('❌ Failed to register routes:', error);
}

initDatabase().then(() => {
    console.log('✅ Database initialization complete');
    
    // Initialize ads table after database is ready
    if (AdController && typeof AdController.initialize === 'function') {
        AdController.initialize().catch(error => {
            console.error('❌ Failed to initialize ads system:', error);
        });
    }
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
                "https://pagead2.googlesyndication.com",
                "https://www.googletagmanager.com",
                "https://www.google-analytics.com",
                "https://googleads.g.doubleclick.net",
                "https://tpc.googlesyndication.com"
            ],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: [
                "'self'", 
                "data:", 
                "https:", 
                "blob:",
                "https://pagead2.googlesyndication.com",
                "https://www.google.com",
                "https://www.gstatic.com"
            ],
            mediaSrc: ["'self'", "https:", "blob:", "data:"],
            connectSrc: [
                "'self'",
                "https://www.google-analytics.com",
                "https://region1.google-analytics.com",
                "https://pagead2.googlesyndication.com"
            ],
            fontSrc: [
                "'self'", 
                "https://cdnjs.cloudflare.com",
                "https://fonts.gstatic.com"
            ],
            objectSrc: ["'none'"],
            frameSrc: [
                "'self'",
                "https://googleads.g.doubleclick.net",
                "https://tpc.googlesyndication.com"
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
app.use(cookieParser());

// FIXED: Enhanced JSON and URL encoding with error handling
app.use(express.json({ 
    limit: '50mb',
    type: ['application/json', 'text/plain'],
    verify: (req, res, buf, encoding) => {
        try {
            if (buf && buf.length) {
                req.rawBody = buf.toString(encoding || 'utf8');
            }
        } catch (error) {
            console.error('❌ JSON parsing error:', error);
        }
    }
}));
// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(express.urlencoded({ 
    extended: true, 
    limit: '50mb',
    type: 'application/x-www-form-urlencoded',
    verify: (req, res, buf, encoding) => {
        try {
            if (buf && buf.length) {
                req.rawBody = buf.toString(encoding || 'utf8');
            }
        } catch (error) {
            console.error('❌ URL encoding parsing error:', error);
        }
    }
}));


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

// FIXED: Global middleware to inject ads into responses
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
            
            // Only attempt to load ads if AdController is available
            if (adsAvailable && AdController) {
                try {
                    // FIXED: Import Ad model safely with error handling
                    const Ad = require('./src/models/Ad');
                    
                    if (Ad && typeof Ad.getAdsBySlots === 'function') {
                        // Get ads organized by slots with timeout
                        const adPromise = Ad.getAdsBySlots();
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Ads loading timeout')), 5000)
                        );
                        
                        const adsBySlots = await Promise.race([adPromise, timeoutPromise]);
                        
                        // FIXED: Map slots to template positions safely
                        locals.ads = {
                            header: Array.isArray(adsBySlots[1]) ? adsBySlots[1] : [],
                            before_video: Array.isArray(adsBySlots[2]) ? adsBySlots[2] : [],
                            sidebar: Array.isArray(adsBySlots[3]) ? adsBySlots[3] : [],
                            after_video: Array.isArray(adsBySlots[4]) ? adsBySlots[4] : [],
                            footer: Array.isArray(adsBySlots[5]) ? adsBySlots[5] : []
                        };
                        
                        console.log('✅ Ads injected into template:', {
                            header: locals.ads.header.length,
                            before_video: locals.ads.before_video.length,
                            sidebar: locals.ads.sidebar.length,
                            after_video: locals.ads.after_video.length,
                            footer: locals.ads.footer.length
                        });
                    } else {
                        console.warn('⚠️ Ad model not available or missing getAdsBySlots method');
                    }
                } catch (adsError) {
                    console.warn('⚠️ Failed to load ads for template injection:', adsError.message);
                    // Keep default empty ads structure
                }
            }
            
            // FIXED: Add ads availability flag for templates
            locals.adsAvailable = adsAvailable;
            locals.adsSystemEnabled = adsAvailable;
            
        } catch (error) {
            console.error('❌ Failed to process ads injection:', error);
            
            // Ensure we always have the ads structure
            locals.ads = {
                header: [],
                footer: [],
                before_video: [],
                after_video: [],
                sidebar: []
            };
            locals.adsAvailable = false;
            locals.adsSystemEnabled = false;
        }
        
        // Call original render function
        originalRender.call(this, view, locals, callback);
    };
    
    next();
});

// Global variables for views
app.use((req, res, next) => {
    // Handle protocol detection for HTTPS/HTTP
    const protocol = req.headers['x-forwarded-proto'] || 
                    (req.connection.encrypted ? 'https' : 'http');
    
    req.protocol = protocol;
    req.secure = protocol === 'https';
    
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    if (req.secure) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    // FIXED: Make flash messages available to all views
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.session ? req.session.user : null;
    
    next();
});

// Routes - FIXED: Register ads routes FIRST to ensure they're available
app.use('/', adRoutes);  // Register ads routes first
app.use('/', routes);    // Then register other routes

// DEVELOPMENT: Add debug endpoint to check routes
if (process.env.NODE_ENV !== 'production') {
    app.get('/debug/routes', (req, res) => {
        const routes = [];
        
        // Get all registered routes
        app._router.stack.forEach(function(middleware) {
            if (middleware.route) {
                routes.push({
                    path: middleware.route.path,
                    methods: Object.keys(middleware.route.methods)
                });
            } else if (middleware.name === 'router') {
                middleware.handle.stack.forEach(function(handler) {
                    if (handler.route) {
                        routes.push({
                            path: handler.route.path,
                            methods: Object.keys(handler.route.methods)
                        });
                    }
                });
            }
        });
        
        // FIXED: Include ads system status
        res.json({
            success: true,
            total_routes: routes.length,
            routes: routes,
            ads_system: {
                available: adsAvailable,
                controller_loaded: !!AdController,
                routes_registered: adsAvailable
            },
            timestamp: new Date().toISOString()
        });
    });

    // FIXED: Ads system health check endpoint
    app.get('/debug/ads-health', async (req, res) => {
        const healthStatus = {
            ads_available: adsAvailable,
            controller_loaded: !!AdController,
            model_available: false,
            database_connected: false,
            tables_exist: false,
            sample_data: false
        };

        try {
            if (adsAvailable && AdController) {
                // Check if Ad model can be loaded
                try {
                    const Ad = require('./src/models/Ad');
                    healthStatus.model_available = !!Ad;
                    
                    // Check database connection and table
                    if (Ad) {
                        try {
                            const count = await Ad.getCount();
                            healthStatus.database_connected = true;
                            healthStatus.tables_exist = true;
                            healthStatus.sample_data = count > 0;
                            healthStatus.ad_count = count;
                        } catch (dbError) {
                            console.warn('Database check failed:', dbError.message);
                        }
                    }
                } catch (modelError) {
                    console.warn('Model check failed:', modelError.message);
                }
            }
        } catch (error) {
            console.error('Health check error:', error);
        }

        res.json({
            success: true,
            health: healthStatus,
            timestamp: new Date().toISOString(),
            recommendations: getHealthRecommendations(healthStatus)
        });
    });
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Application Error:', error);
    
    // Handle different types of errors
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File size too large. Maximum allowed size is 50MB.'
        });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            success: false,
            message: 'Unexpected file field. Please check your form.'
        });
    }
    
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: error.message,
            field: error.field
        });
    }
    
    // JSON parsing errors
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            message: 'Invalid JSON format in request body'
        });
    }
    
    // Database connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ER_ACCESS_DENIED_ERROR') {
        return res.status(500).json({
            success: false,
            message: 'Database connection failed. Please check your database settings.'
        });
    }
    
    // Generic error response
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(500).json({
            success: false,
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
    
    // Redirect for non-API requests
    if (req.flash) {
        req.flash('error_msg', 'An error occurred. Please try again.');
        res.redirect(req.get('Referer') || '/admin');
    } else {
        res.status(500).send('Internal server error');
    }
});

// ENHANCED 404 handler with ads endpoints listed
app.use((req, res) => {
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            message: 'API endpoint not found',
            path: req.originalUrl,
            availableEndpoints: [
                'GET /api/health',
                'GET /api/public/feed',
                'GET /api/public/rss',
                'GET /api/videos/feed',
                'GET /api/categories',
                'POST /api/videos/:id/like',
                'POST /api/videos/:id/share',
                'POST /api/videos/:id/view',
                // Ads API endpoints
                'GET /api/ads/feed',
                'POST /api/ads/:id/click',
                'GET /api/admin/ads/health',
                'GET /api/admin/ads/status',
                'POST /api/admin/ads/migrate'
            ]
        });
    }
    
    res.status(404).render('404', {
        title: 'Page Not Found',
        message: 'The page you are looking for does not exist.',
        layout: 'layouts/main'
    });
});

// Final error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
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
    console.log(`🔍 Debug routes: http://localhost:${PORT}/debug/routes`);
    
    // Verify ads endpoints
    if (AdController) {
        console.log(`✅ Ads API ready: http://localhost:${PORT}/api/ads/feed`);
        console.log(`✅ Ads health check: http://localhost:${PORT}/api/admin/ads/health`);
    } else {
        console.log(`⚠️  Ads system disabled - controller not found`);
    }
});

module.exports = app;