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
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: false
            });
            
            this.video.srcObject = stream;
            
            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    this.resizeCanvas();
                    resolve();
                };
            });
        } catch (error) {
            let errorMessage = 'Camera access denied or not available.';
            
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Camera access was denied. Please allow camera access and refresh the page.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No camera found on this device.';
            } else if (error.name === 'NotSupportedError') {
                errorMessage = 'Camera is not supported on this device.';
            }
            
            throw new Error(errorMessage);
        }
    }
    
    async setupFaceDetection() {
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
    }
    
    setupThreeJS() {
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
    }
    
    setupControls() {
        // Size control
        document.getElementById('sizeSlider').addEventListener('input', (e) => {
            this.adjustments.size = parseFloat(e.target.value);
            this.updateGlassesTransform();
        });
        
        // Position X control
        document.getElementById('positionXSlider').addEventListener('input', (e) => {
            this.adjustments.positionX = parseFloat(e.target.value);
            this.updateGlassesTransform();
        });
        
        // Position Y control
        document.getElementById('positionYSlider').addEventListener('input', (e) => {
            this.adjustments.positionY = parseFloat(e.target.value);
            this.updateGlassesTransform();
        });
        
        // Rotation control
        document.getElementById('rotationSlider').addEventListener('input', (e) => {
            this.adjustments.rotation = parseFloat(e.target.value);
            this.updateGlassesTransform();
        });
        
        // Action buttons
        document.getElementById('captureBtn').addEventListener('click', () => {
            this.capturePhoto();
        });
        
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetAdjustments();
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
                    resolve();
                },
                (progress) => {
                    // Loading progress
                },
                (error) => {
                    reject(error);
                }
            );
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
            if (this.video.readyState === 4) {
                await this.faceMesh.send({ image: this.video });
            }
            this.animationId = requestAnimationFrame(detect);
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
    
    resetAdjustments() {
        this.adjustments = {
            size: 1.0,
            positionX: 0,
            positionY: 0,
            rotation: 0
        };
        
        // Reset sliders
        document.getElementById('sizeSlider').value = 1.0;
        document.getElementById('positionXSlider').value = 0;
        document.getElementById('positionYSlider').value = 0;
        document.getElementById('rotationSlider').value = 0;
        
        this.updateGlassesTransform();
    }
    
    async switchCamera() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            if (videoDevices.length > 1) {
                // Switch between front and back camera
                const currentTrack = this.video.srcObject.getVideoTracks()[0];
                const currentFacingMode = currentTrack.getSettings().facingMode;
                const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
                
                currentTrack.stop();
                
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: newFacingMode },
                    audio: false
                });
                
                this.video.srcObject = stream;
            }
        } catch (error) {
            console.error('Error switching camera:', error);
        }
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