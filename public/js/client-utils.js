// public/js/client-utils.js - Client-side utilities
// This file should be placed in public/js/client-utils.js

function getCorrectBaseUrl() {
    // Get current protocol and host
    const protocol = window.location.protocol; // 'http:' or 'https:'
    const host = window.location.host; // 'localhost:3000' or 'yourdomain.com'
    
    // Handle localhost specifically
    if (host.includes('localhost')) {
        return `http://${host}`; // Always use HTTP for localhost
    }
    
    // For production, respect the current protocol
    return `${protocol}//${host}`;
}

function constructApiUrl(endpoint) {
    const baseUrl = getCorrectBaseUrl();
    return `${baseUrl}${endpoint}`;
}

async function safeFetch(url, options = {}) {
    try {
        console.log('🌐 Making request to:', url);
        console.log('📋 Request options:', options);
        
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                // Add CSRF token if available
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        console.log('📨 Response status:', response.status);
        console.log('📨 Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Response error:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Response data:', data);
        
        return data;
    } catch (error) {
        console.error('❌ Fetch error:', error);
        
        // Handle different types of errors
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            throw new Error('Network error - please check your connection and try again');
        }
        
        if (error.message.includes('ECONNREFUSED')) {
            throw new Error('Server connection failed - please try again later');
        }
        
        if (error.message.includes('SSL') || error.message.includes('certificate')) {
            throw new Error('SSL/Certificate error - please contact support');
        }
        
        throw error;
    }
}

async function handleFormSubmission(formElement, endpoint) {
    const formData = new FormData(formElement);
    
    // Log form data for debugging
    console.log('📋 Form data entries:');
    for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
            console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
        } else {
            console.log(`  ${key}: ${value}`);
        }
    }
    
    const url = constructApiUrl(endpoint);
    
    return await safeFetch(url, {
        method: 'POST',
        body: formData
    });
}

const Environment = {
    isDevelopment: () => {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname.includes('dev');
    },
    
    isSecure: () => {
        return window.location.protocol === 'https:';
    },
    
    getBaseUrl: () => {
        return getCorrectBaseUrl();
    },
    
    log: (message, data = null) => {
        if (Environment.isDevelopment()) {
            console.log(`🔧 [DEV] ${message}`, data || '');
        }
    },
    
    error: (message, error = null) => {
        console.error(`❌ ${message}`, error || '');
    }
};

class NotificationManager {
    static show(message, type = 'info', duration = 5000) {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icon = this.getIcon(type);
        notification.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add styles if not already present
        this.ensureStyles();
        
        document.body.appendChild(notification);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);
        
        Environment.log(`Notification: ${type}`, message);
    }
    
    static getIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
    
    static ensureStyles() {
        if (document.getElementById('notification-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 500;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                animation: slideInRight 0.3s ease;
                max-width: 400px;
                min-width: 250px;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                padding: 2px 6px;
                border-radius: 3px;
                margin-left: auto;
                opacity: 0.8;
                transition: opacity 0.3s;
            }
            
            .notification-close:hover {
                opacity: 1;
                background: rgba(255,255,255,0.1);
            }
            
            .notification-success { background: #27ae60; }
            .notification-error { background: #e74c3c; }
            .notification-info { background: #3498db; }
            .notification-warning { background: #f39c12; }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

class FormValidator {
    static validateRequired(value, fieldName) {
        if (!value || value.toString().trim() === '') {
            throw new Error(`${fieldName} is required`);
        }
        return true;
    }
    
    static validateUrl(value, fieldName = 'URL') {
        if (!value) return true; // Allow empty if not required
        
        try {
            new URL(value);
            return true;
        } catch {
            throw new Error(`${fieldName} must be a valid URL`);
        }
    }
    
    static validateFile(file, options = {}) {
        const {
            maxSize = 50 * 1024 * 1024, // 50MB
            allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
                           'video/mp4', 'video/avi', 'video/mov', 'video/webm']
        } = options;
        
        if (!file) {
            throw new Error('Please select a file');
        }
        
        if (file.size > maxSize) {
            const maxSizeMB = (maxSize / 1024 / 1024).toFixed(0);
            throw new Error(`File size must be less than ${maxSizeMB}MB`);
        }
        
        if (!allowedTypes.includes(file.type)) {
            throw new Error('Please select a valid image or video file');
        }
        
        return true;
    }
    
    static validateForm(formElement, rules = {}) {
        const errors = [];
        const formData = new FormData(formElement);
        
        for (const [fieldName, rule] of Object.entries(rules)) {
            try {
                const value = formData.get(fieldName);
                
                if (rule.required) {
                    this.validateRequired(value, rule.label || fieldName);
                }
                
                if (rule.type === 'url' && value) {
                    this.validateUrl(value, rule.label || fieldName);
                }
                
                if (rule.type === 'file') {
                    const fileInput = formElement.querySelector(`input[name="${fieldName}"]`);
                    const file = fileInput?.files?.[0];
                    if (file) {
                        this.validateFile(file, rule.options);
                    } else if (rule.required) {
                        this.validateRequired(file, rule.label || fieldName);
                    }
                }
                
                if (rule.custom && typeof rule.custom === 'function') {
                    rule.custom(value, fieldName);
                }
            } catch (error) {
                errors.push({
                    field: fieldName,
                    message: error.message
                });
            }
        }
        
        if (errors.length > 0) {
            throw new Error(errors[0].message);
        }
        
        return true;
    }
}

function initializeEnhancedForm() {
    const form = document.getElementById('createAdForm');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            // Validate form
            FormValidator.validateForm(form, {
                title: { required: true, label: 'Title' },
                type: { required: true, label: 'Advertisement Type' },
                slot_position: { required: true, label: 'Slot Position' },
                click_url: { required: true, type: 'url', label: 'Click URL' },
                media_file: { 
                    required: true, 
                    type: 'file', 
                    label: 'Media File',
                    options: {
                        maxSize: 50 * 1024 * 1024,
                        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
                                     'video/mp4', 'video/avi', 'video/mov', 'video/webm']
                    }
                }
            });
            
            // Set loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            
            // Submit form
            const result = await handleFormSubmission(form, '/admin/ads');
            
            if (result.success) {
                NotificationManager.show('Advertisement created successfully!', 'success');
                
                // Redirect after delay
                setTimeout(() => {
                    window.location.href = Environment.getBaseUrl() + '/admin/ads';
                }, 1500);
            } else {
                throw new Error(result.message || 'Failed to create advertisement');
            }
            
        } catch (error) {
            Environment.error('Form submission failed:', error);
            NotificationManager.show(error.message, 'error');
            
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    Environment.log('Initializing enhanced form system');
    
    // Initialize enhanced form if present
    if (document.getElementById('createAdForm')) {
        initializeEnhancedForm();
    }
    
    // Log environment info
    Environment.log('Environment info', {
        isDevelopment: Environment.isDevelopment(),
        isSecure: Environment.isSecure(),
        baseUrl: Environment.getBaseUrl(),
        userAgent: navigator.userAgent
    });
});

// Global error handlers
window.addEventListener('error', function(event) {
    Environment.error('Global error:', event.error);
    
    // Don't show notification for script errors in production
    if (Environment.isDevelopment()) {
        NotificationManager.show('A script error occurred. Check console for details.', 'error');
    }
});

window.addEventListener('unhandledrejection', function(event) {
    Environment.error('Unhandled promise rejection:', event.reason);
    
    if (Environment.isDevelopment()) {
        NotificationManager.show('An async error occurred. Check console for details.', 'error');
    }
    
    // Prevent the default handling (which would log to console)
    event.preventDefault();
});

// Make utilities available globally
window.ClientUtils = {
    Environment,
    NotificationManager,
    FormValidator,
    safeFetch,
    handleFormSubmission,
    constructApiUrl,
    getCorrectBaseUrl
};