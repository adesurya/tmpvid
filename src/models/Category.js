// src/models/Category.js
const { query, queryOne, dbUtils } = require('../config/database');
const slugify = require('slugify');

class Category {
    constructor(data = {}) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.slug = data.slug;
        this.image = data.image;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    static async getAll() {
        try {
            const categories = await query('SELECT * FROM categories ORDER BY name ASC');
            return categories.map(cat => new Category(cat));
        } catch (error) {
            console.error('Get all categories error:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const category = await queryOne('SELECT * FROM categories WHERE id = ?', [id]);
            return category ? new Category(category) : null;
        } catch (error) {
            console.error('Find category by ID error:', error);
            throw error;
        }
    }

    static async findBySlug(slug) {
        try {
            const category = await queryOne('SELECT * FROM categories WHERE slug = ?', [slug]);
            return category ? new Category(category) : null;
        } catch (error) {
            console.error('Find category by slug error:', error);
            throw error;
        }
    }

    static async create(categoryData) {
        try {
            const slug = await this.generateUniqueSlug(categoryData.name);
            
            const sql = 'INSERT INTO categories (name, description, slug, image) VALUES (?, ?, ?, ?)';
            const params = [
                categoryData.name,
                categoryData.description || null,
                slug,
                categoryData.image || null
            ];
            
            const result = await query(sql, params);
            return await this.findById(result.insertId);
        } catch (error) {
            console.error('Category creation error:', error);
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