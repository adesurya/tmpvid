#!/usr/bin/env node
// scripts/migrate-ads.js - Manual migration script untuk ads table

const path = require('path');

// Add project root to require path
const projectRoot = path.resolve(__dirname, '..');
require('module').globalPaths.push(path.join(projectRoot, 'src'));

async function runMigration() {
    console.log('🚀 Starting Ads Table Migration...');
    console.log('=====================================');
    
    try {
        // Import required modules
        const { initDatabase } = require('../src/config/database');
        
        // Initialize database connection
        console.log('🔗 Connecting to database...');
        await initDatabase();
        console.log('✅ Database connected');
        
        // Import and run migration
        const AdsMigration = require('../src/utils/adsMigration');
        
        console.log('🔧 Running migration...');
        const success = await AdsMigration.runFullMigration();
        
        if (success) {
            console.log('');
            console.log('🎉 Migration completed successfully!');
            console.log('=====================================');
            console.log('✅ ads_settings table updated with validation columns');
            console.log('✅ Existing data migrated and validated');
            console.log('✅ Ready for enhanced ads management');
            console.log('');
            console.log('📝 Next steps:');
            console.log('1. Restart your server');
            console.log('2. Visit /admin/ads to test the enhanced features');
            console.log('3. Add new ads codes with automatic validation');
        } else {
            console.log('');
            console.log('❌ Migration failed!');
            console.log('=====================================');
            console.log('Please check the error messages above and try again.');
        }
        
    } catch (error) {
        console.log('');
        console.log('❌ Migration Error!');
        console.log('=====================================');
        console.error('Error details:', error.message);
        console.log('');
        console.log('💡 Troubleshooting:');
        console.log('1. Check if database is running');
        console.log('2. Verify database connection in .env file');
        console.log('3. Ensure you have proper database permissions');
        console.log('4. Try running: npm install mysql2');
    }
    
    // Exit process
    process.exit(0);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error.message);
    process.exit(1);
});

// Run migration
runMigration();