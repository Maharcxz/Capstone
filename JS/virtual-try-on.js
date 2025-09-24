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
        
        // Fallback models for different scenarios
        this.fallbackModels = [
            'Assets/base.glb',
            'Assets/base_basic_pbr.glb',
            'Assets/base_basic_shaded.glb'
        ];
        
        // Enhanced 3D model management
        this.modelLoadAttempts = 0;
        this.maxLoadAttempts = 3;
        this.modelLoadTimeout = 15000; // 15 seconds
        this.fallbackModelUsed = false;
        this.webglSupported = false;
        this.threeJSReady = false;
        
        // Get the assigned GLB model for this product
        this.assignedGLBModel = this.frameId ? this.frameToGLBMapping[this.frameId] : null;
        this.currentGLBModel = null;
        
        // Device capabilities and performance settings
        this.deviceCapabilities = window.deviceCapabilities || {};
        this.threeJSConfig = window.threeJSConfig || {};
        this.performanceMode = this.deviceCapabilities.isMobile ? 'low' : 'high';
        this.lastRenderTime = 0;
        this.performanceStats = null;
        
        // Adaptive quality settings based on device capabilities
        this.qualitySettings = {
            low: {
                renderScale: 0.5,
                targetFPS: 30,
                maxParticles: 50,
                shadowMapSize: 512,
                antialias: false,
                precision: 'lowp'
            },
            medium: {
                renderScale: 0.75,
                targetFPS: 45,
                maxParticles: 100,
                shadowMapSize: 1024,
                antialias: true,
                precision: 'mediump'
            },
            high: {
                renderScale: 1.0,
                targetFPS: 60,
                maxParticles: 200,
                shadowMapSize: 2048,
                antialias: true,
                precision: 'highp'
            }
        };
        
        // Initialize when ready
        this.waitForDependencies().then(() => this.init());
    }
    
    async waitForDependencies() {
        // Add browser compatibility polyfills first
        this.addBrowserPolyfills();
        
        // Check browser compatibility
        const browserSupport = this.checkBrowserCompatibility();
        if (!browserSupport.supported) {
            this.showBrowserCompatibilityError(browserSupport.issues);
            return;
        }
        
        // Wait for WebGL and Three.js to be ready
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (attempts < maxAttempts) {
            if (typeof window.webglSupported !== 'undefined' && typeof window.threeJSLoaded !== 'undefined') {
                // Handle both object and boolean values for webglSupported
                this.webglSupported = window.webglSupported && (window.webglSupported.supported !== false);
                this.threeJSReady = window.threeJSLoaded;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (attempts >= maxAttempts) {
            console.warn('Timeout waiting for dependencies, proceeding with limited functionality');
            this.webglSupported = false;
            this.threeJSReady = false;
        }
    }
    
    addBrowserPolyfills() {
        // Add performance.now() polyfill for older browsers
        if (!window.performance || !window.performance.now) {
            window.performance = window.performance || {};
            window.performance.now = function() {
                return Date.now();
            };
        }
        
        // Add requestAnimationFrame polyfill
        if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = function(callback) {
                return setTimeout(callback, 1000 / 60);
            };
        }
        
        // Add cancelAnimationFrame polyfill
        if (!window.cancelAnimationFrame) {
            window.cancelAnimationFrame = function(id) {
                clearTimeout(id);
            };
        }
        
        // Add getUserMedia polyfill
        if (!navigator.mediaDevices) {
            navigator.mediaDevices = {};
        }
        
        if (!navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia = function(constraints) {
                const getUserMedia = navigator.webkitGetUserMedia || 
                                   navigator.mozGetUserMedia || 
                                   navigator.msGetUserMedia;
                
                if (!getUserMedia) {
                    return Promise.reject(new Error('getUserMedia is not supported'));
                }
                
                return new Promise((resolve, reject) => {
                    getUserMedia.call(navigator, constraints, resolve, reject);
                });
            };
        }
        
        console.log('Browser polyfills added');
    }
    
    checkBrowserCompatibility() {
        const issues = [];
        let supported = true;
        
        // Check for required APIs
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            issues.push('Camera access (getUserMedia) not supported');
            supported = false;
        }
        
        if (!window.WebGLRenderingContext && !window.WebGL2RenderingContext) {
            issues.push('WebGL not supported');
            supported = false;
        }
        
        if (!window.Worker) {
            issues.push('Web Workers not supported');
            // Not critical, but log it
            console.warn('Web Workers not supported - some features may be slower');
        }
        
        // Check browser version compatibility
        const userAgent = navigator.userAgent;
        const browserInfo = this.getBrowserInfo(userAgent);
        
        if (browserInfo.name === 'Internet Explorer') {
            issues.push('Internet Explorer is not supported');
            supported = false;
        }
        
        if (browserInfo.name === 'Chrome' && browserInfo.version < 60) {
            issues.push('Chrome version too old (minimum: 60)');
            supported = false;
        }
        
        if (browserInfo.name === 'Firefox' && browserInfo.version < 55) {
            issues.push('Firefox version too old (minimum: 55)');
            supported = false;
        }
        
        if (browserInfo.name === 'Safari' && browserInfo.version < 11) {
            issues.push('Safari version too old (minimum: 11)');
            supported = false;
        }
        
        return { supported, issues, browserInfo };
    }
    
    getBrowserInfo(userAgent) {
        let name = 'Unknown';
        let version = 0;
        
        if (userAgent.indexOf('Chrome') > -1) {
            name = 'Chrome';
            const match = userAgent.match(/Chrome\/(\d+)/);
            version = match ? parseInt(match[1]) : 0;
        } else if (userAgent.indexOf('Firefox') > -1) {
            name = 'Firefox';
            const match = userAgent.match(/Firefox\/(\d+)/);
            version = match ? parseInt(match[1]) : 0;
        } else if (userAgent.indexOf('Safari') > -1) {
            name = 'Safari';
            const match = userAgent.match(/Version\/(\d+)/);
            version = match ? parseInt(match[1]) : 0;
        } else if (userAgent.indexOf('Edge') > -1) {
            name = 'Edge';
            const match = userAgent.match(/Edge\/(\d+)/);
            version = match ? parseInt(match[1]) : 0;
        } else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident') > -1) {
            name = 'Internet Explorer';
        }
        
        return { name, version };
    }
    
    showBrowserCompatibilityError(issues) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'browser-compatibility-error';
        errorContainer.innerHTML = `
            <div class="error-content">
                <h3>Browser Compatibility Issues</h3>
                <p>Your browser doesn't support some required features:</p>
                <ul>
                    ${issues.map(issue => `<li>${issue}</li>`).join('')}
                </ul>
                <p>Please try using a modern browser like:</p>
                <ul>
                    <li>Chrome 60+</li>
                    <li>Firefox 55+</li>
                    <li>Safari 11+</li>
                    <li>Edge 79+</li>
                </ul>
            </div>
        `;
        
        // Add styles
        errorContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: 'Poppins', sans-serif;
        `;
        
        errorContainer.querySelector('.error-content').style.cssText = `
            background: #1a1a1a;
            padding: 2rem;
            border-radius: 8px;
            max-width: 500px;
            text-align: center;
        `;
        
        document.body.appendChild(errorContainer);
    }
    
    async init() {
        try {
            // Check WebGL support first
            if (!this.webglSupported) {
                this.showWebGLError();
                return;
            }
            
            await this.setupCamera();
            await this.setupFaceDetection();
            
            // Only setup 3D if Three.js is ready
            if (this.threeJSReady) {
                this.setupThreeJS();
                await this.loadAssignedGLBModelWithRetry();
            } else {
                this.show3DModelError('3D rendering unavailable - Three.js failed to load');
            }
            
            this.setupControls();
            this.enhanceControls();
            
            this.hideLoading();
            
            // Set up fallback if face detection is not available
            if (!this.faceDetectionEnabled) {
                this.setDefaultGlassesPosition();
            }
            
            this.startDetection();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize virtual try-on. Please check camera permissions and refresh the page.');
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
            
            // Get quality settings for current performance mode
            const quality = this.qualitySettings[this.performanceMode];
            console.log(`Setting up Three.js with ${this.performanceMode} quality mode:`, quality);
            
            // Create Three.js scene
            this.scene = new THREE.Scene();
            
            // Ensure canvas has proper dimensions
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            
            // Create camera with adaptive FOV
            const fov = this.deviceCapabilities.isMobile ? 70 : 75;
            this.camera = new THREE.PerspectiveCamera(
                fov,
                this.canvas.width / this.canvas.height,
                0.1,
                1000
            );
            this.camera.position.set(0, 0, 5);
            
            // Create renderer with adaptive settings
            const rendererOptions = {
                canvas: this.canvas,
                alpha: true,
                antialias: quality.antialias,
                precision: quality.precision,
                powerPreference: this.deviceCapabilities.isMobile ? 'low-power' : 'high-performance',
                preserveDrawingBuffer: true // Important for capturing screenshots
            };
            
            // Use optimal WebGL context if available
            if (this.threeJSConfig.contextType) {
                rendererOptions.context = this.threeJSConfig.contextType;
            }
            
            this.renderer = new THREE.WebGLRenderer(rendererOptions);
            
            // Set proper render size
            this.renderer.setSize(this.canvas.width, this.canvas.height, false);
            this.renderer.setClearColor(0x000000, 0); // Transparent background
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
            
            // Configure shadow mapping if supported
            if (quality.shadowMapSize > 0 && !this.deviceCapabilities.isMobile) {
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                this.renderer.shadowMap.setSize(quality.shadowMapSize, quality.shadowMapSize);
            }
            
            // Enhanced AR-realistic lighting setup
            const ambientIntensity = this.deviceCapabilities.isMobile ? 0.4 : 0.3;
            this.ambientLight = new THREE.AmbientLight(0xffffff, ambientIntensity);
            this.scene.add(this.ambientLight);
            
            // Main directional light (simulates room lighting)
            this.mainLight = new THREE.DirectionalLight(0xffffff, 0.6);
            this.mainLight.position.set(0, 1, 0.5);
            this.scene.add(this.mainLight);
            
            // Secondary fill light (reduces harsh shadows)
            this.fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
            this.fillLight.position.set(-0.5, 0.5, 1);
            this.scene.add(this.fillLight);
            
            // Rim light for depth and realism
            this.rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
            this.rimLight.position.set(0, -0.5, -1);
            this.scene.add(this.rimLight);
            
            // Enable shadows for main light on higher quality settings
            if (quality.shadowMapSize > 0 && !this.deviceCapabilities.isMobile) {
                this.mainLight.castShadow = true;
                this.mainLight.shadow.mapSize.width = quality.shadowMapSize;
                this.mainLight.shadow.mapSize.height = quality.shadowMapSize;
                this.mainLight.shadow.camera.near = 0.1;
                this.mainLight.shadow.camera.far = 10;
                this.mainLight.shadow.camera.left = -2;
                this.mainLight.shadow.camera.right = 2;
                this.mainLight.shadow.camera.top = 2;
                this.mainLight.shadow.camera.bottom = -2;
                this.mainLight.shadow.bias = -0.0001;
            }
            
            // Add environment mapping for realistic reflections
            this.setupEnvironmentMapping();
            
            // Add debug helpers (can be removed in production)
            this.addDebugHelpers();
            
            console.log(`Three.js initialized successfully with ${this.performanceMode} quality settings`);
            console.log('Render size:', this.canvas.width, 'x', this.canvas.height);
            console.log('Device capabilities:', this.deviceCapabilities);
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
    
    setupEnvironmentMapping() {
        try {
            // Create a simple environment map for realistic reflections
            const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
            
            // Create a simple gradient environment
            const envMapSize = this.deviceCapabilities.isMobile ? 64 : 128;
            const envMapTexture = new THREE.DataTexture(
                new Uint8Array(envMapSize * envMapSize * 4),
                envMapSize,
                envMapSize,
                THREE.RGBAFormat
            );
            
            // Fill with gradient data for realistic environment lighting
            const data = envMapTexture.image.data;
            for (let i = 0; i < data.length; i += 4) {
                const y = Math.floor((i / 4) / envMapSize) / envMapSize;
                const intensity = Math.max(0.2, 1.0 - y); // Brighter at top
                
                data[i] = intensity * 255;     // R
                data[i + 1] = intensity * 255; // G
                data[i + 2] = intensity * 255; // B
                data[i + 3] = 255;             // A
            }
            
            envMapTexture.needsUpdate = true;
            this.envMap = pmremGenerator.fromEquirectangular(envMapTexture).texture;
            
            // Set scene environment for realistic lighting
            this.scene.environment = this.envMap;
            
            pmremGenerator.dispose();
            console.log('Environment mapping setup complete');
        } catch (error) {
            console.warn('Environment mapping setup failed:', error);
        }
    }
    
    updateDynamicLighting() {
        if (!this.faceLandmarks || !this.mainLight || !this.fillLight) return;
        
        // Calculate face orientation for dynamic lighting
        const faceAngle = this.calculateFaceAngle();
        const headPitch = this.calculateHeadPitch();
        
        // Adjust main light position based on face orientation
        const lightOffset = 0.3;
        this.mainLight.position.x = Math.sin(faceAngle) * lightOffset;
        this.mainLight.position.y = 1 + Math.sin(headPitch) * lightOffset;
        this.mainLight.position.z = 0.5 + Math.cos(faceAngle) * lightOffset;
        
        // Adjust fill light to complement main light
        this.fillLight.position.x = -this.mainLight.position.x * 0.5;
        this.fillLight.position.y = this.mainLight.position.y * 0.8;
        
        // Adjust ambient light intensity based on face visibility
        const faceVisibility = Math.cos(faceAngle) * Math.cos(headPitch);
        const ambientIntensity = Math.max(0.2, Math.min(0.5, 0.3 + faceVisibility * 0.2));
        this.ambientLight.intensity = ambientIntensity;
    }
    
    addDebugHelpers() {
        // Add a simple wireframe cube to verify 3D rendering is working
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });
        this.debugCube = new THREE.Mesh(geometry, material);
        this.debugCube.position.set(1, 1, 0);
        this.scene.add(this.debugCube);
        
        // Add coordinate axes helper
        const axesHelper = new THREE.AxesHelper(1);
        this.scene.add(axesHelper);
        
        console.log('Debug helpers added: wireframe cube and axes');
    }
    
    async loadAssignedGLBModelWithRetry() {
        console.log('🔍 Loading assigned GLB model with retry mechanism...');
        console.log('🔍 Frame ID:', this.frameId);
        console.log('🔍 Product Name:', this.productName);
        console.log('🔍 Assigned GLB Model:', this.assignedGLBModel);
        
        // Update header title with product name
        if (this.productName) {
            this.updateHeaderTitle(`Virtual Try-On - ${this.productName}`);
        }
        
        if (!this.assignedGLBModel) {
            const message = this.frameId ? 
                `❌ No GLB model found for frame: ${this.frameId}` : 
                '⚠️ No frame specified in URL parameters';
            console.warn(message);
            await this.loadFallbackModel();
            return;
        }
        
        // Try to load the assigned model with retry mechanism
        for (let attempt = 1; attempt <= this.maxLoadAttempts; attempt++) {
            try {
                this.modelLoadAttempts = attempt;
                this.show3DModelLoading(`Loading 3D model (attempt ${attempt}/${this.maxLoadAttempts})...`);
                
                const success = await this.loadGlassesModel(this.assignedGLBModel.path);
                if (success) {
                    this.currentGLBModel = this.assignedGLBModel;
                    this.showModelControls();
                    this.show3DModelSuccess(`✅ Loaded ${this.assignedGLBModel.name} for ${this.productName || 'product'}`);
                    return;
                }
            } catch (error) {
                console.error(`Model loading attempt ${attempt} failed:`, error);
                if (attempt === this.maxLoadAttempts) {
                    console.log('All attempts failed, trying fallback models...');
                    await this.loadFallbackModel();
                    return;
                }
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }
    
    async loadFallbackModel() {
        console.log('Loading fallback model...');
        this.fallbackModelUsed = true;
        
        for (const fallbackPath of this.fallbackModels) {
            try {
                this.show3DModelLoading('Loading fallback 3D model...');
                const success = await this.loadGlassesModel(fallbackPath);
                if (success) {
                    this.showFallbackNotice();
                    this.showModelControls();
                    return;
                }
            } catch (error) {
                console.error('Fallback model failed:', fallbackPath, error);
            }
        }
        
        // If all fallbacks fail, show error with retry option
        this.showModelLoadError();
    }
    
    showFallbackNotice() {
        const notice = document.createElement('div');
        notice.className = 'fallback-model';
        notice.innerHTML = '⚠️ Using fallback 3D model - original model unavailable';
        document.querySelector('.controls-panel').prepend(notice);
        
        setTimeout(() => {
            if (notice.parentNode) {
                notice.parentNode.removeChild(notice);
            }
        }, 5000);
    }
    
    showModelLoadError() {
        const errorOverlay = document.createElement('div');
        errorOverlay.className = 'model-error-overlay';
        errorOverlay.innerHTML = `
            <h3>3D Model Loading Failed</h3>
            <p>Unable to load the 3D glasses model.</p>
            <p>This might be due to:</p>
            <ul style="text-align: left; margin: 10px 0;">
                <li>Network connectivity issues</li>
                <li>Server problems</li>
                <li>Browser compatibility</li>
            </ul>
            <button class="retry-button" onclick="virtualTryOn.retryModelLoading()">Retry Loading</button>
            <button class="retry-button" onclick="virtualTryOn.hideModelError()" style="background: #666; margin-left: 10px;">Continue Without 3D</button>
        `;
        document.querySelector('.camera-container').appendChild(errorOverlay);
    }
    
    hideModelError() {
        const errorOverlay = document.querySelector('.model-error-overlay');
        if (errorOverlay) {
            errorOverlay.remove();
        }
    }
    
    async retryModelLoading() {
        this.hideModelError();
        this.modelLoadAttempts = 0;
        await this.loadAssignedGLBModelWithRetry();
    }
    

    


    

    
    showModelControls() {
        const modelControls = document.getElementById('modelControls');
        if (modelControls) {
            modelControls.style.display = 'block';
        }
    }
    
    hideModelControls() {
        const modelControls = document.getElementById('modelControls');
        if (modelControls) {
            modelControls.style.display = 'none';
        }
    }
    
    updateModelScale(scale) {
        if (this.glassesModel) {
            const scaleValue = parseFloat(scale);
            this.glassesModel.scale.set(scaleValue * 0.1, scaleValue * 0.1, scaleValue * 0.1);
            console.log('Model scale updated to:', scaleValue);
        }
    }
    
    updateModelPositionY(positionY) {
        if (this.glassesModel) {
            const yValue = parseFloat(positionY);
            this.glassesModel.position.y = yValue;
            console.log('Model position Y updated to:', yValue);
        }
    }
    
    updateModelRotationY(rotationY) {
        if (this.glassesModel) {
            const rotValue = parseFloat(rotationY) * (Math.PI / 180); // Convert to radians
            this.glassesModel.rotation.y = rotValue;
            console.log('Model rotation Y updated to:', rotationY, 'degrees');
        }
    }
    
    resetModelTransform() {
        if (this.glassesModel) {
            this.glassesModel.scale.set(0.1, 0.1, 0.1);
            this.glassesModel.position.set(0, 0.2, 0);
            this.glassesModel.rotation.set(0, 0, 0);
            
            // Reset UI controls
            document.getElementById('modelScale').value = 1.0;
            document.getElementById('modelPositionY').value = 0;
            document.getElementById('modelRotationY').value = 0;
            
            console.log('Model transform reset to defaults');
        }
    }
    

    
    async loadGlassesModel(modelPath) {
        console.log('🔄 Loading glasses model with modern implementation:', modelPath);
        
        // Comprehensive Three.js availability check
        if (!this.validateThreeJSEnvironment()) {
            return false;
        }
        
        try {
            // Remove existing glasses model
            if (this.glassesModel) {
                console.log('🗑️ Removing existing glasses model');
                this.scene.remove(this.glassesModel);
                this.glassesModel = null;
            }
            
            // Show loading state
            this.show3DModelLoading();
            
            // Load the model with enhanced retry logic
            const gltf = await this.loadGLTFWithRetry(modelPath, 3);
            
            // Process and configure the loaded model
            await this.processLoadedGLTF(gltf, modelPath);
            
            console.log('🎉 Glasses model loading completed successfully!');
            return true;
            
        } catch (error) {
            console.error('❌ Critical error loading glasses model:', error);
            this.handleGLTFLoadingError(error, modelPath);
            return false;
        }
    }
    
    validateThreeJSEnvironment() {
        // Check if THREE is available
        if (typeof THREE === 'undefined') {
            console.error('❌ THREE.js not available');
            this.show3DModelError('3D model viewer not available - THREE.js missing');
            return false;
        }
        
        // Check if GLTFLoader is available
        if (typeof THREE.GLTFLoader === 'undefined') {
            console.error('❌ GLTFLoader not available');
            console.log('Available THREE properties:', Object.keys(THREE));
            this.show3DModelError('3D model viewer not available - GLTFLoader missing');
            return false;
        }
        
        // Check if Three.js scene is set up
        if (!this.scene || !this.camera || !this.renderer) {
            console.error('❌ Three.js scene not properly initialized:', {
                scene: !!this.scene,
                camera: !!this.camera,
                renderer: !!this.renderer
            });
            this.show3DModelError('3D scene not initialized');
            return false;
        }
        
        console.log('✅ Three.js environment validation passed');
        return true;
    }
    
    async loadGLTFWithRetry(modelPath, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 GLTF loading attempt ${attempt}/${maxRetries}`);
                
                const loader = new THREE.GLTFLoader();
                
                const gltf = await new Promise((resolve, reject) => {
                    const timeoutId = setTimeout(() => {
                        reject(new Error(`Loading timeout after 30 seconds (attempt ${attempt})`));
                    }, 30000);
                    
                    loader.load(
                        modelPath,
                        (gltf) => {
                            clearTimeout(timeoutId);
                            console.log(`✅ GLTF loaded successfully on attempt ${attempt}:`, gltf);
                            resolve(gltf);
                        },
                        (progress) => {
                            if (progress.total > 0) {
                                const percent = (progress.loaded / progress.total * 100).toFixed(1);
                                console.log(`📊 Loading progress (attempt ${attempt}): ${percent}%`);
                                this.update3DModelLoadingProgress(Math.round(percent));
                            }
                        },
                        (error) => {
                            clearTimeout(timeoutId);
                            console.error(`❌ GLTF loading error on attempt ${attempt}:`, error);
                            reject(error);
                        }
                    );
                });
                
                return gltf; // Success!
                
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Attempt ${attempt} failed:`, error.message);
                
                if (attempt < maxRetries) {
                    const delay = attempt * 1000; // Exponential backoff
                    console.log(`⏳ Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw new Error(`Failed to load GLTF after ${maxRetries} attempts. Last error: ${lastError.message}`);
    }
    
    async processLoadedGLTF(gltf, modelPath) {
        console.log('🔧 Processing loaded GLTF...');
        
        // Validate the loaded model
        if (!gltf || !gltf.scene) {
            throw new Error('Invalid GLTF structure - no scene found');
        }
        
        // Extract the scene from GLTF
        this.glassesModel = gltf.scene;
        
        // Log detailed model information
        console.log('Model structure analysis:', {
            scene: this.glassesModel,
            children: this.glassesModel.children.length,
            animations: gltf.animations?.length || 0,
            cameras: gltf.cameras?.length || 0,
            scenes: gltf.scenes?.length || 0
        });
        
        // Validate model has geometry
        let meshCount = 0;
        let hasGeometry = false;
        this.glassesModel.traverse((child) => {
            if (child.isMesh && child.geometry) {
                hasGeometry = true;
                meshCount++;
            }
        });
        
        if (!hasGeometry) {
            throw new Error('3D model contains no valid geometry');
        }
        
        console.log(`✅ Found ${meshCount} meshes with valid geometry`);
        
        // Configure model transform
        this.glassesModel.scale.set(1.0, 1.0, 1.0);
        this.glassesModel.position.set(0, 0, 0);
        this.glassesModel.rotation.set(0, 0, 0);
        this.glassesModel.visible = true;
        
        // Process all meshes in the model
        this.glassesModel.traverse((child) => {
            if (child.isMesh) {
                console.log(`🔧 Configuring mesh:`, {
                    name: child.name || 'unnamed',
                    geometry: child.geometry?.type,
                    material: child.material?.type,
                    visible: child.visible
                });
                
                // Ensure mesh visibility and properties
                child.visible = true;
                child.castShadow = true;
                child.receiveShadow = true;
                child.frustumCulled = false; // Prevent culling issues
                
                // Configure materials
                this.configureMeshMaterial(child);
            }
        });
        
        // Add to scene
        this.scene.add(this.glassesModel);
        console.log('✅ Glasses model added to scene');
        console.log('Scene children count:', this.scene.children.length);
        
        // Store model info
        this.currentModelPath = modelPath;
        
        // Apply any existing adjustments
        this.updateGlassesTransform();
        
        // Hide loading state and force render
        this.hide3DModelMessage();
        this.show3DModelSuccess('3D model loaded successfully');
        this.render3D();
        
        // Log final scene state
        console.log('Final scene state:', {
            children: this.scene.children.length,
            glassesModel: !!this.glassesModel,
            modelVisible: this.glassesModel?.visible
        });
    }
    
    configureMeshMaterial(mesh) {
        if (!mesh.material) return;
        
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        
        materials.forEach((material, index) => {
            console.log(`🎨 Configuring material ${index}:`, material.type);
            
            // Ensure proper material properties
            material.transparent = true;
            material.opacity = 1.0;
            material.side = THREE.DoubleSide;
            material.alphaTest = 0.1;
            material.depthWrite = true;
            material.depthTest = true;
            
            // Force material update
            material.needsUpdate = true;
        });
    }
    
    handleGLTFLoadingError(error, modelPath) {
        console.error('❌ GLTF loading error details:', {
            message: error.message,
            stack: error.stack,
            modelPath: modelPath,
            threeJSAvailable: typeof THREE !== 'undefined',
            gltfLoaderAvailable: typeof THREE?.GLTFLoader !== 'undefined',
            sceneInitialized: !!this.scene
        });
        
        this.hide3DModelMessage();
        
        // Determine error type and show appropriate message
        let errorMessage = 'Failed to load 3D model';
        
        if (error.message.includes('404') || error.message.includes('not found')) {
            errorMessage = '3D model file not found';
        } else if (error.message.includes('timeout')) {
            errorMessage = '3D model loading timeout';
        } else if (error.message.includes('network')) {
            errorMessage = 'Network error loading 3D model';
        } else if (error.message.includes('parse') || error.message.includes('Invalid')) {
            errorMessage = '3D model file is corrupted or invalid';
        } else if (error.message.includes('CORS')) {
            errorMessage = '3D model access blocked by security policy';
        }
        
        this.show3DModelError(errorMessage);
        
        // Clean up on error
        if (this.glassesModel) {
            this.scene.remove(this.glassesModel);
            this.glassesModel = null;
        }
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
        const chinCenter = this.faceLandmarks[175];    // Chin center
        
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
        
        // Calculate face dimensions for better depth perception
        const faceHeight = Math.abs(foreheadCenter.y - chinCenter.y);
        const faceWidth = Math.abs(rightEyeOuter.x - leftEyeOuter.x);
        const faceDepth = Math.abs(noseBridge.z - foreheadCenter.z);
        
        // Estimate distance from camera based on face size
        const normalizedFaceWidth = faceWidth * this.canvas.width;
        const estimatedDistance = Math.max(0.3, Math.min(3.0, 150 / normalizedFaceWidth));
        
        // Calculate glasses center position with improved depth calculation
        const glassesCenter = {
            x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
            y: (leftEyeCenter.y + rightEyeCenter.y) / 2 - (faceHeight * 0.05), // Slightly above eyes, proportional to face
            z: (leftEyeCenter.z + rightEyeCenter.z) / 2 + (faceDepth * 0.1) // Slightly forward from face
        };
        
        // Convert to Three.js coordinates with perspective correction
        const ndcX = (glassesCenter.x * 2 - 1);
        const ndcY = -(glassesCenter.y * 2 - 1);
        const ndcZ = glassesCenter.z * estimatedDistance;
        
        // Enhanced positioning for GLB models with AR-like depth
        const isGLBModel = this.currentGLBModel !== null;
        const positionMultiplier = isGLBModel ? 1.8 : 1.5;
        const depthOffset = isGLBModel ? -0.15 : -0.1; // Glasses sit slightly in front of face
        
        // Smooth interpolation for natural movement (reduce jitter)
        const smoothingFactor = 0.15;
        const targetPosition = {
            x: ndcX * positionMultiplier,
            y: ndcY * positionMultiplier,
            z: ndcZ + depthOffset
        };
        
        // Apply smooth interpolation
        this.glassesModel.position.x += (targetPosition.x - this.glassesModel.position.x) * smoothingFactor;
        this.glassesModel.position.y += (targetPosition.y - this.glassesModel.position.y) * smoothingFactor;
        this.glassesModel.position.z += (targetPosition.z - this.glassesModel.position.z) * smoothingFactor;
        
        // Enhanced scaling with distance-based adjustment
        let baseScale;
        if (isGLBModel) {
            baseScale = Math.max(0.08, Math.min(0.25, faceWidth * 1.8 * estimatedDistance));
        } else {
            baseScale = Math.max(0.2, Math.min(1.5, faceWidth * 2.5 * estimatedDistance));
        }
        
        // Smooth scale interpolation
        const targetScale = baseScale;
        const currentScale = this.glassesModel.scale.x;
        const newScale = currentScale + (targetScale - currentScale) * smoothingFactor;
        this.glassesModel.scale.set(newScale, newScale, newScale);
        
        // Enhanced rotation calculations for realistic 3D tracking
        const eyeAngle = Math.atan2(
            rightEyeCenter.y - leftEyeCenter.y, 
            rightEyeCenter.x - leftEyeCenter.x
        );
        
        // Calculate head pose angles
        const headTilt = this.calculateHeadTilt();
        const faceAngle = this.calculateFaceAngle();
        const headPitch = this.calculateHeadPitch();
        
        // Smooth rotation interpolation
        const targetRotation = {
            x: headPitch * 0.4, // Up/down head movement
            y: faceAngle * 0.5,  // Left/right head turn
            z: eyeAngle + headTilt * 0.3 // Head tilt
        };
        
        this.glassesModel.rotation.x += (targetRotation.x - this.glassesModel.rotation.x) * smoothingFactor;
        this.glassesModel.rotation.y += (targetRotation.y - this.glassesModel.rotation.y) * smoothingFactor;
        this.glassesModel.rotation.z += (targetRotation.z - this.glassesModel.rotation.z) * smoothingFactor;
        
        // Apply realistic lighting based on face orientation
        this.updateGlassesLighting(faceAngle, headPitch);
        
        // Add subtle physics-based movement for realism
        this.applyGlassesPhysics();
        
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
    
    calculateHeadPitch() {
        if (!this.faceLandmarks) return 0;
        
        // Use forehead and chin to calculate up/down head movement
        const foreheadCenter = this.faceLandmarks[9];
        const chinCenter = this.faceLandmarks[175];
        const noseBridge = this.faceLandmarks[168];
        
        if (foreheadCenter && chinCenter && noseBridge) {
            // Calculate the angle between nose bridge and the forehead-chin line
            const faceVertical = {
                y: chinCenter.y - foreheadCenter.y,
                z: chinCenter.z - foreheadCenter.z
            };
            
            return Math.atan2(faceVertical.z, faceVertical.y) * 0.3; // Subtle pitch adjustment
        }
        
        return 0;
    }
    
    updateGlassesLighting(faceAngle, headPitch) {
        if (!this.glassesModel) return;
        
        // Adjust material properties based on face orientation for realistic lighting
        this.glassesModel.traverse((child) => {
            if (child.isMesh && child.material) {
                // Calculate lighting intensity based on face angle
                const lightIntensity = Math.cos(faceAngle) * Math.cos(headPitch);
                const normalizedIntensity = Math.max(0.3, Math.min(1.0, lightIntensity + 0.5));
                
                // Store original material properties if not already stored
                if (!child.userData.originalMaterial) {
                    child.userData.originalMaterial = {
                        color: child.material.color ? child.material.color.clone() : null,
                        metalness: child.material.metalness || 0,
                        roughness: child.material.roughness || 0.5
                    };
                }
                
                // Apply lighting adjustments
                if (child.material.color && child.userData.originalMaterial.color) {
                    child.material.color.copy(child.userData.originalMaterial.color);
                    child.material.color.multiplyScalar(normalizedIntensity);
                }
                
                // Add subtle metalness variation for glasses frames
                if (child.material.metalness !== undefined) {
                    child.material.metalness = Math.max(0.1, Math.min(0.8, 
                        child.userData.originalMaterial.metalness + normalizedIntensity * 0.3));
                }
                
                // Adjust roughness for realistic reflections
                if (child.material.roughness !== undefined) {
                    child.material.roughness = Math.max(0.2, Math.min(0.9, 
                        child.userData.originalMaterial.roughness + (1.0 - normalizedIntensity) * 0.3));
                }
            }
        });
    }
    
    applyGlassesPhysics() {
        if (!this.glassesModel || !this.faceLandmarks) return;
        
        // Initialize physics properties if not exists
        if (!this.glassesPhysics) {
            this.glassesPhysics = {
                velocity: { x: 0, y: 0, z: 0 },
                lastPosition: { 
                    x: this.glassesModel.position.x, 
                    y: this.glassesModel.position.y, 
                    z: this.glassesModel.position.z 
                },
                damping: 0.85,
                springStrength: 0.1
            };
        }
        
        // Calculate velocity based on position change
        const deltaX = this.glassesModel.position.x - this.glassesPhysics.lastPosition.x;
        const deltaY = this.glassesModel.position.y - this.glassesPhysics.lastPosition.y;
        const deltaZ = this.glassesModel.position.z - this.glassesPhysics.lastPosition.z;
        
        // Update velocity with damping
        this.glassesPhysics.velocity.x = (this.glassesPhysics.velocity.x + deltaX) * this.glassesPhysics.damping;
        this.glassesPhysics.velocity.y = (this.glassesPhysics.velocity.y + deltaY) * this.glassesPhysics.damping;
        this.glassesPhysics.velocity.z = (this.glassesPhysics.velocity.z + deltaZ) * this.glassesPhysics.damping;
        
        // Apply subtle physics-based movement for natural feel
        const physicsInfluence = 0.02;
        this.glassesModel.position.x += this.glassesPhysics.velocity.x * physicsInfluence;
        this.glassesModel.position.y += this.glassesPhysics.velocity.y * physicsInfluence;
        this.glassesModel.position.z += this.glassesPhysics.velocity.z * physicsInfluence;
        
        // Update last position
        this.glassesPhysics.lastPosition.x = this.glassesModel.position.x;
        this.glassesPhysics.lastPosition.y = this.glassesModel.position.y;
        this.glassesPhysics.lastPosition.z = this.glassesModel.position.z;
        
        // Add subtle breathing effect for ultra-realism
        const time = Date.now() * 0.001;
        const breathingOffset = Math.sin(time * 0.5) * 0.002;
        this.glassesModel.position.y += breathingOffset;
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
        if (!this.renderer || !this.scene || !this.camera) return;
        
        // Performance optimization: limit frame rate
        const now = performance.now();
        if (!this.lastRenderTime) this.lastRenderTime = now;
        
        const deltaTime = now - this.lastRenderTime;
        const targetFPS = this.performanceMode === 'high' ? 60 : 30;
        const frameInterval = 1000 / targetFPS;
        
        if (deltaTime < frameInterval) return;
        
        this.lastRenderTime = now;
        
        // Animate debug cube for visual feedback
        if (this.debugCube) {
            this.debugCube.rotation.x += 0.01;
            this.debugCube.rotation.y += 0.01;
        }
        
        // Handle glasses model if it exists
        if (this.glassesModel) {
            // Ensure glasses model is visible if it exists
            if (!this.glassesModel.visible) {
                this.glassesModel.visible = true;
            }
            
            // Update dynamic lighting for realistic AR appearance
            this.updateDynamicLighting();
            
            // Frustum culling optimization
            this.glassesModel.frustumCulled = true;
        }
        
        // Always render the scene (for debug helpers and glasses model)
        this.renderer.render(this.scene, this.camera);
        
        // Update performance stats
        this.updatePerformanceStats(deltaTime);
    }
    
    updatePerformanceStats(deltaTime) {
        if (!this.performanceStats) {
            this.performanceStats = {
                frameCount: 0,
                totalTime: 0,
                avgFPS: 0,
                lastUpdate: performance.now()
            };
        }
        
        this.performanceStats.frameCount++;
        this.performanceStats.totalTime += deltaTime;
        
        // Update FPS every second
        const now = performance.now();
        if (now - this.performanceStats.lastUpdate > 1000) {
            this.performanceStats.avgFPS = Math.round(1000 / (this.performanceStats.totalTime / this.performanceStats.frameCount));
            
            // Auto-adjust performance mode based on FPS
            if (this.performanceStats.avgFPS < 20 && this.performanceMode !== 'low') {
                this.performanceMode = 'low';
                console.log('Switching to low performance mode for better frame rate');
            } else if (this.performanceStats.avgFPS > 45 && this.performanceMode !== 'high') {
                this.performanceMode = 'high';
            }
            
            // Reset stats
            this.performanceStats.frameCount = 0;
            this.performanceStats.totalTime = 0;
            this.performanceStats.lastUpdate = now;
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
        if (this.currentGLBModel && this.currentGLBModel.path) {
            console.log('Retrying 3D model loading...');
            this.loadGlassesModel(this.currentGLBModel.path);
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
        // Monitor frame rate and adjust detection frequency and quality
        const now = performance.now();
        if (this.lastFrameTime) {
            const frameTime = now - this.lastFrameTime;
            const fps = 1000 / frameTime;
            const targetFPS = this.qualitySettings[this.performanceMode].targetFPS;
            
            // Track performance over time
            if (!this.performanceHistory) {
                this.performanceHistory = [];
            }
            this.performanceHistory.push(fps);
            
            // Keep only last 30 frames for averaging
            if (this.performanceHistory.length > 30) {
                this.performanceHistory.shift();
            }
            
            // Calculate average FPS
            const avgFPS = this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length;
            
            // Dynamic quality adjustment based on performance
            if (avgFPS < targetFPS * 0.7 && this.performanceMode !== 'low') {
                // Performance is poor, downgrade quality
                const modes = ['high', 'medium', 'low'];
                const currentIndex = modes.indexOf(this.performanceMode);
                if (currentIndex < modes.length - 1) {
                    this.performanceMode = modes[currentIndex + 1];
                    console.log(`Performance downgrade to ${this.performanceMode} mode (avg FPS: ${avgFPS.toFixed(1)})`);
                    this.applyQualitySettings();
                }
            } else if (avgFPS > targetFPS * 1.2 && this.performanceMode !== 'high') {
                // Performance is good, upgrade quality
                const modes = ['low', 'medium', 'high'];
                const currentIndex = modes.indexOf(this.performanceMode);
                if (currentIndex < modes.length - 1) {
                    this.performanceMode = modes[currentIndex + 1];
                    console.log(`Performance upgrade to ${this.performanceMode} mode (avg FPS: ${avgFPS.toFixed(1)})`);
                    this.applyQualitySettings();
                }
            }
            
            // Adjust detection frequency based on current FPS
            if (fps < 20) {
                this.detectionInterval = Math.min(100, this.detectionInterval + 10);
            } else if (fps > 45) {
                this.detectionInterval = Math.max(16, this.detectionInterval - 5);
            }
        }
        this.lastFrameTime = now;
    }
    
    applyQualitySettings() {
        // Apply new quality settings to renderer if available
        if (this.renderer && this.scene) {
            const quality = this.qualitySettings[this.performanceMode];
            
            // Update render size
            const renderWidth = Math.floor(this.canvas.width * quality.renderScale);
            const renderHeight = Math.floor(this.canvas.height * quality.renderScale);
            this.renderer.setSize(renderWidth, renderHeight);
            
            // Update shadow mapping
            if (quality.shadowMapSize > 0 && !this.deviceCapabilities.isMobile) {
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.setSize(quality.shadowMapSize, quality.shadowMapSize);
            } else {
                this.renderer.shadowMap.enabled = false;
            }
            
            console.log(`Applied ${this.performanceMode} quality settings - Render size: ${renderWidth}x${renderHeight}`);
        }
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



// Function to navigate to home page when header title is clicked
function navigateToHome() {
    window.location.href = 'index.html';
}