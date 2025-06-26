// src/models/User.js - FIXED VERSION KOMPATIBEL DENGAN DATABASE EXISTING
const bcrypt = require('bcrypt');
const { query, queryOne } = require('../config/database');

class User {
    constructor(data) {
        this.id = data.id;
        this.username = data.username;
        this.email = data.email;
        this.password = data.password;
        this.role = data.role || 'user';
        this.status = data.status || 'active'; // Default value jika tidak ada di DB
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // FIXED: Check existing table structure first
    static async checkTableStructure() {
        try {
            const columns = await query(`
                SHOW COLUMNS FROM users
            `);
            
            const columnNames = columns.map(col => col.Field);
            console.log('📋 Users table columns:', columnNames);
            
            return {
                hasStatus: columnNames.includes('status'),
                hasRole: columnNames.includes('role'),
                columns: columnNames
            };
        } catch (error) {
            console.error('❌ Failed to check table structure:', error);
            return {
                hasStatus: false,
                hasRole: false,
                columns: []
            };
        }
    }

    // FIXED: Enhanced initialization with table structure detection
    static async initialize() {
        try {
            console.log('🔧 Initializing users table...');
            
            // First check if table exists and its structure
            const tableStructure = await User.checkTableStructure();
            
            if (tableStructure.columns.length === 0) {
                // Table doesn't exist, create it with full structure
                console.log('📋 Creating new users table...');
                
                const createTableQuery = `
                    CREATE TABLE IF NOT EXISTS users (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        username VARCHAR(255) UNIQUE NOT NULL,
                        email VARCHAR(255) UNIQUE NOT NULL,
                        password VARCHAR(255) NOT NULL,
                        role ENUM('admin', 'user') DEFAULT 'user',
                        status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_username (username),
                        INDEX idx_email (email),
                        INDEX idx_role (role),
                        INDEX idx_status (status)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `;
                
                await query(createTableQuery);
                console.log('✅ Users table created with full structure');
            } else {
                console.log('✅ Users table exists with columns:', tableStructure.columns);
                
                // Add missing columns if needed
                if (!tableStructure.hasStatus) {
                    try {
                        console.log('📋 Adding status column...');
                        await query(`
                            ALTER TABLE users 
                            ADD COLUMN status ENUM('active', 'inactive', 'suspended') DEFAULT 'active'
                            AFTER role
                        `);
                        console.log('✅ Status column added successfully');
                    } catch (alterError) {
                        console.warn('⚠️ Could not add status column:', alterError.message);
                    }
                }
                
                if (!tableStructure.hasRole) {
                    try {
                        console.log('📋 Adding role column...');
                        await query(`
                            ALTER TABLE users 
                            ADD COLUMN role ENUM('admin', 'user') DEFAULT 'user'
                            AFTER password
                        `);
                        console.log('✅ Role column added successfully');
                    } catch (alterError) {
                        console.warn('⚠️ Could not add role column:', alterError.message);
                    }
                }
            }
            
            // Check if default admin exists (use flexible query based on available columns)
            const updatedStructure = await User.checkTableStructure();
            
            let adminQuery = 'SELECT id, username FROM users WHERE username = ?';
            let adminParams = ['admin'];
            
            if (updatedStructure.hasRole) {
                adminQuery = 'SELECT id, username, role FROM users WHERE username = ? AND role = ?';
                adminParams = ['admin', 'admin'];
            }
            
            const adminExists = await queryOne(adminQuery, adminParams);
            
            if (!adminExists) {
                console.log('👤 Creating default admin user...');
                
                // Create default admin user
                const defaultPassword = 'admin123';
                const saltRounds = 12;
                const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);
                
                // Verify the hash works
                const testVerification = await bcrypt.compare(defaultPassword, hashedPassword);
                if (!testVerification) {
                    throw new Error('Password hashing verification failed');
                }
                
                // Build insert query based on available columns
                let insertQuery = `INSERT INTO users (username, email, password`;
                let insertValues = ['admin', 'admin@localhost.com', hashedPassword];
                let valuePlaceholders = '?, ?, ?';
                
                if (updatedStructure.hasRole) {
                    insertQuery += ', role';
                    insertValues.push('admin');
                    valuePlaceholders += ', ?';
                }
                
                if (updatedStructure.hasStatus) {
                    insertQuery += ', status';
                    insertValues.push('active');
                    valuePlaceholders += ', ?';
                }
                
                insertQuery += `) VALUES (${valuePlaceholders})`;
                
                const insertResult = await query(insertQuery, insertValues);
                
                console.log('✅ Default admin user created with ID:', insertResult.insertId);
                console.log('   Username: admin');
                console.log('   Password: admin123');
                console.log('   Email: admin@localhost.com');
                
                // Verify the created user
                const verifyUser = await queryOne(
                    'SELECT id, username FROM users WHERE id = ?',
                    [insertResult.insertId]
                );
                
                if (verifyUser) {
                    console.log('✅ Admin user verification successful:', verifyUser);
                } else {
                    console.error('❌ Admin user verification failed');
                }
                
            } else {
                console.log('✅ Default admin user already exists:', adminExists);
                
                // Optional: Reset admin password if needed (for debugging)
                if (process.env.RESET_ADMIN_PASSWORD === 'true') {
                    console.log('🔄 Resetting admin password...');
                    const resetPassword = 'admin123';
                    const resetHash = await bcrypt.hash(resetPassword, 12);
                    
                    await query(
                        'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
                        [resetHash, adminExists.id]
                    );
                    
                    console.log('✅ Admin password reset to: admin123');
                }
            }
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize users table:', error);
            throw error;
        }
    }

    // FIXED: Enhanced authentication compatible with existing table structure
    static async authenticate(username, password) {
        try {
            console.log('🔐 Starting authentication for user:', username);
            
            if (!username || !password) {
                console.log('❌ Missing username or password');
                return null;
            }
            
            // Clean inputs
            username = username.toString().trim();
            password = password.toString();
            
            if (username.length === 0 || password.length === 0) {
                console.log('❌ Empty username or password after trim');
                return null;
            }
            
            console.log('🔍 Searching for user in database...');
            
            // Check table structure first
            const tableStructure = await User.checkTableStructure();
            
            // Build query based on available columns
            let userQuery = `
                SELECT id, username, email, password, created_at, updated_at
            `;
            
            if (tableStructure.hasRole) {
                userQuery += ', role';
            }
            
            if (tableStructure.hasStatus) {
                userQuery += ', status';
            }
            
            userQuery += `
                FROM users 
                WHERE (username = ? OR email = ?)
            `;
            
            // Add status filter only if column exists
            if (tableStructure.hasStatus) {
                userQuery += ` AND status = 'active'`;
            }
            
            const user = await queryOne(userQuery, [username, username]);
            
            if (!user) {
                console.log('❌ User not found:', username);
                
                // Check if user exists but is inactive (only if status column exists)
                if (tableStructure.hasStatus) {
                    const inactiveUser = await queryOne(`
                        SELECT username, status FROM users WHERE username = ? OR email = ?
                    `, [username, username]);
                    
                    if (inactiveUser) {
                        console.log('🔍 User exists but status is:', inactiveUser.status);
                    } else {
                        console.log('🔍 User does not exist in database');
                    }
                } else {
                    console.log('🔍 User does not exist in database');
                }
                
                return null;
            }
            
            console.log('👤 User found:', {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role || 'user', // Default if column doesn't exist
                status: user.status || 'active' // Default if column doesn't exist
            });
            
            // Enhanced password verification with logging
            console.log('🔐 Verifying password...');
            
            let isValidPassword = false;
            try {
                isValidPassword = await bcrypt.compare(password, user.password);
                console.log('🔐 Password verification result:', isValidPassword ? 'SUCCESS' : 'FAILED');
            } catch (bcryptError) {
                console.error('❌ Bcrypt comparison error:', bcryptError);
                
                // Fallback: Try direct string comparison (only for debugging)
                if (process.env.NODE_ENV === 'development') {
                    console.log('🔄 Trying direct password comparison for debugging...');
                    if (password === user.password) {
                        console.log('⚠️ Direct password match (password not hashed?)');
                        
                        // Re-hash the password
                        const newHash = await bcrypt.hash(password, 12);
                        await query('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);
                        console.log('✅ Password re-hashed for user:', user.username);
                        
                        isValidPassword = true;
                    }
                }
                
                if (!isValidPassword) {
                    return null;
                }
            }
            
            if (!isValidPassword) {
                console.log('❌ Invalid password for user:', username);
                return null;
            }
            
            console.log('✅ Authentication successful for user:', username);
            
            // Update last login (optional)
            try {
                await query('UPDATE users SET updated_at = NOW() WHERE id = ?', [user.id]);
                console.log('✅ Last login updated for user:', username);
            } catch (updateError) {
                console.warn('⚠️ Failed to update last login:', updateError.message);
            }
            
            // Return user without password
            const authenticatedUser = new User({
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role || 'user', // Default if column doesn't exist
                status: user.status || 'active', // Default if column doesn't exist
                created_at: user.created_at,
                updated_at: user.updated_at
            });
            
            console.log('✅ Returning authenticated user object');
            return authenticatedUser;
            
        } catch (error) {
            console.error('❌ Authentication error:', error);
            console.error('❌ Error stack:', error.stack);
            return null;
        }
    }

    // Find user by ID (compatible with existing structure)
    static async findById(id) {
        try {
            const tableStructure = await User.checkTableStructure();
            
            let userQuery = `SELECT id, username, email, created_at, updated_at`;
            
            if (tableStructure.hasRole) {
                userQuery += ', role';
            }
            
            if (tableStructure.hasStatus) {
                userQuery += ', status';
                userQuery += ` FROM users WHERE id = ? AND status = 'active'`;
            } else {
                userQuery += ` FROM users WHERE id = ?`;
            }
            
            const user = await queryOne(userQuery, [id]);
            
            return user ? new User({
                ...user,
                role: user.role || 'user',
                status: user.status || 'active'
            }) : null;
        } catch (error) {
            console.error('❌ Find user by ID error:', error);
            return null;
        }
    }

    // Find user by username (compatible with existing structure)
    static async findByUsername(username) {
        try {
            const tableStructure = await User.checkTableStructure();
            
            let userQuery = `SELECT id, username, email, created_at, updated_at`;
            
            if (tableStructure.hasRole) {
                userQuery += ', role';
            }
            
            if (tableStructure.hasStatus) {
                userQuery += ', status';
                userQuery += ` FROM users WHERE username = ? AND status = 'active'`;
            } else {
                userQuery += ` FROM users WHERE username = ?`;
            }
            
            const user = await queryOne(userQuery, [username]);
            
            return user ? new User({
                ...user,
                role: user.role || 'user',
                status: user.status || 'active'
            }) : null;
        } catch (error) {
            console.error('❌ Find user by username error:', error);
            return null;
        }
    }

    // Create new user (compatible with existing structure)
    static async create(userData) {
        try {
            const { username, email, password, role = 'user' } = userData;
            
            // Validate required fields
            if (!username || !email || !password) {
                throw new Error('Username, email, and password are required');
            }
            
            // Check if user already exists
            const existingUser = await queryOne(`
                SELECT id FROM users 
                WHERE username = ? OR email = ?
            `, [username, email]);
            
            if (existingUser) {
                throw new Error('User with this username or email already exists');
            }
            
            // Hash password
            const hashedPassword = await User.hashPassword(password);
            
            // Check table structure
            const tableStructure = await User.checkTableStructure();
            
            // Build insert query based on available columns
            let insertQuery = `INSERT INTO users (username, email, password`;
            let insertValues = [username, email, hashedPassword];
            let valuePlaceholders = '?, ?, ?';
            
            if (tableStructure.hasRole) {
                insertQuery += ', role';
                insertValues.push(role);
                valuePlaceholders += ', ?';
            }
            
            if (tableStructure.hasStatus) {
                insertQuery += ', status';
                insertValues.push('active');
                valuePlaceholders += ', ?';
            }
            
            insertQuery += `) VALUES (${valuePlaceholders})`;
            
            const result = await query(insertQuery, insertValues);
            
            // Return created user
            return await User.findById(result.insertId);
            
        } catch (error) {
            console.error('❌ Create user error:', error);
            throw error;
        }
    }

    // Get user count
    static async getCount() {
        try {
            const result = await queryOne('SELECT COUNT(*) as count FROM users');
            return result ? result.count : 0;
        } catch (error) {
            console.error('❌ Get user count error:', error);
            return 0;
        }
    }

    // Helper methods
    static async verifyPassword(plainPassword, hashedPassword) {
        try {
            return await bcrypt.compare(plainPassword, hashedPassword);
        } catch (error) {
            console.error('❌ Password verification error:', error);
            return false;
        }
    }

    static async hashPassword(password, saltRounds = 12) {
        try {
            return await bcrypt.hash(password, saltRounds);
        } catch (error) {
            console.error('❌ Password hashing error:', error);
            throw error;
        }
    }

    // Convert to JSON (without password)
    toJSON() {
        return {
            id: this.id,
            username: this.username,
            email: this.email,
            role: this.role,
            status: this.status,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = User;