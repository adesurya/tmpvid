// scripts/init-database.js - Script to initialize database and create admin user
const User = require('../src/models/User');
const { initDatabase } = require('../src/config/database');

async function initializeDatabase() {
    try {
        console.log('🚀 Starting database initialization...');
        
        // Initialize database connection
        await initDatabase();
        console.log('✅ Database connection established');
        
        // Initialize User model (creates table and admin user)
        await User.initialize();
        console.log('✅ User model initialized');
        
        console.log('\n🎉 Database initialization completed successfully!');
        console.log('\n📋 Default Admin Credentials:');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('   URL: http://localhost:3000/admin/login');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    initializeDatabase();
}

module.exports = { initializeDatabase };