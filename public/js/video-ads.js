// public/js/video-ads.js - Frontend integration untuk ads di video player
class VideoAdsManager {
    constructor() {
        this.currentVideoIndex = 0;
        this.adsEnabled = window.adsEnabled || false;
        this.adDisplayInterval = 3; // Show ad every 3 videos
        this.currentAd = null;
        
        console.log('🎬 VideoAdsManager initialized, ads enabled:', this.adsEnabled);
        
        if (this.adsEnabled) {
            this.initializeAds();
        }
    }

    // Initialize ads system
    initializeAds() {
        console.log('🔧 Initializing video ads system...');
        
        // Listen for video navigation events
        document.addEventListener('videoChanged', (event) => {
            this.handleVideoChange(event.detail);
        });
        
        // Listen for video player ready
        document.addEventListener('DOMContentLoaded', () => {
            this.setupAdContainers();
        });
    }

    // Setup ad containers in the page
    setupAdContainers() {
        const videoContainer = document.querySelector('.video-container') || document.querySelector('#video-player');
        
        if (!videoContainer) {
            console.warn('⚠️ Video container not found for ads');
            return;
        }

        // Create ad containers for different slots
        this.createAdContainer('before-video', videoContainer, 'beforebegin');
        this.createAdContainer('after-video', videoContainer, 'afterend');
        this.createAdContainer('overlay-ad', videoContainer, 'beforeend');
        
        console.log('✅ Ad containers created');
    }

    // Create individual ad container
    createAdContainer(id, reference, position) {
        const existingContainer = document.getElementById(id);
        if (existingContainer) {
            return existingContainer;
        }

        const adContainer = document.createElement('div');
        adContainer.id = id;
        adContainer.className = 'ad-container';
        adContainer.style.cssText = `
            display: none;
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            margin: 15px 0;
        `;
        
        reference.insertAdjacentElement(position, adContainer);
        return adContainer;
    }

    // Handle video change
    async handleVideoChange(videoData) {
        this.currentVideoIndex = videoData.index || 0;
        console.log(`📺 Video changed to index: ${this.currentVideoIndex}`);
        
        if (this.shouldShowAd()) {
            await this.loadAndShowAd();
        } else {
            this.hideAllAds();
        }
    }

    // Check if ad should be shown
    shouldShowAd() {
        return this.adsEnabled && (this.currentVideoIndex + 1) % this.adDisplayInterval === 0;
    }

    // Load and show ad
    async loadAndShowAd() {
        try {
            console.log('📥 Loading ad for video index:', this.currentVideoIndex);
            
            const response = await fetch(`/api/ads/feed?videoIndex=${this.currentVideoIndex}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success && data.showAd && data.data) {
                console.log('✅ Ad loaded:', data.data);
                this.currentAd = data.data;
                this.displayAd(data.data);
            } else {
                console.log('ℹ️ No ad to show:', data.message);
                this.hideAllAds();
            }
        } catch (error) {
            console.error('❌ Failed to load ad:', error);
            this.hideAllAds();
        }
    }

    // Display ad based on type
    displayAd(adData) {
        this.hideAllAds();
        
        // Determine slot position
        const slotPosition = adData.slot_position || 1;
        let containerId;
        
        switch (slotPosition) {
            case 1: // Header
                containerId = 'header-ad';
                break;
            case 2: // Before video
                containerId = 'before-video';
                break;
            case 3: // Sidebar
                containerId = 'sidebar-ad';
                break;
            case 4: // After video
                containerId = 'after-video';
                break;
            case 5: // Footer
                containerId = 'footer-ad';
                break;
            default:
                containerId = 'before-video';
        }
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`⚠️ Ad container ${containerId} not found`);
            return;
        }

        switch (adData.type) {
            case 'image':
                this.displayImageAd(container, adData);
                break;
            case 'video':
                this.displayVideoAd(container, adData);
                break;
            case 'google_ads':
                this.displayGoogleAd(container, adData);
                break;
            default:
                console.warn('⚠️ Unknown ad type:', adData.type);
        }
    }

    // Display image ad
    displayImageAd(container, adData) {
        const adHtml = `
            <div class="image-ad" data-ad-id="${adData.id}">
                <div class="ad-label">Advertisement</div>
                <a href="#" onclick="handleAdClick(${adData.id}, '${adData.click_url}', ${adData.open_new_tab}); return false;">
                    <img src="${adData.media_url}" alt="${adData.title}" style="max-width: 100%; height: auto; cursor: pointer;" />
                </a>
                <div class="ad-title" style="margin-top: 10px; font-weight: bold;">${adData.title}</div>
                ${adData.description ? `<div class="ad-description" style="color: #666; font-size: 14px;">${adData.description}</div>` : ''}
            </div>
        `;
        
        container.innerHTML = adHtml;
        container.style.display = 'block';
        
        console.log('🖼️ Image ad displayed');
    }

    // Display video ad
    displayVideoAd(container, adData) {
        const duration = adData.duration || 0;
        
        const adHtml = `
            <div class="video-ad" data-ad-id="${adData.id}">
                <div class="ad-label">Advertisement</div>
                <video controls ${duration > 0 ? 'preload="auto"' : ''} style="max-width: 100%; height: auto;" onclick="handleAdClick(${adData.id}, '${adData.click_url}', ${adData.open_new_tab})">
                    <source src="${adData.media_url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <div class="ad-title" style="margin-top: 10px; font-weight: bold;">${adData.title}</div>
                ${adData.description ? `<div class="ad-description" style="color: #666; font-size: 14px;">${adData.description}</div>` : ''}
                ${adData.click_url ? `<button onclick="handleAdClick(${adData.id}, '${adData.click_url}', ${adData.open_new_tab})" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Learn More</button>` : ''}
            </div>
        `;
        
        container.innerHTML = adHtml;
        container.style.display = 'block';
        
        // Set duration limit if specified
        if (duration > 0) {
            const video = container.querySelector('video');
            video.addEventListener('loadedmetadata', () => {
                if (video.duration > duration) {
                    video.addEventListener('timeupdate', () => {
                        if (video.currentTime >= duration) {
                            video.pause();
                            video.currentTime = duration;
                        }
                    });
                }
            });
        }
        
        console.log('🎥 Video ad displayed');
    }

    // Display Google Ads
    displayGoogleAd(container, adData) {
        const adHtml = `
            <div class="google-ad" data-ad-id="${adData.id}">
                <div class="ad-label">Advertisement</div>
                <div class="google-ads-container">
                    ${adData.google_ads_script}
                </div>
            </div>
        `;
        
        container.innerHTML = adHtml;
        container.style.display = 'block';
        
        // Execute any scripts in the Google Ads code
        this.executeGoogleAdsScripts(container);
        
        console.log('📊 Google Ads displayed');
    }

    // Execute Google Ads scripts
    executeGoogleAdsScripts(container) {
        try {
            const scripts = container.querySelectorAll('script');
            scripts.forEach(script => {
                if (script.src) {
                    // External script
                    const newScript = document.createElement('script');
                    newScript.src = script.src;
                    newScript.async = script.async || false;
                    document.head.appendChild(newScript);
                } else if (script.textContent) {
                    // Inline script
                    const newScript = document.createElement('script');
                    newScript.textContent = script.textContent;
                    document.head.appendChild(newScript);
                }
            });
        } catch (error) {
            console.error('❌ Failed to execute Google Ads scripts:', error);
        }
    }

    // Hide all ads
    hideAllAds() {
        const adContainers = document.querySelectorAll('.ad-container, #header-ad, #sidebar-ad, #footer-ad');
        adContainers.forEach(container => {
            container.style.display = 'none';
            container.innerHTML = '';
        });
    }

    // Get current ad
    getCurrentAd() {
        return this.currentAd;
    }

    // Manually trigger ad load
    async loadAdForSlot(slotPosition) {
        try {
            const response = await fetch(`/api/ads/feed?slot=${slotPosition}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success && data.showAd && data.data) {
                this.displayAd(data.data);
                return data.data;
            }
            
            return null;
        } catch (error) {
            console.error('❌ Failed to load ad for slot:', error);
            return null;
        }
    }
}

// Global ad click handler
async function handleAdClick(adId, clickUrl, openNewTab = true) {
    try {
        console.log('🖱️ Ad clicked:', adId);
        
        // Record click
        const response = await fetch(`/api/ads/${adId}/click`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                referrer: window.location.href,
                timestamp: new Date().toISOString()
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Ad click recorded');
            
            // Open URL if provided
            if (clickUrl && clickUrl !== 'null' && clickUrl !== 'undefined') {
                if (openNewTab) {
                    window.open(clickUrl, '_blank', 'noopener,noreferrer');
                } else {
                    window.location.href = clickUrl;
                }
            }
        } else {
            console.warn('⚠️ Failed to record ad click:', data.message);
        }
    } catch (error) {
        console.error('❌ Ad click error:', error);
        
        // Still open URL even if tracking fails
        if (clickUrl && clickUrl !== 'null' && clickUrl !== 'undefined') {
            if (openNewTab) {
                window.open(clickUrl, '_blank', 'noopener,noreferrer');
            } else {
                window.location.href = clickUrl;
            }
        }
    }
}

// Global ads manager instance
let videoAdsManager;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    videoAdsManager = new VideoAdsManager();
    
    // Make it globally accessible
    window.videoAdsManager = videoAdsManager;
    window.handleAdClick = handleAdClick;
    
    console.log('🚀 Video ads system ready');
});

// Helper function to trigger video change
function triggerVideoChange(videoIndex, videoData = {}) {
    const event = new CustomEvent('videoChanged', {
        detail: {
            index: videoIndex,
            ...videoData
        }
    });
    
    document.dispatchEvent(event);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        VideoAdsManager,
        handleAdClick,
        triggerVideoChange
    };
}ou