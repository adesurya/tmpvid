// src/models/User.js - Simple User Model with Authentication
const bcrypt = require('bcrypt');
const { query, queryOne } = require('../config/database');

class User {
    constructor(data) {
        this.id = data.id;
        this.username = data.username;
        this.email = data.email;
        this.password = data.password;
        this.role = data.role || 'user';
        this.status = data.status || 'active';
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Initialize users table and create default admin user
    static async initialize() {
        try {
            console.log('🔧 Initializing users table...');
            
            // Create users table if it doesn't exist
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
                )
            `;
            
            await query(createTableQuery);
            console.log('✅ Users table created/verified');
            
            // Check if default admin exists
            const adminExists = await queryOne(
                'SELECT id FROM users WHERE username = ? AND role = ?',
                ['admin', 'admin']
            );
            
            if (!adminExists) {
                console.log('👤 Creating default admin user...');
                
                // Create default admin user
                const hashedPassword = await bcrypt.hash('admin123', 10);
                
                await query(`
                    INSERT INTO users (username, email, password, role, status)
                    VALUES (?, ?, ?, ?, ?)
                `, [
                    'admin',
                    'admin@localhost.com',
                    hashedPassword,
                    'admin',
                    'active'
                ]);
                
                console.log('✅ Default admin user created');
                console.log('   Username: admin');
                console.log('   Password: admin123');
                console.log('   Email: admin@localhost.com');
            } else {
                console.log('✅ Default admin user already exists');
            }
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize users table:', error);
            throw error;
        }
    }

    // Authenticate user login
    static async authenticate(username, password) {
        try {
            console.log('🔐 Authenticating user:', username);
            
            if (!username || !password) {
                console.log('❌ Missing username or password');
                return null;
            }
            
            // Find user by username or email
            const user = await queryOne(`
                SELECT id, username, email, password, role, status, created_at, updated_at
                FROM users 
                WHERE (username = ? OR email = ?) AND status = 'active'
            `, [username, username]);
            
            if (!user) {
                console.log('❌ User not found or inactive:', username);
                return null;
            }
            
            // Check password
            const isValidPassword = await bcrypt.compare(password, user.password);
            
            if (!isValidPassword) {
                console.log('❌ Invalid password for user:', username);
                return null;
            }
            
            console.log('✅ Authentication successful for user:', username);
            
            // Update last login (optional)
            try {
                await query('UPDATE users SET updated_at = NOW() WHERE id = ?', [user.id]);
            } catch (updateError) {
                console.warn('Failed to update last login:', updateError.message);
            }
            
            // Return user without password
            return new User({
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                status: user.status,
                created_at: user.created_at,
                updated_at: user.updated_at
            });
            
        } catch (error) {
            console.error('❌ Authentication error:', error);
            return null;
        }
    }

    // Find user by ID
    static async findById(id) {
        try {
            const user = await queryOne(`
                SELECT id, username, email, role, status, created_at, updated_at
                FROM users 
                WHERE id = ? AND status = 'active'
            `, [id]);
            
            return user ? new User(user) : null;
        } catch (error) {
            console.error('Find user by ID error:', error);
            return null;
        }
    }

    // Find user by username
    static async findByUsername(username) {
        try {
            const user = await queryOne(`
                SELECT id, username, email, role, status, created_at, updated_at
                FROM users 
                WHERE username = ? AND status = 'active'
            `, [username]);
            
            return user ? new User(user) : null;
        } catch (error) {
            console.error('Find user by username error:', error);
            return null;
        }
    }

    // Create new user
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
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Insert user
            const result = await query(`
                INSERT INTO users (username, email, password, role, status)
                VALUES (?, ?, ?, ?, 'active')
            `, [username, email, hashedPassword, role]);
            
            // Return created user
            return await User.findById(result.insertId);
            
        } catch (error) {
            console.error('Create user error:', error);
            throw error;
        }
    }

    // Get user count
    static async getCount() {
        try {
            const result = await queryOne('SELECT COUNT(*) as count FROM users');
            return result ? result.count : 0;
        } catch (error) {
            console.error('Get user count error:', error);
            return 0;
        }
    }

    // Get users with pagination
    static async getAll(options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                search = '',
                role = null,
                status = 'active'
            } = options;
            
            const offset = (page - 1) * limit;
            let whereClause = 'WHERE 1=1';
            const params = [];
            
            if (search) {
                whereClause += ' AND (username LIKE ? OR email LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }
            
            if (role) {
                whereClause += ' AND role = ?';
                params.push(role);
            }
            
            if (status) {
                whereClause += ' AND status = ?';
                params.push(status);
            }
            
            // Get users
            const users = await query(`
                SELECT id, username, email, role, status, created_at, updated_at
                FROM users 
                ${whereClause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);
            
            // Get total count
            const totalResult = await queryOne(`
                SELECT COUNT(*) as total FROM users ${whereClause}
            `, params);
            
            const total = totalResult ? totalResult.total : 0;
            
            return {
                users: users.map(user => new User(user)),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
            
        } catch (error) {
            console.error('Get all users error:', error);
            return {
                users: [],
                pagination: {
                    page: 1,
                    limit: 20,
                    total: 0,
                    totalPages: 0,
                    hasNext: false,
                    hasPrev: false
                }
            };
        }
    }

    // Update user
    async update(updateData) {
        try {
            const allowedFields = ['username', 'email', 'role', 'status'];
            const updates = [];
            const values = [];
            
            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key) && value !== undefined) {
                    updates.push(`${key} = ?`);
                    values.push(value);
                }
            }
            
            if (updates.length === 0) {
                throw new Error('No valid fields to update');
            }
            
            values.push(this.id);
            
            await query(`
                UPDATE users 
                SET ${updates.join(', ')}, updated_at = NOW()
                WHERE id = ?
            `, values);
            
            // Reload user data
            const updatedUser = await User.findById(this.id);
            Object.assign(this, updatedUser);
            
            return this;
            
        } catch (error) {
            console.error('Update user error:', error);
            throw error;
        }
    }

    // Delete user (soft delete)
    async delete() {
        try {
            await query(`
                UPDATE users 
                SET status = 'inactive', updated_at = NOW()
                WHERE id = ?
            `, [this.id]);
            
            this.status = 'inactive';
            return true;
            
        } catch (error) {
            console.error('Delete user error:', error);
            throw error;
        }
    }

    // Change password
    async changePassword(newPassword) {
        try {
            if (!newPassword || newPassword.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }
            
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            await query(`
                UPDATE users 
                SET password = ?, updated_at = NOW()
                WHERE id = ?
            `, [hashedPassword, this.id]);
            
            return true;
            
        } catch (error) {
            console.error('Change password error:', error);
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