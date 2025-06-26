// src/routes/debug/series.js - Debug routes for series troubleshooting
const express = require('express');
const router = express.Router();

// Test database connection
router.get('/test-db', async (req, res) => {
    try {
        const { query, queryOne } = require('../../config/database');
        
        // Test basic connection
        const connectionTest = await queryOne('SELECT 1 + 1 AS result');
        
        // Test series table
        const seriesTableTest = await queryOne('SELECT COUNT(*) as count FROM series');
        
        // Test categories table
        let categoriesTableTest = null;
        try {
            categoriesTableTest = await queryOne('SELECT COUNT(*) as count FROM categories');
        } catch (catError) {
            categoriesTableTest = { error: catError.message };
        }
        
        res.json({
            success: true,
            tests: {
                connection: connectionTest,
                series_table: seriesTableTest,
                categories_table: categoriesTableTest
            },
            message: 'Database tests completed'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Database test failed'
        });
    }
});

// Test series creation with detailed logging
router.post('/test-create', async (req, res) => {
    try {
        console.log('=== DEBUG SERIES CREATE TEST ===');
        console.log('Request body:', req.body);
        
        const Series = require('../../models/Series');
        
        // Test data
        const testData = {
            title: req.body.title || `Test Series ${Date.now()}`,
            description: req.body.description || 'This is a test series',
            thumbnail: req.body.thumbnail || null,
            category_id: req.body.category_id || null
        };
        
        console.log('Test data prepared:', testData);
        
        // Step by step creation
        console.log('Step 1: Generating slug...');
        const slug = await Series.generateUniqueSlug(testData.title);
        console.log('Generated slug:', slug);
        
        console.log('Step 2: Direct database insert...');
        const { query } = require('../../config/database');
        
        const insertSql = `
            INSERT INTO series (title, slug, description, thumbnail, category_id, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())
        `;
        
        const insertResult = await query(insertSql, [
            testData.title,
            slug,
            testData.description,
            testData.thumbnail,
            testData.category_id
        ]);
        
        console.log('Insert result:', insertResult);
        
        // Verify insertion
        const verifyResult = await query('SELECT * FROM series WHERE id = ?', [insertResult.insertId]);
        console.log('Verification result:', verifyResult);
        
        res.json({
            success: true,
            test_data: testData,
            generated_slug: slug,
            insert_result: insertResult,
            verification: verifyResult[0] || null,
            message: 'Series creation test completed successfully'
        });
        
    } catch (error) {
        console.error('Debug create test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            message: 'Series creation test failed'
        });
    }
});

// Test series controller directly
router.post('/test-controller', async (req, res) => {
    try {
        console.log('=== DEBUG SERIES CONTROLLER TEST ===');
        
        const SeriesController = require('../../controllers/seriesController');
        
        // Create mock response object
        const mockRes = {
            json: (data) => {
                console.log('Controller response:', data);
                res.json({
                    success: true,
                    controller_response: data,
                    message: 'Controller test completed'
                });
            },
            status: (code) => ({
                json: (data) => {
                    console.log('Controller error response:', code, data);
                    res.status(200).json({
                        success: false,
                        status_code: code,
                        controller_response: data,
                        message: 'Controller returned error'
                    });
                }
            })
        };
        
        // Test controller create method
        await SeriesController.create(req, mockRes);
        
    } catch (error) {
        console.error('Debug controller test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Controller test failed'
        });
    }
});

// Test API route directly
router.post('/test-api-route', async (req, res) => {
    try {
        console.log('=== DEBUG API ROUTE TEST ===');
        
        // Simulate the API route logic
        const { title, description, thumbnail, category_id } = req.body;
        
        if (!title || title.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Series title is required and must be at least 2 characters'
            });
        }
        
        const slugify = require('slugify');
        const { query, queryOne } = require('../../config/database');
        
        const slug = slugify(title, { lower: true, strict: true });
        
        const insertResult = await query(`
            INSERT INTO series (title, slug, description, thumbnail, category_id, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())
        `, [
            title.trim(),
            slug,
            description ? description.trim() : null,
            thumbnail ? thumbnail.trim() : null,
            category_id || null
        ]);
        
        // Get the created series
        const createdSeries = await queryOne(`
            SELECT 
                s.*, 
                c.name as category_name
            FROM series s
            LEFT JOIN categories c ON s.category_id = c.id
            WHERE s.id = ?
        `, [insertResult.insertId]);
        
        res.json({
            success: true,
            data: createdSeries,
            message: 'API route test - Series created successfully'
        });
        
    } catch (error) {
        console.error('Debug API route test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'API route test failed'
        });
    }
});

// Test frontend form submission
router.get('/test-form', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Series Creation Test Form</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                .form-group { margin-bottom: 15px; }
                label { display: block; margin-bottom: 5px; font-weight: bold; }
                input, textarea, select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
                button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
                button:hover { background: #0056b3; }
                .result { margin-top: 20px; padding: 15px; border-radius: 4px; }
                .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
                .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
            </style>
        </head>
        <body>
            <h2>Series Creation Test Form</h2>
            <form id="seriesForm">
                <div class="form-group">
                    <label>Title:</label>
                    <input type="text" name="title" required placeholder="Enter series title">
                </div>
                <div class="form-group">
                    <label>Description:</label>
                    <textarea name="description" rows="3" placeholder="Enter series description (optional)"></textarea>
                </div>
                <div class="form-group">
                    <label>Thumbnail URL:</label>
                    <input type="url" name="thumbnail" placeholder="https://example.com/image.jpg (optional)">
                </div>
                <div class="form-group">
                    <label>Category ID:</label>
                    <input type="number" name="category_id" placeholder="Enter category ID (optional)">
                </div>
                <button type="submit">Create Series</button>
            </form>
            
            <div id="result"></div>
            
            <script>
                document.getElementById('seriesForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const formData = new FormData(e.target);
                    const data = Object.fromEntries(formData);
                    
                    // Convert empty strings to null
                    Object.keys(data).forEach(key => {
                        if (data[key] === '') data[key] = null;
                    });
                    
                    const resultDiv = document.getElementById('result');
                    resultDiv.innerHTML = '<p>Creating series...</p>';
                    
                    try {
                        const response = await fetch('/api/series', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(data)
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                            resultDiv.innerHTML = \`
                                <div class="result success">
                                    <h3>Success!</h3>
                                    <p>\${result.message}</p>
                                    <pre>\${JSON.stringify(result.data, null, 2)}</pre>
                                </div>\`;
                        } else {
                            resultDiv.innerHTML = \`
                                <div class="result error">
                                    <h3>Error</h3>
                                    <p>\${result.message}</p>
                                </div>\`;
                        }
                    } catch (error) {
                        resultDiv.innerHTML = \`
                            <div class="result error">
                                <h3>Network Error</h3>
                                <p>\${error.message}</p>
                            </div>\`;
                    }
                });
            </script>
        </body>
        </html>
    `);
});

// Get series table structure
router.get('/table-structure', async (req, res) => {
    try {
        const { query } = require('../../config/database');
        
        const structure = await query('DESCRIBE series');
        const indexes = await query('SHOW INDEX FROM series');
        
        res.json({
            success: true,
            table_structure: structure,
            indexes: indexes,
            message: 'Series table structure retrieved'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to get table structure'
        });
    }
});

// Test all series operations
router.get('/full-test', async (req, res) => {
    try {
        console.log('=== FULL SERIES OPERATIONS TEST ===');
        
        const Series = require('../../models/Series');
        const { query } = require('../../config/database');
        
        const results = {
            step1_db_connection: null,
            step2_table_check: null,
            step3_create_series: null,
            step4_read_series: null,
            step5_update_series: null,
            step6_delete_series: null,
            step7_cleanup: null
        };
        
        // Step 1: Test database connection
        try {
            const connectionTest = await query('SELECT 1 + 1 AS result');
            results.step1_db_connection = { success: true, result: connectionTest };
        } catch (error) {
            results.step1_db_connection = { success: false, error: error.message };
        }
        
        // Step 2: Check series table
        try {
            const tableCheck = await query('SELECT COUNT(*) as count FROM series');
            results.step2_table_check = { success: true, count: tableCheck[0].count };
        } catch (error) {
            results.step2_table_check = { success: false, error: error.message };
        }
        
        // Step 3: Create test series
        let testSeriesId = null;
        try {
            const testSeries = await Series.create({
                title: `Debug Test Series ${Date.now()}`,
                description: 'This is a test series for debugging',
                thumbnail: null,
                category_id: null
            });
            testSeriesId = testSeries.id;
            results.step3_create_series = { success: true, data: testSeries };
        } catch (error) {
            results.step3_create_series = { success: false, error: error.message };
        }
        
        // Step 4: Read series
        if (testSeriesId) {
            try {
                const readSeries = await Series.findById(testSeriesId);
                results.step4_read_series = { success: true, data: readSeries };
            } catch (error) {
                results.step4_read_series = { success: false, error: error.message };
            }
        }
        
        // Step 5: Update series
        if (testSeriesId) {
            try {
                const updatedSeries = await Series.update(testSeriesId, {
                    title: `Updated Test Series ${Date.now()}`,
                    description: 'Updated description'
                });
                results.step5_update_series = { success: true, data: updatedSeries };
            } catch (error) {
                results.step5_update_series = { success: false, error: error.message };
            }
        }
        
        // Step 6: Delete series (soft delete)
        if (testSeriesId) {
            try {
                const deleteResult = await Series.delete(testSeriesId);
                results.step6_delete_series = { success: true, deleted: deleteResult };
            } catch (error) {
                results.step6_delete_series = { success: false, error: error.message };
            }
        }
        
        // Step 7: Cleanup - hard delete test series
        if (testSeriesId) {
            try {
                await query('DELETE FROM series WHERE id = ?', [testSeriesId]);
                results.step7_cleanup = { success: true, message: 'Test series cleaned up' };
            } catch (error) {
                results.step7_cleanup = { success: false, error: error.message };
            }
        }
        
        res.json({
            success: true,
            test_results: results,
            summary: {
                total_steps: Object.keys(results).length,
                successful_steps: Object.values(results).filter(r => r && r.success).length,
                failed_steps: Object.values(results).filter(r => r && !r.success).length
            },
            message: 'Full series operations test completed'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Full test failed'
        });
    }
});

module.exports = router;