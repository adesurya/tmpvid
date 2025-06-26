// src/routes/debug.js - FIXED VERSION kompatibel dengan database existing
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { query, queryOne } = require('../config/database');

// Debug endpoint untuk cek database connection
router.get('/db-connection', async (req, res) => {
    try {
        const result = await queryOne('SELECT 1 + 1 AS result');
        res.json({
            success: true,
            message: 'Database connection successful',
            result: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Database connection failed',
            error: error.message
        });
    }
});

// Debug endpoint untuk cek struktur tabel users
router.get('/check-table-structure', async (req, res) => {
    try {
        const columns = await query('SHOW COLUMNS FROM users');
        const columnNames = columns.map(col => col.Field);
        
        res.json({
            success: true,
            table_exists: true,
            columns: columns,
            column_names: columnNames,
            has_status: columnNames.includes('status'),
            has_role: columnNames.includes('role'),
            recommendations: columnNames.includes('status') && columnNames.includes('role') 
                ? ['Table structure is complete']
                : ['Consider running migration to add missing columns']
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to check table structure',
            error: error.message,
            table_exists: false
        });
    }
});

// Debug endpoint untuk cek admin user (kompatibel dengan structure apa pun)
router.get('/check-admin', async (req, res) => {
    try {
        // Initialize user table first
        await User.initialize();
        
        // Check table structure
        const tableStructure = await User.checkTableStructure();
        
        // Build query based on available columns
        let adminQuery = 'SELECT id, username, email, created_at';
        
        if (tableStructure.hasRole) {
            adminQuery += ', role';
        }
        
        if (tableStructure.hasStatus) {
            adminQuery += ', status';
        }
        
        adminQuery += ' FROM users WHERE username = ?';
        
        const admin = await queryOne(adminQuery, ['admin']);
        
        if (!admin) {
            return res.json({
                success: false,
                message: 'Admin user not found',
                table_structure: tableStructure,
                recommendation: 'Admin user should be created automatically by User.initialize()'
            });
        }
        
        res.json({
            success: true,
            message: 'Admin user found',
            admin: {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                role: admin.role || 'N/A (column not exists)',
                status: admin.status || 'N/A (column not exists)',
                created_at: admin.created_at
            },
            table_structure: tableStructure,
            default_credentials: {
                username: 'admin',
                password: 'admin123'
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to check admin user',
            error: error.message
        });
    }
});

// Debug endpoint untuk test authentication (kompatibel dengan struktur apa pun)
router.post('/test-auth', async (req, res) => {
    try {
        const { username = 'admin', password = 'admin123' } = req.body;
        
        console.log('🔐 Testing authentication with:', { username, password: '[PROVIDED]' });
        
        // Check table structure first
        const tableStructure = await User.checkTableStructure();
        
        // Test direct database query
        let userQuery = 'SELECT id, username, email, password, created_at';
        
        if (tableStructure.hasRole) {
            userQuery += ', role';
        }
        
        if (tableStructure.hasStatus) {
            userQuery += ', status';
            userQuery += ' FROM users WHERE username = ? AND status = ?';
            var queryParams = [username, 'active'];
        } else {
            userQuery += ' FROM users WHERE username = ?';
            var queryParams = [username];
        }
        
        const user = await queryOne(userQuery, queryParams);
        
        if (!user) {
            return res.json({
                success: false,
                message: 'User not found in database',
                step: 'database_query',
                table_structure: tableStructure,
                query_used: userQuery
            });
        }
        
        // Test bcrypt comparison
        const bcrypt = require('bcrypt');
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.json({
                success: false,
                message: 'Password verification failed',
                step: 'password_verification',
                user_found: true,
                user_details: {
                    id: user.id,
                    username: user.username,
                    role: user.role || 'N/A',
                    status: user.status || 'N/A'
                }
            });
        }
        
        // Test User.authenticate method
        const authenticatedUser = await User.authenticate(username, password);
        
        if (!authenticatedUser) {
            return res.json({
                success: false,
                message: 'User.authenticate method failed',
                step: 'user_authenticate_method',
                direct_auth_works: true
            });
        }
        
        res.json({
            success: true,
            message: 'Authentication test successful',
            user: {
                id: authenticatedUser.id,
                username: authenticatedUser.username,
                role: authenticatedUser.role,
                status: authenticatedUser.status
            },
            table_structure: tableStructure,
            all_steps_passed: true
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Authentication test failed',
            error: error.message,
            stack: error.stack
        });
    }
});

// Debug endpoint untuk reset admin password (kompatibel dengan struktur apa pun)
router.post('/reset-admin-password', async (req, res) => {
    try {
        const bcrypt = require('bcrypt');
        const newPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        // Check if admin exists first
        const adminExists = await queryOne('SELECT id FROM users WHERE username = ?', ['admin']);
        
        if (!adminExists) {
            return res.json({
                success: false,
                message: 'Admin user not found. Creating new admin user...',
                action: 'creating_admin'
            });
        }
        
        const result = await query(`
            UPDATE users 
            SET password = ?, updated_at = NOW() 
            WHERE username = 'admin'
        `, [hashedPassword]);
        
        if (result.affectedRows === 0) {
            return res.json({
                success: false,
                message: 'Admin user not updated'
            });
        }
        
        // Verify the password works
        const testAuth = await User.authenticate('admin', newPassword);
        
        res.json({
            success: true,
            message: 'Admin password reset successfully',
            new_password: newPassword,
            verification_test: testAuth ? 'PASSED' : 'FAILED'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to reset admin password',
            error: error.message
        });
    }
});

// Debug endpoint untuk create fresh admin user
router.post('/create-admin', async (req, res) => {
    try {
        // Delete existing admin first
        await query('DELETE FROM users WHERE username = ?', ['admin']);
        
        // Initialize User model (will create new admin)
        await User.initialize();
        
        // Test the new admin
        const testAuth = await User.authenticate('admin', 'admin123');
        
        res.json({
            success: true,
            message: 'Fresh admin user created',
            credentials: {
                username: 'admin',
                password: 'admin123'
            },
            authentication_test: testAuth ? 'PASSED' : 'FAILED'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create admin user',
            error: error.message
        });
    }
});

// Debug endpoint untuk migrate table structure
router.post('/migrate-table', async (req, res) => {
    try {
        const { migrateUsersTable } = require('../scripts/migrate-users-table');
        const result = await migrateUsersTable();
        
        res.json({
            success: true,
            message: 'Table migration completed',
            result: result
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Table migration failed',
            error: error.message
        });
    }
});

// Debug endpoint untuk cek session
router.get('/check-session', (req, res) => {
    res.json({
        session_available: !!req.session,
        session_id: req.sessionID,
        session_data: req.session,
        user_in_session: req.session ? req.session.user : null,
        cookie_settings: req.session ? req.session.cookie : null
    });
});

// Debug endpoint untuk test bcrypt
router.post('/test-bcrypt', async (req, res) => {
    try {
        const { password = 'admin123' } = req.body;
        const bcrypt = require('bcrypt');
        
        // Hash the password
        const hash1 = await bcrypt.hash(password, 10);
        const hash2 = await bcrypt.hash(password, 12);
        
        // Test comparison
        const test1 = await bcrypt.compare(password, hash1);
        const test2 = await bcrypt.compare(password, hash2);
        const test3 = await bcrypt.compare('wrong_password', hash1);
        
        res.json({
            success: true,
            password_tested: password,
            hash_10_rounds: hash1,
            hash_12_rounds: hash2,
            comparison_tests: {
                correct_password_10_rounds: test1,
                correct_password_12_rounds: test2,
                wrong_password: test3
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Bcrypt test failed',
            error: error.message
        });
    }
});

// Debug endpoint untuk list all users (kompatibel dengan struktur apa pun)
router.get('/list-users', async (req, res) => {
    try {
        // Check table structure first
        const tableStructure = await User.checkTableStructure();
        
        let userQuery = 'SELECT id, username, email, created_at, updated_at';
        
        if (tableStructure.hasRole) {
            userQuery += ', role';
        }
        
        if (tableStructure.hasStatus) {
            userQuery += ', status';
        }
        
        userQuery += ' FROM users ORDER BY created_at DESC';
        
        const users = await query(userQuery);
        
        res.json({
            success: true,
            total_users: users.length,
            table_structure: tableStructure,
            users: users.map(user => ({
                ...user,
                role: user.role || 'N/A',
                status: user.status || 'N/A'
            }))
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to list users',
            error: error.message
        });
    }
});

// Debug endpoint untuk comprehensive login test (updated untuk kompatibilitas)
router.post('/comprehensive-login-test', async (req, res) => {
    const results = {};
    
    try {
        console.log('🔍 Starting comprehensive login test...');
        
        // 1. Database connection test
        try {
            await queryOne('SELECT 1');
            results.database_connection = 'PASSED';
        } catch (error) {
            results.database_connection = `FAILED: ${error.message}`;
        }
        
        // 2. Users table exists
        try {
            await queryOne('SELECT COUNT(*) as count FROM users');
            results.users_table_exists = 'PASSED';
        } catch (error) {
            results.users_table_exists = `FAILED: ${error.message}`;
        }
        
        // 3. Check table structure
        try {
            const tableStructure = await User.checkTableStructure();
            results.table_structure = {
                status: 'CHECKED',
                has_role: tableStructure.hasRole,
                has_status: tableStructure.hasStatus,
                columns: tableStructure.columns
            };
        } catch (error) {
            results.table_structure = `FAILED: ${error.message}`;
        }
        
        // 4. Admin user exists
        try {
            const tableStructure = await User.checkTableStructure();
            let adminQuery = 'SELECT * FROM users WHERE username = ?';
            const admin = await queryOne(adminQuery, ['admin']);
            
            if (admin) {
                results.admin_user_exists = 'PASSED';
                results.admin_user_details = {
                    id: admin.id,
                    username: admin.username,
                    role: admin.role || 'N/A (column missing)',
                    status: admin.status || 'N/A (column missing)'
                };
            } else {
                results.admin_user_exists = 'FAILED: Admin user not found';
            }
        } catch (error) {
            results.admin_user_exists = `FAILED: ${error.message}`;
        }
        
        // 5. Password verification test
        try {
            const admin = await queryOne('SELECT password FROM users WHERE username = ?', ['admin']);
            if (admin) {
                const bcrypt = require('bcrypt');
                const isValid = await bcrypt.compare('admin123', admin.password);
                results.password_verification = isValid ? 'PASSED' : 'FAILED: Password does not match';
            } else {
                results.password_verification = 'FAILED: Admin user not found';
            }
        } catch (error) {
            results.password_verification = `FAILED: ${error.message}`;
        }
        
        // 6. User.authenticate method test
        try {
            const user = await User.authenticate('admin', 'admin123');
            if (user) {
                results.user_authenticate_method = 'PASSED';
                results.authenticated_user = {
                    id: user.id,
                    username: user.username,
                    role: user.role
                };
            } else {
                results.user_authenticate_method = 'FAILED: Authentication returned null';
            }
        } catch (error) {
            results.user_authenticate_method = `FAILED: ${error.message}`;
        }
        
        // 7. Session capability test
        if (req.session) {
            results.session_available = 'PASSED';
            results.session_id = req.sessionID;
        } else {
            results.session_available = 'FAILED: Session not available';
        }
        
        // 8. Flash messages test
        if (typeof req.flash === 'function') {
            results.flash_messages = 'PASSED';
        } else {
            results.flash_messages = 'FAILED: Flash not available';
        }
        
        // Overall assessment
        const failedTests = Object.values(results).filter(result => 
            typeof result === 'string' && result.startsWith('FAILED')
        );
        
        results.overall_assessment = failedTests.length === 0 ? 'ALL TESTS PASSED' : `${failedTests.length} TESTS FAILED`;
        results.recommendations = [];
        
        if (failedTests.length > 0) {
            if (results.database_connection.startsWith('FAILED')) {
                results.recommendations.push('Fix database connection configuration');
            }
            if (results.users_table_exists.startsWith('FAILED')) {
                results.recommendations.push('Run database migrations to create users table');
            }
            if (results.admin_user_exists.startsWith('FAILED')) {
                results.recommendations.push('Run User.initialize() to create admin user or use /debug/create-admin');
            }
            if (results.password_verification.startsWith('FAILED')) {
                results.recommendations.push('Reset admin password using /debug/reset-admin-password');
            }
            if (results.session_available.startsWith('FAILED')) {
                results.recommendations.push('Check session middleware configuration');
            }
            if (results.table_structure && 
                typeof results.table_structure === 'object' && 
                (!results.table_structure.has_role || !results.table_structure.has_status)) {
                results.recommendations.push('Consider running /debug/migrate-table to add missing columns');
            }
        }
        
        res.json({
            success: true,
            test_results: results,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Comprehensive test failed',
            error: error.message,
            partial_results: results
        });
    }
});

module.exports = router;