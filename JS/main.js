// Main entry point for Virtual Try-On with WebXR support
// This file handles the initialization and integration of all components

import { VirtualTryOn } from './virtual-try-on.js';
import { WebXRManager } from './webxr-manager.js';

class VirtualTryOnApp {
    constructor() {
        this.virtualTryOn = null;
        this.webXRManager = null;
        this.isInitialized = false;
    }
    
    async init() {
        console.log('🚀 Initializing Virtual Try-On Application...');
        
        try {
            // Initialize Virtual Try-On
            this.virtualTryOn = new VirtualTryOn();
            await this.virtualTryOn.init();
            
            // Initialize WebXR Manager
            this.webXRManager = new WebXRManager(this.virtualTryOn);
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Virtual Try-On Application initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Virtual Try-On Application:', error);
            this.showError('Failed to initialize the application. Please refresh and try again.');
        }
    }
    
    setupEventListeners() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });
        
        // Handle page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.virtualTryOn) {
                this.virtualTryOn.handleResize();
            }
        });
        
        // Handle orientation change (mobile)
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                if (this.virtualTryOn) {
                    this.virtualTryOn.handleResize();
                }
            }, 100);
        });
    }
    
    pause() {
        if (this.virtualTryOn) {
            // Pause face detection if available
            if (this.virtualTryOn.faceDetectionActive) {
                this.virtualTryOn.faceDetectionActive = false;
            }
        }
    }
    
    resume() {
        if (this.virtualTryOn) {
            // Resume face detection if available
            if (!this.virtualTryOn.faceDetectionActive) {
                this.virtualTryOn.faceDetectionActive = true;
            }
        }
    }
    
    cleanup() {
        if (this.webXRManager) {
            this.webXRManager.destroy();
        }
        if (this.virtualTryOn) {
            this.virtualTryOn.destroy();
        }
    }
    
    showError(message) {
        // Create error message element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff4757;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            z-index: 10000;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(255, 71, 87, 0.3);
        `;
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
}

// Initialize the application when DOM is loaded
let app = null;

function initializeApp() {
    if (!app) {
        app = new VirtualTryOnApp();
        app.init();
    }
}

// Check if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Export for global access (fallback compatibility)
window.VirtualTryOnApp = VirtualTryOnApp;
window.initializeVirtualTryOn = initializeApp;

export { VirtualTryOnApp, initializeApp };