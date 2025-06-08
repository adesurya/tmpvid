// src/config/aws.js
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();

const S3_BUCKET = process.env.AWS_S3_BUCKET;
const S3_REGION = process.env.AWS_REGION || 'us-east-1';

// Upload file to S3
const uploadToS3 = async (file, folder = 'videos') => {
    try {
        const fileExtension = path.extname(file.originalname);
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}${fileExtension}`;
        
        const uploadParams = {
            Bucket: S3_BUCKET,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read'
        };
        
        const result = await s3.upload(uploadParams).promise();
        
        return {
            success: true,
            url: result.Location,
            key: result.Key,
            bucket: result.Bucket
        };
    } catch (error) {
        console.error('S3 upload error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Upload file stream to S3
const uploadStreamToS3 = async (fileStream, fileName, contentType, folder = 'videos') => {
    try {
        const key = `${folder}/${fileName}`;
        
        const uploadParams = {
            Bucket: S3_BUCKET,
            Key: key,
            Body: fileStream,
            ContentType: contentType,
            ACL: 'public-read'
        };
        
        const result = await s3.upload(uploadParams).promise();
        
        return {
            success: true,
            url: result.Location,
            key: result.Key,
            bucket: result.Bucket
        };
    } catch (error) {
        console.error('S3 stream upload error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Delete file from S3
const deleteFromS3 = async (key) => {
    try {
        const deleteParams = {
            Bucket: S3_BUCKET,
            Key: key
        };
        
        await s3.deleteObject(deleteParams).promise();
        
        return {
            success: true,
            message: 'File deleted successfully'
        };
    } catch (error) {
        console.error('S3 delete error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Get signed URL for private files
const getSignedUrl = (key, expiresIn = 3600) => {
    try {
        const params = {
            Bucket: S3_BUCKET,
            Key: key,
            Expires: expiresIn
        };
        
        const url = s3.getSignedUrl('getObject', params);
        return {
            success: true,
            url: url
        };
    } catch (error) {
        console.error('S3 signed URL error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Check if S3 is configured
const isS3Configured = () => {
    return !!(process.env.AWS_ACCESS_KEY_ID && 
              process.env.AWS_SECRET_ACCESS_KEY && 
              process.env.AWS_S3_BUCKET);
};

// Test S3 connection
const testS3Connection = async () => {
    if (!isS3Configured()) {
        console.warn('⚠️  S3 not configured, using local storage');
        return false;
    }
    
    try {
        await s3.headBucket({ Bucket: S3_BUCKET }).promise();
        console.log('✅ S3 connection successful');
        return true;
    } catch (error) {
        console.error('❌ S3 connection failed:', error.message);
        return false;
    }
};

// Get file info from S3
const getFileInfo = async (key) => {
    try {
        const params = {
            Bucket: S3_BUCKET,
            Key: key
        };
        
        const result = await s3.headObject(params).promise();
        
        return {
            success: true,
            size: result.ContentLength,
            lastModified: result.LastModified,
            contentType: result.ContentType,
            etag: result.ETag
        };
    } catch (error) {
        console.error('S3 file info error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// List files in S3 folder
const listFiles = async (prefix = '', maxKeys = 1000) => {
    try {
        const params = {
            Bucket: S3_BUCKET,
            Prefix: prefix,
            MaxKeys: maxKeys
        };
        
        const result = await s3.listObjectsV2(params).promise();
        
        return {
            success: true,
            files: result.Contents,
            count: result.KeyCount,
            isTruncated: result.IsTruncated
        };
    } catch (error) {
        console.error('S3 list files error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    s3,
    uploadToS3,
    uploadStreamToS3,
    deleteFromS3,
    getSignedUrl,
    isS3Configured,
    testS3Connection,
    getFileInfo,
    listFiles,
    S3_BUCKET,
    S3_REGION
};