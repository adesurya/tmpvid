// src/utils/adsValidator.js
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class AdsValidator {
    constructor() {
        this.adsConfig = {
            allowedDomains: [
                'googlesyndication.com',
                'googletagmanager.com',
                'google-analytics.com',
                'googleads.g.doubleclick.net',
                'gstatic.com',
                'google.com'
            ],
            blockedPatterns: [
                /document\.write/gi,
                /eval\s*\(/gi,
                /innerHTML\s*=/gi,
                /outerHTML\s*=/gi,
                /javascript\s*:/gi,
                /on\w+\s*=/gi, // onclick, onload, etc.
                /<iframe[^>]*src\s*=\s*["'][^"']*(?!https?:\/\/(?:.*\.)?googlesyndication\.com|.*\.google\.com)/gi,
                /<script[^>]*src\s*=\s*["'][^"']*(?!https?:\/\/(?:.*\.)?googlesyndication\.com|.*\.googletagmanager\.com|.*\.google-analytics\.com)/gi
            ],
            requiredAdSensePatterns: [
                /data-ad-client\s*=\s*["']ca-pub-\d+["']/gi,
                /google_ad_client\s*=\s*["']ca-pub-\d+["']/gi
            ],
            requiredAnalyticsPatterns: [
                /gtag\(/gi,
                /UA-\d+-\d+/gi,
                /G-[A-Z0-9]+/gi,
                /GTM-[A-Z0-9]+/gi
            ]
        };
    }

    // Main validation function
    async validateAdsCode(code, type, options = {}) {
        const validation = {
            valid: false,
            errors: [],
            warnings: [],
            extractedData: {},
            securityScore: 0,
            recommendations: []
        };

        try {
            // 1. Basic security validation
            await this.validateSecurity(code, validation);
            
            // 2. Type-specific validation
            await this.validateByType(code, type, validation);
            
            // 3. Domain verification
            await this.validateDomains(code, validation);
            
            // 4. Check against ads.txt (if site verification enabled)
            if (options.verifySiteRegistration) {
                await this.verifyAdsTxtRegistration(code, validation);
            }
            
            // 5. Performance analysis
            this.analyzePerformance(code, validation);
            
            // 6. Final validation decision
            validation.valid = validation.errors.length === 0 && validation.securityScore >= 7;
            
        } catch (error) {
            validation.errors.push(`Validation error: ${error.message}`);
        }

        return validation;
    }

    // Security validation
    async validateSecurity(code, validation) {
        let securityScore = 10;

        // Check for blocked patterns
        for (const pattern of this.adsConfig.blockedPatterns) {
            if (pattern.test(code)) {
                validation.errors.push(`Security risk: Code contains potentially dangerous pattern: ${pattern.source}`);
                securityScore -= 2;
            }
        }

        // Check for suspicious URLs
        const urlMatches = code.match(/https?:\/\/[^\s"'<>]+/gi) || [];
        for (const url of urlMatches) {
            const domain = this.extractDomain(url);
            if (!this.adsConfig.allowedDomains.some(allowed => domain.includes(allowed))) {
                validation.warnings.push(`Suspicious external domain: ${domain}`);
                securityScore -= 1;
            }
        }

        // Check for inline JavaScript
        if (/<script[^>]*>[\s\S]*?<\/script>/gi.test(code)) {
            const inlineScripts = code.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
            for (const script of inlineScripts) {
                if (!script.includes('src=')) {
                    validation.warnings.push('Inline JavaScript detected - ensure it\'s from trusted source');
                    securityScore -= 0.5;
                }
            }
        }

        // Check for data collection practices
        if (/data-\w+/gi.test(code)) {
            const dataAttributes = code.match(/data-[\w-]+/gi) || [];
            validation.extractedData.dataAttributes = [...new Set(dataAttributes)];
        }

        validation.securityScore = Math.max(0, securityScore);
    }

    // Type-specific validation
    async validateByType(code, type, validation) {
        switch (type) {
            case 'google_adsense':
                this.validateAdSense(code, validation);
                break;
            case 'google_ads':
                this.validateGoogleAds(code, validation);
                break;
            case 'analytics':
                this.validateAnalytics(code, validation);
                break;
            case 'custom':
                this.validateCustomCode(code, validation);
                break;
            default:
                validation.warnings.push('Unknown ad type - performing generic validation only');
        }
    }

    // AdSense specific validation
    validateAdSense(code, validation) {
        // Check for required AdSense patterns
        const hasAdClient = this.adsConfig.requiredAdSensePatterns.some(pattern => pattern.test(code));
        
        if (!hasAdClient) {
            validation.errors.push('AdSense code must contain valid ca-pub-XXXXXXXX client ID');
            return;
        }

        // Extract Publisher ID
        const pubIdMatch = code.match(/ca-pub-(\d+)/);
        if (pubIdMatch) {
            validation.extractedData.publisherId = pubIdMatch[1];
        }

        // Extract Ad Slot
        const adSlotMatch = code.match(/data-ad-slot\s*=\s*["'](\d+)["']/);
        if (adSlotMatch) {
            validation.extractedData.adSlot = adSlotMatch[1];
        }

        // Extract Ad Format
        const adFormatMatch = code.match(/data-ad-format\s*=\s*["']([^"']+)["']/);
        if (adFormatMatch) {
            validation.extractedData.adFormat = adFormatMatch[1];
        }

        // Check for responsive ads
        if (code.includes('data-full-width-responsive="true"')) {
            validation.extractedData.responsive = true;
            validation.recommendations.push('Responsive ads detected - good for mobile optimization');
        }

        // Validate AdSense script source
        if (!code.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js')) {
            validation.errors.push('AdSense code must include official Google AdSense script');
        }

        // Check for auto ads
        if (code.includes('data-ad-client') && !code.includes('data-ad-slot')) {
            validation.extractedData.autoAds = true;
            validation.recommendations.push('Auto ads detected - ensure proper page layout');
        }
    }

    // Google Ads validation
    validateGoogleAds(code, validation) {
        // Check for Google Ads conversion tracking
        if (code.includes('googleads.g.doubleclick.net')) {
            validation.extractedData.conversionTracking = true;
        }

        // Check for Google Tag Manager
        if (code.includes('googletagmanager.com')) {
            const gtmIdMatch = code.match(/GTM-([A-Z0-9]+)/);
            if (gtmIdMatch) {
                validation.extractedData.gtmId = gtmIdMatch[1];
            }
        }

        // Validate required Google Ads elements
        if (!code.includes('gtag(') && !code.includes('googletagmanager.com')) {
            validation.errors.push('Google Ads code should include gtag library or Google Tag Manager');
        }
    }

    // Analytics validation
    validateAnalytics(code, validation) {
        const hasAnalyticsPattern = this.adsConfig.requiredAnalyticsPatterns.some(pattern => pattern.test(code));
        
        if (!hasAnalyticsPattern) {
            validation.errors.push('Analytics code must contain valid tracking ID (UA-XXXXX-X, G-XXXXXXXX, or GTM-XXXXXXX)');
            return;
        }

        // Extract tracking IDs
        const uaMatch = code.match(/UA-(\d+-\d+)/);
        if (uaMatch) {
            validation.extractedData.universalAnalyticsId = uaMatch[1];
        }

        const ga4Match = code.match(/G-([A-Z0-9]+)/);
        if (ga4Match) {
            validation.extractedData.ga4MeasurementId = ga4Match[1];
        }

        const gtmMatch = code.match(/GTM-([A-Z0-9]+)/);
        if (gtmMatch) {
            validation.extractedData.gtmId = gtmMatch[1];
        }

        // Check for privacy compliance
        if (code.includes('anonymize_ip')) {
            validation.extractedData.anonymizeIp = true;
            validation.recommendations.push('IP anonymization enabled - good for GDPR compliance');
        }

        // Check for enhanced ecommerce
        if (code.includes('ecommerce') || code.includes('purchase')) {
            validation.extractedData.ecommerce = true;
            validation.recommendations.push('E-commerce tracking detected');
        }
    }

    // Custom code validation
    validateCustomCode(code, validation) {
        validation.warnings.push('Custom code requires manual review for compliance');
        
        // Basic checks for custom code
        if (code.includes('<script')) {
            validation.recommendations.push('Ensure custom scripts are from trusted sources and comply with ad policies');
        }
        
        if (code.includes('iframe')) {
            validation.recommendations.push('Iframe content should be from verified advertising networks');
        }
    }

    // Domain validation
    async validateDomains(code, validation) {
        const urls = code.match(/https?:\/\/[^\s"'<>]+/gi) || [];
        const domains = urls.map(url => this.extractDomain(url));
        
        validation.extractedData.externalDomains = [...new Set(domains)];
        
        // Check if all domains are allowed
        const unauthorizedDomains = domains.filter(domain => 
            !this.adsConfig.allowedDomains.some(allowed => domain.includes(allowed))
        );
        
        if (unauthorizedDomains.length > 0) {
            validation.warnings.push(`Unauthorized domains detected: ${unauthorizedDomains.join(', ')}`);
        }
    }

    // Verify ads.txt registration
    async verifyAdsTxtRegistration(code, validation) {
        try {
            const projectRoot = path.resolve(__dirname, '../../');
            const adsTxtPath = path.join(projectRoot, 'public', 'ads.txt');
            
            let adsTxtContent = '';
            try {
                adsTxtContent = await fs.readFile(adsTxtPath, 'utf8');
                validation.extractedData.adsTxtExists = true;
            } catch (error) {
                validation.warnings.push('ads.txt file not found - required for AdSense approval');
                validation.extractedData.adsTxtExists = false;
                return;
            }

            // Extract publisher ID from code
            const pubIdMatch = code.match(/ca-pub-(\d+)/);
            if (pubIdMatch) {
                const publisherId = pubIdMatch[1];
                
                // Check if publisher ID is in ads.txt
                if (adsTxtContent.includes(`google.com, pub-${publisherId}`)) {
                    validation.extractedData.adsTxtRegistered = true;
                    validation.recommendations.push('Publisher ID found in ads.txt - good for monetization');
                } else {
                    validation.warnings.push(`Publisher ID pub-${publisherId} not found in ads.txt`);
                    validation.extractedData.adsTxtRegistered = false;
                }
            }

        } catch (error) {
            validation.warnings.push(`ads.txt verification failed: ${error.message}`);
        }
    }

    // Performance analysis
    analyzePerformance(code, validation) {
        const codeSize = code.length;
        validation.extractedData.codeSize = codeSize;

        if (codeSize > 5000) {
            validation.warnings.push('Large code size may impact page load performance');
        }

        // Check for async loading
        if (code.includes('async') || code.includes('defer')) {
            validation.recommendations.push('Async loading detected - good for performance');
        } else if (code.includes('<script')) {
            validation.recommendations.push('Consider using async loading for better performance');
        }

        // Check for lazy loading
        if (code.includes('data-ad-lazy') || code.includes('loading="lazy"')) {
            validation.recommendations.push('Lazy loading detected - excellent for performance');
        }
    }

    // Generate ads.txt content
    async generateAdsTxt(publisherId, options = {}) {
        const adsTxtLines = [
            `# ads.txt file for ${options.domain || 'your-domain.com'}`,
            `# Generated on ${new Date().toISOString()}`,
            '',
            '# Google AdSense',
            `google.com, pub-${publisherId}, DIRECT, f08c47fec0942fa0`,
            '',
            '# Additional networks can be added here',
            '# Format: domain, publisher_id, relationship, certification_authority_id'
        ];

        if (options.additionalNetworks) {
            adsTxtLines.push('');
            adsTxtLines.push('# Additional advertising networks');
            options.additionalNetworks.forEach(network => {
                adsTxtLines.push(`${network.domain}, ${network.publisherId}, ${network.relationship}, ${network.certificationId || ''}`);
            });
        }

        return adsTxtLines.join('\n');
    }

    // Auto-create ads.txt
    async createAdsTxt(publisherId, options = {}) {
        try {
            const projectRoot = path.resolve(__dirname, '../../');
            const publicDir = path.join(projectRoot, 'public');
            const adsTxtPath = path.join(publicDir, 'ads.txt');

            // Ensure public directory exists
            try {
                await fs.access(publicDir);
            } catch {
                await fs.mkdir(publicDir, { recursive: true });
            }

            const adsTxtContent = await this.generateAdsTxt(publisherId, options);
            await fs.writeFile(adsTxtPath, adsTxtContent, 'utf8');

            return {
                success: true,
                path: adsTxtPath,
                content: adsTxtContent,
                message: 'ads.txt file created successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to create ads.txt file'
            };
        }
    }

    // Utility functions
    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return url;
        }
    }

    // Generate security hash for code tracking
    generateCodeHash(code) {
        return crypto.createHash('sha256').update(code).digest('hex').substring(0, 16);
    }

    // Check if code has been modified
    validateCodeIntegrity(originalCode, currentCode) {
        return this.generateCodeHash(originalCode) === this.generateCodeHash(currentCode);
    }
}

module.exports = AdsValidator;