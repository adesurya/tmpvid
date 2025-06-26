// src/scripts/migrate-users-table.js
// Script untuk menambahkan kolom yang hilang ke tabel users
const { query, queryOne } = require('../config/database');

async function migrateUsersTable() {
    try {
        console.log('🔧 Starting users table migration...');
        
        // 1. Check current table structure
        console.log('📋 Checking current table structure...');
        const columns = await query('SHOW COLUMNS FROM users');
        const columnNames = columns.map(col => col.Field);
        
        console.log('📋 Current columns:', columnNames);
        
        // 2. Check for missing columns
        const hasStatus = columnNames.includes('status');
        const hasRole = columnNames.includes('role');
        
        console.log('📋 Status column exists:', hasStatus);
        console.log('📋 Role column exists:', hasRole);
        
        // 3. Add missing columns
        if (!hasRole) {
            console.log('➕ Adding role column...');
            try {
                await query(`
                    ALTER TABLE users 
                    ADD COLUMN role ENUM('admin', 'user') DEFAULT 'user'
                    AFTER password
                `);
                console.log('✅ Role column added successfully');
                
                // Set existing users as 'user' role, except admin
                await query(`
                    UPDATE users 
                    SET role = CASE 
                        WHEN username = 'admin' THEN 'admin'
                        ELSE 'user'
                    END
                `);
                console.log('✅ Role values updated for existing users');
            } catch (error) {
                console.error('❌ Failed to add role column:', error.message);
            }
        }
        
        if (!hasStatus) {
            console.log('➕ Adding status column...');
            try {
                await query(`
                    ALTER TABLE users 
                    ADD COLUMN status ENUM('active', 'inactive', 'suspended') DEFAULT 'active'
                    ${hasRole ? 'AFTER role' : 'AFTER password'}
                `);
                console.log('✅ Status column added successfully');
                
                // Set all existing users as active
                await query(`UPDATE users SET status = 'active'`);
                console.log('✅ Status values updated for existing users');
            } catch (error) {
                console.error('❌ Failed to add status column:', error.message);
            }
        }
        
        // 4. Add indexes if they don't exist
        console.log('📋 Adding indexes...');
        try {
            // Check existing indexes
            const indexes = await query('SHOW INDEX FROM users');
            const indexNames = indexes.map(idx => idx.Key_name);
            
            if (!indexNames.includes('idx_username')) {
                await query('ALTER TABLE users ADD INDEX idx_username (username)');
                console.log('✅ Username index added');
            }
            
            if (!indexNames.includes('idx_email')) {
                await query('ALTER TABLE users ADD INDEX idx_email (email)');
                console.log('✅ Email index added');
            }
            
            if (hasRole && !indexNames.includes('idx_role')) {
                await query('ALTER TABLE users ADD INDEX idx_role (role)');
                console.log('✅ Role index added');
            }
            
            if (hasStatus && !indexNames.includes('idx_status')) {
                await query('ALTER TABLE users ADD INDEX idx_status (status)');
                console.log('✅ Status index added');
            }
        } catch (indexError) {
            console.warn('⚠️ Some indexes could not be added:', indexError.message);
        }
        
        // 5. Verify final structure
        console.log('🔍 Verifying final table structure...');
        const finalColumns = await query('SHOW COLUMNS FROM users');
        const finalColumnNames = finalColumns.map(col => col.Field);
        
        console.log('✅ Final table structure:');
        finalColumns.forEach(col => {
            console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
        });
        
        // 6. Ensure admin user exists with correct role
        console.log('👤 Ensuring admin user exists...');
        const adminUser = await queryOne('SELECT * FROM users WHERE username = ?', ['admin']);
        
        if (!adminUser) {
            console.log('👤 Creating admin user...');
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash('admin123', 12);
            
            let insertQuery = 'INSERT INTO users (username, email, password';
            let insertValues = ['admin', 'admin@localhost.com', hashedPassword];
            let valuePlaceholders = '?, ?, ?';
            
            if (finalColumnNames.includes('role')) {
                insertQuery += ', role';
                insertValues.push('admin');
                valuePlaceholders += ', ?';
            }
            
            if (finalColumnNames.includes('status')) {
                insertQuery += ', status';
                insertValues.push('active');
                valuePlaceholders += ', ?';
            }
            
            insertQuery += `) VALUES (${valuePlaceholders})`;
            
            await query(insertQuery, insertValues);
            console.log('✅ Admin user created');
        } else {
            console.log('✅ Admin user already exists');
            
            // Update admin role if needed
            if (finalColumnNames.includes('role') && adminUser.role !== 'admin') {
                await query('UPDATE users SET role = ? WHERE username = ?', ['admin', 'admin']);
                console.log('✅ Admin role updated');
            }
            
            // Update admin status if needed
            if (finalColumnNames.includes('status') && adminUser.status !== 'active') {
                await query('UPDATE users SET status = ? WHERE username = ?', ['active', 'admin']);
                console.log('✅ Admin status updated');
            }
        }
        
        console.log('🎉 Users table migration completed successfully!');
        
        return {
            success: true,
            message: 'Migration completed successfully',
            final_columns: finalColumnNames,
            changes_made: {
                role_added: !hasRole,
                status_added: !hasStatus,
                admin_verified: true
            }
        };
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateUsersTable()
        .then(result => {
            console.log('✅ Migration result:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateUsersTable };