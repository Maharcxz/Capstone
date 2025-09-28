// Virtual Try-On System - Legacy Version (No ES6 modules)
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
        this.faceDetectionEnabled = true;
        this.faceDetectionActive = true;
        this.lastDetectionTime = 0;
        this.detectionInterval = 33; // ~30 FPS for face detection
        
        // Camera permission management
        this.cameraPermissionGranted = false;
        this.permissionCheckComplete = false;
        
        // Adjustment parameters
        this.adjustments = {
            size: 1.0,
            positionX: 0,
            positionY: 0,
            rotation: 0
        };
        
        // Get URL parameters
        this.urlParams = new URLSearchParams(window.location.search);
        this.frameId = this.urlParams.get('frame');
        this.productName = this.urlParams.get('productName');
        
        // Fixed frame ID to GLB model mapping with correct paths
        this.frameToGLBMapping = {
            'glasses-6': { id: 'base', name: 'Base Model', path: 'Assets/base.glb' },
            'glasses-7': { id: 'base_pbr', name: 'Base PBR', path: 'Assets/base_basic_pbr.glb' },
            'glasses-10': { id: 'base_shaded', name: 'Base Shaded', path: 'Assets/base_basic_shaded.glb' },
            'glasses-11b': { id: 'base', name: 'Base Model', path: 'Assets/base.glb' },
            'glasses-12': { id: 'base_pbr', name: 'Base PBR', path: 'Assets/base_basic_pbr.glb' },
            'glasses-5b': { id: 'base_shaded', name: 'Base Shaded', path: 'Assets/base_basic_shaded.glb' }
        };
        
        // Default fallback models
        this.fallbackModels = [
            'Assets/base.glb',
            'Assets/base_basic_pbr.glb',
            'Assets/base_basic_shaded.glb'
        ];
        
        this.maxLoadAttempts = 3;
        this.assignedGLBModel = null;
        this.currentGLBModel = null;
        
        // Performance monitoring
        this.performanceMode = 'auto';
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.performanceHistory = [];
        
        // Device capabilities
        this.deviceCapabilities = {
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            hasWebGL2: !!window.WebGL2RenderingContext,
            maxTextureSize: 2048,
            supportsShadows: true
        };
        
        // Quality settings
        this.qualitySettings = {
            high: { shadowMapSize: 2048, antialias: true, pixelRatio: Math.min(window.devicePixelRatio, 2) },
            medium: { shadowMapSize: 1024, antialias: true, pixelRatio: 1 },
            low: { shadowMapSize: 512, antialias: false, pixelRatio: 1 }
        };
        
        this.currentQuality = this.deviceCapabilities.isMobile ? 'medium' : 'high';
    }
    
    async init() {
        console.log('🚀 Initializing Virtual Try-On System...');
        
        try {
            // Wait for browser compatibility check
            const browserSupport = this.checkBrowserCompatibility();
            if (!browserSupport.supported) {
                this.showBrowserCompatibilityError(browserSupport.issues);
                return false;
            }
            
            // Wait for Three.js to be available
            let attempts = 0;
            const maxAttempts = 50;
            while (attempts < maxAttempts) {
                if (typeof window.webglSupported !== 'undefined' && typeof window.threeJSLoaded !== 'undefined') {
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (attempts >= maxAttempts) {
                throw new Error('Three.js not loaded after maximum wait time');
            }
            
            // Add browser polyfills
            this.addBrowserPolyfills();
            
            // Check WebGL support
            if (!this.checkWebGLSupport()) {
                this.showWebGLError();
                return false;
            }
            
            // Initialize camera and face detection
            await this.initializeCamera();
            
            // Setup Three.js scene
            this.setupThreeJS();
            
            // Load 3D model
            await this.load3DModel();
            
            // Start the render loop
            this.startDetection();
            
            console.log('✅ Virtual Try-On System initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize Virtual Try-On System:', error);
            this.showError('Failed to initialize the virtual try-on system. Please refresh and try again.');
            return false;
        }
    }
    
    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            this.webglSupported = !!gl;
            return this.webglSupported;
        } catch (e) {
            this.webglSupported = false;
            return false;
        }
    }

    showWebGLError() {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'webgl-error';
        errorDiv.innerHTML = `
            <h3>WebGL Not Supported</h3>
            <p>Your browser doesn't support WebGL, which is required for 3D model rendering.</p>
            <p>Please try:</p>
            <ul style="text-align: left; margin: 10px 0;">
                <li>Updating your browser</li>
                <li>Enabling hardware acceleration</li>
                <li>Using a different browser (Chrome, Firefox, Safari)</li>
            </ul>
        `;
        document.body.appendChild(errorDiv);
    }
    
    checkBrowserCompatibility() {
        const issues = [];
        
        // Check for getUserMedia support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            issues.push('Camera access not supported');
        }
        
        // Check for WebGL support using actual WebGL context creation
        if (!this.checkWebGLSupport()) {
            issues.push('WebGL not supported');
        }
        
        // Check for Web Workers
        if (!window.Worker) {
            issues.push('Web Workers not supported');
        }
        
        // Browser-specific checks
        const browserInfo = this.getBrowserInfo(navigator.userAgent);
        
        // Block Internet Explorer completely
        if (browserInfo.name === 'Internet Explorer') {
            issues.push('Internet Explorer is not supported');
        }
        
        // Check minimum browser versions
        if (browserInfo.name === 'Chrome' && browserInfo.version < 60) {
            issues.push('Chrome 60+ required');
        }
        
        if (browserInfo.name === 'Firefox' && browserInfo.version < 55) {
            issues.push('Firefox 55+ required');
        }
        
        if (browserInfo.name === 'Safari' && browserInfo.version < 11) {
            issues.push('Safari 11+ required');
        }
        
        return { supported: issues.length === 0, issues };
    }
    
    getBrowserInfo(userAgent) {
        let name = 'Unknown';
        let version = 0;
        
        if (userAgent.indexOf('Chrome') > -1) {
            name = 'Chrome';
            version = parseInt(userAgent.match(/Chrome\/(\d+)/)[1]);
        } else if (userAgent.indexOf('Firefox') > -1) {
            name = 'Firefox';
            version = parseInt(userAgent.match(/Firefox\/(\d+)/)[1]);
        } else if (userAgent.indexOf('Safari') > -1) {
            name = 'Safari';
            version = parseInt(userAgent.match(/Version\/(\d+)/)[1]);
        } else if (userAgent.indexOf('Edge') > -1) {
            name = 'Edge';
            version = parseInt(userAgent.match(/Edge\/(\d+)/)[1]);
        } else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident') > -1) {
            name = 'Internet Explorer';
            version = parseInt(userAgent.match(/(?:MSIE |rv:)(\d+)/)[1]);
        }
        
        return { name, version };
    }
    
    addBrowserPolyfills() {
        // Performance.now polyfill
        if (!window.performance || !window.performance.now) {
            window.performance = window.performance || {};
            window.performance.now = function() {
                return Date.now();
            };
        }
        
        // RequestAnimationFrame polyfill
        if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = function(callback) {
                return setTimeout(callback, 16);
            };
        }
        
        if (!window.cancelAnimationFrame) {
            window.cancelAnimationFrame = function(id) {
                clearTimeout(id);
            };
        }
        
        // MediaDevices polyfill
        if (!navigator.mediaDevices) {
            navigator.mediaDevices = {};
        }
        
        if (!navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia = function(constraints) {
                const getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
                
                if (!getUserMedia) {
                    return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
                }
                
                return new Promise((resolve, reject) => {
                    getUserMedia.call(navigator, constraints, resolve, reject);
                });
            };
        }
    }
    
    async initializeCamera() {
        console.log('🎥 Initializing camera...');
        
        try {
            // Check camera permissions first
            await this.checkCameraPermissions();
            
            if (!this.cameraPermissionGranted) {
                this.showCameraPermissionRequest();
                return;
            }
            
            // Get video element
            this.video = document.getElementById('videoElement');
            if (!this.video) {
                throw new Error('Video element not found');
            }
            
            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    facingMode: 'user'
                }
            });
            
            this.video.srcObject = stream;
            
            // Wait for video to be ready
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });
            
            // Initialize face detection
            await this.initializeFaceDetection();
            
            console.log('✅ Camera initialized successfully');
            
        } catch (error) {
            console.error('❌ Camera initialization failed:', error);
            this.handleCameraError(error);
        }
    }
    
    async checkCameraPermissions() {
        try {
            // Check if we're in a secure context
            if (!isSecureContext) {
                throw new Error('Camera access requires HTTPS');
            }
            
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera access not supported');
            }
            
            // Check permission status
            if (navigator.permissions && navigator.permissions.query) {
                const permissionStatus = await navigator.permissions.query({ name: 'camera' });
                
                if (permissionStatus.state === 'denied') {
                    this.cameraPermissionGranted = false;
                    this.showCameraPermissionHelp();
                    return;
                }
                
                if (permissionStatus.state === 'granted') {
                    this.cameraPermissionGranted = true;
                    return;
                }
            }
            
            // Try to access camera to check permissions
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach(track => track.stop());
                this.cameraPermissionGranted = true;
            } catch (error) {
                this.cameraPermissionGranted = false;
                throw error;
            }
            
        } catch (error) {
            this.cameraPermissionGranted = false;
            throw error;
        }
    }
    
    handleCameraError(error) {
        console.error('Camera error:', error);
        
        if (error.name === 'NotAllowedError') {
            this.showCameraPermissionHelp();
        } else if (error.name === 'NotFoundError') {
            this.showError('No camera found. Please connect a camera and refresh the page.');
        } else if (error.name === 'NotReadableError') {
            this.showError('Camera is being used by another application. Please close other applications and refresh.');
        } else {
            this.showError('Failed to access camera. Please check your camera settings and refresh the page.');
        }
    }
    
    showCameraPermissionRequest() {
        const message = document.createElement('div');
        message.className = 'camera-permission-request';
        message.innerHTML = `
            <div class="permission-content">
                <h3>Camera Access Required</h3>
                <p>This application needs access to your camera to provide virtual try-on functionality.</p>
                <button onclick="location.reload()" class="permission-button">Grant Camera Access</button>
            </div>
        `;
        document.body.appendChild(message);
    }
    
    hideCameraPermissionRequest() {
        const message = document.querySelector('.camera-permission-request');
        if (message) {
            message.remove();
        }
    }
    
    showCameraPermissionHelp() {
        const helpMessage = `
            <div class="camera-help-overlay">
                <div class="camera-help-content">
                    <h3>Camera Permission Required</h3>
                    <p>To use the virtual try-on feature, please allow camera access:</p>
                    <ol>
                        <li>Click the camera icon in your browser's address bar</li>
                        <li>Select "Allow" for camera access</li>
                        <li>Refresh this page</li>
                    </ol>
                    <button onclick="this.parentElement.parentElement.remove()" class="help-close-btn">Close</button>
                </div>
            </div>
        `;
        
        const helpDiv = document.createElement('div');
        helpDiv.innerHTML = helpMessage;
        document.body.appendChild(helpDiv);
    }
    
    async initializeFaceDetection() {
        console.log('🔍 Initializing face detection...');
        
        try {
            // Check if MediaPipe FaceMesh is available
            if (typeof FaceMesh === 'undefined') {
                console.warn('MediaPipe FaceMesh not available, using fallback');
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
            
            this.faceMesh.onResults(this.onFaceDetectionResults.bind(this));
            
            console.log('✅ Face detection initialized');
            
        } catch (error) {
            console.error('❌ Face detection initialization failed:', error);
            this.showFaceDetectionStatus('Face detection unavailable - manual positioning enabled');
        }
    }
    
    setupThreeJS() {
        console.log('🎨 Setting up Three.js scene...');
        
        // Check if Three.js is available
        if (typeof THREE === 'undefined') {
            throw new Error('Three.js not loaded');
        }
        
        // Get canvas container
        const canvasContainer = document.querySelector('.video-canvas-wrapper');
        if (!canvasContainer) {
            throw new Error('Canvas container not found');
        }
        
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            canvasContainer.clientWidth / canvasContainer.clientHeight,
            0.1,
            1000
        );
        this.camera.position.z = 5;
        
        // Create renderer
        const quality = this.qualitySettings[this.currentQuality];
        this.renderer = new THREE.WebGLRenderer({
            antialias: quality.antialias,
            alpha: true,
            preserveDrawingBuffer: true
        });
        
        this.renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
        this.renderer.setPixelRatio(quality.pixelRatio);
        this.renderer.shadowMap.enabled = quality.shadowMapSize > 0 && !this.deviceCapabilities.isMobile;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        canvasContainer.appendChild(this.renderer.domElement);
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        if (quality.shadowMapSize > 0 && !this.deviceCapabilities.isMobile) {
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = quality.shadowMapSize;
            directionalLight.shadow.mapSize.height = quality.shadowMapSize;
        }
        this.scene.add(directionalLight);
        
        // Setup controls if available
        this.setupControls();
        
        // Handle window resize
        window.addEventListener('resize', () => this.resizeCanvas());
        
        console.log('✅ Three.js scene setup complete');
    }
    
    setupControls() {
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
        }
    }
    
    async load3DModel() {
        console.log('📦 Loading 3D model...');
        
        // Determine which model to load
        if (this.productName) {
            console.log(`Loading model for product: ${this.productName}`);
        }
        
        if (!this.assignedGLBModel) {
            console.log('No specific model assigned, using fallback models');
        }
        
        // Try to load the assigned model first, then fallbacks
        for (let attempt = 1; attempt <= this.maxLoadAttempts; attempt++) {
            console.log(`🔄 Model loading attempt ${attempt}/${this.maxLoadAttempts}`);
            
            let modelPath = this.assignedGLBModel ? this.assignedGLBModel.path : this.fallbackModels[0];
            let success = await this.loadGLTFModel(modelPath);
            
            if (success) {
                console.log(`✅ Model loaded successfully: ${modelPath}`);
                return;
            }
            
            if (attempt === this.maxLoadAttempts) {
                console.warn('⚠️ All model loading attempts failed, trying fallback models');
            }
        }
        
        // Try fallback models
        for (const fallbackPath of this.fallbackModels) {
            console.log(`🔄 Trying fallback model: ${fallbackPath}`);
            let success = await this.loadGLTFModel(fallbackPath);
            
            if (success) {
                console.log(`✅ Fallback model loaded: ${fallbackPath}`);
                this.showFallbackNotice();
                return;
            }
        }
        
        // If all models fail to load
        console.error('❌ All model loading attempts failed');
        this.showModelLoadError();
    }
    
    async loadGLTFModel(modelPath) {
        return new Promise((resolve) => {
            if (!this.validateThreeJSEnvironment()) {
                resolve(false);
                return;
            }
            
            // Remove existing model
            if (this.glassesModel) {
                this.scene.remove(this.glassesModel);
                this.glassesModel = null;
            }
            
            const loader = new THREE.GLTFLoader();
            
            loader.load(
                modelPath,
                (gltf) => {
                    try {
                        if (!gltf || !gltf.scene) {
                            console.error('Invalid GLTF data');
                            resolve(false);
                            return;
                        }
                        
                        this.glassesModel = gltf.scene;
                        
                        // Validate model has geometry
                        let hasGeometry = false;
                        this.glassesModel.traverse((child) => {
                            if (child.isMesh && child.geometry) {
                                hasGeometry = true;
                            }
                        });
                        
                        if (!hasGeometry) {
                            console.error('Model has no valid geometry');
                            resolve(false);
                            return;
                        }
                        
                        // Configure model
                        this.glassesModel.scale.set(1, 1, 1);
                        this.glassesModel.position.set(0, 0, 0);
                        this.glassesModel.visible = false; // Hide until face is detected
                        
                        // Configure materials
                        this.glassesModel.traverse((child) => {
                            if (child.isMesh) {
                                this.configureMeshMaterial(child);
                            }
                        });
                        
                        this.scene.add(this.glassesModel);
                        this.currentGLBModel = { path: modelPath };
                        
                        console.log('✅ 3D model loaded and configured');
                        resolve(true);
                        
                    } catch (error) {
                        console.error('Error processing GLTF model:', error);
                        resolve(false);
                    }
                },
                (progress) => {
                    // Loading progress
                    if (progress.total > 0) {
                        const percentage = (progress.loaded / progress.total) * 100;
                        console.log(`Loading progress: ${percentage.toFixed(1)}%`);
                    }
                },
                (error) => {
                    console.error('GLTF loading error:', error);
                    resolve(false);
                }
            );
        });
    }
    
    configureMeshMaterial(mesh) {
        if (mesh.material) {
            // Ensure material is compatible
            if (mesh.material.isMeshBasicMaterial) {
                // Convert to MeshStandardMaterial for better lighting
                const newMaterial = new THREE.MeshStandardMaterial({
                    color: mesh.material.color,
                    map: mesh.material.map,
                    transparent: mesh.material.transparent,
                    opacity: mesh.material.opacity
                });
                mesh.material = newMaterial;
            }
            
            // Enable shadows if supported
            mesh.castShadow = this.qualitySettings[this.currentQuality].shadowMapSize > 0;
            mesh.receiveShadow = this.qualitySettings[this.currentQuality].shadowMapSize > 0;
        }
    }
    
    validateThreeJSEnvironment() {
        // Check if Three.js is available
        if (typeof THREE === 'undefined') {
            console.error('Three.js not available');
            return false;
        }
        
        // Check if GLTFLoader is available
        if (typeof THREE.GLTFLoader === 'undefined') {
            console.error('GLTFLoader not available');
            return false;
        }
        
        // Check if scene components are ready
        if (!this.scene || !this.camera || !this.renderer) {
            console.error('Three.js scene not properly initialized');
            return false;
        }
        
        return true;
    }
    
    onFaceDetectionResults(results) {
        const currentTime = performance.now();
        
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            
            if (this.validateLandmarks(landmarks)) {
                this.faceLandmarks = this.smoothLandmarks(landmarks);
                this.faceDetected = true;
                this.updateFaceDetectionIndicator(true);
                
                // Show glasses model
                if (!this.faceLandmarks) {
                    this.setDefaultGlassesPosition();
                    if (this.glassesModel) {
                        this.glassesModel.visible = true;
                    }
                }
                
                this.updateGlassesPosition();
            }
        } else {
            this.faceDetected = false;
            this.updateFaceDetectionIndicator(false);
            
            if (this.glassesModel) {
                this.glassesModel.visible = false;
            }
        }
        
        this.lastDetectionTime = currentTime;
    }
    
    validateLandmarks(landmarks) {
        return landmarks && landmarks.length >= 468; // MediaPipe face mesh has 468 landmarks
    }
    
    smoothLandmarks(newLandmarks) {
        if (!this.faceLandmarks) {
            return newLandmarks;
        }
        
        const smoothingFactor = 0.7;
        const smoothedLandmarks = [];
        
        for (let i = 0; i < newLandmarks.length; i++) {
            const prev = this.faceLandmarks[i];
            const curr = newLandmarks[i];
            
            if (prev && curr) {
                smoothedLandmarks[i] = {
                    x: prev.x * smoothingFactor + curr.x * (1 - smoothingFactor),
                    y: prev.y * smoothingFactor + curr.y * (1 - smoothingFactor),
                    z: prev.z * smoothingFactor + curr.z * (1 - smoothingFactor)
                };
            } else {
                smoothedLandmarks[i] = curr;
            }
        }
        
        return smoothedLandmarks;
    }
    
    updateFaceDetectionIndicator(detected) {
        const statusElement = document.getElementById('face-detection-status');
        if (statusElement && this.faceDetectionEnabled) {
            if (detected) {
                statusElement.textContent = 'Face detected ✓';
                statusElement.className = 'face-detected';
            } else {
                statusElement.textContent = 'Looking for face...';
                statusElement.className = 'face-not-detected';
            }
        }
    }
    
    updateGlassesPosition() {
        if (!this.glassesModel || !this.faceLandmarks) return;
        
        // Get key facial landmarks
        const leftEye = this.faceLandmarks[33];
        const rightEye = this.faceLandmarks[263];
        const noseTip = this.faceLandmarks[1];
        const foreheadCenter = this.faceLandmarks[9];
        
        if (!leftEye || !rightEye || !noseTip) return;
        
        // Calculate glasses position
        const eyeDistance = Math.sqrt(
            Math.pow(rightEye.x - leftEye.x, 2) + 
            Math.pow(rightEye.y - leftEye.y, 2)
        );
        
        const centerX = (leftEye.x + rightEye.x) / 2;
        const centerY = (leftEye.y + rightEye.y) / 2;
        
        // Convert from normalized coordinates to 3D space
        const scale = eyeDistance * 15; // Adjust scale based on eye distance
        const posX = (centerX - 0.5) * 10;
        const posY = -(centerY - 0.5) * 10;
        const posZ = 0;
        
        // Apply position and scale
        this.glassesModel.position.set(posX, posY, posZ);
        this.glassesModel.scale.set(scale, scale, scale);
        
        // Calculate rotation based on eye alignment
        const eyeAngle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
        this.glassesModel.rotation.z = eyeAngle;
        
        // Apply user adjustments
        this.glassesModel.scale.multiplyScalar(this.adjustments.size);
        this.glassesModel.position.x += this.adjustments.positionX;
        this.glassesModel.position.y += this.adjustments.positionY;
        this.glassesModel.rotation.z += this.adjustments.rotation;
    }
    
    setDefaultGlassesPosition() {
        if (this.glassesModel) {
            this.glassesModel.position.set(0, 0, 0);
            this.glassesModel.scale.set(1, 1, 1);
            this.glassesModel.rotation.set(0, 0, 0);
        }
    }
    
    startDetection() {
        const detect = () => {
            if (this.video && this.video.readyState === 4) {
                const currentTime = performance.now();
                const shouldDetect = currentTime - this.lastDetectionTime >= this.detectionInterval;
                
                if (shouldDetect && this.faceMesh && this.faceDetectionActive) {
                    this.faceMesh.send({ image: this.video });
                }
            }
            
            this.render3D();
            this.animationId = requestAnimationFrame(detect);
        };
        
        detect();
    }
    
    render3D() {
        if (!this.renderer || !this.scene || !this.camera) return;
        
        // Update controls if available
        if (this.controls) {
            this.controls.update();
        }
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
        
        // Update performance stats
        const currentTime = performance.now();
        if (this.lastFrameTime) {
            const deltaTime = currentTime - this.lastFrameTime;
            this.updatePerformanceStats(deltaTime);
        }
        this.lastFrameTime = currentTime;
    }
    
    updatePerformanceStats(deltaTime) {
        if (!this.performanceStats) {
            this.performanceStats = {
                frameCount: 0,
                totalTime: 0,
                avgFPS: 60,
                lastUpdate: performance.now()
            };
        }
        
        this.performanceStats.frameCount++;
        this.performanceStats.totalTime += deltaTime;
        
        const now = performance.now();
        if (now - this.performanceStats.lastUpdate > 1000) {
            this.performanceStats.avgFPS = 1000 / (this.performanceStats.totalTime / this.performanceStats.frameCount);
            
            if (this.performanceStats.avgFPS < 20 && this.performanceMode !== 'low') {
                console.warn('Low FPS detected, adjusting quality settings');
                this.adjustPerformance();
            }
            
            this.performanceStats.frameCount = 0;
            this.performanceStats.totalTime = 0;
            this.performanceStats.lastUpdate = now;
        }
    }
    
    adjustPerformance() {
        const modes = ['high', 'medium', 'low'];
        const currentIndex = modes.indexOf(this.currentQuality);
        
        if (currentIndex < modes.length - 1) {
            this.currentQuality = modes[currentIndex + 1];
            this.applyQualitySettings();
            console.log(`Performance adjusted to: ${this.currentQuality}`);
        }
    }
    
    applyQualitySettings() {
        const quality = this.qualitySettings[this.currentQuality];
        
        if (this.renderer && this.scene) {
            this.renderer.setPixelRatio(quality.pixelRatio);
            
            // Update shadow settings
            this.scene.traverse((child) => {
                if (child.isLight && child.shadow) {
                    if (quality.shadowMapSize > 0 && !this.deviceCapabilities.isMobile) {
                        child.castShadow = true;
                        child.shadow.mapSize.width = quality.shadowMapSize;
                        child.shadow.mapSize.height = quality.shadowMapSize;
                    } else {
                        child.castShadow = false;
                    }
                }
            });
        }
    }
    
    resizeCanvas() {
        const canvasContainer = document.querySelector('.video-canvas-wrapper');
        
        if (this.renderer) {
            this.renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
        }
        
        if (this.camera) {
            this.camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
            this.camera.updateProjectionMatrix();
        }
    }
    
    showError(message) {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.innerHTML = `
                <div class="error-message">
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="retry-button">Retry</button>
                </div>
            `;
        }
    }
    
    showFallbackNotice() {
        console.log('Showing fallback model notice');
    }
    
    showModelLoadError() {
        this.showError('Failed to load 3D model. Please refresh the page and try again.');
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

// Make VirtualTryOn available globally
window.VirtualTryOn = VirtualTryOn;