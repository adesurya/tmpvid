// src/config/aws.js
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

class AWSS3Service {
    constructor() {
        this.s3 = null;
        this.bucketName = 'haluanvids';
        this.region = 'ap-southeast-2';
        this.accessKeyId = 'AKIAVD2WW2AFEB7XBHG4';
        this.secretAccessKey = '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';
        //this.cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;


        this.initializeS3();
    }

    initializeS3() {
        try {
            if (!this.isConfigured()) {
                console.log('⚠️ AWS S3 not configured - using local storage');
                return;
            }

            AWS.config.update({
                accessKeyId: this.accessKeyId,
                secretAccessKey: this.secretAccessKey,
                region: this.region
            });

            this.s3 = new AWS.S3({
                apiVersion: '2006-03-01',
                params: { Bucket: this.bucketName }
            });

            console.log('✅ AWS S3 initialized successfully');
        } catch (error) {
            console.error('❌ AWS S3 initialization failed:', error);
            this.s3 = null;
        }
    }

    isConfigured() {
        return !!(this.bucketName && this.accessKeyId && this.secretAccessKey);
    }

    // Upload file to S3
    async uploadToS3(file, folder = 'videos') {
        try {
            if (!this.s3) {
                throw new Error('S3 not configured');
            }

            const fileExtension = path.extname(file.originalname);
            const fileName = `${uuidv4()}${fileExtension}`;
            const key = `${folder}/${fileName}`;

            const uploadParams = {
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: 'public-read', // Make files publicly accessible
                CacheControl: 'max-age=31536000', // Cache for 1 year
                Metadata: {
                    'original-name': file.originalname,
                    'upload-timestamp': new Date().toISOString()
                }
            };

            // Add specific settings for video files
            if (file.mimetype.startsWith('video/')) {
                uploadParams.ContentDisposition = 'inline';
                uploadParams.Metadata['file-type'] = 'video';
            }

            console.log(`📤 Uploading to S3: ${key}`);

            const result = await this.s3.upload(uploadParams).promise();

            // Generate the URL
            let fileUrl;
            if (this.cloudfrontDomain) {
                // Use CloudFront domain if configured (for better performance)
                fileUrl = `https://${this.cloudfrontDomain}/${key}`;
            } else {
                // Use direct S3 URL
                fileUrl = result.Location;
            }

            console.log(`✅ S3 upload successful: ${fileUrl}`);

            return {
                success: true,
                url: fileUrl,
                key: key,
                bucket: this.bucketName,
                size: file.size,
                etag: result.ETag
            };

        } catch (error) {
            console.error('❌ S3 upload failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Delete file from S3
    async deleteFromS3(key) {
        try {
            if (!this.s3) {
                throw new Error('S3 not configured');
            }

            const deleteParams = {
                Bucket: this.bucketName,
                Key: key
            };

            await this.s3.deleteObject(deleteParams).promise();
            console.log(`✅ S3 delete successful: ${key}`);

            return {
                success: true,
                key: key
            };

        } catch (error) {
            console.error('❌ S3 delete failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get file info from S3
    async getFileInfo(key) {
        try {
            if (!this.s3) {
                throw new Error('S3 not configured');
            }

            const params = {
                Bucket: this.bucketName,
                Key: key
            };

            const headResult = await this.s3.headObject(params).promise();

            return {
                success: true,
                exists: true,
                size: headResult.ContentLength,
                lastModified: headResult.LastModified,
                contentType: headResult.ContentType,
                metadata: headResult.Metadata
            };

        } catch (error) {
            if (error.code === 'NotFound') {
                return {
                    success: true,
                    exists: false
                };
            }

            console.error('❌ S3 getFileInfo failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Extract S3 key from URL
    extractKeyFromUrl(url) {
        try {
            if (!url) return null;

            // Handle CloudFront URLs
            if (this.cloudfrontDomain && url.includes(this.cloudfrontDomain)) {
                return url.split(`${this.cloudfrontDomain}/`)[1];
            }

            // Handle direct S3 URLs
            if (url.includes('.amazonaws.com/')) {
                return url.split('.amazonaws.com/')[1];
            }

            // Handle s3:// protocol
            if (url.startsWith('s3://')) {
                return url.replace(`s3://${this.bucketName}/`, '');
            }

            return null;
        } catch (error) {
            console.error('❌ Failed to extract S3 key:', error);
            return null;
        }
    }

    // Generate pre-signed URL for temporary access
    async generatePresignedUrl(key, expiresIn = 3600) {
        try {
            if (!this.s3) {
                throw new Error('S3 not configured');
            }

            const params = {
                Bucket: this.bucketName,
                Key: key,
                Expires: expiresIn // URL expires in seconds
            };

            const url = await this.s3.getSignedUrlPromise('getObject', params);

            return {
                success: true,
                url: url,
                expiresIn: expiresIn
            };

        } catch (error) {
            console.error('❌ Failed to generate presigned URL:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // List files in S3 bucket
    async listFiles(prefix = '', maxKeys = 1000) {
        try {
            if (!this.s3) {
                throw new Error('S3 not configured');
            }

            const params = {
                Bucket: this.bucketName,
                Prefix: prefix,
                MaxKeys: maxKeys
            };

            const result = await this.s3.listObjectsV2(params).promise();

            return {
                success: true,
                files: result.Contents.map(file => ({
                    key: file.Key,
                    size: file.Size,
                    lastModified: file.LastModified,
                    etag: file.ETag
                })),
                isTruncated: result.IsTruncated,
                nextContinuationToken: result.NextContinuationToken
            };

        } catch (error) {
            console.error('❌ Failed to list S3 files:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Copy file within S3
    async copyFile(sourceKey, destinationKey) {
        try {
            if (!this.s3) {
                throw new Error('S3 not configured');
            }

            const copyParams = {
                Bucket: this.bucketName,
                CopySource: `${this.bucketName}/${sourceKey}`,
                Key: destinationKey
            };

            const result = await this.s3.copyObject(copyParams).promise();

            return {
                success: true,
                sourceKey: sourceKey,
                destinationKey: destinationKey,
                etag: result.ETag
            };

        } catch (error) {
            console.error('❌ S3 copy failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get S3 bucket information
    async getBucketInfo() {
        try {
            if (!this.s3) {
                throw new Error('S3 not configured');
            }

            // Get bucket location
            const locationResult = await this.s3.getBucketLocation({
                Bucket: this.bucketName
            }).promise();

            // Get bucket versioning
            const versioningResult = await this.s3.getBucketVersioning({
                Bucket: this.bucketName
            }).promise();

            return {
                success: true,
                bucket: this.bucketName,
                region: locationResult.LocationConstraint || 'us-east-1',
                versioning: versioningResult.Status || 'Disabled',
                configured: true
            };

        } catch (error) {
            console.error('❌ Failed to get bucket info:', error);
            return {
                success: false,
                error: error.message,
                configured: false
            };
        }
    }
}

// Create singleton instance
const s3Service = new AWSS3Service();

// Export convenience functions for backward compatibility
module.exports = {
    s3Service,
    uploadToS3: (file, folder) => s3Service.uploadToS3(file, folder),
    deleteFromS3: (key) => s3Service.deleteFromS3(key),
    isS3Configured: () => s3Service.isConfigured(),
    extractKeyFromUrl: (url) => s3Service.extractKeyFromUrl(url),
    generatePresignedUrl: (key, expiresIn) => s3Service.generatePresignedUrl(key, expiresIn),
    listFiles: (prefix, maxKeys) => s3Service.listFiles(prefix, maxKeys),
    copyFile: (sourceKey, destinationKey) => s3Service.copyFile(sourceKey, destinationKey),
    getBucketInfo: () => s3Service.getBucketInfo(),
    getFileInfo: (key) => s3Service.getFileInfo(key)
};