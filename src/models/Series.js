// src/models/Series.js
const { query, queryOne, dbUtils } = require('../config/database');
const slugify = require('slugify');

class Series {
    constructor(data = {}) {
        this.id = data.id;
        this.title = data.title;
        this.slug = data.slug;
        this.description = data.description;
        this.status = data.status || 'active';
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    static async getAll() {
        try {
            const { query } = require('../config/database');
            const sql = `
                SELECT id, title, slug, description, status, created_at, updated_at
                FROM series 
                WHERE status = 'active' 
                ORDER BY title ASC
            `;
            
            const series = await query(sql);
            console.log(`Series.getAll - Found ${series.length} series`);
            return series.map(s => new Series(s));
        } catch (error) {
            console.error('Series.getAll error:', error);
            
            // Return demo series as fallback
            return [
                new Series({ id: 1, title: 'Learning Series', slug: 'learning-series', status: 'active' }),
                new Series({ id: 2, title: 'Tutorial Basics', slug: 'tutorial-basics', status: 'active' }),
                new Series({ id: 3, title: 'Advanced Topics', slug: 'advanced-topics', status: 'active' })
            ];
        }
    }

    static async findById(id) {
        try {
            const { queryOne } = require('../config/database');
            const sql = 'SELECT * FROM series WHERE id = ? AND status = "active"';
            const series = await queryOne(sql, [id]);
            return series ? new Series(series) : null;
        } catch (error) {
            console.error('Series.findById error:', error);
            return null;
        }
    }

    static async create(seriesData) {
        try {
            const { query } = require('../config/database');
            const slugify = require('slugify');
            
            const slug = slugify(seriesData.title, { lower: true, strict: true });
            
            const sql = `
                INSERT INTO series (title, slug, description, status)
                VALUES (?, ?, ?, ?)
            `;
            
            const result = await query(sql, [
                seriesData.title,
                slug,
                seriesData.description || null,
                seriesData.status || 'active'
            ]);
            
            return await this.findById(result.insertId);
        } catch (error) {
            console.error('Series.create error:', error);
            throw error;
        }
    }

    static async generateUniqueSlug(title, excludeId = null) {
        try {
            let baseSlug = slugify(title, { lower: true, strict: true });
            let slug = baseSlug;
            let counter = 1;
            
            while (true) {
                let sql = 'SELECT id FROM series WHERE slug = ?';
                const params = [slug];
                
                if (excludeId) {
                    sql += ' AND id != ?';
                    params.push(excludeId);
                }
                
                const existing = await queryOne(sql, params);
                
                if (!existing) {
                    break;
                }
                
                slug = `${baseSlug}-${counter}`;
                counter++;
            }
            
            return slug;
        } catch (error) {
            console.error('Generate unique slug error:', error);
            throw error;
        }
    }

    static async getCount() {
        try {
            const result = await queryOne('SELECT COUNT(*) as count FROM series');
            return result.count;
        } catch (error) {
            console.error('Get series count error:', error);
            return 0;
        }
    }
}

module.exports = Series;