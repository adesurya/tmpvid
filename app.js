// app.js - COMPLETE FIXED VERSION WITH ADS SYSTEM INTEGRATION
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
const fs = require('fs');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// === DATABASE INITIALIZATION ===
let initDatabase;
try {
    const dbConfig = require('./src/config/database');
    initDatabase = dbConfig.initDatabase;
    console.log('✅ Database config loaded');
} catch (error) {
    console.warn('⚠️ Database config not found, using fallback');
    initDatabase = async () => {
        console.log('✅ Database initialization skipped (no config)');
    };
}

// === ADS SYSTEM INITIALIZATION ===
let AdController;
let adRoutes;
let apiAdRoutes;
let adsAvailable = false;

// Load ads system with comprehensive error handling
try {
    // Try to load AdController first
    AdController = require('./src/controllers/adController');
    console.log('✅ AdController loaded successfully');
    
    // Then load ad routes - FIXED PATH
    adRoutes = require('./src/routes/adRoutes'); // This should match your file structure
    console.log('✅ Ad routes loaded successfully');
    
    // Load API ad routes - FIXED PATH
    try {
        apiAdRoutes = require('./src/routes/api/ads'); // Or wherever your API routes are
        console.log('✅ Ad API routes loaded successfully');
    } catch (apiError) {
        console.warn('⚠️ Ad API routes not found, using fallback');
        // Create basic API fallback
        const express = require('express');
        apiAdRoutes = express.Router();
        apiAdRoutes.get('/status', (req, res) => {
            res.json({ success: true, message: 'Ads API not fully configured' });
        });
    }
    
    adsAvailable = true;
} catch (error) {
    console.error('❌ Failed to load ads system:', error);
    AdController = null;
    
    // Create fallback routes
    const express = require('express');
    adRoutes = express.Router();
    
    // Fallback route for ads dashboard
    adRoutes.get('*', (req, res) => {
        res.status(503).render('admin/ads-fallback', {
            title: 'Advertisement System',
            error: 'Advertisement system is not available',
            instructions: [
                'Check if src/controllers/adController.js exists',
                'Check if src/routes/adRoutes.js exists', 
                'Verify src/models/Ad.js is properly configured',
                'Check database connection and tables exist',
                'Verify upload directory permissions',
                'Restart the application server'
            ],
            layout: 'layouts/admin'
        });
    });
    
    apiAdRoutes = express.Router();
    apiAdRoutes.get('*', (req, res) => {
        res.status(503).json({
            success: false,
            message: 'Ads API not available'
        });
    });
    
    adsAvailable = false;
}

// === IMPORT OTHER ROUTES ===
const routes = require('./src/routes');
const apiRoutes = require('./src/routes/api');

// === SECURITY MIDDLEWARE ===
// Enhanced CSP to support ads, inline scripts, and Google services
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: [
                "'self'", 
                "'unsafe-inline'", 
                "https://cdnjs.cloudflare.com", 
                "https://fonts.googleapis.com"
            ],
            scriptSrc: [
                "'self'", 
                "'unsafe-inline'", 
                "'unsafe-eval'",
                "https://cdnjs.cloudflare.com",
                "https://pagead2.googlesyndication.com",
                "https://www.googletagmanager.com",
                "https://www.google-analytics.com",
                "https://googleads.g.doubleclick.net",
                "https://tpc.googlesyndication.com",
                "https://securepubads.g.doubleclick.net"
            ],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: [
                "'self'", 
                "data:", 
                "https:", 
                "blob:",
                "https://pagead2.googlesyndication.com",
                "https://www.google.com",
                "https://www.gstatic.com",
                "https://googleads.g.doubleclick.net"
            ],
            mediaSrc: ["'self'", "https:", "blob:", "data:"],
            connectSrc: [
                "'self'",
                "https://www.google-analytics.com",
                "https://region1.google-analytics.com", 
                "https://pagead2.googlesyndication.com",
                "https://googleads.g.doubleclick.net"
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
                "https://tpc.googlesyndication.com",
                "https://securepubads.g.doubleclick.net"
            ],
            workerSrc: ["'self'", "blob:"],
            manifestSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false // Disable for ads compatibility
}));

// Rate limiting with different limits for different endpoints
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // More restrictive for API
    message: {
        success: false,
        message: 'Too many API requests from this IP, please try again later.'
    }
});

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // More restrictive for admin
    message: 'Too many admin requests from this IP, please try again later.'
});

app.use('/api/', apiLimiter);
app.use('/admin/', adminLimiter);
app.use(generalLimiter);

// === BASIC MIDDLEWARE ===
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: true
}));
app.use(cookieParser());

// === BODY PARSING MIDDLEWARE ===
// Enhanced JSON and URL encoding with comprehensive error handling
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
            throw new Error('Invalid JSON format');
        }
    }
}));

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
            throw new Error('Invalid form data');
        }
    }
}));

app.use('/admin/login', (req, res, next) => {
    if (req.method === 'POST') {
        console.log('🔐 Admin login attempt:', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            hasBody: !!req.body,
            bodyKeys: req.body ? Object.keys(req.body) : [],
            contentType: req.get('Content-Type'),
            timestamp: new Date().toISOString()
        });
    }
    next();
});

// === SESSION CONFIGURATION ===
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        sameSite: 'lax'
    },
    name: 'sessionId' // Don't use default session name
}));

app.use(flash());

// === VIEW ENGINE SETUP ===
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// === STATIC FILES & UPLOAD DIRECTORIES ===
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Create upload directories if they don't exist
const uploadDirs = [
    path.join(__dirname, 'public/uploads'),
    path.join(__dirname, 'public/uploads/ads'),
    path.join(__dirname, 'public/uploads/videos'),
    path.join(__dirname, 'public/uploads/images'),
    path.join(__dirname, 'public/uploads/temp')
];

uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        try {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`✅ Created upload directory: ${dir}`);
        } catch (error) {
            console.error(`❌ Failed to create directory ${dir}:`, error);
        }
    }
});

// === APPLICATION INITIALIZATION ===
async function initializeApp() {
    try {
        console.log('🚀 Initializing application...');
        
        // Initialize database first
        await initDatabase();
        console.log('✅ Database initialization complete');
        
        // Initialize ads system after database is ready
        if (adsAvailable && AdController && typeof AdController.initialize === 'function') {
            try {
                await AdController.initialize();
                console.log('✅ Ads system initialized successfully');
            } catch (adError) {
                console.error('❌ Failed to initialize ads system:', adError);
                // Don't fail the entire app, just disable ads
                adsAvailable = false;
            }
        }
        
        console.log('✅ Application initialization complete');
    } catch (error) {
        console.error('❌ Application initialization failed:', error);
        // Don't exit the process, continue without full functionality
    }
}

// Initialize the app
initializeApp();

// === GLOBAL MIDDLEWARE FOR AD INJECTION ===
app.use(async (req, res, next) => {
    // Store original render function
    const originalRender = res.render;
    
    // Override render function to inject ads and global data
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
            
            // Load ads if system is available
            if (adsAvailable && AdController) {
                try {
                    const Ad = require('./src/models/Ad');
                    
                    if (Ad && typeof Ad.getAdsBySlots === 'function') {
                        // Get ads organized by slots with timeout protection
                        const adPromise = Ad.getAdsBySlots();
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Ads loading timeout')), 3000)
                        );
                        
                        const adsBySlots = await Promise.race([adPromise, timeoutPromise]);
                        
                        // Map slots to template positions safely
                        locals.ads = {
                            header: Array.isArray(adsBySlots[1]) ? adsBySlots[1] : [],
                            before_video: Array.isArray(adsBySlots[2]) ? adsBySlots[2] : [],
                            sidebar: Array.isArray(adsBySlots[3]) ? adsBySlots[3] : [],
                            after_video: Array.isArray(adsBySlots[4]) ? adsBySlots[4] : [],
                            footer: Array.isArray(adsBySlots[5]) ? adsBySlots[5] : []
                        };
                        
                        if (process.env.NODE_ENV === 'development') {
                            console.log('✅ Ads injected into template:', {
                                header: locals.ads.header.length,
                                before_video: locals.ads.before_video.length,
                                sidebar: locals.ads.sidebar.length,
                                after_video: locals.ads.after_video.length,
                                footer: locals.ads.footer.length
                            });
                        }
                    }
                } catch (adsError) {
                    console.warn('⚠️ Failed to load ads for template injection:', adsError.message);
                    // Keep default empty ads structure
                }
            }
            
            // Add global template variables
            locals.adsAvailable = adsAvailable;
            locals.adsSystemEnabled = adsAvailable;
            locals.currentYear = new Date().getFullYear();
            locals.app = {
                name: process.env.APP_NAME || 'Video Platform',
                version: process.env.APP_VERSION || '1.0.0',
                environment: process.env.NODE_ENV || 'development'
            };
            
        } catch (error) {
            console.error('❌ Failed to process template injection:', error);
            
            // Ensure we always have the required structure
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

// === GLOBAL VARIABLES FOR VIEWS ===
app.use((req, res, next) => {
    // Handle protocol detection for HTTPS/HTTP
    const protocol = req.headers['x-forwarded-proto'] || 
                    (req.connection.encrypted ? 'https' : 'http');
    
    req.protocol = protocol;
    req.secure = protocol === 'https';
    
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // Changed from DENY to allow ads
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    if (req.secure) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    // Make flash messages available to all views
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.session ? req.session.user : null;
    res.locals.isAuthenticated = !!(req.session && req.session.user);
    
    next();
});

// === ADMIN MIDDLEWARE ===
// Inject ads summary into admin pages
app.use('/admin*', async (req, res, next) => {
    if (adsAvailable && AdController) {
        try {
            const Ad = require('./src/models/Ad');
            if (Ad && typeof Ad.getDashboardSummary === 'function') {
                const adsSummary = await Ad.getDashboardSummary();
                res.locals.adsSummary = adsSummary;
                res.locals.adsEnabled = true;
            } else {
                res.locals.adsEnabled = false;
            }
        } catch (error) {
            console.warn('⚠️ Failed to load ads summary for admin:', error);
            res.locals.adsEnabled = false;
        }
    } else {
        res.locals.adsEnabled = false;
    }
    
    // Add admin menu integration
    res.locals.adminMenu = res.locals.adminMenu || [];
    
    // Add ads to admin menu if available
    if (adsAvailable) {
        const adsMenuExists = res.locals.adminMenu.some(item => item.url === '/admin/ads');
        if (!adsMenuExists) {
            res.locals.adminMenu.push({
                title: 'Advertisements',
                icon: 'fas fa-bullhorn',
                url: '/admin/ads',
                submenu: [
                    { title: 'Manage Ads', url: '/admin/ads', icon: 'fas fa-list' },
                    { title: 'Create New', url: '/admin/ads/create', icon: 'fas fa-plus' },
                    { title: 'Performance', url: '/admin/ads/performance', icon: 'fas fa-chart-bar' }
                ]
            });
        }
    }
    
    next();
});

// === DATABASE MIDDLEWARE FOR ADS ===
// Check database connection for ads routes
app.use('/admin/ads*', async (req, res, next) => {
    if (!adsAvailable) {
        return res.status(503).render('admin/ads-fallback', {
            title: 'Advertisement System',
            error: 'Advertisement system is not available',
            instructions: [
                'Ensure src/controllers/adController.js exists',
                'Verify src/models/Ad.js is properly configured',
                'Check database connection and tables',
                'Restart the application server'
            ],
            layout: 'layouts/admin'
        });
    }
    
    try {
        // Quick database connectivity check for ads
        const Ad = require('./src/models/Ad');
        await Ad.getCount();
        next();
    } catch (error) {
        console.error('❌ Database connection issue for ads:', error);
        
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(503).json({
                success: false,
                message: 'Database connection issue',
                error: 'Please check database configuration'
            });
        }
        
        res.render('admin/ads-fallback', {
            title: 'Advertisement System',
            error: 'Database connection issue',
            instructions: [
                'Check database connection settings',
                'Verify database server is running',
                'Run database migrations if needed',
                'Check database user permissions'
            ],
            layout: 'layouts/admin'
        });
    }
});

// === ROUTE REGISTRATION ===
// Register API routes first
app.use('/api', apiRoutes);

// Register ads routes
// if (adsAvailable && adRoutes && apiAdRoutes) {
//     app.use('/admin/ads', adRoutes);
//     app.use('/api/admin/ads', apiAdRoutes);
//     app.use('/api/ads', apiAdRoutes); // Public API access
//     console.log('✅ Ad routes registered successfully');
// } else {
//     console.warn('⚠️ Ad routes not registered - system not available');
// }

//Versi Baru
if (adsAvailable && adRoutes) {
    console.log('🔧 Registering ad routes...');
    app.use('/admin/ads', adRoutes);
    console.log('✅ Ad routes registered at /admin/ads');
    
    // Register API ad routes
    if (apiAdRoutes) {
        app.use('/api/ads', apiAdRoutes);
        console.log('✅ Ad API routes registered at /api/ads');
    }
} else {
    console.warn('⚠️ Ad routes not registered - system not available');
    
    // Create minimal fallback route
    app.get('/admin/ads*', (req, res) => {
        res.status(503).render('admin/ads-fallback', {
            title: 'Advertisement System',
            error: 'Advertisement system is not available',
            instructions: [
                'Ensure src/controllers/adController.js exists and is valid',
                'Verify src/routes/adRoutes.js exists',
                'Check src/models/Ad.js is properly configured',
                'Check database connection and tables exist',
                'Restart the application server'
            ],
            layout: 'layouts/admin'
        });
    });
}


// Register main routes
app.use('/', routes);

// === ENHANCED ERROR HANDLING FOR ADS ===
// Error handling middleware specifically for ad-related errors

app.use('/admin/login', (error, req, res, next) => {
    console.error('❌ Login route error:', error);
    
    if (req.flash && typeof req.flash === 'function') {
        req.flash('error_msg', 'Login system error. Please try again.');
    }
    
    res.redirect('/admin/login');
});

app.get('/fix-login', async (req, res) => {
    try {
        console.log('🔧 Running quick login fix...');
        
        const User = require('./src/models/User');
        const bcrypt = require('bcrypt');
        const { query } = require('./src/config/database');
        
        // 1. Initialize User model
        await User.initialize();
        
        // 2. Reset admin password
        const hashedPassword = await bcrypt.hash('admin123', 12);
        await query(`
            UPDATE users 
            SET password = ?, updated_at = NOW() 
            WHERE username = 'admin' AND role = 'admin'
        `, [hashedPassword]);
        
        // 3. Test authentication
        const testAuth = await User.authenticate('admin', 'admin123');
        
        res.json({
            success: true,
            message: 'Login fix completed',
            steps_completed: [
                'User model initialized',
                'Admin password reset to admin123',
                'Authentication tested'
            ],
            authentication_test: testAuth ? 'PASSED' : 'FAILED',
            next_steps: [
                'Try logging in with username: admin, password: admin123',
                'If still failing, check /debug/comprehensive-login-test'
            ]
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Quick fix failed',
            error: error.message,
            recommendation: 'Check database connection and configuration'
        });
    }
});

app.use('/admin/ads*', (error, req, res, next) => {
    console.error('❌ Ad route error:', error);
    
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(500).json({
            success: false,
            message: 'Advertisement system error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
    
    res.status(500).render('error', {
        title: 'Advertisement Error',
        message: 'An error occurred in the advertisement system',
        error: process.env.NODE_ENV === 'development' ? error : {},
        layout: 'layouts/admin'
    });
});

app.use('/api/ads*', (error, req, res, next) => {
    console.error('❌ Ad API error:', error);
    res.status(500).json({
        success: false,
        message: 'Advertisement API error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
});

// === FRONTEND INTEGRATION ===
// Enhanced video feed page with ads integration
app.get('/videos', async (req, res) => {
    try {
        // Your existing video loading logic
        let videos = [];
        try {
            // Replace this with your actual video loading function
            // videos = await getVideos(); // Your existing function
            videos = []; // Placeholder
        } catch (videoError) {
            console.warn('⚠️ Failed to load videos:', videoError);
        }
        
        // Add ads data if available
        let adsBySlots = {};
        if (adsAvailable && AdController) {
            try {
                const Ad = require('./src/models/Ad');
                if (Ad && typeof Ad.getAdsBySlots === 'function') {
                    adsBySlots = await Ad.getAdsBySlots();
                }
            } catch (adError) {
                console.warn('⚠️ Failed to load ads for video page:', adError);
            }
        }
        
        res.render('videos/index', {
            title: 'Videos',
            videos: videos,
            ads: adsBySlots,
            adsEnabled: adsAvailable,
            layout: 'layouts/main'
        });
    } catch (error) {
        console.error('❌ Error loading videos page:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load videos',
            layout: 'layouts/main'
        });
    }
});

// === SYSTEM STATUS ENDPOINTS ===
app.get('/system/status', (req, res) => {
    res.json({
        success: true,
        timestamp: new Date().toISOString(),
        system: {
            ads_system: adsAvailable,
            environment: process.env.NODE_ENV || 'development',
            node_version: process.version,
            uptime: process.uptime()
        },
        features: {
            ad_serving: adsAvailable,
            ad_management: adsAvailable,
            ad_analytics: adsAvailable,
            file_upload: true,
            session_management: true
        },
        upload_directories: uploadDirs.map(dir => ({
            path: dir,
            exists: fs.existsSync(dir),
            writable: fs.existsSync(dir) ? checkWritePermission(dir) : false
        }))
    });
});

// Helper function to check write permission
function checkWritePermission(dir) {
    try {
        fs.accessSync(dir, fs.constants.W_OK);
        return true;
    } catch (error) {
        return false;
    }
}

// === DEVELOPMENT ENDPOINTS ===
// if (process.env.NODE_ENV !== 'production') {
//     app.get('/debug/routes', (req, res) => {
//         const routesList = [];
        
//         // Get all registered routes
//         function extractRoutes(stack, basePath = '') {
//             stack.forEach(layer => {
//                 if (layer.route) {
//                     routesList.push({
//                         path: basePath + layer.route.path,
//                         methods: Object.keys(layer.route.methods)
//                     });
//                 } else if (layer.name === 'router' && layer.handle.stack) {
//                     const layerPath = layer.regexp.source
//                         .replace(/\\\//g, '/')
//                         .replace(/\$.*/, '')
//                         .replace(/\^/, '');
//                     extractRoutes(layer.handle.stack, basePath + layerPath);
//                 }
//             });
//         }
        
//         extractRoutes(app._router.stack);
        
//         res.json({
//             success: true,
//             total_routes: routesList.length,
//             routes: routesList,
//             ads_system: {
//                 available: adsAvailable,
//                 controller_loaded: !!AdController,
//                 routes_registered: adsAvailable
//             },
//             timestamp: new Date().toISOString()
//         });
//     });

//     app.get('/debug/ads-health', async (req, res) => {
//         const healthStatus = {
//             ads_available: adsAvailable,
//             controller_loaded: !!AdController,
//             model_available: false,
//             database_connected: false,
//             tables_exist: false,
//             sample_data: false,
//             upload_directories: {}
//         };

//         // Check upload directories
//         uploadDirs.forEach(dir => {
//             healthStatus.upload_directories[path.basename(dir)] = {
//                 exists: fs.existsSync(dir),
//                 writable: fs.existsSync(dir) ? checkWritePermission(dir) : false,
//                 path: dir
//             };
//         });

//         try {
//             if (adsAvailable && AdController) {
//                 // Check if Ad model can be loaded
//                 try {
//                     const Ad = require('./src/models/Ad');
//                     healthStatus.model_available = !!Ad;
                    
//                     // Check database connection and table
//                     if (Ad && typeof Ad.getCount === 'function') {
//                         try {
//                             const count = await Ad.getCount();
//                             healthStatus.database_connected = true;
//                             healthStatus.tables_exist = true;
//                             healthStatus.sample_data = count > 0;
//                             healthStatus.ad_count = count;
//                         } catch (dbError) {
//                             console.warn('⚠️ Database check failed:', dbError.message);
//                         }
//                     }
//                 } catch (modelError) {
//                     console.warn('⚠️ Model check failed:', modelError.message);
//                 }
//             }
//         } catch (error) {
//             console.error('❌ Health check error:', error);
//         }

//         res.json({
//             success: true,
//             health: healthStatus,
//             timestamp: new Date().toISOString(),
//             recommendations: getHealthRecommendations(healthStatus)
//         });
//     });
// }

if (process.env.NODE_ENV !== 'production') {
    app.get('/debug/ads-routes', (req, res) => {
        const routeInfo = {
            ads_system_available: adsAvailable,
            controller_loaded: !!AdController,
            routes_registered: !!adRoutes,
            api_routes_registered: !!apiAdRoutes,
            test_urls: [
                `http://localhost:${PORT}/admin/ads`,
                `http://localhost:${PORT}/admin/ads/create`,
                `http://localhost:${PORT}/api/ads/status`
            ]
        };
    const debugSeriesRoutes = require('./src/routes/debug/series');
    app.use('/debug/series', debugSeriesRoutes);
    console.log('🔧 Debug routes enabled at /debug/series');

        
        res.json({
            success: true,
            data: routeInfo,
            message: 'Ads routes debugging information'
        });
    });
}

// Helper function for health recommendations
function getHealthRecommendations(healthStatus) {
    const recommendations = [];
    
    if (!healthStatus.controller_loaded) {
        recommendations.push('Check if src/controllers/adController.js exists and is properly configured');
    }
    
    if (!healthStatus.model_available) {
        recommendations.push('Check if src/models/Ad.js exists and can be loaded');
    }
    
    if (!healthStatus.database_connected) {
        recommendations.push('Verify database connection configuration');
    }
    
    if (!healthStatus.tables_exist) {
        recommendations.push('Run database migration to create ads tables');
    }
    
    if (!healthStatus.sample_data) {
        recommendations.push('Consider adding sample ads for testing');
    }
    
    // Check upload directories
    Object.entries(healthStatus.upload_directories).forEach(([name, status]) => {
        if (!status.exists) {
            recommendations.push(`Create upload directory: ${name}`);
        } else if (!status.writable) {
            recommendations.push(`Fix write permissions for upload directory: ${name}`);
        }
    });
    
    if (recommendations.length === 0) {
        recommendations.push('All systems are working correctly');
    }
    
    return recommendations;
}

// === COMPREHENSIVE ERROR HANDLING ===
app.use((error, req, res, next) => {
    console.error('❌ Application Error:', error);
    
    // Handle different types of errors
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File size too large. Maximum allowed size is 50MB.',
            code: 'FILE_TOO_LARGE'
        });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            success: false,
            message: 'Unexpected file field. Please check your form.',
            code: 'UNEXPECTED_FILE'
        });
    }
    
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: error.message,
            field: error.field,
            code: 'VALIDATION_ERROR'
        });
    }
    
    // JSON parsing errors
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            message: 'Invalid JSON format in request body',
            code: 'INVALID_JSON'
        });
    }
    
    // Database connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ER_ACCESS_DENIED_ERROR') {
        return res.status(500).json({
            success: false,
            message: 'Database connection failed. Please check your database settings.',
            code: 'DATABASE_ERROR'
        });
    }
    
    // Generic error response
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(500).json({
            success: false,
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            code: 'INTERNAL_ERROR',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
    
    // Redirect for non-API requests
    if (req.flash) {
        req.flash('error_msg', 'An error occurred. Please try again.');
        res.redirect(req.get('Referer') || '/');
    } else {
        res.status(500).send('Internal server error');
    }
});

// === 404 HANDLER ===
app.use((req, res) => {
    if (req.originalUrl.startsWith('/api/')) {
        const availableEndpoints = [
            'GET /api/health',
            // Add your existing API endpoints here
        ];

        // Add ads endpoints if available
        if (adsAvailable) {
            availableEndpoints.push(
                'GET /api/ads/feed',
                'POST /api/ads/click/:id',
                'GET /api/ads/summary',
                'GET /api/ads/:id/analytics',
                'GET /api/ads/slots/overview',
                'GET /api/ads/slots/:slotNumber',
                'POST /api/ads/slots/:slotNumber/assign',
                'DELETE /api/ads/slots/:slotNumber/remove',
                'GET /api/ads/health',
                'GET /api/ads/status'
            );
        }

        return res.status(404).json({
            success: false,
            message: 'API endpoint not found',
            path: req.originalUrl,
            ads_system_available: adsAvailable,
            availableEndpoints: availableEndpoints,
            timestamp: new Date().toISOString()
        });
    }
    
    res.status(404).render('404', {
        title: 'Page Not Found',
        message: 'The page you are looking for does not exist.',
        layout: 'layouts/main'
    });
});

// === FINAL ERROR HANDLER ===
app.use((err, req, res, next) => {
    console.error('❌ Final error handler:', err.stack);
    
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        res.status(500).json({
            success: false,
            message: process.env.NODE_ENV === 'production' 
                ? 'Something went wrong!' 
                : err.message,
            timestamp: new Date().toISOString()
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

// === GRACEFUL SHUTDOWN ===
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

async function ensureAdminUser() {
    try {
        console.log('🔧 Ensuring admin user exists...');
        const User = require('./src/models/User');
        await User.initialize();
        
        // Test authentication
        const testAuth = await User.authenticate('admin', 'admin123');
        if (testAuth) {
            console.log('✅ Admin authentication test: PASSED');
        } else {
            console.log('❌ Admin authentication test: FAILED');
            
            // Try to fix by resetting password
            const bcrypt = require('bcrypt');
            const { query } = require('./src/config/database');
            
            const hashedPassword = await bcrypt.hash('admin123', 12);
            await query(`
                UPDATE users 
                SET password = ?, updated_at = NOW() 
                WHERE username = 'admin' AND role = 'admin'
            `, [hashedPassword]);
            
            console.log('🔄 Admin password reset, testing again...');
            const retestAuth = await User.authenticate('admin', 'admin123');
            console.log('✅ Admin authentication retest:', retestAuth ? 'PASSED' : 'FAILED');
        }
        
    } catch (error) {
        console.error('❌ Failed to ensure admin user:', error);
    }
}

// === SERVER STARTUP ===
const server = app.listen(PORT, () => {
    console.log('🚀 ===================================');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('🚀 ===================================');
    console.log(`📱 Main app: http://localhost:${PORT}`);
    console.log(`🔧 Admin dashboard: http://localhost:${PORT}/admin`);
    
    if (adsAvailable) {
        console.log('✅ ===== ADS SYSTEM ACTIVE =====');
        console.log(`✅ Ads management: http://localhost:${PORT}/admin/ads`);
        console.log(`✅ Create new ad: http://localhost:${PORT}/admin/ads/create`);
        console.log(`✅ Ads performance: http://localhost:${PORT}/admin/ads/performance`);
        console.log(`✅ Ads API: http://localhost:${PORT}/api/ads/feed`);
        console.log(`✅ Ads health check: http://localhost:${PORT}/api/ads/health`);
        console.log(`✅ Ads status: http://localhost:${PORT}/api/ads/status`);
        console.log(`✅ Slots overview: http://localhost:${PORT}/api/ads/slots/overview`);
    } else {
        console.log('⚠️  ===== ADS SYSTEM DISABLED =====');
        console.log('⚠️  Controller not found or failed to load');
        console.log(`⚠️  Check: http://localhost:${PORT}/debug/ads-health`);
    }
    
    console.log('🚀 ===== OTHER ENDPOINTS =====');
    console.log(`📡 Public API: http://localhost:${PORT}/api/public`);
    console.log(`🔗 RSS Feed: http://localhost:${PORT}/api/public/rss`);
    console.log(`📺 Videos: http://localhost:${PORT}/videos`);
    console.log(`🔍 System status: http://localhost:${PORT}/system/status`);
    
    if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 ===== DEBUG ENDPOINTS =====');
        console.log(`🔍 Debug routes: http://localhost:${PORT}/debug/routes`);
        console.log(`🔍 Debug ads health: http://localhost:${PORT}/debug/ads-health`);
    }
    
    console.log('🚀 ===================================');
    
    // Additional startup checks
    setTimeout(() => {
        performStartupChecks();
    }, 2000);
});

app.use('/api/series', (req, res, next) => {
    console.log('🔍 SERIES API REQUEST:', {
        method: req.method,
        url: req.originalUrl,
        body: req.body,
        contentType: req.get('Content-Type'),
        timestamp: new Date().toISOString()
    });
    next();
});

// === STARTUP HEALTH CHECKS ===
async function performStartupChecks() {
    console.log('🔍 Performing enhanced startup checks...');
    
    try {
        // 1. Ensure admin user
        await ensureAdminUser();
        
        // 2. Check upload directories
        let uploadChecks = 0;
        uploadDirs.forEach(dir => {
            if (fs.existsSync(dir) && checkWritePermission(dir)) {
                uploadChecks++;
            }
        });
        console.log(`✅ Upload directories: ${uploadChecks}/${uploadDirs.length} ready`);
        
        // 3. Check database connection
        try {
            const { queryOne } = require('./src/config/database');
            await queryOne('SELECT 1 + 1 AS result');
            console.log('✅ Database connection: ACTIVE');
        } catch (dbError) {
            console.error('❌ Database connection: FAILED -', dbError.message);
        }
        
        // 4. Check session system
        if (process.env.SESSION_SECRET && process.env.SESSION_SECRET !== 'your-secret-key-change-in-production') {
            console.log('✅ Session: Custom secret configured');
        } else {
            console.warn('⚠️ Session: Using default secret (change in production!)');
        }
        
        // 5. Check ads system
        if (adsAvailable) {
            try {
                const Ad = require('./src/models/Ad');
                const count = await Ad.getCount();
                console.log(`✅ Ads system: Database connected, ${count} ads in database`);
            } catch (error) {
                console.warn('⚠️ Ads system: Database connection issues');
            }
        }
        
        console.log('✅ Enhanced startup checks completed');
        
        // Show debug endpoints in development
        if (process.env.NODE_ENV !== 'production') {
            console.log('🔧 ===== DEBUG ENDPOINTS =====');
            console.log(`🔧 Check admin: http://localhost:${PORT}/debug/check-admin`);
            console.log(`🔧 Test auth: http://localhost:${PORT}/debug/test-auth (POST)`);
            console.log(`🔧 Reset password: http://localhost:${PORT}/debug/reset-admin-password (POST)`);
            console.log(`🔧 Full test: http://localhost:${PORT}/debug/comprehensive-login-test (POST)`);
            console.log(`🔧 DB connection: http://localhost:${PORT}/debug/db-connection`);
        }
        
    } catch (error) {
        console.error('❌ Enhanced startup checks failed:', error);
    }
}

// === SERVER ERROR HANDLING ===
server.on('error', (error) => {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

    switch (error.code) {
        case 'EACCES':
            console.error(`❌ ${bind} requires elevated privileges`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(`❌ ${bind} is already in use`);
            process.exit(1);
            break;
        default:
            throw error;
    }
});

server.on('listening', () => {
    const addr = server.address();
    const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
    console.log(`🎧 Server listening on ${bind}`);
});

// === CLEANUP ON EXIT ===
process.on('exit', (code) => {
    console.log(`👋 Process exiting with code: ${code}`);
});

// === EXPORT FOR TESTING ===
module.exports = app;