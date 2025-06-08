// src/config/database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'video_platform',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    multipleStatements: true,
    // Disable prepared statements untuk menghindari error
    namedPlaceholders: false,
    execute: false
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// Initialize database
const initDatabase = async () => {
    try {
        await testConnection();
        
        // Create database if it doesn't exist
        const tempConfig = { ...dbConfig };
        delete tempConfig.database;
        
        const tempPool = mysql.createPool(tempConfig);
        await tempPool.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
        await tempPool.end();
        
        console.log(`✅ Database '${dbConfig.database}' ready`);
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        throw error;
    }
};

// Execute query with error handling - GUNAKAN query() alih-alih execute()
const query = async (sql, params = []) => {
    try {
        console.log('Executing SQL:', sql.replace(/\s+/g, ' ').trim());
        console.log('With params:', params);
        
        // Gunakan query() alih-alih execute() untuk menghindari prepared statement issues
        const [results] = await pool.query(sql, params);
        return results;
    } catch (error) {
        console.error('Database query error:', error);
        console.error('SQL was:', sql);
        console.error('Params were:', params);
        throw error;
    }
};

// Get single record
const queryOne = async (sql, params = []) => {
    try {
        const [results] = await pool.query(sql, params);
        return results[0] || null;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

// Transaction helper
const transaction = async (callback) => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// Database utilities
const dbUtils = {
    // Get table row count
    async getCount(table, where = '', params = []) {
        const sql = `SELECT COUNT(*) as count FROM ${table} ${where}`;
        const result = await queryOne(sql, params);
        return result.count;
    },
    
    // Check if record exists
    async exists(table, where, params = []) {
        const count = await this.getCount(table, where, params);
        return count > 0;
    },
    
    // Get paginated results
    async paginate(sql, params = [], page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const paginatedSql = `${sql} LIMIT ${limit} OFFSET ${offset}`;
        
        const [results, countResult] = await Promise.all([
            query(paginatedSql, params),
            query(`SELECT COUNT(*) as total FROM (${sql}) as count_query`, params)
        ]);
        
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);
        
        return {
            data: results,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }
};

module.exports = {
    pool,
    query,
    queryOne,
    transaction,
    initDatabase,
    testConnection,
    dbUtils
};