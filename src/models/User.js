// src/models/User.js
const { query, queryOne, dbUtils } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    constructor(data = {}) {
        this.id = data.id;
        this.username = data.username;
        this.email = data.email;
        this.password = data.password;
        this.role = data.role;
        this.profile_image = data.profile_image;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    static async findById(id) {
        try {
            const user = await queryOne('SELECT * FROM users WHERE id = ?', [id]);
            return user ? new User(user) : null;
        } catch (error) {
            console.error('Find user by ID error:', error);
            throw error;
        }
    }

    static async findByEmail(email) {
        try {
            const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
            return user ? new User(user) : null;
        } catch (error) {
            console.error('Find user by email error:', error);
            throw error;
        }
    }

    static async findByUsername(username) {
        try {
            const user = await queryOne('SELECT * FROM users WHERE username = ?', [username]);
            return user ? new User(user) : null;
        } catch (error) {
            console.error('Find user by username error:', error);
            throw error;
        }
    }

    static async create(userData) {
        try {
            const hashedPassword = await bcrypt.hash(userData.password, 12);
            
            const sql = 'INSERT INTO users (username, email, password, role, profile_image) VALUES (?, ?, ?, ?, ?)';
            const params = [
                userData.username,
                userData.email,
                hashedPassword,
                userData.role || 'user',
                userData.profile_image || null
            ];
            
            const result = await query(sql, params);
            return await this.findById(result.insertId);
        } catch (error) {
            console.error('User creation error:', error);
            throw error;
        }
    }

    async validatePassword(password) {
        try {
            return await bcrypt.compare(password, this.password);
        } catch (error) {
            console.error('Password validation error:', error);
            return false;
        }
    }

    static async getCount() {
        try {
            const result = await queryOne('SELECT COUNT(*) as count FROM users');
            return result.count;
        } catch (error) {
            console.error('Get user count error:', error);
            return 0;
        }
    }

    static async authenticate(identifier, password) {
        try {
            // Try to find user by username or email
            let user = await this.findByUsername(identifier);
            if (!user) {
                user = await this.findByEmail(identifier);
            }

            if (!user) {
                return null;
            }

            const isValid = await user.validatePassword(password);
            if (!isValid) {
                return null;
            }

            return user;
        } catch (error) {
            console.error('User authentication error:', error);
            return null;
        }
    }
}

module.exports = User;