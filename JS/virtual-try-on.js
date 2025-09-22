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
        this.faceDetectionEnabled = true; // Start with face detection enabled
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
        
        // Available frames - will be loaded dynamically from database
        this.availableFrames = [];
        
        this.init();
    }
    
    async init() {
        try {
            await this.setupCamera();
            await this.setupFaceDetection();
            this.setupThreeJS();
            this.setupControls();
            this.enhanceControls(); // Add enhanced controls with face detection toggle
            await this.loadAvailableFrames(); // Load frames from database
            this.loadFrameSelector();
            this.hideLoading();
            
            // Set up fallback if face detection is not available
            if (!this.faceDetectionEnabled) {
                this.setDefaultGlassesPosition();
            }
            
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
        
        // Check permission status and localStorage
        const permissionStatus = await this.checkCameraPermission();
        console.log('Camera permission status:', permissionStatus);
        
        // If permission was previously denied, show a helpful message
        if (permissionStatus === 'denied') {
            this.showCameraPermissionHelp();
            throw new Error('Camera access was previously denied. Please enable camera access in your browser settings.');
        }
        
        // If permission is already granted, proceed directly
        if (permissionStatus === 'granted') {
            return await this.initializeCamera();
        }
        
        // For first-time users or when permission is prompt, request access
        return await this.requestCameraAccess();
    }
    
    async checkCameraPermission() {
        try {
            // Check browser permission API first
            if (navigator.permissions && navigator.permissions.query) {
                const permission = await navigator.permissions.query({ name: 'camera' });
                
                // Update localStorage with current permission state
                localStorage.setItem('cameraPermissionStatus', permission.state);
                localStorage.setItem('cameraPermissionLastChecked', Date.now().toString());
                
                // Listen for permission changes
                permission.addEventListener('change', () => {
                    localStorage.setItem('cameraPermissionStatus', permission.state);
                    console.log('Camera permission changed to:', permission.state);
                });
                
                return permission.state;
            }
        } catch (e) {
            console.log('Permission API not supported, checking localStorage');
        }
        
        // Fallback to localStorage for browsers without permission API
        const storedStatus = localStorage.getItem('cameraPermissionStatus');
        const lastChecked = localStorage.getItem('cameraPermissionLastChecked');
        
        // If we have a recent status (within 24 hours), use it
        if (storedStatus && lastChecked) {
            const timeDiff = Date.now() - parseInt(lastChecked);
            const twentyFourHours = 24 * 60 * 60 * 1000;
            
            if (timeDiff < twentyFourHours && storedStatus === 'granted') {
                return 'granted';
            }
        }
        
        return 'prompt';
    }
    
    async requestCameraAccess() {
        try {
            console.log('Requesting camera access...');
            this.showCameraPermissionRequest();
            
            const stream = await this.attemptCameraAccess();
            
            // Permission granted, update localStorage
            localStorage.setItem('cameraPermissionStatus', 'granted');
            localStorage.setItem('cameraPermissionLastChecked', Date.now().toString());
            this.cameraPermissionGranted = true;
            
            this.hideCameraPermissionRequest();
            return await this.setupVideoStream(stream);
            
        } catch (error) {
            this.hideCameraPermissionRequest();
            
            if (error.name === 'NotAllowedError') {
                // Permission denied, update localStorage
                localStorage.setItem('cameraPermissionStatus', 'denied');
                localStorage.setItem('cameraPermissionLastChecked', Date.now().toString());
                this.showCameraPermissionHelp();
                throw new Error('Camera access was denied. Please allow camera access to use the virtual try-on feature.');
            }
            
            throw error;
        }
    }
    
    async initializeCamera() {
        try {
            console.log('Initializing camera with existing permission...');
            const stream = await this.attemptCameraAccess();
            this.cameraPermissionGranted = true;
            return await this.setupVideoStream(stream);
        } catch (error) {
            // Permission might have been revoked
            if (error.name === 'NotAllowedError') {
                localStorage.setItem('cameraPermissionStatus', 'denied');
                this.showCameraPermissionHelp();
            }
            throw error;
        }
    }
    
    async attemptCameraAccess() {
        const constraints = {
            video: {
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 },
                facingMode: 'user'
            },
            audio: false
        };
        
        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (error) {
            // Try with basic constraints if ideal constraints fail
            if (error.name === 'OverconstrainedError') {
                console.log('Trying with basic camera constraints...');
                const basicConstraints = {
                    video: { facingMode: 'user' },
                    audio: false
                };
                return await navigator.mediaDevices.getUserMedia(basicConstraints);
            }
            throw error;
        }
    }
    
    async setupVideoStream(stream) {
        this.video.srcObject = stream;
        
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Video loading timeout'));
            }, 10000);
            
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
    }
    
    showCameraPermissionRequest() {
        const existingMessage = document.getElementById('cameraPermissionRequest');
        if (existingMessage) return;
        
        const message = document.createElement('div');
        message.id = 'cameraPermissionRequest';
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            z-index: 10000;
            max-width: 400px;
        `;
        message.innerHTML = `
            <h3>Camera Access Required</h3>
            <p>Please allow camera access to use the virtual try-on feature.</p>
            <p>Your browser will ask for permission - please click "Allow".</p>
        `;
        document.body.appendChild(message);
    }
    
    hideCameraPermissionRequest() {
        const message = document.getElementById('cameraPermissionRequest');
        if (message) {
            message.remove();
        }
    }
    
    showCameraPermissionHelp() {
        const existingMessage = document.getElementById('cameraPermissionHelp');
        if (existingMessage) return;
        
        const message = document.createElement('div');
        message.id = 'cameraPermissionHelp';
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff6b6b;
            color: white;
            padding: 15px;
            border-radius: 8px;
            max-width: 300px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        const isChrome = /Chrome/.test(navigator.userAgent);
        const isFirefox = /Firefox/.test(navigator.userAgent);
        
        let instructions = '';
        if (isChrome) {
            instructions = 'Click the camera icon in the address bar, then select "Always allow" and refresh the page.';
        } else if (isFirefox) {
            instructions = 'Click the shield icon in the address bar, then enable camera access and refresh the page.';
        } else {
            instructions = 'Enable camera access in your browser settings and refresh the page.';
        }
        
        message.innerHTML = `
            <h4>Camera Access Needed</h4>
            <p>${instructions}</p>
            <button onclick="this.parentElement.remove()" style="
                background: white;
                color: #ff6b6b;
                border: none;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
            ">Got it</button>
        `;
        document.body.appendChild(message);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (message.parentElement) {
                message.remove();
            }
        }, 10000);
    }
    
    async setupFaceDetection() {
        try {
            // Check if FaceMesh is available
            if (typeof FaceMesh === 'undefined') {
                console.warn('MediaPipe FaceMesh not available, using fallback positioning');
                this.faceMesh = null;
                this.faceDetectionEnabled = false;
                this.showFaceDetectionStatus('Face detection unavailable - using manual positioning');
                return;
            }
            
            this.showFaceDetectionStatus('Initializing face detection...');
            
            this.faceMesh = new FaceMesh({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                }
            });
            
            // Enhanced options for better performance and accuracy
            this.faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.5,
                staticImageMode: false
            });
            
            this.faceMesh.onResults((results) => {
                this.onFaceDetectionResults(results);
            });
            
            // Test face detection initialization
            await this.testFaceDetection();
            
            this.faceDetectionEnabled = true;
            this.showFaceDetectionStatus('Face detection active');
            console.log('Face detection initialized successfully');
            
        } catch (error) {
            console.warn('Face detection setup failed:', error);
            this.faceMesh = null;
            this.faceDetectionEnabled = false;
            this.showFaceDetectionStatus('Face detection failed - using manual positioning');
            // Don't throw error - allow the app to continue without face detection
        }
    }
    
    async testFaceDetection() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Face detection test timeout'));
            }, 5000);
            
            const testResults = (results) => {
                clearTimeout(timeout);
                this.faceMesh.onResults(this.onFaceDetectionResults.bind(this));
                resolve();
            };
            
            this.faceMesh.onResults(testResults);
            
            // Send a test frame
            if (this.video && this.video.readyState >= 2) {
                this.faceMesh.send({ image: this.video }).catch(reject);
            } else {
                // If video isn't ready, just resolve
                clearTimeout(timeout);
                resolve();
            }
        });
    }
    
    showFaceDetectionStatus(message) {
        // Create or update status indicator
        let statusElement = document.getElementById('faceDetectionStatus');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'faceDetectionStatus';
            statusElement.style.cssText = `
                position: absolute;
                top: 10px;
                left: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                font-family: 'Poppins', sans-serif;
                z-index: 1000;
                transition: opacity 0.3s ease;
            `;
            
            const cameraContainer = document.querySelector('.camera-container');
            if (cameraContainer) {
                cameraContainer.appendChild(statusElement);
            }
        }
        
        statusElement.textContent = message;
        statusElement.style.opacity = '1';
        
        // Auto-hide after 3 seconds for success messages
        if (message.includes('active')) {
            setTimeout(() => {
                statusElement.style.opacity = '0.7';
            }, 3000);
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
    
    async loadAvailableFrames() {
        try {
            console.log('🔍 Loading available frames...');
            
            // Check if getAllProducts function is available
            if (typeof getAllProducts === 'function') {
                console.log('📡 Database connection available, fetching products...');
                const products = await getAllProducts();
                console.log(`📦 Found ${products.length} total products in database`);
                
                // Debug: Log all products to see their structure
                products.forEach((product, index) => {
                    console.log(`Product ${index + 1}:`, {
                        id: product.id,
                        title: product.title,
                        visible: product.visible,
                        hasGlbFiles: !!product.glbFiles,
                        glbFilesCount: product.glbFiles ? product.glbFiles.length : 0,
                        glbFiles: product.glbFiles
                    });
                });
                
                // Filter products that have .glb files and are visible
                this.availableFrames = products
                    .filter(product => {
                        const hasValidGlb = product.visible && 
                                          product.glbFiles && 
                                          Array.isArray(product.glbFiles) && 
                                          product.glbFiles.length > 0;
                        
                        if (!hasValidGlb) {
                            console.log(`❌ Product "${product.title}" filtered out:`, {
                                visible: product.visible,
                                hasGlbFiles: !!product.glbFiles,
                                isArray: Array.isArray(product.glbFiles),
                                length: product.glbFiles ? product.glbFiles.length : 0
                            });
                        }
                        
                        return hasValidGlb;
                    })
                    .map(product => ({
                        id: product.id,
                        name: product.title,
                        model: product.glbFiles[0].src, // Use the first .glb file
                        product: product // Store full product data for reference
                    }));
                
                console.log(`✅ Loaded ${this.availableFrames.length} frames with .glb files from database`);
                
                // If no products with .glb files found, use fallback
                if (this.availableFrames.length === 0) {
                    console.warn('⚠️ No products with .glb files found in database, using fallback frames');
                    this.availableFrames = [
                        { id: 'glasses-6', name: 'Classic Round', model: 'Assets/glasses-6.glb' },
                        { id: 'glasses-7', name: 'Modern Square', model: 'Assets/glasses-7.glb' },
                        { id: 'glasses-10', name: 'Vintage Style', model: 'Assets/glasses-10.glb' }
                    ];
                }
                
                // Listen for real-time product updates
                if (typeof listenForProductChanges === 'function') {
                    listenForProductChanges((updatedProducts) => {
                        this.updateAvailableFrames(updatedProducts);
                    });
                }
            } else {
                console.warn('⚠️ getAllProducts function not available, using fallback frames');
                // Fallback to hardcoded frames if database is not available
                this.availableFrames = [
                    { id: 'glasses-6', name: 'Classic Round', model: 'Assets/glasses-6.glb' },
                    { id: 'glasses-7', name: 'Modern Square', model: 'Assets/glasses-7.glb' },
                    { id: 'glasses-10', name: 'Vintage Style', model: 'Assets/glasses-10.glb' }
                ];
            }
            
            console.log('🎯 Final available frames:', this.availableFrames);
        } catch (error) {
            console.error('❌ Error loading frames from database:', error);
            // Fallback to hardcoded frames on error
            this.availableFrames = [
                { id: 'glasses-6', name: 'Classic Round', model: 'Assets/glasses-6.glb' },
                { id: 'glasses-7', name: 'Modern Square', model: 'Assets/glasses-7.glb' },
                { id: 'glasses-10', name: 'Vintage Style', model: 'Assets/glasses-10.glb' }
            ];
            console.log('🔄 Using fallback frames:', this.availableFrames);
        }
    }
    
    updateAvailableFrames(products) {
        // Filter products that have .glb files and are visible
        const previousCount = this.availableFrames.length;
        
        this.availableFrames = products
            .filter(product => {
                return product.visible && 
                       product.glbFiles && 
                       Array.isArray(product.glbFiles) && 
                       product.glbFiles.length > 0;
            })
            .map(product => ({
                id: product.id,
                name: product.title,
                model: product.glbFiles[0].src, // Use the first .glb file
                product: product // Store full product data for reference
            }));
        
        console.log(`Updated frames: ${previousCount} -> ${this.availableFrames.length} frames with .glb files`);
        
        // Refresh the frame selector UI
        this.loadFrameSelector();
        
        // If the currently selected frame is no longer available, clear selection
        if (this.currentFrame && !this.availableFrames.find(f => f.id === this.currentFrame.id)) {
            this.currentFrame = null;
            // Clear the 3D model
            if (this.glassesModel) {
                this.scene.remove(this.glassesModel);
                this.glassesModel = null;
            }
            // Update header title
            this.updateHeaderTitle();
        }
    }
    
    loadFrameSelector() {
        const frameSelector = document.getElementById('frameSelector');
        
        if (this.availableFrames.length === 0) {
            frameSelector.innerHTML = `
                <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.7);">
                    <div style="font-size: 48px; margin-bottom: 10px;">👓</div>
                    <div style="font-size: 14px; line-height: 1.4;">
                        No 3D models available<br>
                        <small style="font-size: 12px; opacity: 0.8;">Products need .glb files to appear here</small>
                    </div>
                </div>
            `;
            return;
        }
        
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
        if (!frame) {
            console.error('Frame not found:', frameId);
            this.show3DModelError('Selected frame not found');
            return;
        }
        
        // Store current selected frame for retry functionality
        this.currentSelectedFrame = frame;
        
        // Update UI
        document.querySelectorAll('.frame-option').forEach(option => {
            option.classList.remove('active');
        });
        const frameElement = document.querySelector(`[data-frame-id="${frameId}"]`);
        if (frameElement) {
            frameElement.classList.add('active');
        }
        
        // Load 3D model - check for glbFile property from database
        try {
            let modelPath = null;
            
            // Check for .glb file from database (glbFiles array)
            if (frame.glbFiles && frame.glbFiles.length > 0) {
                modelPath = frame.glbFiles[0]; // Use first .glb file
                console.log('Loading .glb file from database:', modelPath);
            } 
            // Fallback to model property for backward compatibility
            else if (frame.model) {
                modelPath = frame.model;
                console.log('Loading model from fallback property:', modelPath);
            }
            
            if (modelPath) {
                // Store the model path for retry functionality
                this.currentSelectedFrame.glbFile = modelPath;
                await this.loadGlassesModel(modelPath);
                this.currentFrame = frame;
                
                // Update header title with current product name
                this.updateHeaderTitle(frame.name);
            } else {
                console.warn('No 3D model found for frame:', frame);
                this.show3DModelError('No 3D model available for this product');
            }
        } catch (error) {
            console.error('Error loading frame model:', error);
            this.show3DModelError('Failed to load 3D model');
        }
    }
    
    async loadGlassesModel(modelPath) {
        return new Promise((resolve, reject) => {
            try {
                console.log('🔄 Starting 3D model loading process...');
                console.log('📁 Model path:', modelPath);
                
                // Check if GLTFLoader is available
                if (typeof THREE.GLTFLoader === 'undefined') {
                    console.warn('❌ GLTFLoader not available, 3D models will not be loaded');
                    this.show3DModelError('3D model viewer not available');
                    resolve(); // Don't reject, just continue without 3D models
                    return;
                }
                console.log('✅ GLTFLoader is available');
                
                // Check if Three.js scene is set up
                if (!this.scene || !this.camera || !this.renderer) {
                    console.error('❌ Three.js scene not properly initialized:', {
                        scene: !!this.scene,
                        camera: !!this.camera,
                        renderer: !!this.renderer
                    });
                    this.show3DModelError('3D viewer not initialized');
                    resolve();
                    return;
                }
                console.log('✅ Three.js scene is initialized');
                
                // Show loading indicator
                this.show3DModelLoading();
                
                // Validate model path
                if (!modelPath || typeof modelPath !== 'string') {
                    console.error('❌ Invalid model path:', modelPath);
                    this.show3DModelError('Invalid 3D model path');
                    resolve();
                    return;
                }
                console.log('✅ Model path is valid');
                
                const loader = new THREE.GLTFLoader();
                
                // Set a timeout for loading
                const loadingTimeout = setTimeout(() => {
                    console.error('3D model loading timeout for:', modelPath);
                    this.show3DModelError('3D model loading timeout');
                    resolve();
                }, 15000); // 15 second timeout
                
                console.log('🚀 Starting GLTFLoader.load...');
                
                loader.load(
                    modelPath,
                    (gltf) => {
                        console.log('✅ 3D model loaded successfully!', gltf);
                        clearTimeout(loadingTimeout);
                        
                        try {
                            // Validate the loaded model
                            if (!gltf || !gltf.scene) {
                                console.error('❌ Invalid 3D model structure:', gltf);
                                this.show3DModelError('Invalid 3D model format');
                                resolve();
                                return;
                            }
                            console.log('✅ GLTF structure is valid');
                            
                            // Remove previous model
                            if (this.glassesModel) {
                                console.log('🗑️ Removing previous model');
                                this.scene.remove(this.glassesModel);
                            }
                            
                            this.glassesModel = gltf.scene;
                            console.log('📦 Model assigned to glassesModel:', this.glassesModel);
                            
                            // Validate model has geometry
                            let hasGeometry = false;
                            let meshCount = 0;
                            this.glassesModel.traverse((child) => {
                                if (child.isMesh && child.geometry) {
                                    hasGeometry = true;
                                    meshCount++;
                                }
                            });
                            
                            console.log(`🔍 Model analysis: ${meshCount} meshes found, hasGeometry: ${hasGeometry}`);
                            
                            if (!hasGeometry) {
                                console.error('❌ 3D model has no valid geometry');
                                this.show3DModelError('3D model contains no geometry');
                                resolve();
                                return;
                            }
                            
                            // Configure model
                            this.glassesModel.scale.set(0.1, 0.1, 0.1); // Adjust scale as needed
                            this.glassesModel.visible = true; // Ensure model is visible
                            
                            // Set default position if face detection is not working
                            if (!this.faceDetectionEnabled || !this.faceDetected) {
                                this.glassesModel.position.set(0, 0.2, 0);
                                this.glassesModel.rotation.set(0, 0, 0);
                            }
                            
                            this.scene.add(this.glassesModel);
                            console.log('3D model loaded successfully:', modelPath);
                            
                            // Apply any existing adjustments
                            this.updateGlassesTransform();
                            
                            // Hide loading indicator and show success
                            this.hide3DModelMessage();
                            this.show3DModelSuccess('3D model loaded successfully');
                            
                            resolve();
                        } catch (processingError) {
                            console.error('Error processing loaded 3D model:', processingError);
                            this.show3DModelError('Error processing 3D model');
                            resolve();
                        }
                    },
                    (progress) => {
                        // Loading progress
                        console.log('📊 Loading progress event:', {
                            loaded: progress.loaded,
                            total: progress.total,
                            lengthComputable: progress.lengthComputable
                        });
                        
                        if (progress.total > 0) {
                            const percentage = Math.round((progress.loaded / progress.total) * 100);
                            console.log('📈 Loading progress:', percentage + '%');
                            this.update3DModelLoadingProgress(percentage);
                        } else {
                            console.log('⏳ Loading in progress (size unknown)');
                        }
                    },
                    (error) => {
                        clearTimeout(loadingTimeout);
                        console.error('❌ Failed to load 3D model:', error);
                        console.log('🔍 Error details:', {
                            message: error.message,
                            type: error.type,
                            stack: error.stack,
                            modelPath: modelPath
                        });
                        
                        // Determine error type and show appropriate message
                        let errorMessage = '3D model not available';
                        
                        if (error.message && error.message.includes('404')) {
                            errorMessage = '3D model file not found';
                            console.log('📁 File not found error - check if file exists at:', modelPath);
                        } else if (error.message && error.message.includes('network')) {
                            errorMessage = 'Network error loading 3D model';
                            console.log('🌐 Network error - check internet connection');
                        } else if (error.message && error.message.includes('parse')) {
                            errorMessage = '3D model file is corrupted';
                            console.log('💥 Parse error - file may be corrupted or invalid format');
                        } else if (error.message && error.message.includes('CORS')) {
                            errorMessage = '3D model access blocked by security policy';
                            console.log('🚫 CORS error - check server configuration');
                        } else {
                            console.log('❓ Unknown error type:', error.message);
                        }
                        
                        this.show3DModelError(errorMessage);
                        resolve(); // Don't reject, continue without the model
                    }
                );
            } catch (error) {
                console.error('GLTFLoader initialization failed:', error);
                this.show3DModelError('3D model loader initialization failed');
                resolve(); // Don't reject, continue without 3D models
            }
        });
    }
    
    updateHeaderTitle(productName) {
        const titleElement = document.getElementById('tryOnTitle');
        if (titleElement) {
            if (productName) {
                titleElement.textContent = `Virtual Try-On – ${productName}`;
            } else {
                titleElement.textContent = 'Virtual Try-On';
            }
        }
    }
    
    onFaceDetectionResults(results) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            
            // Validate landmark quality
            if (this.validateLandmarks(landmarks)) {
                this.faceDetected = true;
                
                // Apply smoothing to reduce jitter
                this.faceLandmarks = this.smoothLandmarks(landmarks);
                this.updateGlassesPosition();
                
                // Update face detection status
                this.updateFaceDetectionIndicator(true);
            } else {
                // Poor quality landmarks, keep previous position if available
                if (!this.faceLandmarks) {
                    this.faceDetected = false;
                    if (this.glassesModel) {
                        this.glassesModel.visible = false;
                    }
                }
                this.updateFaceDetectionIndicator(false);
            }
        } else {
            this.faceDetected = false;
            if (this.glassesModel) {
                this.glassesModel.visible = false;
            }
            this.updateFaceDetectionIndicator(false);
        }
        
        this.render3D();
    }
    
    validateLandmarks(landmarks) {
        if (!landmarks || landmarks.length < 468) return false;
        
        // Check key landmarks for glasses positioning
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const noseBridge = landmarks[168];
        
        // Ensure landmarks are within reasonable bounds
        const isValid = leftEye && rightEye && noseBridge &&
                       leftEye.x >= 0 && leftEye.x <= 1 &&
                       leftEye.y >= 0 && leftEye.y <= 1 &&
                       rightEye.x >= 0 && rightEye.x <= 1 &&
                       rightEye.y >= 0 && rightEye.y <= 1;
        
        if (!isValid) return false;
        
        // Check if eyes are reasonably spaced
        const eyeDistance = Math.sqrt(
            Math.pow(rightEye.x - leftEye.x, 2) + 
            Math.pow(rightEye.y - leftEye.y, 2)
        );
        
        return eyeDistance > 0.05 && eyeDistance < 0.5; // Reasonable eye distance
    }
    
    smoothLandmarks(newLandmarks) {
        if (!this.faceLandmarks) {
            // First detection, no smoothing needed
            return newLandmarks;
        }
        
        const smoothingFactor = 0.7; // Higher = more smoothing
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
        const statusElement = document.getElementById('faceDetectionStatus');
        if (statusElement && this.faceDetectionEnabled) {
            if (detected) {
                statusElement.style.background = 'rgba(76, 175, 80, 0.8)'; // Green
                statusElement.textContent = 'Face detected';
            } else {
                statusElement.style.background = 'rgba(255, 152, 0, 0.8)'; // Orange
                statusElement.textContent = 'Looking for face...';
            }
        }
    }
    
    updateGlassesPosition() {
        if (!this.glassesModel || !this.faceLandmarks) return;
        
        // Get enhanced face landmarks for better positioning
        const leftEyeOuter = this.faceLandmarks[33];   // Left eye outer corner
        const leftEyeInner = this.faceLandmarks[133];  // Left eye inner corner
        const rightEyeOuter = this.faceLandmarks[263]; // Right eye outer corner
        const rightEyeInner = this.faceLandmarks[362]; // Right eye inner corner
        const noseBridge = this.faceLandmarks[168];    // Nose bridge
        const noseTop = this.faceLandmarks[6];         // Nose top
        const foreheadCenter = this.faceLandmarks[9];  // Forehead center
        
        // Calculate eye centers for more accurate positioning
        const leftEyeCenter = {
            x: (leftEyeOuter.x + leftEyeInner.x) / 2,
            y: (leftEyeOuter.y + leftEyeInner.y) / 2,
            z: (leftEyeOuter.z + leftEyeInner.z) / 2
        };
        
        const rightEyeCenter = {
            x: (rightEyeOuter.x + rightEyeInner.x) / 2,
            y: (rightEyeOuter.y + rightEyeInner.y) / 2,
            z: (rightEyeOuter.z + rightEyeInner.z) / 2
        };
        
        // Calculate inter-pupillary distance for scaling
        const eyeDistance = Math.sqrt(
            Math.pow(rightEyeCenter.x - leftEyeCenter.x, 2) + 
            Math.pow(rightEyeCenter.y - leftEyeCenter.y, 2)
        );
        
        // Calculate glasses center position (slightly above eye line)
        const glassesCenter = {
            x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
            y: (leftEyeCenter.y + rightEyeCenter.y) / 2 - 0.01, // Slightly above eyes
            z: (leftEyeCenter.z + rightEyeCenter.z) / 2
        };
        
        // Convert to Three.js coordinates
        const ndcX = (glassesCenter.x * 2 - 1);
        const ndcY = -(glassesCenter.y * 2 - 1);
        const ndcZ = glassesCenter.z * 2;
        
        // Position the glasses with depth consideration
        this.glassesModel.position.x = ndcX * 1.5;
        this.glassesModel.position.y = ndcY * 1.5;
        this.glassesModel.position.z = ndcZ * 0.5;
        
        // Enhanced scaling based on face size and distance
        const faceWidth = Math.abs(rightEyeOuter.x - leftEyeOuter.x);
        const baseScale = Math.max(0.3, Math.min(2.0, faceWidth * 3.5)); // Clamp scale
        this.glassesModel.scale.set(baseScale, baseScale, baseScale);
        
        // Calculate rotation based on eye alignment and face orientation
        const eyeAngle = Math.atan2(
            rightEyeCenter.y - leftEyeCenter.y, 
            rightEyeCenter.x - leftEyeCenter.x
        );
        
        // Add slight head tilt compensation
        const headTilt = this.calculateHeadTilt();
        this.glassesModel.rotation.z = eyeAngle + headTilt;
        
        // Add subtle Y-axis rotation for face angle
        const faceAngle = this.calculateFaceAngle();
        this.glassesModel.rotation.y = faceAngle * 0.3; // Subtle rotation
        
        this.glassesModel.visible = true;
        this.updateGlassesTransform();
    }
    
    calculateHeadTilt() {
        if (!this.faceLandmarks) return 0;
        
        // Use forehead and chin landmarks to detect head tilt
        const foreheadLeft = this.faceLandmarks[21];
        const foreheadRight = this.faceLandmarks[251];
        
        if (foreheadLeft && foreheadRight) {
            return Math.atan2(
                foreheadRight.y - foreheadLeft.y,
                foreheadRight.x - foreheadLeft.x
            ) * 0.2; // Subtle tilt adjustment
        }
        
        return 0;
    }
    
    calculateFaceAngle() {
        if (!this.faceLandmarks) return 0;
        
        // Use nose and face outline to estimate face angle
        const noseCenter = this.faceLandmarks[1];
        const leftCheek = this.faceLandmarks[234];
        const rightCheek = this.faceLandmarks[454];
        
        if (noseCenter && leftCheek && rightCheek) {
            const leftDistance = Math.abs(noseCenter.x - leftCheek.x);
            const rightDistance = Math.abs(noseCenter.x - rightCheek.x);
            const asymmetry = (rightDistance - leftDistance) / (rightDistance + leftDistance);
            
            return Math.max(-0.5, Math.min(0.5, asymmetry * 2)); // Clamp rotation
        }
        
        return 0;
    }
    
    updateGlassesTransform() {
        if (!this.glassesModel) return;
        
        // Store original values before applying adjustments
        const originalScale = this.glassesModel.scale.x;
        const originalPosX = this.glassesModel.position.x;
        const originalPosY = this.glassesModel.position.y;
        const originalRotZ = this.glassesModel.rotation.z;
        
        // Apply user adjustments
        const adjustedScale = originalScale * this.adjustments.size;
        this.glassesModel.scale.set(adjustedScale, adjustedScale, adjustedScale);
        
        // Apply position adjustments
        this.glassesModel.position.x = originalPosX + this.adjustments.positionX * 0.01;
        this.glassesModel.position.y = originalPosY + this.adjustments.positionY * 0.01;
        
        // Apply rotation adjustment
        this.glassesModel.rotation.z = originalRotZ + (this.adjustments.rotation * Math.PI) / 180;
    }
    
    // Fallback positioning for when face detection is not available
    setDefaultGlassesPosition() {
        if (!this.glassesModel) return;
        
        // Default position in center of screen
        this.glassesModel.position.set(0, 0.2, 0);
        this.glassesModel.scale.set(1, 1, 1);
        this.glassesModel.rotation.set(0, 0, 0);
        this.glassesModel.visible = true;
        
        this.updateGlassesTransform();
        
        // Show manual controls hint
        this.showManualControlsHint();
    }
    
    showManualControlsHint() {
        const hintElement = document.createElement('div');
        hintElement.id = 'manualControlsHint';
        hintElement.style.cssText = `
            position: absolute;
            bottom: 10px;
            left: 10px;
            background: rgba(255, 193, 7, 0.9);
            color: black;
            padding: 10px 15px;
            border-radius: 6px;
            font-size: 13px;
            font-family: 'Poppins', sans-serif;
            z-index: 1000;
            max-width: 250px;
            line-height: 1.4;
        `;
        hintElement.innerHTML = `
            <strong>Manual Mode</strong><br>
            Use the controls on the right to adjust glasses position, size, and rotation.
        `;
        
        const cameraContainer = document.querySelector('.camera-container');
        if (cameraContainer) {
            // Remove existing hint
            const existingHint = document.getElementById('manualControlsHint');
            if (existingHint) existingHint.remove();
            
            cameraContainer.appendChild(hintElement);
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                if (hintElement.parentNode) {
                    hintElement.style.opacity = '0';
                    setTimeout(() => hintElement.remove(), 300);
                }
            }, 5000);
        }
    }
    
    // Enhanced control setup with face detection toggle
    enhanceControls() {
        // Add face detection toggle
        const controlsPanel = document.querySelector('.controls-panel');
        if (controlsPanel && this.faceDetectionEnabled) {
            const faceDetectionToggle = document.createElement('div');
            faceDetectionToggle.className = 'control-section';
            faceDetectionToggle.innerHTML = `
                <div class="control-title">Face Detection</div>
                <label style="display: flex; align-items: center; color: white; cursor: pointer;">
                    <input type="checkbox" id="faceDetectionToggle" checked style="margin-right: 8px;">
                    Auto-position glasses
                </label>
                <small style="color: rgba(255,255,255,0.7); font-size: 11px; margin-top: 5px; display: block;">
                    Uncheck to use manual controls only
                </small>
            `;
            
            // Insert after the first control section
            const firstSection = controlsPanel.querySelector('.control-section');
            if (firstSection) {
                firstSection.parentNode.insertBefore(faceDetectionToggle, firstSection.nextSibling);
            } else {
                controlsPanel.appendChild(faceDetectionToggle);
            }
            
            // Add toggle functionality
            const toggle = document.getElementById('faceDetectionToggle');
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    this.faceDetectionActive = e.target.checked;
                    if (!this.faceDetectionActive) {
                        this.setDefaultGlassesPosition();
                    }
                });
            }
        }
    }
    
    render3D() {
        if (this.renderer && this.scene && this.camera) {
            // Ensure glasses model is visible if it exists
            if (this.glassesModel && !this.glassesModel.visible) {
                this.glassesModel.visible = true;
            }
            
            this.renderer.render(this.scene, this.camera);
        }
    }

    // 3D Model UI Message Methods
    show3DModelLoading() {
        this.hide3DModelMessage(); // Clear any existing messages
        
        const messageContainer = this.get3DModelMessageContainer();
        messageContainer.innerHTML = `
            <div class="model-loading">
                <div class="loading-spinner"></div>
                <span>Loading 3D model...</span>
                <div class="loading-progress">
                    <div class="progress-bar" id="model-progress-bar"></div>
                </div>
            </div>
        `;
        messageContainer.style.display = 'block';
    }

    update3DModelLoadingProgress(percentage) {
        const progressBar = document.getElementById('model-progress-bar');
        if (progressBar) {
            progressBar.style.width = percentage + '%';
        }
        
        const loadingText = document.querySelector('.model-loading span');
        if (loadingText) {
            loadingText.textContent = `Loading 3D model... ${percentage}%`;
        }
    }

    show3DModelError(message) {
        this.hide3DModelMessage(); // Clear any existing messages
        
        const messageContainer = this.get3DModelMessageContainer();
        messageContainer.innerHTML = `
            <div class="model-error">
                <div class="error-icon">⚠️</div>
                <span>${message}</span>
                <button class="retry-btn" onclick="virtualTryOn.retryModelLoading()">Retry</button>
            </div>
        `;
        messageContainer.style.display = 'block';
        
        // Auto-hide error after 8 seconds
        setTimeout(() => {
            this.hide3DModelMessage();
        }, 8000);
    }

    show3DModelSuccess(message) {
        this.hide3DModelMessage(); // Clear any existing messages
        
        const messageContainer = this.get3DModelMessageContainer();
        messageContainer.innerHTML = `
            <div class="model-success">
                <div class="success-icon">✅</div>
                <span>${message}</span>
            </div>
        `;
        messageContainer.style.display = 'block';
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
            this.hide3DModelMessage();
        }, 3000);
    }

    hide3DModelMessage() {
        const messageContainer = this.get3DModelMessageContainer();
        messageContainer.style.display = 'none';
        messageContainer.innerHTML = '';
    }

    get3DModelMessageContainer() {
        let container = document.getElementById('model-message-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'model-message-container';
            container.className = 'model-message-overlay';
            container.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                z-index: 1000;
                font-family: 'Poppins', sans-serif;
                min-width: 250px;
                display: none;
            `;
            
            // Insert into the camera container
            const cameraContainer = document.getElementById('camera-container') || 
                                  document.querySelector('.camera-container') || 
                                  document.body;
            cameraContainer.appendChild(container);
            
            // Add CSS styles for the message components
            this.addMessageStyles();
        }
        return container;
    }

    addMessageStyles() {
        if (document.getElementById('model-message-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'model-message-styles';
        style.textContent = `
            .model-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 15px;
            }
            
            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-top: 4px solid #fff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .loading-progress {
                width: 200px;
                height: 6px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 3px;
                overflow: hidden;
            }
            
            .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #4CAF50, #8BC34A);
                width: 0%;
                transition: width 0.3s ease;
            }
            
            .model-error {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 15px;
            }
            
            .error-icon {
                font-size: 32px;
            }
            
            .retry-btn {
                background: #ff6b6b;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 5px;
                cursor: pointer;
                font-family: 'Poppins', sans-serif;
                transition: background 0.3s ease;
            }
            
            .retry-btn:hover {
                background: #ff5252;
            }
            
            .model-success {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 15px;
            }
            
            .success-icon {
                font-size: 32px;
            }
        `;
        document.head.appendChild(style);
    }

    retryModelLoading() {
        if (this.currentSelectedFrame && this.currentSelectedFrame.glbFile) {
            console.log('Retrying 3D model loading...');
            this.loadGlassesModel(this.currentSelectedFrame.glbFile);
        } else {
            this.show3DModelError('No 3D model to retry loading');
        }
    }
    
    startDetection() {
        const detect = async () => {
            try {
                const currentTime = performance.now();
                
                if (this.video.readyState === 4) {
                    // Throttle face detection for better performance
                    const shouldDetect = this.faceMesh && 
                                       this.faceDetectionEnabled && 
                                       this.faceDetectionActive &&
                                       (currentTime - this.lastDetectionTime) >= this.detectionInterval;
                    
                    if (shouldDetect) {
                        this.lastDetectionTime = currentTime;
                        await this.faceMesh.send({ image: this.video });
                    }
                    
                    // Always render the 3D scene for smooth animation
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
    
    // Performance monitoring
    getPerformanceStats() {
        return {
            faceDetectionEnabled: this.faceDetectionEnabled,
            faceDetectionActive: this.faceDetectionActive,
            faceDetected: this.faceDetected,
            detectionInterval: this.detectionInterval,
            glassesVisible: this.glassesModel ? this.glassesModel.visible : false
        };
    }
    
    // Debug method to check 3D model status
    debug3DModel() {
        const status = {
            hasGlassesModel: !!this.glassesModel,
            modelVisible: this.glassesModel ? this.glassesModel.visible : false,
            modelPosition: this.glassesModel ? this.glassesModel.position : null,
            modelScale: this.glassesModel ? this.glassesModel.scale : null,
            sceneChildren: this.scene ? this.scene.children.length : 0,
            rendererSize: this.renderer ? this.renderer.getSize(new THREE.Vector2()) : null,
            cameraPosition: this.camera ? this.camera.position : null
        };
        
        console.log('3D Model Debug Status:', status);
        
        // Force model to be visible if it exists
        if (this.glassesModel) {
            this.glassesModel.visible = true;
            console.log('Forced model visibility to true');
        }
        
        return status;
    }
    
    // Adjust performance based on device capabilities
    adjustPerformance() {
        // Monitor frame rate and adjust detection frequency
        const now = performance.now();
        if (this.lastFrameTime) {
            const frameTime = now - this.lastFrameTime;
            const fps = 1000 / frameTime;
            
            // If FPS is low, reduce detection frequency
            if (fps < 20) {
                this.detectionInterval = Math.min(100, this.detectionInterval + 10);
            } else if (fps > 45) {
                this.detectionInterval = Math.max(16, this.detectionInterval - 5);
            }
        }
        this.lastFrameTime = now;
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
        // Use the updateHeaderTitle method if virtualTryOn is available
        if (virtualTryOn && virtualTryOn.updateHeaderTitle) {
            virtualTryOn.updateHeaderTitle(productName);
        } else {
            // Fallback for when virtualTryOn is not yet initialized
            const titleElement = document.getElementById('tryOnTitle');
            if (titleElement) {
                titleElement.textContent = `Virtual Try-On – ${productName}`;
            }
        }
    }
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', () => {
    getFrameFromURL();
});

// Function to navigate to home page when header title is clicked
function navigateToHome() {
    window.location.href = 'index.html';
}