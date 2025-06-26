// diagnostic.js - Jalankan dengan: node diagnostic.js
console.log('🔍 Starting Ads System Diagnostic...\n');

const fs = require('fs');
const path = require('path');

// 1. Check File Structure
console.log('📁 Checking File Structure:');
const filesToCheck = [
    'src/controllers/adController.js',
    'src/models/Ad.js', 
    'src/routes/adRoutes.js',
    'src/config/database.js',
    'views/admin/ads-create.ejs',
    'public/uploads/ads'
];

filesToCheck.forEach(filePath => {
    try {
        const exists = fs.existsSync(filePath);
        const isDir = exists && fs.statSync(filePath).isDirectory();
        console.log(`${exists ? '✅' : '❌'} ${filePath} ${isDir ? '(directory)' : '(file)'}`);
        
        if (exists && !isDir) {
            const stats = fs.statSync(filePath);
            console.log(`   Size: ${stats.size} bytes, Modified: ${stats.mtime.toISOString()}`);
        }
    } catch (error) {
        console.log(`❌ ${filePath} - Error: ${error.message}`);
    }
});

console.log('\n📦 Checking Dependencies:');
const dependencies = ['multer', 'joi', 'mysql2', 'bcrypt'];
dependencies.forEach(dep => {
    try {
        require.resolve(dep);
        console.log(`✅ ${dep} - installed`);
    } catch (error) {
        console.log(`❌ ${dep} - NOT INSTALLED`);
    }
});

console.log('\n🧪 Testing Module Imports:');

// Test AdController
console.log('\n--- Testing AdController ---');
try {
    console.log('Attempting to load src/controllers/adController.js...');
    const AdController = require('./src/controllers/adController');
    console.log('✅ AdController loaded successfully');
    console.log('✅ AdController type:', typeof AdController);
    
    // Check methods
    const methods = Object.getOwnPropertyNames(AdController);
    console.log('✅ Available methods:', methods.slice(0, 10)); // Show first 10
    
    // Check specific methods
    const requiredMethods = ['create', 'getAdminList', 'showCreateForm', 'getUploadMiddleware'];
    requiredMethods.forEach(method => {
        const hasMethod = typeof AdController[method] === 'function';
        console.log(`${hasMethod ? '✅' : '❌'} Method ${method}: ${hasMethod ? 'exists' : 'missing'}`);
    });
    
} catch (error) {
    console.log('❌ AdController failed to load');
    console.log('❌ Error:', error.message);
    console.log('❌ Stack trace:');
    console.log(error.stack);
}

// Test Ad Model
console.log('\n--- Testing Ad Model ---');
try {
    console.log('Attempting to load src/models/Ad.js...');
    const Ad = require('./src/models/Ad');
    console.log('✅ Ad model loaded successfully');
    console.log('✅ Ad type:', typeof Ad);
    
    const methods = Object.getOwnPropertyNames(Ad);
    console.log('✅ Available methods:', methods.slice(0, 10));
    
    const requiredMethods = ['create', 'findById', 'getAll', 'initializeTable'];
    requiredMethods.forEach(method => {
        const hasMethod = typeof Ad[method] === 'function';
        console.log(`${hasMethod ? '✅' : '❌'} Method ${method}: ${hasMethod ? 'exists' : 'missing'}`);
    });
    
} catch (error) {
    console.log('❌ Ad model failed to load');
    console.log('❌ Error:', error.message);
    console.log('❌ Stack trace:');
    console.log(error.stack);
}

// Test Database Connection
console.log('\n--- Testing Database Connection ---');
try {
    console.log('Attempting to load database config...');
    const dbConfig = require('./src/config/database');
    console.log('✅ Database config loaded');
    
    // Test query if available
    if (dbConfig.query && typeof dbConfig.query === 'function') {
        console.log('Testing database connection...');
        dbConfig.query('SELECT 1 as test')
            .then(() => console.log('✅ Database connection successful'))
            .catch(err => console.log('❌ Database connection failed:', err.message));
    }
    
} catch (error) {
    console.log('❌ Database config failed to load');
    console.log('❌ Error:', error.message);
}

// Test Upload Directory
console.log('\n--- Testing Upload Directory ---');
const uploadDir = path.join(__dirname, 'public/uploads/ads');
try {
    if (fs.existsSync(uploadDir)) {
        const stats = fs.statSync(uploadDir);
        console.log('✅ Upload directory exists');
        console.log('✅ Is directory:', stats.isDirectory());
        
        // Test write permission
        const testFile = path.join(uploadDir, 'test-write.txt');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log('✅ Directory is writable');
    } else {
        console.log('❌ Upload directory does not exist');
        console.log('🔧 Creating upload directory...');
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('✅ Upload directory created');
    }
} catch (error) {
    console.log('❌ Upload directory error:', error.message);
}

console.log('\n🎯 Summary and Recommendations:');
console.log('1. Check the output above for any ❌ errors');
console.log('2. Install missing dependencies with: npm install <package-name>');
console.log('3. Fix any file structure issues');
console.log('4. Fix any syntax errors in controller/model files');
console.log('5. After fixing, restart your server');

console.log('\n✅ Diagnostic completed!');
console.log('Save this output and fix the issues marked with ❌');