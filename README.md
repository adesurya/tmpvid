# Health check
curl http://localhost:3000/api/health

# Get videos feed
curl http://localhost:3000/api/videos/feed

# Get categories
curl http://localhost:3000/api/categories


Frontend: http://localhost:3000
Admin Login: http://localhost:3000/admin/login

Username: admin
Password: admin123


Admin Dashboard: http://localhost:3000/admin


✅ GET /api/public/feed - Video feed dengan pagination
✅ GET /api/public/rss - RSS feed format XML
✅ GET /api/public/videos/{slug} - Single video detail
✅ GET /api/public/categories - All categories
✅ GET /api/public/stats - Platform statistics
✅ GET /api/public/docs - API documentation


🎯 Cara Menggunakan:

Login admin: /admin/login (admin/admin123)
Kelola iklan: /admin/ads - tambah kode AdSense/Google Ads
Monitor API: /admin/api-dashboard - lihat statistik dan test endpoints
Akses API publik: /api/public/docs - dokumentasi lengkap
RSS Feed: /api/public/rss - untuk content syndication