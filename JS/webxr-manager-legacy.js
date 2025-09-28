// WebXR Manager for AR Virtual Try-On - Legacy Version (No ES6 modules)
// Handles WebXR session management and AR functionality

class WebXRManager {
    constructor(virtualTryOn) {
        this.virtualTryOn = virtualTryOn;
        this.xrSession = null;
        this.xrRefSpace = null;
        this.xrRenderer = null;
        this.arButton = null;
        this.isARActive = false;
        this.arSupported = false;
        
        // AR-specific Three.js components
        this.arScene = null;
        this.arCamera = null;
        this.arGlassesModel = null;
        
        this.init();
    }

    async init() {
        console.log('🔄 Initializing WebXR Manager...');
        
        // Check WebXR support
        this.arSupported = await this.checkWebXRSupport();
        
        if (this.arSupported) {
            this.createARButton();
            console.log('✅ WebXR AR support detected');
        } else {
            console.log('❌ WebXR AR not supported on this device');
            this.showARNotSupported();
        }
    }

    async checkWebXRSupport() {
        if (!navigator.xr) {
            console.log('WebXR not available');
            return false;
        }
        
        try {
            const supported = await navigator.xr.isSessionSupported('immersive-ar');
            return supported;
        } catch (error) {
            console.error('Error checking WebXR support:', error);
            return false;
        }
    }

    createARButton() {
        // Create AR button
        this.arButton = document.createElement('button');
        this.arButton.id = 'ar-button';
        this.arButton.className = 'ar-button';
        this.arButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <path d="M8 21L9.09 15.26L16 14L9.09 13.74L8 8L6.91 13.74L0 14L6.91 15.26L8 21Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>
            <span>Try in AR</span>
        `;
        
        const self = this;
        this.arButton.addEventListener('click', function() {
            if (self.isARActive) {
                self.endARSession();
            } else {
                self.startARSession();
            }
        });
        
        // Add AR button to the page
        const container = document.querySelector('.controls-container') || document.body;
        container.appendChild(this.arButton);
        
        // Add AR button styles
        this.addARButtonStyles();
    }

    addARButtonStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .ar-button {
                display: flex;
                align-items: center;
                gap: 8px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 25px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                margin: 10px;
                position: relative;
                overflow: hidden;
            }
            
            .ar-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            
            .ar-button:active {
                transform: translateY(0);
            }
            
            .ar-button.active {
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
            }
            
            .ar-button svg {
                width: 20px;
                height: 20px;
            }
            
            .ar-not-supported {
                background: #6c757d;
                color: #fff;
                padding: 10px 15px;
                border-radius: 5px;
                margin: 10px;
                text-align: center;
                font-size: 14px;
            }
        `;
        document.head.appendChild(style);
    }

    async startARSession() {
        if (!this.arSupported) {
            this.showARNotSupported();
            return;
        }
        
        try {
            console.log('🔄 Starting AR session...');
            
            // Request AR session
            this.xrSession = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['local'],
                optionalFeatures: ['dom-overlay', 'hit-test']
            });
            
            // Set up AR session
            await this.setupARSession();
            
            this.isARActive = true;
            this.updateARButton();
            
            console.log('✅ AR session started successfully');
            
        } catch (error) {
            console.error('❌ Failed to start AR session:', error);
            this.showARError('Failed to start AR session. Please try again.');
        }
    }

    async setupARSession() {
        // Get reference space
        this.xrRefSpace = await this.xrSession.requestReferenceSpace('local');
        
        // Set up WebXR-compatible renderer
        if (this.virtualTryOn.renderer) {
            this.xrRenderer = this.virtualTryOn.renderer;
            this.xrRenderer.xr.enabled = true;
            this.xrRenderer.xr.setSession(this.xrSession);
        }
        
        // Clone glasses model for AR
        if (this.virtualTryOn.glassesModel) {
            this.arGlassesModel = this.virtualTryOn.glassesModel.clone();
            this.arScene = this.virtualTryOn.scene;
            this.arCamera = this.virtualTryOn.camera;
        }
        
        // Handle session end
        const self = this;
        this.xrSession.addEventListener('end', function() {
            self.endARSession();
        });
        
        // Start AR render loop
        this.xrSession.requestAnimationFrame(this.onARFrame.bind(this));
    }

    onARFrame(time, frame) {
        if (!this.xrSession || !this.isARActive) return;
        
        const session = frame.session;
        const pose = frame.getViewerPose(this.xrRefSpace);
        
        if (pose) {
            // Update AR glasses position based on face detection
            if (this.virtualTryOn.faceDetected && this.arGlassesModel) {
                this.updateARGlassesPosition();
            }
            
            // Render AR scene
            if (this.xrRenderer && this.arScene && this.arCamera) {
                this.xrRenderer.render(this.arScene, this.arCamera);
            }
        }
        
        // Continue AR loop
        session.requestAnimationFrame(this.onARFrame.bind(this));
    }

    updateARGlassesPosition() {
        if (!this.arGlassesModel || !this.virtualTryOn.faceLandmarks) return;
        
        // Use the same positioning logic as the regular try-on
        // but adapted for AR coordinate system
        const landmarks = this.virtualTryOn.faceLandmarks;
        
        // Get key face points (same as regular mode)
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const noseTip = landmarks[1];
        
        if (leftEye && rightEye && noseTip) {
            // Calculate position (convert from screen to AR coordinates)
            const eyeCenter = {
                x: (leftEye.x + rightEye.x) / 2,
                y: (leftEye.y + rightEye.y) / 2,
                z: (leftEye.z + rightEye.z) / 2
            };
            
            // Apply AR-specific transformations
            this.arGlassesModel.position.set(
                (eyeCenter.x - 0.5) * 2, // Convert to AR space
                -(eyeCenter.y - 0.5) * 2,
                eyeCenter.z - 0.1
            );
            
            // Calculate rotation based on eye alignment
            const eyeAngle = Math.atan2(
                rightEye.y - leftEye.y,
                rightEye.x - leftEye.x
            );
            
            this.arGlassesModel.rotation.z = eyeAngle;
        }
    }

    endARSession() {
        if (this.xrSession) {
            this.xrSession.end();
            this.xrSession = null;
        }
        
        if (this.xrRenderer) {
            this.xrRenderer.xr.enabled = false;
            this.xrRenderer.xr.setSession(null);
        }
        
        this.isARActive = false;
        this.updateARButton();
        
        console.log('✅ AR session ended');
    }

    updateARButton() {
        if (!this.arButton) return;
        
        if (this.isARActive) {
            this.arButton.classList.add('active');
            this.arButton.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="6" y="6" width="12" height="12" stroke="currentColor" stroke-width="2"/>
                </svg>
                <span>Exit AR</span>
            `;
        } else {
            this.arButton.classList.remove('active');
            this.arButton.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M8 21L9.09 15.26L16 14L9.09 13.74L8 8L6.91 13.74L0 14L6.91 15.26L8 21Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                </svg>
                <span>Try in AR</span>
            `;
        }
    }

    showARNotSupported() {
        const message = document.createElement('div');
        message.className = 'ar-not-supported';
        message.textContent = 'AR not supported on this device';
        
        const container = document.querySelector('.controls-container') || document.body;
        container.appendChild(message);
    }

    showARError(errorMessage) {
        // Show error message to user
        if (this.virtualTryOn && this.virtualTryOn.showError) {
            this.virtualTryOn.showError(errorMessage);
        } else {
            alert(errorMessage);
        }
    }
    
    // Cleanup method
    destroy() {
        if (this.isARActive) {
            this.endARSession();
        }
        
        if (this.arButton) {
            this.arButton.remove();
        }
    }
}