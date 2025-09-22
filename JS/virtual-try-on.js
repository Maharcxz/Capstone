// Virtual Try-On System
// Handles camera access, face detection, and 3D glasses overlay

class VirtualTryOn {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.faceMesh = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.glassesModel = null;
        this.currentFrame = null;
        this.faceDetected = false;
        this.faceLandmarks = null;
        this.animationId = null;
        
        // Adjustment parameters
        this.adjustments = {
            size: 1.0,
            positionX: 0,
            positionY: 0,
            rotation: 0
        };
        
        // Available frames
        this.availableFrames = [
            { id: 'glasses-6', name: 'Classic Round', model: 'Assets/glasses-6.glb' },
            { id: 'glasses-7', name: 'Modern Square', model: 'Assets/glasses-7.glb' },
            { id: 'glasses-10', name: 'Vintage Style', model: 'Assets/glasses-10.glb' },
            { id: 'glasses-11b', name: 'Sport Frame', model: 'Assets/glasses-11b.glb' },
            { id: 'glasses-12', name: 'Designer Frame', model: 'Assets/glasses-12.glb' },
            { id: 'glasses-5b', name: 'Minimalist', model: 'Assets/glasses-5b.glb' }
        ];
        
        this.init();
    }
    
    async init() {
        try {
            await this.setupCamera();
            await this.setupFaceDetection();
            this.setupThreeJS();
            this.setupControls();
            this.loadFrameSelector();
            this.hideLoading();
            this.startDetection();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize virtual try-on. Please check camera permissions.');
        }
    }
    
    async setupCamera() {
        this.video = document.getElementById('videoElement');
        this.canvas = document.getElementById('canvasElement');
        this.ctx = this.canvas.getContext('2d');
        
        // Check if we're on HTTPS or localhost
        const isSecureContext = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        
        if (!isSecureContext) {
            throw new Error('Camera access requires HTTPS. Please use a secure connection or localhost.');
        }
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera API not supported in this browser.');
        }
        
        // Check current permission status
        let permissionStatus = 'prompt';
        try {
            if (navigator.permissions && navigator.permissions.query) {
                const permission = await navigator.permissions.query({ name: 'camera' });
                permissionStatus = permission.state;
            }
        } catch (e) {
            // Permission API not supported, continue with getUserMedia
            console.log('Permission API not supported, proceeding with getUserMedia');
        }
        
        // Retry logic for camera access
        const maxRetries = 3;
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Camera setup attempt ${attempt}/${maxRetries}, permission status: ${permissionStatus}`);
                
                const constraints = {
                    video: {
                        width: { ideal: 1280, min: 640 },
                        height: { ideal: 720, min: 480 },
                        facingMode: 'user'
                    },
                    audio: false
                };
                
                // For subsequent attempts, try with more basic constraints
                if (attempt > 1) {
                    constraints.video = {
                        facingMode: 'user'
                    };
                }
                
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                
                this.video.srcObject = stream;
                
                return new Promise((resolve, reject) => {
                    const timeoutId = setTimeout(() => {
                        reject(new Error('Video loading timeout'));
                    }, 10000); // 10 second timeout
                    
                    this.video.onloadedmetadata = () => {
                        clearTimeout(timeoutId);
                        this.video.play().then(() => {
                            this.resizeCanvas();
                            console.log('Camera initialized successfully');
                            resolve();
                        }).catch(reject);
                    };
                    
                    this.video.onerror = (e) => {
                        clearTimeout(timeoutId);
                        reject(new Error('Video element error: ' + e.message));
                    };
                });
                
            } catch (error) {
                lastError = error;
                console.error(`Camera setup attempt ${attempt} failed:`, error);
                
                // If it's a permission error and we're not on the last attempt, wait and retry
                if (error.name === 'NotAllowedError' && attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }
                
                // If it's not a permission error, break early
                if (error.name !== 'NotAllowedError' && error.name !== 'NotReadableError') {
                    break;
                }
                
                // Wait before retry
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        
        // If we get here, all attempts failed
        let errorMessage = 'Camera access failed after multiple attempts.';
        
        if (lastError) {
            if (lastError.name === 'NotAllowedError') {
                errorMessage = 'Camera access was denied. Please allow camera access and refresh the page.';
            } else if (lastError.name === 'NotFoundError') {
                errorMessage = 'No camera found on this device.';
            } else if (lastError.name === 'NotSupportedError') {
                errorMessage = 'Camera is not supported on this device.';
            } else if (lastError.name === 'NotReadableError') {
                errorMessage = 'Camera is already in use by another application. Please close other applications using the camera and try again.';
            } else if (lastError.name === 'OverconstrainedError') {
                errorMessage = 'Camera constraints could not be satisfied. Please try with a different camera.';
            } else {
                errorMessage = `Camera error: ${lastError.message}`;
            }
        }
        
        throw new Error(errorMessage);
    }
    
    async setupFaceDetection() {
        try {
            // Check if FaceMesh is available
            if (typeof FaceMesh === 'undefined') {
                console.warn('MediaPipe FaceMesh not available, face detection will be disabled');
                this.faceMesh = null;
                return;
            }
            
            this.faceMesh = new FaceMesh({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                }
            });
            
            this.faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            
            this.faceMesh.onResults((results) => {
                this.onFaceDetectionResults(results);
            });
            
            console.log('Face detection initialized successfully');
        } catch (error) {
            console.warn('Face detection setup failed:', error);
            this.faceMesh = null;
            // Don't throw error - allow the app to continue without face detection
        }
    }
    
    setupThreeJS() {
        try {
            // Check if Three.js is available
            if (typeof THREE === 'undefined') {
                console.warn('Three.js not available, 3D rendering will be disabled');
                return;
            }
            
            // Create Three.js scene
            this.scene = new THREE.Scene();
            
            // Create camera
            this.camera = new THREE.PerspectiveCamera(
                75,
                this.canvas.width / this.canvas.height,
                0.1,
                1000
            );
            this.camera.position.z = 5;
            
            // Create renderer
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                alpha: true,
                antialias: true
            });
            this.renderer.setSize(this.canvas.width, this.canvas.height);
            this.renderer.setClearColor(0x000000, 0); // Transparent background
            
            // Add lighting
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            this.scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(0, 1, 1);
            this.scene.add(directionalLight);
            
            console.log('Three.js initialized successfully');
        } catch (error) {
            console.warn('Three.js setup failed:', error);
            // Don't throw error - allow the app to continue without 3D rendering
        }
    }
    
    setupControls() {
        // Action buttons
        document.getElementById('captureBtn').addEventListener('click', () => {
            this.capturePhoto();
        });
        
        document.getElementById('switchCameraBtn').addEventListener('click', () => {
            this.switchCamera();
        });
    }
    
    loadFrameSelector() {
        const frameSelector = document.getElementById('frameSelector');
        frameSelector.innerHTML = this.availableFrames.map(frame => `
            <div class="frame-option" data-frame-id="${frame.id}" onclick="virtualTryOn.selectFrame('${frame.id}')">
                <div style="width: 100%; height: 60px; background: rgba(255,255,255,0.1); border-radius: 4px; display: flex; align-items: center; justify-content: center; margin-bottom: 5px;">
                    <span style="font-size: 24px;">👓</span>
                </div>
                <span>${frame.name}</span>
            </div>
        `).join('');
    }
    
    async selectFrame(frameId) {
        const frame = this.availableFrames.find(f => f.id === frameId);
        if (!frame) return;
        
        // Update UI
        document.querySelectorAll('.frame-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector(`[data-frame-id="${frameId}"]`).classList.add('active');
        
        // Load 3D model
        try {
            await this.loadGlassesModel(frame.model);
            this.currentFrame = frame;
        } catch (error) {
            console.error('Error loading frame model:', error);
            this.showError('Failed to load frame model');
        }
    }
    
    async loadGlassesModel(modelPath) {
        return new Promise((resolve, reject) => {
            try {
                // Check if GLTFLoader is available
                if (typeof THREE.GLTFLoader === 'undefined') {
                    console.warn('GLTFLoader not available, 3D models will not be loaded');
                    resolve(); // Don't reject, just continue without 3D models
                    return;
                }
                
                const loader = new THREE.GLTFLoader();
                loader.load(
                    modelPath,
                    (gltf) => {
                        // Remove previous model
                        if (this.glassesModel) {
                            this.scene.remove(this.glassesModel);
                        }
                        
                        this.glassesModel = gltf.scene;
                        this.glassesModel.scale.set(0.1, 0.1, 0.1); // Adjust scale as needed
                        this.scene.add(this.glassesModel);
                        console.log('3D model loaded successfully');
                        resolve();
                    },
                    (progress) => {
                        // Loading progress
                        console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
                    },
                    (error) => {
                        console.warn('Failed to load 3D model:', error);
                        resolve(); // Don't reject, continue without the model
                    }
                );
            } catch (error) {
                console.warn('GLTFLoader initialization failed:', error);
                resolve(); // Don't reject, continue without 3D models
            }
        });
    }
    
    onFaceDetectionResults(results) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            this.faceDetected = true;
            this.faceLandmarks = results.multiFaceLandmarks[0];
            this.updateGlassesPosition();
        } else {
            this.faceDetected = false;
            if (this.glassesModel) {
                this.glassesModel.visible = false;
            }
        }
        
        this.render3D();
    }
    
    updateGlassesPosition() {
        if (!this.glassesModel || !this.faceLandmarks) return;
        
        // Get key face landmarks for glasses positioning
        const leftEye = this.faceLandmarks[33]; // Left eye outer corner
        const rightEye = this.faceLandmarks[263]; // Right eye outer corner
        const noseBridge = this.faceLandmarks[168]; // Nose bridge
        
        // Convert normalized coordinates to canvas coordinates
        const leftEyeX = leftEye.x * this.canvas.width;
        const leftEyeY = leftEye.y * this.canvas.height;
        const rightEyeX = rightEye.x * this.canvas.width;
        const rightEyeY = rightEye.y * this.canvas.height;
        const noseBridgeX = noseBridge.x * this.canvas.width;
        const noseBridgeY = noseBridge.y * this.canvas.height;
        
        // Calculate glasses position and rotation
        const eyeDistance = Math.sqrt(
            Math.pow(rightEyeX - leftEyeX, 2) + 
            Math.pow(rightEyeY - leftEyeY, 2)
        );
        
        const centerX = (leftEyeX + rightEyeX) / 2;
        const centerY = (leftEyeY + rightEyeY) / 2;
        
        // Convert to Three.js coordinates (normalized device coordinates)
        const ndcX = (centerX / this.canvas.width) * 2 - 1;
        const ndcY = -((centerY / this.canvas.height) * 2 - 1);
        
        // Position the glasses
        this.glassesModel.position.x = ndcX * 2;
        this.glassesModel.position.y = ndcY * 2;
        this.glassesModel.position.z = 0;
        
        // Scale based on eye distance
        const baseScale = eyeDistance / 200; // Adjust this value as needed
        this.glassesModel.scale.set(baseScale, baseScale, baseScale);
        
        // Calculate rotation based on eye alignment
        const eyeAngle = Math.atan2(rightEyeY - leftEyeY, rightEyeX - leftEyeX);
        this.glassesModel.rotation.z = eyeAngle;
        
        this.glassesModel.visible = true;
        this.updateGlassesTransform();
    }
    
    updateGlassesTransform() {
        if (!this.glassesModel) return;
        
        // Apply user adjustments
        const currentScale = this.glassesModel.scale.x;
        const adjustedScale = currentScale * this.adjustments.size;
        this.glassesModel.scale.set(adjustedScale, adjustedScale, adjustedScale);
        
        // Apply position adjustments
        this.glassesModel.position.x += this.adjustments.positionX * 0.01;
        this.glassesModel.position.y += this.adjustments.positionY * 0.01;
        
        // Apply rotation adjustment
        this.glassesModel.rotation.z += (this.adjustments.rotation * Math.PI) / 180;
    }
    
    render3D() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    startDetection() {
        const detect = async () => {
            try {
                if (this.video.readyState === 4) {
                    // Only try face detection if faceMesh is available
                    if (this.faceMesh) {
                        await this.faceMesh.send({ image: this.video });
                    }
                    
                    // Always render the 3D scene (even without face detection)
                    this.render3D();
                }
                this.animationId = requestAnimationFrame(detect);
            } catch (error) {
                console.warn('Detection error:', error);
                // Continue the animation loop even if detection fails
                this.animationId = requestAnimationFrame(detect);
            }
        };
        detect();
    }
    
    resizeCanvas() {
        const rect = this.video.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        if (this.renderer) {
            this.renderer.setSize(this.canvas.width, this.canvas.height);
        }
        
        if (this.camera) {
            this.camera.aspect = this.canvas.width / this.canvas.height;
            this.camera.updateProjectionMatrix();
        }
    }
    
    capturePhoto() {
        const captureCanvas = document.createElement('canvas');
        const captureCtx = captureCanvas.getContext('2d');
        
        captureCanvas.width = this.video.videoWidth;
        captureCanvas.height = this.video.videoHeight;
        
        // Draw video frame
        captureCtx.drawImage(this.video, 0, 0);
        
        // Draw 3D glasses overlay
        if (this.glassesModel && this.faceDetected) {
            captureCtx.drawImage(this.canvas, 0, 0);
        }
        
        // Download the image
        const link = document.createElement('a');
        link.download = `virtual-try-on-${Date.now()}.png`;
        link.href = captureCanvas.toDataURL();
        link.click();
    }
    

    
    async switchCamera() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            if (videoDevices.length > 1) {
                // Switch between front and back camera
                const currentTrack = this.video.srcObject.getVideoTracks()[0];
                const currentSettings = currentTrack.getSettings();
                const currentFacingMode = currentSettings.facingMode || 'user';
                const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
                
                console.log(`Switching camera from ${currentFacingMode} to ${newFacingMode}`);
                
                // Stop current track
                currentTrack.stop();
                
                // Try to get new stream with different facing mode
                const constraints = {
                    video: { 
                        facingMode: { exact: newFacingMode },
                        width: { ideal: 1280, min: 640 },
                        height: { ideal: 720, min: 480 }
                    },
                    audio: false
                };
                
                try {
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    this.video.srcObject = stream;
                    
                    // Wait for video to load
                    return new Promise((resolve) => {
                        this.video.onloadedmetadata = () => {
                            this.video.play().then(() => {
                                this.resizeCanvas();
                                console.log('Camera switched successfully');
                                resolve();
                            });
                        };
                    });
                } catch (exactError) {
                    // If exact facing mode fails, try without exact constraint
                    console.log('Exact facing mode failed, trying without exact constraint');
                    const fallbackConstraints = {
                        video: { 
                            facingMode: newFacingMode,
                            width: { ideal: 1280, min: 640 },
                            height: { ideal: 720, min: 480 }
                        },
                        audio: false
                    };
                    
                    const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
                    this.video.srcObject = stream;
                    
                    return new Promise((resolve) => {
                        this.video.onloadedmetadata = () => {
                            this.video.play().then(() => {
                                this.resizeCanvas();
                                console.log('Camera switched successfully (fallback)');
                                resolve();
                            });
                        };
                    });
                }
            } else {
                console.log('Only one camera available, cannot switch');
                // Show a brief notification that only one camera is available
                this.showTemporaryMessage('Only one camera available');
            }
        } catch (error) {
            console.error('Error switching camera:', error);
            // Try to restore the original camera if switching failed
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                    audio: false
                });
                this.video.srcObject = stream;
            } catch (restoreError) {
                console.error('Failed to restore camera:', restoreError);
                this.showError('Camera switching failed. Please refresh the page.');
            }
        }
    }
    
    showTemporaryMessage(message) {
        // Create a temporary message overlay
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-family: 'Poppins', sans-serif;
            z-index: 10000;
            pointer-events: none;
        `;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);
        
        // Remove after 2 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 2000);
    }
    
    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
    
    showError(message) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.innerHTML = `
                <div class="error-message">
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Try Again
                    </button>
                </div>
            `;
        }
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.video && this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
        }
        
        if (this.faceMesh) {
            this.faceMesh.close();
        }
    }
}

// Initialize virtual try-on when page loads
let virtualTryOn;

document.addEventListener('DOMContentLoaded', () => {
    virtualTryOn = new VirtualTryOn();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (virtualTryOn) {
        virtualTryOn.destroy();
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    if (virtualTryOn) {
        virtualTryOn.resizeCanvas();
    }
});

// Get frame from URL parameters
function getFrameFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const frameId = urlParams.get('frame');
    const productName = urlParams.get('productName');
    
    if (frameId && virtualTryOn) {
        // Wait for initialization to complete
        setTimeout(() => {
            virtualTryOn.selectFrame(frameId);
        }, 1000);
    }
    
    // Update page title if product name is provided
    if (productName) {
        document.title = `Virtual Try-On - ${productName} - Trinity Optimum Vision Center`;
        const titleElement = document.querySelector('.try-on-title');
        if (titleElement) {
            titleElement.textContent = `Virtual Try-On - ${productName}`;
        }
    }
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', () => {
    getFrameFromURL();
});