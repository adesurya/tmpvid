// src/models/Series.js - FIXED VERSION
const { query, queryOne, dbUtils } = require('../config/database');
const slugify = require('slugify');

class Series {
    constructor(data = {}) {
        this.id = data.id;
        this.title = data.title;
        this.slug = data.slug;
        this.description = data.description;
        this.thumbnail = data.thumbnail;
        this.total_episodes = data.total_episodes || 0;
        this.category_id = data.category_id;
        this.status = data.status || 'active';
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.category_name = data.category_name; // For joins
    }

    static async getAll() {
        try {
            const sql = `
                SELECT 
                    s.id, s.title, s.slug, s.description, s.thumbnail, 
                    s.total_episodes, s.category_id, s.status, 
                    s.created_at, s.updated_at,
                    c.name as category_name
                FROM series s
                LEFT JOIN categories c ON s.category_id = c.id
                WHERE s.status = 'active' 
                ORDER BY s.title ASC
            `;
            
            const series = await query(sql);
            console.log(`Series.getAll - Found ${series.length} series`);
            return series.map(seriesItem => new Series(seriesItem));
        } catch (error) {
            console.error('Series.getAll error:', error);
            
            // Return demo series as fallback
            return [
                new Series({ 
                    id: 1, 
                    title: 'Tech Tutorials', 
                    slug: 'tech-tutorials', 
                    description: 'Learn programming and technology',
                    total_episodes: 10,
                    status: 'active',
                    category_name: 'Technology'
                }),
                new Series({ 
                    id: 2, 
                    title: 'Cooking Basics', 
                    slug: 'cooking-basics', 
                    description: 'Essential cooking skills for beginners',
                    total_episodes: 8,
                    status: 'active',
                    category_name: 'Educational'
                })
            ];
        }
    }

    static async findById(id) {
        try {
            const sql = `
                SELECT 
                    s.*, 
                    c.name as category_name
                FROM series s
                LEFT JOIN categories c ON s.category_id = c.id
                WHERE s.id = ? AND s.status = "active"
            `;
            const seriesItem = await queryOne(sql, [id]);
            return seriesItem ? new Series(seriesItem) : null;
        } catch (error) {
            console.error('Series.findById error:', error);
            return null;
        }
    }

    static async findBySlug(slug) {
        try {
            const sql = `
                SELECT 
                    s.*, 
                    c.name as category_name
                FROM series s
                LEFT JOIN categories c ON s.category_id = c.id
                WHERE s.slug = ? AND s.status = "active"
            `;
            const seriesItem = await queryOne(sql, [slug]);
            return seriesItem ? new Series(seriesItem) : null;
        } catch (error) {
            console.error('Series.findBySlug error:', error);
            return null;
        }
    }

    static async create(seriesData) {
        try {
            console.log('Series.create - Starting with data:', seriesData);
            
            // Validate required fields
            if (!seriesData.title || seriesData.title.trim().length === 0) {
                throw new Error('Series title is required');
            }
            
            // Generate unique slug
            const slug = await this.generateUniqueSlug(seriesData.title);
            console.log('Series.create - Generated slug:', slug);
            
            // Prepare data for insertion
            const insertData = {
                title: seriesData.title.trim(),
                slug: slug,
                description: seriesData.description ? seriesData.description.trim() : null,
                thumbnail: seriesData.thumbnail ? seriesData.thumbnail.trim() : null,
                category_id: seriesData.category_id || null,
                status: seriesData.status || 'active'
            };
            
            console.log('Series.create - Insert data:', insertData);
            
            const sql = `
                INSERT INTO series (title, slug, description, thumbnail, category_id, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
            `;
            
            const result = await query(sql, [
                insertData.title,
                insertData.slug,
                insertData.description,
                insertData.thumbnail,
                insertData.category_id,
                insertData.status
            ]);
            
            console.log('Series.create - Insert result:', result);
            
            if (!result.insertId) {
                throw new Error('Failed to insert series - no insertId returned');
            }
            
            // Get the created series
            const createdSeries = await this.findById(result.insertId);
            console.log('Series.create - Created series:', createdSeries);
            
            return createdSeries;
        } catch (error) {
            console.error('Series.create error:', error);
            throw error;
        }
    }

    static async update(id, updateData) {
        try {
            console.log('Series.update - Starting with ID:', id, 'Data:', updateData);
            
            const fields = [];
            const params = [];
            
            if (updateData.title && updateData.title.trim()) {
                fields.push('title = ?');
                params.push(updateData.title.trim());
                
                // Update slug if title changed
                const newSlug = await this.generateUniqueSlug(updateData.title.trim(), id);
                fields.push('slug = ?');
                params.push(newSlug);
            }
            
            if (updateData.description !== undefined) {
                fields.push('description = ?');
                params.push(updateData.description ? updateData.description.trim() : null);
            }
            
            if (updateData.thumbnail !== undefined) {
                fields.push('thumbnail = ?');
                params.push(updateData.thumbnail ? updateData.thumbnail.trim() : null);
            }
            
            if (updateData.category_id !== undefined) {
                fields.push('category_id = ?');
                params.push(updateData.category_id || null);
            }
            
            if (updateData.status) {
                fields.push('status = ?');
                params.push(updateData.status);
            }
            
            if (fields.length === 0) {
                throw new Error('No fields to update');
            }
            
            // Add updated_at and id
            fields.push('updated_at = NOW()');
            params.push(id);
            
            const sql = `UPDATE series SET ${fields.join(', ')} WHERE id = ?`;
            const result = await query(sql, params);
            
            console.log('Series.update - Update result:', result);
            
            if (result.affectedRows === 0) {
                throw new Error('No series found with the given ID');
            }
            
            return await this.findById(id);
        } catch (error) {
            console.error('Series.update error:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            const sql = 'UPDATE series SET status = "deleted", updated_at = NOW() WHERE id = ?';
            const result = await query(sql, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Series.delete error:', error);
            throw error;
        }
    }

    // FIXED: Generate unique slug function
    static async generateUniqueSlug(title, excludeId = null) {
        try {
            console.log('Generating unique slug for title:', title);
            
            let baseSlug = slugify(title, { 
                lower: true, 
                strict: true,
                remove: /[*+~.()'"!:@]/g // Remove special characters
            });
            
            let slug = baseSlug;
            let counter = 1;
            
            while (true) {
                let sql = 'SELECT id FROM series WHERE slug = ? AND status != "deleted"';
                const params = [slug];
                
                if (excludeId) {
                    sql += ' AND id != ?';
                    params.push(excludeId);
                }
                
                console.log('Checking slug:', slug, 'with SQL:', sql, 'params:', params);
                
                const existing = await queryOne(sql, params);
                console.log('Existing slug check result:', existing);
                
                if (!existing) {
                    console.log('Unique slug found:', slug);
                    break;
                }
                
                slug = `${baseSlug}-${counter}`;
                counter++;
                
                // Prevent infinite loop
                if (counter > 100) {
                    slug = `${baseSlug}-${Date.now()}`;
                    break;
                }
            }
            
            return slug;
        } catch (error) {
            console.error('Generate unique slug error:', error);
            // Fallback to timestamp-based slug
            const fallbackSlug = slugify(title, { lower: true, strict: true }) + '-' + Date.now();
            console.log('Using fallback slug:', fallbackSlug);
            return fallbackSlug;
        }
    }

    static async getCount() {
        try {
            const result = await queryOne('SELECT COUNT(*) as count FROM series WHERE status = "active"');
            return result ? result.count : 0;
        } catch (error) {
            console.error('Get series count error:', error);
            return 0;
        }
    }

    static async updateEpisodeCount(seriesId) {
        try {
            const sql = `
                UPDATE series 
                SET total_episodes = (
                    SELECT COUNT(*) 
                    FROM videos 
                    WHERE series_id = ? AND status = 'published'
                ),
                updated_at = NOW()
                WHERE id = ?
            `;
            await query(sql, [seriesId, seriesId]);
        } catch (error) {
            console.error('Update episode count error:', error);
            throw error;
        }
    }

    static async getSeriesWithCategories() {
        try {
            const sql = `
                SELECT 
                    s.id, s.title, s.slug, s.description, 
                    s.thumbnail, s.total_episodes, s.status,
                    s.created_at, s.updated_at,
                    c.id as category_id, c.name as category_name
                FROM series s
                LEFT JOIN categories c ON s.category_id = c.id
                WHERE s.status = 'active'
                ORDER BY s.title ASC
            `;
            
            const series = await query(sql);
            return series.map(seriesItem => new Series(seriesItem));
        } catch (error) {
            console.error('Get series with categories error:', error);
            return [];
        }
    }
}

module.exports = Series;