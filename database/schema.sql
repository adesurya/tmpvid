-- Database Schema for Video Platform
-- Create database
CREATE DATABASE IF NOT EXISTS video_platform;
USE video_platform;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    profile_image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    slug VARCHAR(100) UNIQUE NOT NULL,
    image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Series table
CREATE TABLE series (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(255) UNIQUE NOT NULL,
    thumbnail VARCHAR(255),
    category_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Videos table
CREATE TABLE videos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(255) UNIQUE NOT NULL,
    video_url VARCHAR(500) NOT NULL,
    thumbnail VARCHAR(255),
    duration INT DEFAULT 0, -- in seconds
    file_size BIGINT DEFAULT 0, -- in bytes
    video_quality ENUM('360p', '720p', '1080p', '4K') DEFAULT '720p',
    storage_type ENUM('local', 's3') DEFAULT 'local',
    category_id INT,
    series_id INT,
    user_id INT,
    views_count INT DEFAULT 0,
    likes_count INT DEFAULT 0,
    shares_count INT DEFAULT 0,
    status ENUM('draft', 'published', 'private') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_category (category_id),
    INDEX idx_views (views_count),
    INDEX idx_created (created_at)
);

-- Video views tracking
CREATE TABLE video_views (
    id INT PRIMARY KEY AUTO_INCREMENT,
    video_id INT NOT NULL,
    user_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    watch_duration INT DEFAULT 0, -- in seconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_video_user (video_id, user_id),
    INDEX idx_created (created_at)
);

-- Video likes
CREATE TABLE video_likes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    video_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_like (video_id, user_id)
);

-- Video shares
CREATE TABLE video_shares (
    id INT PRIMARY KEY AUTO_INCREMENT,
    video_id INT NOT NULL,
    user_id INT,
    platform VARCHAR(50), -- 'facebook', 'twitter', 'whatsapp', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Tags table
CREATE TABLE tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Video tags junction table
CREATE TABLE video_tags (
    video_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (video_id, tag_id),
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Insert default admin user
INSERT INTO users (username, email, password, role) VALUES 
('admin', 'admin@example.com', '$2b$10$rQZ7fHPEZhSGKjqNVcJjJO1JY7bUUyJdaYEMKL1.aDHyKGJqYXEFG', 'admin');

-- Insert sample categories
INSERT INTO categories (name, description, slug) VALUES 
('Entertainment', 'Fun and entertaining videos', 'entertainment'),
('Education', 'Educational and learning content', 'education'),
('Music', 'Music videos and performances', 'music'),
('Sports', 'Sports highlights and content', 'sports'),
('Technology', 'Tech reviews and tutorials', 'technology'),
('Comedy', 'Funny and comedic content', 'comedy');

-- Insert sample series
INSERT INTO series (title, description, slug, category_id) VALUES 
('Daily Highlights', 'Best moments of the day', 'daily-highlights', 1),
('Tech Tips', 'Quick technology tips', 'tech-tips', 5),
('Music Sessions', 'Live music performances', 'music-sessions', 3);

-- Create indexes for better performance
CREATE INDEX idx_videos_engagement ON videos (views_count DESC, likes_count DESC, created_at DESC);
CREATE INDEX idx_video_views_video ON video_views (video_id, created_at DESC);
CREATE INDEX idx_video_search ON videos (title, description);

-- Create full-text search index
ALTER TABLE videos ADD FULLTEXT(title, description);