import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// DOM elements
const video = document.getElementById('videoElement');
const canvas = document.getElementById('three-canvas');
const glassesSelect = document.getElementById('glassesSelect');
const infoElement = document.querySelector('.info');

// Three.js setup
let scene, camera, renderer, glassesModel;
const loader = new GLTFLoader();

function initThree() {
  // Create scene
  scene = new THREE.Scene();
  
  // Create camera with perspective
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
  
  // Setup WebGL renderer
  renderer = new THREE.WebGLRenderer({ 
    canvas: canvas, 
    alpha: true,
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0); // Transparent background
  
  // Add lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(0, 1, 1);
  scene.add(directionalLight);
}

function loadGlasses(modelName) {
  // Remove previous model if exists
  if (glassesModel) {
    scene.remove(glassesModel);
    glassesModel = null;
  }
  
  // Load new model
  loader.load(`/Assets/${modelName}`, function(gltf) {
    glassesModel = gltf.scene;
    
    // Set initial scale - will be adjusted by face tracking
    // Using a smaller initial scale to prevent overwhelming the view
    glassesModel.scale.set(0.5, 0.5, 0.5);
    
    // Center the model initially
    glassesModel.position.set(0, 0, -0.5);
    
    // Add the model to the scene
    scene.add(glassesModel);
    
    // Center the glasses model's pivot point if needed
    centerGlassesModel(glassesModel);
    
    infoElement.textContent = `Loaded ${modelName}. Position your face in the camera.`;
  }, 
  // Progress callback
  function(xhr) {
    infoElement.textContent = `Loading model: ${Math.floor(xhr.loaded / xhr.total * 100)}%`;
  },
  // Error callback
  function(error) {
    console.error('Error loading model:', error);
    infoElement.textContent = `Error loading model. Please try again.`;
  });
}

// Function to center the glasses model's pivot point
function centerGlassesModel(model) {
  // Calculate the bounding box of the model
  const boundingBox = new THREE.Box3().setFromObject(model);
  const center = boundingBox.getCenter(new THREE.Vector3());
  
  // Adjust the model's children to center the pivot point
  model.children.forEach(child => {
    child.position.sub(center);
  });
  
  // Adjust the model's position to compensate
  model.position.add(center);
}

// Listen for glasses selection change
glassesSelect.addEventListener('change', () => {
  loadGlasses(glassesSelect.value);
});

// MediaPipe FaceMesh setup
let faceMesh = new window.FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

let lastFaceLandmarks = null;

faceMesh.onResults((results) => {
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    lastFaceLandmarks = results.multiFaceLandmarks[0];
    // Update info when face is detected
    if (infoElement.textContent.includes('point your face')) {
      infoElement.textContent = 'Face detected! Try different glasses from the dropdown.';
    }
  } else {
    lastFaceLandmarks = null;
  }
});

// Camera setup using MediaPipe Camera Utils with improved mobile handling
const cameraUtils = window.Camera;
let mpCamera = null;

// Check if device is mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Function to handle camera permissions and setup
function startCamera() {
  // Check if camera permissions are available
  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: 'camera' })
      .then(permissionStatus => {
        handleCameraPermission(permissionStatus.state);
        
        // Listen for permission changes
        permissionStatus.onchange = () => {
          handleCameraPermission(permissionStatus.state);
        };
      })
      .catch(() => {
        // If permissions API is not supported, try direct camera access
        initializeCamera();
      });
  } else {
    // Fallback for browsers that don't support the permissions API
    initializeCamera();
  }
}

// Handle different permission states
function handleCameraPermission(permissionState) {
  if (permissionState === 'granted') {
    initializeCamera();
  } else if (permissionState === 'prompt') {
    infoElement.textContent = 'Please allow camera access when prompted.';
    initializeCamera();
  } else if (permissionState === 'denied') {
    infoElement.textContent = 'Camera access denied. Please enable camera access in your browser settings and reload the page.';
    showCameraInstructions();
  }
}

// Show instructions for enabling camera
function showCameraInstructions() {
  // Use the pre-defined overlay in the HTML
  const overlay = document.getElementById('cameraAccessOverlay');
  if (overlay) {
    overlay.style.display = 'flex';
    
    // Add event listener to reload button
    const reloadButton = document.getElementById('reloadButton');
    if (reloadButton) {
      reloadButton.addEventListener('click', () => {
        location.reload();
      });
    }
  } else {
    // Fallback if the overlay element doesn't exist
    const instructions = document.createElement('div');
    instructions.className = 'mobile-instructions';
    instructions.innerHTML = `
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 10px; 
                  max-width: 80%; text-align: center; z-index: 10000;">
        <h3>Camera Access Required</h3>
        <p>This AR application needs camera access to work.</p>
        <p>Please enable camera access in your browser settings and reload the page.</p>
        ${isMobile ? '<p>On mobile devices, make sure to use a modern browser like Chrome or Safari.</p>' : ''}
        <button onclick="location.reload()" style="background: white; color: #540000; border: none; 
                padding: 10px 20px; border-radius: 20px; margin-top: 15px; font-weight: bold;">
          Reload Page
        </button>
      </div>
    `;
    document.body.appendChild(instructions);
  }
}

// Initialize camera with appropriate settings for device type
function initializeCamera() {
  // Set optimal camera constraints based on device
  const constraints = {
    width: isMobile ? { ideal: window.innerWidth } : { ideal: 1280 },
    height: isMobile ? { ideal: window.innerHeight } : { ideal: 720 },
    facingMode: 'user', // Front camera
    frameRate: { ideal: 30 }
  };
  
  // Create and start camera
  mpCamera = new cameraUtils(video, {
    onFrame: async () => {
      await faceMesh.send({image: video});
    },
    width: window.innerWidth,
    height: window.innerHeight,
    cameraOptions: constraints
  });
  
  mpCamera.start()
    .then(() => {
      infoElement.textContent = 'Camera started. Point your face at the camera.';
      // Add orientation change handling for mobile
      if (isMobile) {
        handleOrientationChange();
      }
    })
    .catch(err => {
      infoElement.textContent = `Camera error: ${err.message}. Please allow camera access.`;
      console.error('Camera error:', err);
      showCameraInstructions();
    });
}

// Handle device orientation changes on mobile
function handleOrientationChange() {
  window.addEventListener('orientationchange', () => {
    // Give time for orientation to complete
    setTimeout(() => {
      // Update camera and renderer dimensions
      if (mpCamera) {
        mpCamera.stop();
        setTimeout(() => {
          initializeCamera();
        }, 500);
      }
    }, 200);
  });
}

// Model-specific adjustments for different glasses models
const modelAdjustments = {
  'glasses_1.glb': { scaleMultiplier: 10, yOffset: 0.02, zOffset: 0, xRotOffset: 0.1 },
  'glasses_2.glb': { scaleMultiplier: 11, yOffset: 0.01, zOffset: -0.1, xRotOffset: 0.05 },
  // Add more model-specific adjustments as needed
  // Default values for any model not specifically listed
  'default': { scaleMultiplier: 10, yOffset: 0, zOffset: 0, xRotOffset: 0 }
};

// Get adjustments for current model
function getModelAdjustments() {
  const modelName = glassesSelect.value;
  return modelAdjustments[modelName] || modelAdjustments['default'];
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  if (glassesModel && lastFaceLandmarks) {
    // Use more precise landmarks for glasses placement
    // Left and right eye landmarks
    const leftEye = lastFaceLandmarks[33];  // Left eye landmark
    const rightEye = lastFaceLandmarks[263]; // Right eye landmark
    
    // Additional landmarks for better positioning
    const nose = lastFaceLandmarks[168];    // Nose landmark
    const leftEyebrow = lastFaceLandmarks[107]; // Left eyebrow
    const rightEyebrow = lastFaceLandmarks[336]; // Right eyebrow
    const foreheadCenter = lastFaceLandmarks[10]; // Forehead center
    
    // Get model-specific adjustments
    const adjustments = getModelAdjustments();
    
    // Calculate eye distance for scaling
    const eyeDist = Math.sqrt(
      Math.pow(leftEye.x - rightEye.x, 2) +
      Math.pow(leftEye.y - rightEye.y, 2) +
      Math.pow(leftEye.z - rightEye.z, 2)
    );
    
    // Calculate the midpoint between eyes for better horizontal positioning
    const eyeMidpointX = (leftEye.x + rightEye.x) / 2;
    const eyeMidpointY = (leftEye.y + rightEye.y) / 2;
    const eyeMidpointZ = (leftEye.z + rightEye.z) / 2;
    
    // Calculate vertical position based on eyebrows and eyes
    const eyebrowMidpointY = (leftEyebrow.y + rightEyebrow.y) / 2;
    const verticalOffset = (eyebrowMidpointY - eyeMidpointY) * 0.5;
    
    // Map normalized coordinates to screen with better positioning
    const x = (eyeMidpointX - 0.5) * window.innerWidth;
    // Adjust Y position to be slightly above the eyes, closer to eyebrows
    // Apply model-specific vertical adjustment
    const y = -((eyeMidpointY - verticalOffset + adjustments.yOffset) - 0.5) * window.innerHeight;
    
    // Improved depth positioning based on face depth with model-specific adjustment
    const z = -0.5 - (eyeMidpointZ * 2) + adjustments.zOffset;
    
    // Position the glasses model with finer adjustments
    glassesModel.position.set(x / 400, y / 400, z);
    
    // Improved scaling based on eye distance and face width
    // Apply model-specific scale multiplier
    const scale = eyeDist * adjustments.scaleMultiplier;
    glassesModel.scale.set(scale, scale, scale);
    
    // Improved rotation based on face orientation
    // Calculate roll (z-axis rotation)
    const dx = rightEye.x - leftEye.x;
    const dy = rightEye.y - leftEye.y;
    const rollAngle = Math.atan2(dy, dx);
    
    // Calculate pitch (x-axis rotation) based on face depth
    const foreheadToNoseDY = foreheadCenter.y - nose.y;
    const foreheadToNoseDZ = foreheadCenter.z - nose.z;
    const pitchAngle = Math.atan2(foreheadToNoseDY, foreheadToNoseDZ) * 0.5 + adjustments.xRotOffset;
    
    // Calculate yaw (y-axis rotation) based on face orientation
    const leftToRightEyeDX = rightEye.x - leftEye.x;
    const leftToRightEyeDZ = rightEye.z - leftEye.z;
    const yawAngle = Math.atan2(leftToRightEyeDZ, leftToRightEyeDX) * 0.5;
    
    // Apply all rotations for better 3D alignment
    glassesModel.rotation.set(pitchAngle, yawAngle, -rollAngle);
  }

  renderer.render(scene, camera);
}

// Handle window resize and orientation changes
function handleResize() {
  // Update Three.js camera and renderer
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Update video element size
  if (video) {
    video.style.width = window.innerWidth + 'px';
    video.style.height = window.innerHeight + 'px';
  }
  
  // For mobile devices, we may need to adjust the camera position
  if (isMobile && glassesModel) {
    // Reset position to ensure proper alignment after resize
    glassesModel.position.set(0, 0, -0.5);
  }
}

// Add event listeners for resize and orientation change
window.addEventListener('resize', handleResize);

// Add touch event listeners for mobile devices
if (isMobile) {
  // Prevent pinch zoom on mobile
  document.addEventListener('touchmove', function(event) {
    if (event.scale !== 1) {
      event.preventDefault();
    }
  }, { passive: false });
  
  // Double tap to toggle fullscreen on mobile
  let lastTap = 0;
  document.addEventListener('touchend', function(event) {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 300 && tapLength > 0) {
      // Double tap detected
      toggleFullScreen();
      event.preventDefault();
    }
    lastTap = currentTime;
  });
}

// Toggle fullscreen function
function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.error(`Error attempting to enable fullscreen: ${err.message}`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

// Display instructions for mobile users
function displayMobileInstructions() {
  const instructions = document.createElement('div');
  instructions.className = 'mobile-instructions';
  instructions.innerHTML = `
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 10px; 
                max-width: 80%; text-align: center; z-index: 10000;">
      <h3>Mobile AR Glasses Try-On</h3>
      <ul style="text-align: left; padding-left: 20px;">
        <li>Allow camera permissions when prompted</li>
        <li>Position your face in the center of the screen</li>
        <li>Double-tap for fullscreen mode</li>
        <li>Use the dropdown to try different glasses</li>
        <li>For best results, use in good lighting</li>
      </ul>
      <button onclick="this.parentNode.parentNode.remove()" style="background: white; color: #540000; border: none; 
              padding: 10px 20px; border-radius: 20px; margin-top: 15px; font-weight: bold;">
        Got it!
      </button>
    </div>
  `;
  document.body.appendChild(instructions);
}

// Handle initial camera message
function setupInitialCameraMessage() {
  const initialMessage = document.getElementById('initialCameraMessage');
  const gotItButton = document.getElementById('gotItButton');
  const reloadPageButton = document.getElementById('reloadPageButton');
  
  if (initialMessage && gotItButton && reloadPageButton) {
    // Add event listener to Got It button
    gotItButton.addEventListener('click', () => {
      initialMessage.style.display = 'none';
      // Start the camera after user acknowledges
      startCamera();
    });
    
    // Add event listener to Reload Page button
    reloadPageButton.addEventListener('click', () => {
      location.reload();
    });
  } else {
    // If elements don't exist, start camera directly
    startCamera();
  }
}

// Initialize everything
initThree();
loadGlasses(glassesSelect.value);
// Don't start camera immediately, wait for user acknowledgment
setupInitialCameraMessage();
// Show mobile instructions if on a mobile device
if (isMobile) {
  displayMobileInstructions();
}
animate();