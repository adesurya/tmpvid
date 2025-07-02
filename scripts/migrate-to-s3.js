// scripts/migrate-to-s3.js - NEW FILE
const { isS3Configured } = require('../src/config/aws');
const Video = require('../src/models/Video');

async function migrateToS3() {
    console.log('🚀 Starting migration from local storage to AWS S3...\n');
    
    // Check if S3 is configured
    if (!isS3Configured()) {
        console.log('❌ S3 not configured. Please set up S3 first.');
        console.log('Run: npm run setup-s3');
        process.exit(1);
    }
    
    try {
        // Get all local videos
        console.log('📊 Analyzing local videos...');
        const localVideos = await Video.getVideosByStorageType('local');
        
        if (localVideos.data.length === 0) {
            console.log('✅ No local videos found to migrate.');
            process.exit(0);
        }
        
        console.log(`📹 Found ${localVideos.data.length} local videos to migrate.`);
        console.log('');
        
        // Show migration plan
        const totalSize = localVideos.data.reduce((sum, video) => sum + (video.file_size || 0), 0);
        console.log('Migration Plan:');
        console.log(`- Videos to migrate: ${localVideos.data.length}`);
        console.log(`- Total size: ${formatFileSize(totalSize)}`);
        console.log(`- Estimated time: ${estimateMigrationTime(totalSize)}`);
        console.log('');
        
        // Confirm migration
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        const confirmed = await new Promise((resolve) => {
            rl.question('Do you want to proceed with the migration? (y/N): ', (answer) => {
                rl.close();
                resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
            });
        });
        
        if (!confirmed) {
            console.log('Migration cancelled.');
            process.exit(0);
        }
        
        console.log('');
        console.log('🔄 Starting migration...');
        
        // Migrate videos in batches
        const videoIds = localVideos.data.map(video => video.id);
        const migrationOptions = {
            batchSize: 3, // Process 3 videos at a time
            deleteLocal: false, // Keep local files as backup initially
            skipExisting: true
        };
        
        const migrationResult = await Video.batchMigrateToS3(videoIds, migrationOptions);
        
        console.log('');
        console.log('📊 Migration Results:');
        console.log(`✅ Successfully migrated: ${migrationResult.migrated}`);
        console.log(`⏭️  Skipped (already in S3): ${migrationResult.skipped}`);
        console.log(`❌ Failed: ${migrationResult.failed}`);
        console.log(`📝 Total processed: ${migrationResult.total}`);
        
        if (migrationResult.errors.length > 0) {
            console.log('');
            console.log('❌ Migration Errors:');
            migrationResult.errors.forEach((error, index) => {
                console.log(`${index + 1}. Video ID ${error.video_id}: ${error.error}`);
            });
        }
        
        if (migrationResult.migrated > 0) {
            console.log('');
            console.log('✅ Migration completed successfully!');
            console.log('');
            console.log('Next steps:');
            console.log('1. Test video playback from the frontend');
            console.log('2. Verify videos are accessible in S3 console');
            console.log('3. Consider setting up CloudFront for better performance');
            console.log('4. Once verified, you can delete local files to save space');
            console.log('');
            console.log('To delete local files after verification:');
            console.log('node scripts/cleanup-local-files.js');
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

// Helper functions
function formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function estimateMigrationTime(totalBytes) {
    // Estimate based on average upload speed of 10 MB/s
    const avgSpeedMBps = 10;
    const totalMB = totalBytes / (1024 * 1024);
    const estimatedSeconds = totalMB / avgSpeedMBps;
    
    if (estimatedSeconds < 60) {
        return `${Math.round(estimatedSeconds)} seconds`;
    } else if (estimatedSeconds < 3600) {
        return `${Math.round(estimatedSeconds / 60)} minutes`;
    } else {
        const hours = Math.floor(estimatedSeconds / 3600);
        const minutes = Math.round((estimatedSeconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
}

// Run migration if script is called directly
if (require.main === module) {
    migrateToS3().catch(error => {
        console.error('❌ Migration script failed:', error.message);
        process.exit(1);
    });
}

module.exports = { migrateToS3 };