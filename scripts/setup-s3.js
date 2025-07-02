// scripts/setup-s3.js - NEW FILE
const { s3Service, getBucketInfo, isS3Configured } = require('../src/config/aws');

async function setupS3() {
    console.log('🚀 Setting up AWS S3 for video storage...\n');
    
    // Check if S3 is configured
    if (!isS3Configured()) {
        console.log('❌ S3 Configuration Missing!');
        console.log('Please add the following environment variables to your .env file:');
        console.log('');
        console.log('AWS_ACCESS_KEY_ID=your_access_key');
        console.log('AWS_SECRET_ACCESS_KEY=your_secret_key');
        console.log('AWS_REGION=us-east-1');
        console.log('AWS_S3_BUCKET_NAME=your-bucket-name');
        console.log('AWS_CLOUDFRONT_DOMAIN=your-domain.cloudfront.net (optional)');
        console.log('');
        console.log('For detailed setup instructions, visit:');
        console.log('https://docs.aws.amazon.com/AmazonS3/latest/userguide/creating-buckets-s3.html');
        process.exit(1);
    }
    
    console.log('✅ S3 Configuration Found');
    console.log(`Region: ${process.env.AWS_REGION}`);
    console.log(`Bucket: ${process.env.AWS_S3_BUCKET_NAME}`);
    if (process.env.AWS_CLOUDFRONT_DOMAIN) {
        console.log(`CloudFront: ${process.env.AWS_CLOUDFRONT_DOMAIN}`);
    }
    console.log('');
    
    // Test S3 connectivity
    console.log('🔍 Testing S3 connectivity...');
    try {
        const bucketInfo = await getBucketInfo();
        
        if (bucketInfo.success) {
            console.log('✅ S3 Connection Successful!');
            console.log(`Bucket: ${bucketInfo.bucket}`);
            console.log(`Region: ${bucketInfo.region}`);
            console.log(`Versioning: ${bucketInfo.versioning}`);
        } else {
            console.log('❌ S3 Connection Failed!');
            console.log(`Error: ${bucketInfo.error}`);
            console.log('');
            console.log('Common issues:');
            console.log('1. Invalid AWS credentials');
            console.log('2. Bucket does not exist');
            console.log('3. Insufficient permissions');
            console.log('4. Incorrect region');
            process.exit(1);
        }
    } catch (error) {
        console.log('❌ S3 Test Failed!');
        console.log(`Error: ${error.message}`);
        process.exit(1);
    }
    
    // Test file operations
    console.log('');
    console.log('🧪 Testing file operations...');
    
    try {
        // Create a test file
        const testFile = {
            buffer: Buffer.from('This is a test file for S3 upload'),
            originalname: 'test-upload.txt',
            mimetype: 'text/plain'
        };
        
        // Upload test file
        console.log('📤 Testing upload...');
        const uploadResult = await s3Service.uploadToS3(testFile, 'test');
        
        if (uploadResult.success) {
            console.log('✅ Upload test successful!');
            console.log(`Test file URL: ${uploadResult.url}`);
            
            // Test file info
            console.log('📋 Testing file info...');
            const fileInfo = await s3Service.getFileInfo(uploadResult.key);
            
            if (fileInfo.success && fileInfo.exists) {
                console.log('✅ File info test successful!');
                console.log(`File size: ${fileInfo.size} bytes`);
                console.log(`Content type: ${fileInfo.contentType}`);
            }
            
            // Clean up test file
            console.log('🧹 Cleaning up test file...');
            const deleteResult = await s3Service.deleteFromS3(uploadResult.key);
            
            if (deleteResult.success) {
                console.log('✅ Cleanup successful!');
            } else {
                console.log('⚠️ Cleanup failed, you may need to manually delete the test file');
            }
            
        } else {
            console.log('❌ Upload test failed!');
            console.log(`Error: ${uploadResult.error}`);
            process.exit(1);
        }
        
    } catch (error) {
        console.log('❌ File operations test failed!');
        console.log(`Error: ${error.message}`);
        process.exit(1);
    }
    
    // Success message
    console.log('');
    console.log('🎉 S3 Setup Complete!');
    console.log('');
    console.log('Your video platform is now configured to use AWS S3 for storage.');
    console.log('');
    console.log('Next steps:');
    console.log('1. Upload a test video through the admin panel');
    console.log('2. Verify the video is accessible from the frontend');
    console.log('3. Check the S3 console to confirm files are being stored');
    console.log('');
    console.log('Optional optimizations:');
    console.log('- Set up CloudFront for faster global delivery');
    console.log('- Configure S3 lifecycle policies for cost optimization');
    console.log('- Set up S3 Cross-Region Replication for redundancy');
    console.log('');
}

// Run setup if script is called directly
if (require.main === module) {
    setupS3().catch(error => {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    });
}

module.exports = { setupS3 };