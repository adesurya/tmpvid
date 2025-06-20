// public/js/video-feed-ads.js - FRONTEND INTEGRATION FOR ADS IN VIDEO FEED

class VideoAdsManager {
    constructor() {
        this.currentVideoIndex = 0;
        this.loadedAds = new Map();
        this.adTimers = new Map();
        this.init();
    }

    init() {
        console.log('🎯 Initializing Video Ads Manager...');
        this.setupVideoFeed();
        this.setupAdEventListeners();
    }

    setupVideoFeed() {
        // Monitor video changes
        this.observeVideoChanges();
        
        // Load initial ads
        this.loadAdsForCurrentVideo();
    }

    observeVideoChanges() {
        // Use Intersection Observer to detect when videos come into view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const videoElement = entry.target;
                    const videoIndex = parseInt(videoElement.dataset.index) || 0;
                    
                    if (videoIndex !== this.currentVideoIndex) {
                        this.currentVideoIndex = videoIndex;
                        this.checkAndLoadAd(videoIndex);
                    }
                }
            });
        }, {
            threshold: 0.5
        });

        // Observe all video elements
        document.querySelectorAll('.video-item').forEach(video => {
            observer.observe(video);
        });
    }

    async checkAndLoadAd(videoIndex) {
        console.log(`📺 Video ${videoIndex} is now active`);
        
        // Check if we should show an ad (after every 2 videos)
        // Videos at index 2, 5, 8, 11, etc. should trigger ads
        const shouldShowAd = (videoIndex + 1) % 3 === 0;
        
        if (shouldShowAd) {
            console.log(`🎯 Should show ad after video ${videoIndex}`);
            await this.loadAndDisplayAd(videoIndex);
        }
    }

    async loadAndDisplayAd(videoIndex) {
        try {
            console.log(`📡 Loading ad for video index ${videoIndex}...`);
            
            const response = await fetch(`/api/ads/feed?videoIndex=${videoIndex}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.showAd && data.data) {
                console.log(`✅ Ad loaded: ${data.data.title} (${data.data.type})`);
                this.displayAd(data.data, videoIndex);
            } else {
                console.log(`❌ No ad available for video index ${videoIndex}`);
            }
        } catch (error) {
            console.error('❌ Failed to load ad:', error);
        }
    }

    displayAd(adData, videoIndex) {
        console.log(`🎨 Displaying ad: ${adData.title}`);
        
        // Create ad container
        const adContainer = this.createAdContainer(adData, videoIndex);
        
        // Insert ad after current video
        const videoContainer = document.getElementById('videoContainer');
        const currentVideo = document.querySelector(`[data-index="${videoIndex}"]`);
        
        if (currentVideo && videoContainer) {
            // Insert after current video
            currentVideo.insertAdjacentElement('afterend', adContainer);
            
            // Setup ad functionality
            this.setupAdInteractions(adContainer, adData);
            
            // Auto-play if video ad
            if (adData.type === 'video') {
                this.setupVideoAd(adContainer, adData);
            }
        }
    }

    createAdContainer(adData, videoIndex) {
        const container = document.createElement('div');
        container.className = 'ad-container';
        container.dataset.adId = adData.id;
        container.dataset.adType = adData.type;
        container.dataset.videoIndex = videoIndex;
        
        let adContent = '';
        
        // Generate content based on ad type
        if (adData.type === 'google_ads') {
            adContent = this.createGoogleAdsContent(adData);
        } else if (adData.type === 'video') {
            adContent = this.createVideoAdContent(adData);
        } else if (adData.type === 'image') {
            adContent = this.createImageAdContent(adData);
        }
        
        container.innerHTML = `
            ${adContent}
            
            <!-- Ad Label -->
            <div class="ad-label ${adData.type === 'google_ads' ? 'google-ads' : ''}">
                <i class="fas fa-${adData.type === 'google_ads' ? 'code' : 'bullhorn'}"></i>
                <span>${adData.type === 'google_ads' ? 'Google Ads' : 'Advertisement'}</span>
            </div>
            
            <!-- Skip Button -->
            <div class="ad-skip">
                <button class="ad-skip-btn" onclick="videoAdsManager.skipAd(${adData.id})">
                    <i class="fas fa-forward"></i>
                    <span>Skip</span>
                </button>
            </div>
        `;
        
        return container;
    }

    createGoogleAdsContent(adData) {
        return `
            <div class="google-ads-container">
                <div class="google-ads-script-container">
                    ${adData.google_ads_script}
                </div>
            </div>
            <div class="ad-overlay"></div>
        `;
    }

    createVideoAdContent(adData) {
        return `
            <video class="ad-media" 
                   id="ad-video-${adData.id}"
                   src="${adData.media_url}" 
                   loop 
                   muted 
                   playsinline
                   onended="videoAdsManager.onAdEnded(${adData.id})">
            </video>
            <div class="ad-overlay"></div>
            <div class="ad-info">
                <div class="ad-title">${adData.title}</div>
                ${adData.description ? `<div class="ad-description">${adData.description}</div>` : ''}
                <button class="ad-cta" onclick="videoAdsManager.clickAd(${adData.id}, '${adData.click_url}', ${adData.open_new_tab})">
                    <i class="fas fa-external-link-alt"></i>
                    <span>Learn More</span>
                </button>
            </div>
            <div class="ad-controls">
                <button class="ad-sound-btn" onclick="videoAdsManager.toggleAdSound(${adData.id})">
                    <i class="fas fa-volume-mute" id="ad-sound-icon-${adData.id}"></i>
                </button>
            </div>
            <div class="ad-duration-bar" id="adDurationBar-${adData.id}"></div>
        `;
    }

    createImageAdContent(adData) {
        return `
            <img class="ad-media" 
                 src="${adData.media_url}" 
                 alt="${adData.title}"
                 onclick="videoAdsManager.clickAd(${adData.id}, '${adData.click_url}', ${adData.open_new_tab})"
                 style="cursor: pointer;">
            <div class="ad-overlay"></div>
            <div class="ad-info">
                <div class="ad-title">${adData.title}</div>
                ${adData.description ? `<div class="ad-description">${adData.description}</div>` : ''}
                <button class="ad-cta" onclick="videoAdsManager.clickAd(${adData.id}, '${adData.click_url}', ${adData.open_new_tab})">
                    <i class="fas fa-external-link-alt"></i>
                    <span>Learn More</span>
                </button>
            </div>
        `;
    }

    setupAdInteractions(container, adData) {
        // Store ad data
        this.loadedAds.set(adData.id, adData);
        
        // Setup click tracking for the container
        container.addEventListener('click', (e) => {
            // Only track clicks on the ad media, not on buttons
            if (e.target.closest('.ad-media') && !e.target.closest('button')) {
                this.clickAd(adData.id, adData.click_url, adData.open_new_tab);
            }
        });
    }

    setupVideoAd(container, adData) {
        const video = container.querySelector(`#ad-video-${adData.id}`);
        const durationBar = container.querySelector(`#adDurationBar-${adData.id}`);
        
        if (!video) return;
        
        // Auto-play when video comes into view
        video.play().catch(console.warn);
        
        // Setup duration tracking
        if (durationBar && adData.duration > 0) {
            let currentTime = 0;
            const timer = setInterval(() => {
                currentTime += 0.1;
                const progress = (currentTime / adData.duration) * 100;
                durationBar.style.width = Math.min(progress, 100) + '%';
                
                if (currentTime >= adData.duration) {
                    clearInterval(timer);
                    this.adTimers.delete(adData.id);
                }
            }, 100);
            
            this.adTimers.set(adData.id, timer);
        }
    }

    async clickAd(adId, clickUrl, openNewTab) {
        try {
            console.log(`🖱️ Ad ${adId} clicked`);
            
            // Record click
            await fetch(`/api/ads/${adId}/click`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            // Open URL
            if (clickUrl) {
                if (openNewTab) {
                    window.open(clickUrl, '_blank');
                } else {
                    window.location.href = clickUrl;
                }
            }
            
            this.showToast('Opening advertiser link...', 'info');
        } catch (error) {
            console.error('❌ Failed to record ad click:', error);
            // Still open the link even if tracking fails
            if (clickUrl) {
                if (openNewTab) {
                    window.open(clickUrl, '_blank');
                } else {
                    window.location.href = clickUrl;
                }
            }
        }
    }

    toggleAdSound(adId) {
        const video = document.getElementById(`ad-video-${adId}`);
        const icon = document.getElementById(`ad-sound-icon-${adId}`);
        
        if (!video || !icon) return;
        
        if (video.muted) {
            video.muted = false;
            icon.className = 'fas fa-volume-up';
        } else {
            video.muted = true;
            icon.className = 'fas fa-volume-mute';
        }
    }

    skipAd(adId) {
        console.log(`⏭️ Skipping ad ${adId}`);
        
        const adContainer = document.querySelector(`[data-ad-id="${adId}"]`);
        if (!adContainer) return;
        
        // Clear any timers
        if (this.adTimers.has(adId)) {
            clearInterval(this.adTimers.get(adId));
            this.adTimers.delete(adId);
        }
        
        // Scroll to next video
        this.scrollToNextVideo(adContainer);
        
        this.showToast('Ad skipped', 'info');
    }

    onAdEnded(adId) {
        console.log(`🏁 Video ad ${adId} ended`);
        
        const adContainer = document.querySelector(`[data-ad-id="${adId}"]`);
        if (adContainer) {
            setTimeout(() => {
                this.scrollToNextVideo(adContainer);
            }, 500);
        }
    }

    scrollToNextVideo(currentElement) {
        const nextElement = currentElement.nextElementSibling;
        if (nextElement) {
            nextElement.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    setupAdEventListeners() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Pause all ad videos when page is hidden
                document.querySelectorAll('.ad-media').forEach(media => {
                    if (media.tagName === 'VIDEO' && !media.paused) {
                        media.pause();
                    }
                });
            }
        });
    }

    showToast(message, type = 'info', duration = 3000) {
        // Remove existing toasts
        document.querySelectorAll('.toast').forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: ${colors[type] || colors.info};
            color: white;
            padding: 15px 24px;
            border-radius: 30px;
            z-index: 3000;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        `;
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, duration);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we're on a video feed page
    if (document.getElementById('videoContainer')) {
        window.videoAdsManager = new VideoAdsManager();
        console.log('✅ Video Ads Manager initialized');
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoAdsManager;
}