// test-ads-data.js - Script untuk debug ads data
// Jalankan dengan: node test-ads-data.js

const path = require('path');

// Load environment
require('dotenv').config();

async function testAdsSystem() {
    console.log('🔍 Testing Ads System...');
    console.log('=====================================');
    
    try {
        // 1. Test database connection
        console.log('1. Testing database connection...');
        const { query, queryOne } = require('./src/config/database');
        
        const dbTest = await queryOne('SELECT 1 + 1 AS result');
        console.log('✅ Database connected:', dbTest);
        
        // 2. Test Ad model loading
        console.log('\n2. Testing Ad model...');
        const Ad = require('./src/models/Ad');
        console.log('✅ Ad model loaded');
        
        // 3. Test ads table exists
        console.log('\n3. Testing ads table...');
        const adCount = await Ad.getCount();
        console.log('✅ Ads table exists, total ads:', adCount);
        
        // 4. Test getting all ads
        console.log('\n4. Testing getAll method...');
        const allAdsResult = await Ad.getAll({ page: 1, limit: 100, status: null });
        console.log('✅ getAll result:');
        console.log('  - Total ads:', allAdsResult.data.length);
        console.log('  - Pagination:', allAdsResult.pagination);
        
        // 5. Test active ads
        console.log('\n5. Testing active ads...');
        const activeAds = allAdsResult.data.filter(ad => ad.is_active);
        console.log('✅ Active ads:', activeAds.length);
        
        activeAds.forEach((ad, index) => {
            console.log(`  ${index + 1}. ID: ${ad.id}, Title: ${ad.title}, Slot: ${ad.slot_position}, Type: ${ad.type}`);
        });
        
        // 6. Test slots data
        console.log('\n6. Testing getAdsBySlots...');
        const adsBySlots = await Ad.getAdsBySlots();
        console.log('✅ Ads by slots:');
        
        for (let i = 1; i <= 5; i++) {
            const slotAds = adsBySlots[i] || [];
            const activeSlotAds = slotAds.filter(ad => ad.is_active);
            console.log(`  Slot ${i}: ${slotAds.length} total, ${activeSlotAds.length} active`);
            
            if (activeSlotAds.length > 0) {
                activeSlotAds.forEach(ad => {
                    console.log(`    - "${ad.title}" (ID: ${ad.id}, Type: ${ad.type})`);
                });
            }
        }
        
        // 7. Test controller methods
        console.log('\n7. Testing AdController...');
        const AdController = require('./src/controllers/adController');
        console.log('✅ AdController loaded');
        
        // 8. Test summary
        console.log('\n8. Testing dashboard summary...');
        const summary = await Ad.getDashboardSummary();
        console.log('✅ Dashboard summary:', summary);
        
        // 9. Create sample ad if none exist
        if (adCount === 0) {
            console.log('\n9. No ads found, creating sample ad...');
            
            const sampleAd = {
                title: 'Sample Test Ad',
                description: 'This is a test advertisement',
                type: 'image',
                media_url: '/images/placeholder.jpg',
                click_url: 'https://example.com',
                open_new_tab: true,
                duration: 0,
                slot_position: 1,
                is_active: true,
                start_date: new Date(),
                end_date: null
            };
            
            try {
                const newAd = await Ad.create(sampleAd);
                console.log('✅ Sample ad created:', newAd.id);
                
                // Re-test after creating sample ad
                const newCount = await Ad.getCount();
                console.log('✅ New ad count:', newCount);
                
            } catch (createError) {
                console.error('❌ Failed to create sample ad:', createError.message);
            }
        }
        
        console.log('\n=====================================');
        console.log('🎉 Ads system test completed!');
        console.log('=====================================');
        
        // Summary
        console.log('\nSUMMARY:');
        console.log('- Database: ✅ Connected');
        console.log('- Ad Model: ✅ Working');
        console.log('- Ads Table: ✅ Exists');
        console.log(`- Total Ads: ${adCount}`);
        console.log(`- Active Ads: ${activeAds.length}`);
        console.log('- Controller: ✅ Loaded');
        
        if (activeAds.length === 0) {
            console.log('\n⚠️  ISSUE FOUND: No active ads in database!');
            console.log('   This is why slot overview shows empty.');
            console.log('   Solution: Create some ads via admin panel.');
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack trace:', error.stack);
        
        console.log('\n=====================================');
        console.log('❌ Ads system test FAILED!');
        console.log('=====================================');
        
        // Diagnosis
        console.log('\nDIAGNOSIS:');
        if (error.message.includes('Cannot find module')) {
            console.log('- Missing module or file');
            console.log('- Check if all files exist');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('- Database connection failed');
            console.log('- Check database server is running');
        } else if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log('- Ads table does not exist');
            console.log('- Run database migration');
        } else {
            console.log('- Unknown error, check logs above');
        }
        
        process.exit(1);
    }
}

// Additional test function for API routes
async function testAPIRoutes() {
    console.log('\n🌐 Testing API Routes...');
    
    const http = require('http');
    const PORT = process.env.PORT || 3000;
    
    const testEndpoints = [
        '/api/ads/status',
        '/api/ads/summary',
        '/api/ads/slots/overview'
    ];
    
    for (const endpoint of testEndpoints) {
        try {
            console.log(`Testing ${endpoint}...`);
            
            const options = {
                hostname: 'localhost',
                port: PORT,
                path: endpoint,
                method: 'GET'
            };
            
            const response = await new Promise((resolve, reject) => {
                const req = http.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => resolve({ status: res.statusCode, data: data }));
                });
                
                req.on('error', reject);
                req.setTimeout(5000, () => reject(new Error('Timeout')));
                req.end();
            });
            
            console.log(`  Status: ${response.status}`);
            
            if (response.status === 200) {
                const jsonData = JSON.parse(response.data);
                console.log(`  Success: ${jsonData.success}`);
            }
            
        } catch (apiError) {
            console.log(`  ❌ Failed: ${apiError.message}`);
        }
    }
}

// Run tests
console.log('🚀 Starting Ads System Tests...');
testAdsSystem().then(() => {
    console.log('\n📡 Testing API routes (if server is running)...');
    return testAPIRoutes();
}).catch(console.error);