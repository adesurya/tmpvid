// src/models/Series.js
const { query, queryOne, dbUtils } = require('../config/database');
const slugify = require('slugify');

class Series {
    constructor(data = {}) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
        this.slug = data.slug;
        this.thumbnail = data.thumbnail;
        this.category_id = data.category_id;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    static async getAll() {
        try {
            const sql = `
                SELECT s.*, c.name as category_name 
                FROM series s 
                LEFT JOIN categories c ON s.category_id = c.id 
                ORDER BY s.title ASC
            `;
            const series = await query(sql);
            return series.map(s => new Series(s));
        } catch (error) {
            console.error('Get all series error:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const sql = `
                SELECT s.*, c.name as category_name 
                FROM series s 
                LEFT JOIN categories c ON s.category_id = c.id 
                WHERE s.id = ?
            `;
            const series = await queryOne(sql, [id]);
            return series ? new Series(series) : null;
        } catch (error) {
            console.error('Find series by ID error:', error);
            throw error;
        }
    }

    static async create(seriesData) {
        try {
            const slug = await this.generateUniqueSlug(seriesData.title);
            
            const sql = 'INSERT INTO series (title, description, slug, thumbnail, category_id) VALUES (?, ?, ?, ?, ?)';
            const params = [
                seriesData.title,
                seriesData.description || null,
                slug,
                seriesData.thumbnail || null,
                seriesData.category_id || null
            ];
            
            const result = await query(sql, params);
            return await this.findById(result.insertId);
        } catch (error) {
            console.error('Series creation error:', error);
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