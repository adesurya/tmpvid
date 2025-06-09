// Save this as: src/controllers/publicApiController.js
const Video = require('../models/Video');
const Category = require('../models/Category');
const { query } = require('../config/database');

class PublicApiController {
    // Get public video feed (without auth)
    static async getPublicFeed(req, res) {
        try {
            const { 
                page = 1, 
                limit = 20, 
                category = null, 
                sort = 'latest',
                format = 'json'
            } = req.query;
            
            let sql = `
                SELECT v.id, v.title, v.description, v.slug, v.video_url, v.thumbnail,
                       v.duration, v.views_count, v.likes_count, v.shares_count,
                       v.video_quality, v.created_at, v.updated_at,
                       c.name as category_name, c.slug as category_slug,
                       u.username
                FROM videos v
                LEFT JOIN categories c ON v.category_id = c.id
                LEFT JOIN users u ON v.user_id = u.id
                WHERE v.status = 'published'
            `;
            
            const params = [];
            
            if (category) {
                sql += ' AND (c.slug = ? OR c.name = ?)';
                params.push(category, category);
            }
            
            // Sorting
            switch (sort) {
                case 'popular':
                    sql += ' ORDER BY v.views_count DESC, v.created_at DESC';
                    break;
                case 'trending':
                    sql += ' ORDER BY (v.views_count + v.likes_count + v.shares_count) DESC, v.created_at DESC';
                    break;
                case 'most_liked':
                    sql += ' ORDER BY v.likes_count DESC, v.created_at DESC';
                    break;
                case 'oldest':
                    sql += ' ORDER BY v.created_at ASC';
                    break;
                default: // latest
                    sql += ' ORDER BY v.created_at DESC';
            }
            
            // Pagination
            const offset = (parseInt(page) - 1) * parseInt(limit);
            sql += ` LIMIT ? OFFSET ?`;
            params.push(parseInt(limit), offset);
            
            // Get videos
            const videos = await query(sql, params);
            
            // Get total count
            let countSql = `
                SELECT COUNT(*) as total
                FROM videos v
                LEFT JOIN categories c ON v.category_id = c.id
                WHERE v.status = 'published'
            `;
            
            const countParams = [];
            if (category) {
                countSql += ' AND (c.slug = ? OR c.name = ?)';
                countParams.push(category, category);
            }
            
            const countResult = await query(countSql, countParams);
            const total = countResult[0]?.total || 0;
            const totalPages = Math.ceil(total / parseInt(limit));
            
            // Format response
            const response = {
                success: true,
                data: videos.map(video => ({
                    id: video.id,
                    title: video.title,
                    description: video.description,
                    slug: video.slug,
                    video_url: video.video_url,
                    thumbnail: video.thumbnail,
                    duration: video.duration,
                    views_count: video.views_count || 0,
                    likes_count: video.likes_count || 0,
                    shares_count: video.shares_count || 0,
                    video_quality: video.video_quality,
                    created_at: video.created_at,
                    updated_at: video.updated_at,
                    category: video.category_name ? {
                        name: video.category_name,
                        slug: video.category_slug
                    } : null,
                    author: video.username || null,
                    urls: {
                        web: `${req.protocol}://${req.get('host')}/video/${video.slug}`,
                        embed: `${req.protocol}://${req.get('host')}/embed/${video.slug}`,
                        api: `${req.protocol}://${req.get('host')}/api/public/videos/${video.slug}`
                    }
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    totalPages: totalPages,
                    hasNext: parseInt(page) < totalPages,
                    hasPrev: parseInt(page) > 1
                },
                meta: {
                    generated_at: new Date().toISOString(),
                    api_version: '1.0',
                    sort: sort,
                    category: category
                }
            };
            
            // Handle different response formats
            if (format === 'rss') {
                return this.generateRSSFeed(req, res, response.data, {
                    title: 'VideoApp - Latest Videos',
                    description: 'Latest videos from VideoApp platform',
                    category: category
                });
            }
            
            res.json(response);
            
        } catch (error) {
            console.error('Public feed error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get public feed',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }
    
    // Get single video (public)
    static async getPublicVideo(req, res) {
        try {
            const { slug } = req.params;
            
            const sql = `
                SELECT v.*, c.name as category_name, c.slug as category_slug, u.username
                FROM videos v
                LEFT JOIN categories c ON v.category_id = c.id
                LEFT JOIN users u ON v.user_id = u.id
                WHERE v.slug = ? AND v.status = 'published'
            `;
            
            const result = await query(sql, [slug]);
            
            if (result.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Video not found'
                });
            }
            
            const video = result[0];
            
            res.json({
                success: true,
                data: {
                    id: video.id,
                    title: video.title,
                    description: video.description,
                    slug: video.slug,
                    video_url: video.video_url,
                    thumbnail: video.thumbnail,
                    duration: video.duration,
                    views_count: video.views_count || 0,
                    likes_count: video.likes_count || 0,
                    shares_count: video.shares_count || 0,
                    video_quality: video.video_quality,
                    created_at: video.created_at,
                    updated_at: video.updated_at,
                    category: video.category_name ? {
                        name: video.category_name,
                        slug: video.category_slug
                    } : null,
                    author: video.username || null,
                    urls: {
                        web: `${req.protocol}://${req.get('host')}/video/${video.slug}`,
                        embed: `${req.protocol}://${req.get('host')}/embed/${video.slug}`,
                        api: `${req.protocol}://${req.get('host')}/api/public/videos/${video.slug}`
                    }
                }
            });
            
        } catch (error) {
            console.error('Get public video error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get video'
            });
        }
    }
    
    // Get public categories
    static async getPublicCategories(req, res) {
        try {
            const categories = await query(`
                SELECT c.*, COUNT(v.id) as video_count
                FROM categories c
                LEFT JOIN videos v ON c.id = v.category_id AND v.status = 'published'
                GROUP BY c.id, c.name, c.description, c.slug, c.image, c.created_at, c.updated_at
                ORDER BY c.name ASC
            `);
            
            res.json({
                success: true,
                data: categories.map(category => ({
                    id: category.id,
                    name: category.name,
                    description: category.description,
                    slug: category.slug,
                    image: category.image,
                    video_count: category.video_count || 0,
                    created_at: category.created_at,
                    urls: {
                        web: `${req.protocol}://${req.get('host')}/category/${category.slug}`,
                        api: `${req.protocol}://${req.get('host')}/api/public/feed?category=${category.slug}`
                    }
                }))
            });
            
        } catch (error) {
            console.error('Get public categories error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get categories'
            });
        }
    }
    
    // Get platform statistics
    static async getPublicStats(req, res) {
        try {
            const stats = await query(`
                SELECT 
                    COUNT(DISTINCT v.id) as total_videos,
                    COALESCE(SUM(v.views_count), 0) as total_views,
                    COALESCE(SUM(v.likes_count), 0) as total_likes,
                    COALESCE(SUM(v.shares_count), 0) as total_shares,
                    COUNT(DISTINCT c.id) as total_categories,
                    COUNT(DISTINCT u.id) as total_creators
                FROM videos v
                LEFT JOIN categories c ON v.category_id = c.id
                LEFT JOIN users u ON v.user_id = u.id
                WHERE v.status = 'published'
            `);
            
            const recentStats = await query(`
                SELECT 
                    COUNT(*) as videos_today,
                    COALESCE(SUM(views_count), 0) as views_today
                FROM videos
                WHERE status = 'published' 
                AND DATE(created_at) = CURDATE()
            `);
            
            res.json({
                success: true,
                data: {
                    overview: stats[0] || {
                        total_videos: 0,
                        total_views: 0,
                        total_likes: 0,
                        total_shares: 0,
                        total_categories: 0,
                        total_creators: 0
                    },
                    today: recentStats[0] || {
                        videos_today: 0,
                        views_today: 0
                    },
                    generated_at: new Date().toISOString()
                }
            });
            
        } catch (error) {
            console.error('Get public stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get statistics'
            });
        }
    }
    
    // Generate RSS feed
    static async generateRSSFeed(req, res, videos, options = {}) {
        try {
            const {
                title = 'VideoApp Feed',
                description = 'Latest videos from VideoApp',
                category = null
            } = options;
            
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const feedTitle = category ? `${title} - ${category}` : title;
            
            let rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
    <channel>
        <title><![CDATA[${feedTitle}]]></title>
        <description><![CDATA[${description}]]></description>
        <link>${baseUrl}</link>
        <atom:link href="${baseUrl}${req.originalUrl}" rel="self" type="application/rss+xml"/>
        <language>en-us</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <generator>VideoApp RSS Generator</generator>
`;
            
            videos.forEach(video => {
                const videoUrl = `${baseUrl}/video/${video.slug}`;
                const pubDate = new Date(video.created_at).toUTCString();
                
                rssXml += `
        <item>
            <title><![CDATA[${video.title}]]></title>
            <description><![CDATA[${video.description || video.title}]]></description>
            <link>${videoUrl}</link>
            <guid>${videoUrl}</guid>
            <pubDate>${pubDate}</pubDate>
            ${video.category ? `<category><![CDATA[${video.category.name}]]></category>` : ''}
            ${video.author ? `<author><![CDATA[${video.author}]]></author>` : ''}
            <media:content url="${video.video_url}" type="video/mp4" duration="${video.duration || 0}"/>
            ${video.thumbnail ? `<media:thumbnail url="${video.thumbnail}"/>` : ''}
            <media:description><![CDATA[${video.description || video.title}]]></media:description>
            <media:statistics views="${video.views_count || 0}"/>
        </item>`;
            });
            
            rssXml += `
    </channel>
</rss>`;
            
            res.set({
                'Content-Type': 'application/rss+xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
            });
            
            res.send(rssXml);
            
        } catch (error) {
            console.error('Generate RSS feed error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate RSS feed'
            });
        }
    }
    
    // API documentation endpoint
    static async getApiDocs(req, res) {
        try {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            
            const docs = {
                info: {
                    title: 'VideoApp Public API',
                    version: '1.0.0',
                    description: 'Public API for accessing VideoApp content',
                    base_url: `${baseUrl}/api/public`
                },
                endpoints: {
                    feed: {
                        url: '/feed',
                        method: 'GET',
                        description: 'Get paginated video feed',
                        parameters: {
                            page: 'Page number (default: 1)',
                            limit: 'Items per page (default: 20, max: 100)',
                            category: 'Filter by category slug or name',
                            sort: 'Sort order: latest, popular, trending, most_liked, oldest',
                            format: 'Response format: json, rss'
                        },
                        example: `${baseUrl}/api/public/feed?page=1&limit=10&sort=popular&format=json`
                    },
                    video: {
                        url: '/videos/{slug}',
                        method: 'GET',
                        description: 'Get single video by slug',
                        example: `${baseUrl}/api/public/videos/example-video-slug`
                    },
                    categories: {
                        url: '/categories',
                        method: 'GET',
                        description: 'Get all categories with video counts',
                        example: `${baseUrl}/api/public/categories`
                    },
                    stats: {
                        url: '/stats',
                        method: 'GET',
                        description: 'Get platform statistics',
                        example: `${baseUrl}/api/public/stats`
                    },
                    rss: {
                        url: '/feed?format=rss',
                        method: 'GET',
                        description: 'RSS feed of latest videos',
                        example: `${baseUrl}/api/public/feed?format=rss&category=technology`
                    }
                },
                usage_examples: {
                    javascript_fetch: `
// Get latest videos
fetch('${baseUrl}/api/public/feed?limit=5')
  .then(response => response.json())
  .then(data => console.log(data));

// Get specific video
fetch('${baseUrl}/api/public/videos/video-slug')
  .then(response => response.json())
  .then(data => console.log(data));
`,
                    curl: `
# Get feed
curl "${baseUrl}/api/public/feed?limit=5"

# Get RSS feed
curl "${baseUrl}/api/public/feed?format=rss"

# Get categories
curl "${baseUrl}/api/public/categories"
`
                },
                rate_limits: {
                    description: 'No authentication required. Rate limited to 1000 requests per 15 minutes per IP.',
                    headers: {
                        'X-RateLimit-Limit': 'Total requests allowed',
                        'X-RateLimit-Remaining': 'Remaining requests',
                        'X-RateLimit-Reset': 'Time when limit resets'
                    }
                }
            };
            
            res.json(docs);
            
        } catch (error) {
            console.error('Get API docs error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get API documentation'
            });
        }
    }
}

module.exports = PublicApiController;