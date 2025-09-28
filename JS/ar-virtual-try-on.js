// Simplified AR Virtual Try-On System
// Uses only Three.js and browser APIs - no external AR libraries

// Import Three.js from the installed package
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class SimplifiedARTryOn {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.video = null;
        this.canvas = null;
        // No 2D context needed - Three.js will handle WebGL context
        this.eyewearModel = null;
        this.isInitialized = false;
        this.faceDetectionActive = false;
        
        // Face detection parameters
        this.facePosition = { x: 0, y: 0, width: 200, height: 150 };
        this.eyewearPosition = { x: 0, y: -20, z: 0 };
        this.eyewearScale = 1.0;
        this.eyewearRotation = 0;
        
        // Camera settings
        this.currentCameraIndex = 0;
        this.availableCameras = [];
        
        // Smoothing for face landmarks
        this.previousLandmarks = null;
        
        // Physics-based smoothing for glasses
        this.glassesPhysics = {
            velocity: { x: 0, y: 0, z: 0, scale: 0, rotation: 0 },
            damping: 0.85,
            maxVelocity: 0.1
        };
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Starting AR Virtual Try-On initialization...');
            this.showStatus('Initializing camera...', 'info');
            
            // Get DOM elements
            this.video = document.getElementById('videoElement');
            this.canvas = document.getElementById('canvasElement');
            // Don't create 2D context - Three.js will create WebGL context
            
            console.log('📱 DOM elements found:', {
                video: !!this.video,
                canvas: !!this.canvas
            });
            
            if (!this.video || !this.canvas) {
                console.error('❌ Required DOM elements not found!');
                alert('ERROR: Required DOM elements not found!');
                return;
            }
            
            // Initialize camera first
            console.log('📷 Initializing camera...');
            
            try {
                await this.initCamera();
                console.log('✅ Camera initialized successfully');
            } catch (cameraError) {
                console.error('❌ Camera initialization failed:', cameraError);
                // Continue anyway to test Three.js
            }
            
            // Wait a moment for camera to start
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Initialize Three.js scene
            console.log('🎮 Initializing Three.js scene...');
            this.initThreeJS();
            
            // Setup event listeners
            console.log('🎛️ Setting up event listeners...');
            this.setupEventListeners();
            
            // Load eyewear model from Assets folder
            console.log('👓 Loading eyewear model...');
            this.loadEyewearModel();
            
            // Setup face detection
            console.log('🔍 Setting up face detection...');
            await this.setupFaceDetection();
            
            this.hideLoading();
            this.showStatus('AR Virtual Try-On ready!', 'success');
            console.log('✅ AR Virtual Try-On initialization complete!');
            
            this.isInitialized = true;
            
        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.showStatus('Failed to initialize camera. Please allow camera access.', 'error');
            this.hideLoading();
        }
    }

    async initCamera() {
        try {
            // Get available cameras
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.availableCameras = devices.filter(device => device.kind === 'videoinput');
            
            // Request camera access
            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = stream;
            
            // Wait for video to load
            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    
                    // Set canvas size to match video
        this.canvas.width = this.video.videoWidth || 640;
        this.canvas.height = this.video.videoHeight || 480;
        
        // Also set CSS size to match container
        const container = this.canvas.parentElement;
        if (container) {
            const rect = container.getBoundingClientRect();
            this.canvas.style.width = rect.width + 'px';
            this.canvas.style.height = rect.height + 'px';
        }
                    
                    resolve();
                };
            });
            
        } catch (error) {
            throw new Error('Camera access denied or not available');
        }
    }

    initThreeJS() {
        console.log('🎬 Starting Three.js initialization...');
        
        if (!this.canvas) {
            console.error('❌ Canvas element not found! Cannot initialize Three.js');
            return;
        }
        
        if (this.canvas.clientWidth === 0 || this.canvas.clientHeight === 0) {
            console.error('❌ Canvas has zero dimensions! Cannot initialize Three.js');
            return;
        }
        
        // Create Three.js scene for 3D eyewear
        this.scene = new THREE.Scene();
        console.log('🎭 Scene created');
        
        // Get canvas dimensions
        const canvasRect = this.canvas.getBoundingClientRect();
        let width = canvasRect.width || 640;
        let height = canvasRect.height || 480;
        
        console.log('📐 Canvas dimensions:', width, 'x', height);
        
        // Force canvas to have minimum dimensions if it's zero
        if (width === 0 || height === 0) {
            console.warn('⚠️ Canvas has zero dimensions, setting minimum size');
            this.canvas.style.width = '640px';
            this.canvas.style.height = '480px';
            width = 640;
            height = 480;
            console.log('📐 Forced canvas dimensions:', width, 'x', height);
        }
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            width / height, 
            0.1, 
            1000
        );
        this.camera.position.z = 5;
        console.log('📷 Camera created at position:', this.camera.position);
        
        // Create renderer and attach to existing canvas
        try {
            this.renderer = new THREE.WebGLRenderer({ 
                canvas: this.canvas,  // Use the existing canvas element
                alpha: true,
                antialias: true,
                preserveDrawingBuffer: true,
                powerPreference: "high-performance"
            });
            console.log('✅ Primary WebGL renderer created successfully with existing canvas');
        } catch (error) {
            console.warn('⚠️ Primary WebGL renderer failed, trying fallback options:', error);
            try {
                this.renderer = new THREE.WebGLRenderer({ 
                    canvas: this.canvas,
                    alpha: true 
                });
                console.log('✅ Fallback WebGL renderer created');
            } catch (fallbackError) {
                console.error('❌ All WebGL renderers failed:', fallbackError);
                return;
            }
        }
        
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(0x000000, 0); // Transparent background
        
        console.log('✅ Renderer configured with size:', width, 'x', height);
        console.log('✅ Renderer canvas element:', this.renderer.domElement);
        
        // Ensure the Three.js canvas is properly positioned over the video
        const cameraContainer = document.querySelector('.camera-container');
        if (cameraContainer && this.renderer.domElement !== this.canvas) {
            // If Three.js created a new canvas, append it to the container
            this.renderer.domElement.style.position = 'absolute';
            this.renderer.domElement.style.top = '0';
            this.renderer.domElement.style.left = '0';
            this.renderer.domElement.style.width = '100%';
            this.renderer.domElement.style.height = '100%';
            this.renderer.domElement.style.zIndex = '15'; // Above the HTML canvas
            this.renderer.domElement.style.pointerEvents = 'none';
            this.renderer.domElement.id = 'threeJsCanvas';
            cameraContainer.appendChild(this.renderer.domElement);
            console.log('✅ Three.js canvas appended to camera container');
        }
        
        console.log('🎨 Renderer DOM element styled and positioned');
        
        // Only enable shadows if WebGL is available
        if (this.renderer instanceof THREE.WebGLRenderer) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        
        // Add comprehensive lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(0, 1, 1);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Add a bright point light for better visibility
        const pointLight = new THREE.PointLight(0xffffff, 1.0, 100);
        pointLight.position.set(0, 0, 2);
        this.scene.add(pointLight);
        
        console.log('💡 Lighting setup complete - ambient, directional, and point lights added');
        
        // Start the animation loop immediately
        this.animate();
        
        console.log('✅ Three.js initialized with canvas size:', width, 'x', height);
        console.log('📷 Camera position:', this.camera.position);
        console.log('🎭 Scene children count:', this.scene.children.length);
    }

    loadEyewearModel(modelPath = 'Assets/glasses.glb') {
        // Remove existing model
        if (this.eyewearModel) {
            this.scene.remove(this.eyewearModel);
            this.eyewearModel = null;
        }
        
        console.log('🔄 Loading glasses model from:', modelPath);
        
        // Check if GLTFLoader is available
        if (!GLTFLoader) {
            console.error('❌ GLTFLoader not available, creating fallback glasses');
            this.createFallbackGlasses();
            return;
        }
        
        // Load the glasses model from Assets folder
        const loader = new GLTFLoader();
        loader.load(
            modelPath,
            (gltf) => {
                console.log('✅ GLB model loaded successfully:', gltf);
                console.log('📦 Model scene children:', gltf.scene.children.length);
                
                this.eyewearModel = gltf.scene;
                
                // Add the model to the scene FIRST
                this.scene.add(this.eyewearModel);
                console.log('✅ Glasses model added to scene');
                
                // Make the model visible and properly sized
                this.eyewearModel.scale.set(2.0, 2.0, 2.0);  // Larger scale for better visibility
                this.eyewearModel.position.set(0, 0, -1);    // Closer to camera
                this.eyewearModel.visible = true;
                
                // Ensure all child meshes are visible and have proper materials
                this.eyewearModel.traverse((child) => {
                    if (child.isMesh) {
                        child.visible = true;
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        // Enhance material for better visibility
                        if (child.material) {
                            child.material.transparent = false;
                            child.material.opacity = 1.0;
                            child.material.needsUpdate = true;
                            
                            // Make sure the material is visible with a bright color
                            if (child.material.color) {
                                child.material.color.setHex(0xffffff); // White color for maximum visibility
                            }
                            
                            // Add emissive color for better visibility
                            if (child.material.emissive) {
                                child.material.emissive.setHex(0x444444);
                            }
                            
                            // Add wireframe for debugging
                            child.material.wireframe = false;
                        }
                        
                        console.log('👓 Found mesh in model:', child.name || 'unnamed', 'material:', child.material?.type);
                    }
                });
                
                // Force an immediate render to show the glasses
                this.render();
                console.log('🎨 Forced render after loading glasses model');
                
                console.log('✅ Glasses model added to scene at position:', this.eyewearModel.position);
                console.log('🎯 Scene now has', this.scene.children.length, 'children');
                
                // Force a render to show the model
                if (this.renderer && this.scene && this.camera) {
                    this.renderer.render(this.scene, this.camera);
                }
            },
            (progress) => {
                const percent = (progress.loaded / progress.total * 100).toFixed(2);
                console.log('📊 Loading progress:', percent + '%');
            },
            (error) => {
                console.error('❌ Error loading glasses model:', error);
                console.log('🔧 Falling back to simple geometry...');
                // Fallback to simple geometry if GLB loading fails
                this.createFallbackGlasses();
            }
        );
    }
    
    createFallbackGlasses() {
        console.log('🔧 Creating fallback glasses geometry...');
        
        const group = new THREE.Group();
        
        // Create extremely visible test geometry
        const testGeometry = new THREE.BoxGeometry(2, 2, 2);
        const testMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: false,
            opacity: 1.0
        });
        const testBox = new THREE.Mesh(testGeometry, testMaterial);
        testBox.position.set(0, 0, -2); // Very close to camera
        group.add(testBox);
        
        // Add a second bright green box for extra visibility
        const testGeometry2 = new THREE.BoxGeometry(1, 1, 1);
        const testMaterial2 = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            transparent: false,
            opacity: 1.0
        });
        const testBox2 = new THREE.Mesh(testGeometry2, testMaterial2);
        testBox2.position.set(1, 1, -1.5);
        group.add(testBox2);
        
        // Add a bright blue sphere
        const sphereGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const sphereMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x0000ff,
            transparent: false,
            opacity: 1.0
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.set(-1, -1, -1.5);
        group.add(sphere);
        
        // Create classic glasses geometry as well
        const glassesGeometry = this.createClassicGlassesGeometry();
        const glassesMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00, // Bright yellow
            transparent: false,
            opacity: 1.0,
            side: THREE.DoubleSide
        });
        const glasses = new THREE.Mesh(glassesGeometry, glassesMaterial);
        glasses.position.set(0, 0, -1);
        glasses.scale.set(5, 5, 5); // Make it huge
        group.add(glasses);
        
        console.log('✅ Fallback glasses created with extreme visibility');
        console.log('📦 Group children count:', group.children.length);
        
        this.eyewearModel = group; // Use the group directly
        this.eyewearModel.scale.set(20, 20, 20);  // Make fallback glasses MUCH larger for visibility
        this.eyewearModel.position.set(0, 0, -0.5);  // Position very close to camera
        this.eyewearModel.visible = true;
        
        this.scene.add(this.eyewearModel);
        
        console.log('✅ Fallback glasses created and added to scene at position:', this.eyewearModel.position);
        console.log('🎯 Scene now has', this.scene.children.length, 'children');
        
        // Force a render to show the fallback glasses
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    createClassicGlassesGeometry() {
        const group = new THREE.Group();
        
        // Left lens - make it much more visible
        const leftLens = new THREE.RingGeometry(0.3, 0.4, 16);
        const leftLensMesh = new THREE.Mesh(leftLens, new THREE.MeshBasicMaterial({ 
            color: 0xff0000,  // Bright red for visibility
            transparent: false, 
            opacity: 1.0 
        }));
        leftLensMesh.position.set(-0.5, 0, 0);
        group.add(leftLensMesh);
        
        // Right lens - make it much more visible
        const rightLens = new THREE.RingGeometry(0.3, 0.4, 16);
        const rightLensMesh = new THREE.Mesh(rightLens, new THREE.MeshBasicMaterial({ 
            color: 0xff0000,  // Bright red for visibility
            transparent: false, 
            opacity: 1.0 
        }));
        rightLensMesh.position.set(0.5, 0, 0);
        group.add(rightLensMesh);
        
        // Bridge - make it more visible
        const bridge = new THREE.CylinderGeometry(0.02, 0.02, 0.2);
        const bridgeMesh = new THREE.Mesh(bridge, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        bridgeMesh.rotation.z = Math.PI / 2;
        bridgeMesh.position.set(0, 0, 0);
        group.add(bridgeMesh);
        
        // Add a simple box for extra visibility
        const boxGeometry = new THREE.BoxGeometry(1, 0.3, 0.1);
        const boxMesh = new THREE.Mesh(boxGeometry, new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
        boxMesh.position.set(0, 0, 0);
        group.add(boxMesh);
        
        return group;
    }

    createModernGlassesGeometry() {
        const group = new THREE.Group();
        
        // Modern rectangular lenses
        const lensGeometry = new THREE.PlaneGeometry(0.6, 0.4);
        const lensMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x666666, 
            transparent: true, 
            opacity: 0.2 
        });
        
        const leftLens = new THREE.Mesh(lensGeometry, lensMaterial);
        leftLens.position.set(-0.4, 0, 0);
        group.add(leftLens);
        
        const rightLens = new THREE.Mesh(lensGeometry, lensMaterial);
        rightLens.position.set(0.4, 0, 0);
        group.add(rightLens);
        
        return group;
    }

    createSportGlassesGeometry() {
        const group = new THREE.Group();
        
        // Sport wrap-around style
        const lensGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.8, 16, 1, false, 0, Math.PI);
        const lensMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x0066cc, 
            transparent: true, 
            opacity: 0.3 
        });
        
        const lens = new THREE.Mesh(lensGeometry, lensMaterial);
        lens.rotation.y = Math.PI / 2;
        group.add(lens);
        
        return group;
    }

    createVintageGlassesGeometry() {
        const group = new THREE.Group();
        
        // Vintage round lenses
        const leftLens = new THREE.RingGeometry(0.25, 0.35, 16);
        const leftLensMesh = new THREE.Mesh(leftLens, new THREE.MeshBasicMaterial({ 
            color: 0x8B4513, 
            transparent: true, 
            opacity: 0.4 
        }));
        leftLensMesh.position.set(-0.4, 0, 0);
        group.add(leftLensMesh);
        
        const rightLens = new THREE.RingGeometry(0.25, 0.35, 16);
        const rightLensMesh = new THREE.Mesh(rightLens, new THREE.MeshBasicMaterial({ 
            color: 0x8B4513, 
            transparent: true, 
            opacity: 0.4 
        }));
        rightLensMesh.position.set(0.4, 0, 0);
        group.add(rightLensMesh);
        
        return group;
    }

    createDesignerGlassesGeometry() {
        const group = new THREE.Group();
        
        // Designer cat-eye style
        const shape = new THREE.Shape();
        shape.moveTo(-0.3, -0.2);
        shape.lineTo(0.3, -0.2);
        shape.lineTo(0.4, 0.1);
        shape.lineTo(0.2, 0.2);
        shape.lineTo(-0.2, 0.2);
        shape.lineTo(-0.4, 0.1);
        shape.lineTo(-0.3, -0.2);
        
        const lensGeometry = new THREE.ShapeGeometry(shape);
        const lensMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000, 
            transparent: true, 
            opacity: 0.4 
        });
        
        const leftLens = new THREE.Mesh(lensGeometry, lensMaterial);
        leftLens.position.set(-0.4, 0, 0);
        group.add(leftLens);
        
        const rightLens = new THREE.Mesh(lensGeometry, lensMaterial);
        rightLens.position.set(0.4, 0, 0);
        group.add(rightLens);
        
        return group;
    }

    async setupFaceDetection() {
        try {
            console.log('🔍 Setting up MediaPipe face detection...');
            
            // Check if MediaPipe FaceMesh is available
            if (typeof FaceMesh === 'undefined') {
                console.warn('❌ MediaPipe FaceMesh not available, using basic face detection');
                this.startBasicFaceDetection();
                return;
            }
            
            this.showStatus('Initializing face detection...');
            
            // Initialize MediaPipe FaceMesh
            this.faceMesh = new FaceMesh({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                }
            });
            
            // Configure face detection options
            this.faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.5,
                staticImageMode: false
            });
            
            // Set up results callback
            this.faceMesh.onResults((results) => {
                this.onFaceDetectionResults(results);
            });
            
            console.log('✅ MediaPipe face detection initialized');
            this.showStatus('Face detection ready');
            
            // Start MediaPipe face detection
            this.startMediaPipeFaceDetection();
            
        } catch (error) {
            console.error('❌ MediaPipe face detection setup failed:', error);
            console.log('🔧 Falling back to basic face detection...');
            this.startBasicFaceDetection();
        }
    }
    
    startMediaPipeFaceDetection() {
        console.log('👤 Starting MediaPipe face detection...');
        this.faceDetectionActive = true;
        
        const detectFace = async () => {
            if (!this.faceDetectionActive || !this.video || this.video.paused || !this.faceMesh) {
                if (this.faceDetectionActive) {
                    requestAnimationFrame(detectFace);
                }
                return;
            }
            
            try {
                if (this.video.readyState >= 2) {
                    await this.faceMesh.send({ image: this.video });
                }
            } catch (error) {
                console.warn('Face detection error:', error);
            }
            
            if (this.faceDetectionActive) {
                requestAnimationFrame(detectFace);
            }
        };
        
        detectFace();
    }
    
    onFaceDetectionResults(results) {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            
            if (this.validateLandmarks(landmarks)) {
                // Apply smoothing to reduce jitter
                this.faceLandmarks = this.smoothLandmarks(landmarks);
                this.faceDetected = true;
                this.updateEyewearPositionFromLandmarks();
                this.showStatus('Face detected - glasses positioned');
            } else {
                this.faceDetected = false;
                this.showStatus('Looking for face...');
            }
        } else {
            this.faceDetected = false;
            this.showStatus('Looking for face...');
        }
        
        // DO NOT draw landmarks - we only want the glasses, not the face detection points
        this.render();
    }
    
    smoothLandmarks(newLandmarks) {
        // First detection, no smoothing needed
        if (!this.previousLandmarks) {
            this.previousLandmarks = newLandmarks;
            return newLandmarks;
        }
        
        const smoothingFactor = 0.7; // Higher = more smoothing
        const smoothedLandmarks = [];
        
        for (let i = 0; i < newLandmarks.length; i++) {
            const prev = this.previousLandmarks[i];
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
        
        this.previousLandmarks = smoothedLandmarks;
        return smoothedLandmarks;
    }
    
    validateLandmarks(landmarks) {
        if (!landmarks || landmarks.length < 468) return false;
        
        // Check key landmarks for glasses positioning
        const leftEye = landmarks[33];   // Left eye outer corner
        const rightEye = landmarks[263]; // Right eye outer corner
        const noseBridge = landmarks[168]; // Nose bridge
        
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
    
    updateEyewearPositionFromLandmarks() {
        if (!this.eyewearModel || !this.faceLandmarks) {
            return;
        }
        
        // Get key face landmarks
        const leftEyeOuter = this.faceLandmarks[33];   // Left eye outer corner
        const leftEyeInner = this.faceLandmarks[133];  // Left eye inner corner
        const rightEyeOuter = this.faceLandmarks[263]; // Right eye outer corner
        const rightEyeInner = this.faceLandmarks[362]; // Right eye inner corner
        const noseBridge = this.faceLandmarks[168];    // Nose bridge
        
        // Calculate eye centers
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
        
        // Calculate glasses center position
        const glassesCenter = {
            x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
            y: (leftEyeCenter.y + rightEyeCenter.y) / 2,
            z: (leftEyeCenter.z + rightEyeCenter.z) / 2
        };
        
        // Convert normalized coordinates to 3D space
        const targetX = (glassesCenter.x - 0.5) * 4;  // Convert to Three.js coordinate system
        const targetY = -(glassesCenter.y - 0.5) * 3; // Flip Y and convert
        const targetZ = glassesCenter.z - 0.5;        // Adjust Z depth
        
        // Calculate rotation based on eye alignment
        const eyeAngle = Math.atan2(
            rightEyeCenter.y - leftEyeCenter.y,
            rightEyeCenter.x - leftEyeCenter.x
        );
        
        // Scale based on eye distance for better fit
        const eyeDistance = Math.sqrt(
            Math.pow(rightEyeCenter.x - leftEyeCenter.x, 2) + 
            Math.pow(rightEyeCenter.y - leftEyeCenter.y, 2)
        );
        const targetScale = Math.max(0.5, Math.min(2.0, eyeDistance * 8)); // Reasonable scale range
        
        // Apply physics-based smoothing for position
        const currentPos = this.eyewearModel.position;
        
        // Calculate velocity for position
        this.glassesPhysics.velocity.x += (targetX - currentPos.x) * 0.1;
        this.glassesPhysics.velocity.y += (targetY - currentPos.y) * 0.1;
        this.glassesPhysics.velocity.z += (targetZ - currentPos.z) * 0.1;
        
        // Apply damping to velocity
        this.glassesPhysics.velocity.x *= this.glassesPhysics.damping;
        this.glassesPhysics.velocity.y *= this.glassesPhysics.damping;
        this.glassesPhysics.velocity.z *= this.glassesPhysics.damping;
        
        // Limit velocity to prevent overshooting
        const maxVel = this.glassesPhysics.maxVelocity;
        this.glassesPhysics.velocity.x = Math.max(-maxVel, Math.min(maxVel, this.glassesPhysics.velocity.x));
        this.glassesPhysics.velocity.y = Math.max(-maxVel, Math.min(maxVel, this.glassesPhysics.velocity.y));
        this.glassesPhysics.velocity.z = Math.max(-maxVel, Math.min(maxVel, this.glassesPhysics.velocity.z));
        
        // Update position with velocity
        this.eyewearModel.position.x += this.glassesPhysics.velocity.x;
        this.eyewearModel.position.y += this.glassesPhysics.velocity.y;
        this.eyewearModel.position.z += this.glassesPhysics.velocity.z;
        
        // Apply physics-based smoothing for rotation
        const currentRotation = this.eyewearModel.rotation.z;
        this.glassesPhysics.velocity.rotation += (eyeAngle - currentRotation) * 0.1;
        this.glassesPhysics.velocity.rotation *= this.glassesPhysics.damping;
        this.glassesPhysics.velocity.rotation = Math.max(-maxVel, Math.min(maxVel, this.glassesPhysics.velocity.rotation));
        this.eyewearModel.rotation.z += this.glassesPhysics.velocity.rotation;
        
        // Apply physics-based smoothing for scale
        const currentScale = this.eyewearModel.scale.x;
        this.glassesPhysics.velocity.scale += (targetScale - currentScale) * 0.1;
        this.glassesPhysics.velocity.scale *= this.glassesPhysics.damping;
        this.glassesPhysics.velocity.scale = Math.max(-maxVel, Math.min(maxVel, this.glassesPhysics.velocity.scale));
        const newScale = currentScale + this.glassesPhysics.velocity.scale;
        this.eyewearModel.scale.setScalar(newScale);
        
        // Make glasses visible
        this.eyewearModel.visible = true;
        
        console.log('👓 Glasses positioned using physics-based smoothing:', {
            position: this.eyewearModel.position,
            rotation: this.eyewearModel.rotation.z,
            scale: newScale,
            velocity: this.glassesPhysics.velocity
        });
    }
    
    startBasicFaceDetection() {
        console.log('👤 Starting basic face detection (fallback)...');
        this.faceDetectionActive = true;
        this.faceDetected = true; // Force face detection for testing
        this.detectFace();
    }

    detectFace() {
        if (!this.faceDetectionActive || !this.video || this.video.paused) {
            return;
        }
        
        // Simple face detection - look for face-like patterns
        // This is a simplified version - in a real app you'd use more sophisticated detection
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCanvas.width = this.video.videoWidth;
        tempCanvas.height = this.video.videoHeight;
        
        tempCtx.drawImage(this.video, 0, 0);
        
        // Estimate face position (center of video for simplicity)
        this.facePosition = {
            x: tempCanvas.width / 2,
            y: tempCanvas.height / 2,
            width: 200,
            height: 150
        };
        
        this.updateEyewearPosition();
        this.render();
        
        // Continue detection
        requestAnimationFrame(() => this.detectFace());
    }

    updateEyewearPosition() {
        if (!this.eyewearModel) {
            console.log('⚠️ No eyewear model to position');
            return;
        }
        
        console.log('📍 Updating eyewear position:', {
            facePosition: this.facePosition,
            eyewearPosition: this.eyewearPosition,
            scale: this.eyewearScale
        });
        
        // Convert face position to 3D coordinates
        const x = (this.facePosition.x / this.canvas.width - 0.5) * 4;
        const y = -(this.facePosition.y / this.canvas.height - 0.5) * 3;
        
        this.eyewearModel.position.set(
            x + this.eyewearPosition.x * 0.01,
            y + this.eyewearPosition.y * 0.01,
            this.eyewearPosition.z
        );
        
        this.eyewearModel.scale.setScalar(this.eyewearScale);
        this.eyewearModel.rotation.z = this.eyewearRotation * Math.PI / 180;
        
        console.log('👓 Eyewear positioned at:', this.eyewearModel.position);
        console.log('📏 Eyewear scale:', this.eyewearModel.scale);
        
        // Trigger render
        this.render();
    }

    render() {
        if (!this.renderer || !this.scene || !this.camera) {
            console.warn('⚠️ Cannot render: missing renderer, scene, or camera');
            return;
        }
        
        // Debug: Log scene contents
        if (this.eyewearModel) {
            console.log('🎨 Rendering scene with glasses at position:', this.eyewearModel.position, 'visible:', this.eyewearModel.visible);
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    setupEventListeners() {
        // Model selection buttons
        document.querySelectorAll('.model-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.model-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.loadEyewearModel(e.target.dataset.model);
            });
        });
        
        // Adjustment sliders
        document.getElementById('scaleSlider').addEventListener('input', (e) => {
            this.eyewearScale = parseFloat(e.target.value);
            this.updateEyewearPosition();
        });
        
        document.getElementById('positionXSlider').addEventListener('input', (e) => {
            this.eyewearPosition.x = parseFloat(e.target.value);
            this.updateEyewearPosition();
        });
        
        document.getElementById('positionYSlider').addEventListener('input', (e) => {
            this.eyewearPosition.y = parseFloat(e.target.value);
            this.updateEyewearPosition();
        });
        
        document.getElementById('rotationSlider').addEventListener('input', (e) => {
            this.eyewearRotation = parseFloat(e.target.value);
            this.updateEyewearPosition();
        });
    }

    showStatus(message, type = 'info') {
        const statusElement = document.getElementById('statusMessage');
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}-message`;
        statusElement.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 3000);
        }
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    async switchCamera() {
        if (this.availableCameras.length <= 1) {
            this.showStatus('No additional cameras available', 'error');
            return;
        }
        
        try {
            this.currentCameraIndex = (this.currentCameraIndex + 1) % this.availableCameras.length;
            const deviceId = this.availableCameras[this.currentCameraIndex].deviceId;
            
            // Stop current stream
            if (this.video.srcObject) {
                this.video.srcObject.getTracks().forEach(track => track.stop());
            }
            
            // Start new stream
            const constraints = {
                video: {
                    deviceId: { exact: deviceId },
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = stream;
            
            this.showStatus('Camera switched successfully', 'success');
            
        } catch (error) {
            console.error('Error switching camera:', error);
            this.showStatus('Failed to switch camera', 'error');
        }
    }

    capturePhoto() {
        if (!this.video || !this.canvas) {
            this.showStatus('Camera not ready', 'error');
            return;
        }
        
        // Create a temporary canvas for the photo
        const photoCanvas = document.createElement('canvas');
        const photoCtx = photoCanvas.getContext('2d');
        
        photoCanvas.width = this.video.videoWidth;
        photoCanvas.height = this.video.videoHeight;
        
        // Draw video frame
        photoCtx.drawImage(this.video, 0, 0);
        
        // Draw 3D eyewear on top
        photoCtx.drawImage(this.canvas, 0, 0);
        
        // Download the photo
        const link = document.createElement('a');
        link.download = `ar-tryOn-${Date.now()}.png`;
        link.href = photoCanvas.toDataURL();
        link.click();
        
        this.showStatus('Photo captured successfully!', 'success');
    }

    resetPosition() {
        this.eyewearScale = 1.0;
        this.eyewearPosition = { x: 0, y: -20, z: 0 };
        this.eyewearRotation = 0;
        
        // Reset sliders
        document.getElementById('scaleSlider').value = 1.0;
        document.getElementById('positionXSlider').value = 0;
        document.getElementById('positionYSlider').value = 0;
        document.getElementById('rotationSlider').value = 0;
        
        this.updateEyewearPosition();
        this.showStatus('Position reset', 'success');
    }
    
    animate() {
        if (!this.renderer || !this.scene || !this.camera) {
            console.warn('⚠️ Animation stopped: Missing renderer, scene, or camera');
            return;
        }
        
        requestAnimationFrame(() => this.animate());
        
        // Update glasses position if face is detected and glasses are loaded
        if (this.faceDetected && this.eyewearModel) {
            this.updateEyewearPosition();
        }
        
        // Always render the scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Global functions for button handlers
window.capturePhoto = function() {
    if (window.arTryOn) {
        window.arTryOn.capturePhoto();
    }
};

window.resetPosition = function() {
    if (window.arTryOn) {
        window.arTryOn.resetPosition();
    }
};

window.switchCamera = function() {
    if (window.arTryOn) {
        window.arTryOn.switchCamera();
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.arTryOn = new SimplifiedARTryOn();
});