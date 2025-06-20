// src/models/Category.js
const { query, queryOne, dbUtils } = require('../config/database');
const slugify = require('slugify');

class Category {
    constructor(data = {}) {
        this.id = data.id;
        this.name = data.name;
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
                    SELECT id, name, slug, description, status, created_at, updated_at
                    FROM categories 
                    WHERE status = 'active' 
                    ORDER BY name ASC
                `;
                
                const categories = await query(sql);
                console.log(`Category.getAll - Found ${categories.length} categories`);
                return categories.map(category => new Category(category));
            } catch (error) {
                console.error('Category.getAll error:', error);
                
                // Return demo categories as fallback
                return [
                    new Category({ id: 1, name: 'Entertainment', slug: 'entertainment', status: 'active' }),
                    new Category({ id: 2, name: 'Educational', slug: 'educational', status: 'active' }),
                    new Category({ id: 3, name: 'Music', slug: 'music', status: 'active' }),
                    new Category({ id: 4, name: 'Sports', slug: 'sports', status: 'active' }),
                    new Category({ id: 5, name: 'Technology', slug: 'technology', status: 'active' })
                ];
            }
        }

    static async findById(id) {
        try {
            const { queryOne } = require('../config/database');
            const sql = 'SELECT * FROM categories WHERE id = ? AND status = "active"';
            const category = await queryOne(sql, [id]);
            return category ? new Category(category) : null;
        } catch (error) {
            console.error('Category.findById error:', error);
            return null;
        }
    }

    static async findBySlug(slug) {
        try {
            const { queryOne } = require('../config/database');
            const sql = 'SELECT * FROM categories WHERE slug = ? AND status = "active"';
            const category = await queryOne(sql, [slug]);
            return category ? new Category(category) : null;
        } catch (error) {
            console.error('Category.findBySlug error:', error);
            return null;
        }
    }

    static async create(categoryData) {
        try {
            const { query } = require('../config/database');
            const slugify = require('slugify');
            
            const slug = slugify(categoryData.name, { lower: true, strict: true });
            
            const sql = `
                INSERT INTO categories (name, slug, description, status)
                VALUES (?, ?, ?, ?)
            `;
            
            const result = await query(sql, [
                categoryData.name,
                slug,
                categoryData.description || null,
                categoryData.status || 'active'
            ]);
            
            return await this.findById(result.insertId);
        } catch (error) {
            console.error('Category.create error:', error);
            throw error;
        }
    }

    static async update(id, updateData) {
        try {
            const { query } = require('../config/database');
            const slugify = require('slugify');
            
            const fields = [];
            const params = [];
            
            if (updateData.name) {
                fields.push('name = ?');
                params.push(updateData.name);
                
                // Update slug if name changed
                fields.push('slug = ?');
                params.push(slugify(updateData.name, { lower: true, strict: true }));
            }
            
            if (updateData.description !== undefined) {
                fields.push('description = ?');
                params.push(updateData.description);
            }
            
            if (updateData.status) {
                fields.push('status = ?');
                params.push(updateData.status);
            }
            
            if (fields.length === 0) {
                throw new Error('No fields to update');
            }
            
            params.push(id);
            
            const sql = `UPDATE categories SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`;
            await query(sql, params);
            
            return await this.findById(id);
        } catch (error) {
            console.error('Category.update error:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            const { query } = require('../config/database');
            const sql = 'UPDATE categories SET status = "deleted" WHERE id = ?';
            const result = await query(sql, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Category.delete error:', error);
            throw error;
        }
    }

    static async generateUniqueSlug(name, excludeId = null) {
        try {
            let baseSlug = slugify(name, { lower: true, strict: true });
            let slug = baseSlug;
            let counter = 1;
            
            while (true) {
                let sql = 'SELECT id FROM categories WHERE slug = ?';
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
            const result = await queryOne('SELECT COUNT(*) as count FROM categories');
            return result.count;
        } catch (error) {
            console.error('Get category count error:', error);
            return 0;
        }
    }
}

module.exports = Category;