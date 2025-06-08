// src/controllers/adminController.js
const User = require('../models/User');
const Video = require('../models/Video');
const Category = require('../models/Category');
const Series = require('../models/Series');
const storageService = require('../services/storageService');

class AdminController {
    static async getDashboardStats(req, res) {
        try {
            // Get basic stats with fallback values
            const totalVideos = await Video.getCount?.() || 0;
            const totalUsers = await User.getCount?.() || 0;
            const totalCategories = await Category.getCount?.() || 0;
            const totalSeries = await Series.getCount?.() || 0;
            
            // Mock data for now
            const totalViews = 125000;
            const storageUsed = 2.5 * 1024 * 1024 * 1024; // 2.5GB
            const activeUsers = 1250;

            res.json({
                success: true,
                data: {
                    totalVideos,
                    totalUsers,
                    totalCategories,
                    totalSeries,
                    totalViews,
                    storageUsed,
                    activeUsers
                }
            });
        } catch (error) {
            console.error('Get dashboard stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get dashboard stats'
            });
        }
    }

    static async getUsers(req, res) {
        try {
            const { page = 1, limit = 20, search = '' } = req.query;
            
            // Mock implementation - replace with actual user query
            const users = [];
            const pagination = {
                page: parseInt(page),
                limit: parseInt(limit),
                total: 0,
                totalPages: 0,
                hasNext: false,
                hasPrev: false
            };

            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    data: users,
                    pagination: pagination
                });
            }
            
            res.render('admin/users', {
                title: 'Manage Users',
                users: users,
                pagination: pagination
            });
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get users'
            });
        }
    }

    static async createUser(req, res) {
        try {
            const { username, email, password, role } = req.body;
            
            // Validate input
            if (!username || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Username, email, and password are required'
                });
            }

            const user = await User.create({
                username,
                email,
                password,
                role: role || 'user'
            });

            res.json({
                success: true,
                data: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                },
                message: 'User created successfully'
            });
        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create user'
            });
        }
    }

    static async updateUser(req, res) {
        try {
            const { id } = req.params;
            
            res.json({
                success: true,
                message: 'User updated successfully'
            });
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update user'
            });
        }
    }

    static async deleteUser(req, res) {
        try {
            const { id } = req.params;
            
            res.json({
                success: true,
                message: 'User deleted successfully'
            });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete user'
            });
        }
    }

    static async getAnalyticsOverview(req, res) {
        try {
            // Mock analytics data
            const analytics = {
                viewsOverTime: [
                    { date: '2024-01-01', views: 1200 },
                    { date: '2024-01-02', views: 1500 },
                    { date: '2024-01-03', views: 1100 },
                    { date: '2024-01-04', views: 1800 },
                    { date: '2024-01-05', views: 2100 },
                    { date: '2024-01-06', views: 1900 },
                    { date: '2024-01-07', views: 2300 }
                ],
                uploadsOverTime: [
                    { date: '2024-01-01', uploads: 12 },
                    { date: '2024-01-02', uploads: 15 },
                    { date: '2024-01-03', uploads: 8 },
                    { date: '2024-01-04', uploads: 20 },
                    { date: '2024-01-05', uploads: 18 },
                    { date: '2024-01-06', uploads: 14 },
                    { date: '2024-01-07', uploads: 22 }
                ],
                topCategories: [
                    { name: 'Entertainment', count: 150 },
                    { name: 'Education', count: 120 },
                    { name: 'Music', count: 95 },
                    { name: 'Technology', count: 80 },
                    { name: 'Sports', count: 65 }
                ]
            };

            res.json({
                success: true,
                data: analytics
            });
        } catch (error) {
            console.error('Get analytics overview error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get analytics overview'
            });
        }
    }

    static async getVideoAnalytics(req, res) {
        try {
            const { timeframe = '7d' } = req.query;
            
            // Mock video analytics
            const analytics = {
                totalViews: 45000,
                averageViewDuration: 125, // seconds
                topVideos: [
                    { id: 1, title: 'Popular Video 1', views: 5000 },
                    { id: 2, title: 'Popular Video 2', views: 4500 },
                    { id: 3, title: 'Popular Video 3', views: 4200 }
                ],
                viewsByDevice: {
                    mobile: 65,
                    desktop: 30,
                    tablet: 5
                }
            };

            res.json({
                success: true,
                data: analytics
            });
        } catch (error) {
            console.error('Get video analytics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get video analytics'
            });
        }
    }

    static async getUserAnalytics(req, res) {
        try {
            // Mock user analytics
            const analytics = {
                totalUsers: 2500,
                activeUsers: 1250,
                newUsersToday: 25,
                userGrowth: [
                    { date: '2024-01-01', users: 2400 },
                    { date: '2024-01-02', users: 2420 },
                    { date: '2024-01-03', users: 2445 },
                    { date: '2024-01-04', users: 2465 },
                    { date: '2024-01-05', users: 2480 },
                    { date: '2024-01-06', users: 2495 },
                    { date: '2024-01-07', users: 2500 }
                ]
            };

            res.json({
                success: true,
                data: analytics
            });
        } catch (error) {
            console.error('Get user analytics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user analytics'
            });
        }
    }

    static async getSettings(req, res) {
        try {
            // Mock settings
            const settings = {
                siteName: 'Video Platform',
                siteDescription: 'A TikTok-like video platform',
                allowRegistration: true,
                requireEmailVerification: false,
                maxFileSize: '500MB',
                allowedVideoFormats: ['mp4', 'avi', 'mov'],
                storageType: process.env.STORAGE_TYPE || 'local',
                enableAnalytics: true
            };

            res.json({
                success: true,
                data: settings
            });
        } catch (error) {
            console.error('Get settings error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get settings'
            });
        }
    }

    static async updateSettings(req, res) {
        try {
            // Mock settings update
            res.json({
                success: true,
                message: 'Settings updated successfully'
            });
        } catch (error) {
            console.error('Update settings error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update settings'
            });
        }
    }

    // Login handler
    static async login(req, res) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                req.flash('error_msg', 'Username and password are required');
                return res.redirect('/admin/login');
            }

            const user = await User.authenticate(username, password);
            
            if (!user || user.role !== 'admin') {
                req.flash('error_msg', 'Invalid credentials or insufficient permissions');
                return res.redirect('/admin/login');
            }

            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            };

            res.redirect('/admin');
        } catch (error) {
            console.error('Login error:', error);
            req.flash('error_msg', 'Login failed. Please try again.');
            res.redirect('/admin/login');
        }
    }
}

module.exports = AdminController;