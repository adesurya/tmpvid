// src/database/connection.js - REQUIRED DATABASE CONNECTION
const mysql = require('mysql2/promise');

// Database configuration - ADJUST ACCORDING TO YOUR SETTINGS
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'video_platform',
    charset: 'utf8mb4',
    timezone: '+00:00',
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
};

let pool;

// Initialize connection pool
function initializeDatabase() {
    try {
        pool = mysql.createPool({
            ...dbConfig,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        
        console.log('✅ Database connection pool initialized');
        return pool;
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}

// Get database pool
function getPool() {
    if (!pool) {
        pool = initializeDatabase();
    }
    return pool;
}

// Execute query
async function query(sql, params = []) {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log(`🔍 Executing query: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`);
        console.log(`📊 Query params:`, params);
        
        const [rows] = await connection.execute(sql, params);
        
        console.log(`✅ Query executed successfully, returned ${Array.isArray(rows) ? rows.length : 1} rows`);
        return rows;
    } catch (error) {
        console.error('❌ Database query error:', {
            sql: sql.substring(0, 200),
            params: params,
            error: error.message,
            code: error.code,
            errno: error.errno
        });
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

// Execute query and return single result
async function queryOne(sql, params = []) {
    try {
        const results = await query(sql, params);
        return Array.isArray(results) && results.length > 0 ? results[0] : null;
    } catch (error) {
        console.error('❌ Database queryOne error:', error);
        throw error;
    }
}

// Execute transaction
async function transaction(callback) {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        console.log('🔄 Transaction started');
        
        // Create a wrapper object with transaction-aware query methods
        const transactionConnection = {
            query: async (sql, params = []) => {
                console.log(`🔍 Transaction query: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`);
                const [rows] = await connection.execute(sql, params);
                return rows;
            },
            queryOne: async (sql, params = []) => {
                const results = await transactionConnection.query(sql, params);
                return Array.isArray(results) && results.length > 0 ? results[0] : null;
            }
        };
        
        // Execute the callback with the transaction connection
        const result = await callback(transactionConnection);
        
        await connection.commit();
        console.log('✅ Transaction committed successfully');
        
        return result;
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
                console.log('🔄 Transaction rolled back due to error');
            } catch (rollbackError) {
                console.error('❌ Failed to rollback transaction:', rollbackError);
            }
        }
        
        console.error('❌ Transaction error:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

async function healthCheck() {
    try {
        const result = await query('SELECT 1 as healthy');
        return {
            healthy: true,
            message: 'Database connection is healthy',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('❌ Database health check failed:', error);
        return {
            healthy: false,
            message: `Database connection failed: ${error.message}`,
            error: error.code,
            timestamp: new Date().toISOString()
        };
    }
}

async function closePool() {
    try {
        await pool.end();
        console.log('✅ Database connection pool closed');
    } catch (error) {
        console.error('❌ Error closing database pool:', error);
    }
}

// Test database connection
async function testConnection() {
    try {
        const result = await query('SELECT 1 as test');
        console.log('✅ Database connection test successful');
        return true;
    } catch (error) {
        console.error('❌ Database connection test failed:', error);
        return false;
    }
}

// Close all connections
async function closeDatabase() {
    try {
        if (pool) {
            await pool.end();
            console.log('✅ Database connections closed');
        }
    } catch (error) {
        console.error('❌ Error closing database:', error);
    }
}

// Initialize on module load
initializeDatabase();

// Handle process termination
process.on('SIGINT', closePool);
process.on('SIGTERM', closePool);
process.on('exit', closePool);


module.exports = {
    query,
    queryOne,
    transaction,
    healthCheck,
    closePool,
    pool,
    testConnection,
    closeDatabase,
    getPool
};