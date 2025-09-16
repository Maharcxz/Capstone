import './style.css'
import javascriptLogo from './javascript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.js'
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// MediaPipe scripts still use CDN

// Only initialize the app if the #app element exists
const appElement = document.querySelector('#app');
if (appElement) {
  appElement.innerHTML = `
    <div>
      <a href="https://vite.dev" target="_blank">
        <img src="${viteLogo}" class="logo" alt="Vite logo" />
      </a>
      <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank">
        <img src="${javascriptLogo}" class="logo vanilla" alt="JavaScript logo" />
      </a>
      <h1>Hello Vite!</h1>
      <div class="card">
        <button id="counter" type="button"></button>
      </div>
      <p class="read-the-docs">
        Click on the Vite logo to learn more
      </p>
    </div>
  `;
  
  const counterElement = document.querySelector('#counter');
  if (counterElement) {
    setupCounter(counterElement);
  }
}

// DOM elements
// Check if we're on the AR try-on page to avoid conflicts
if (!window.isARTryOnPage) {
const video = document.getElementById('videoElement');
const canvas = document.getElementById('three-canvas');
const glassesSelect = document.getElementById('glassesSelect');

// Three.js setup
let scene, camera, renderer, glassesModel;
const loader = new GLTFLoader();

function initThree() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
  renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);
}

function loadGlasses(modelName) {
  if (glassesModel) {
    scene.remove(glassesModel);
    glassesModel = null;
  }
  loader.load(`/Assets/${modelName}`, function(gltf) {
    glassesModel = gltf.scene;
    glassesModel.scale.set(0.7, 0.7, 0.7);
    scene.add(glassesModel);
  });
}

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
  } else {
    lastFaceLandmarks = null;
  }
});

// Camera setup
const cameraUtils = window.Camera;
let mpCamera = null;

function startCamera() {
  mpCamera = new cameraUtils(video, {
    onFrame: async () => {
      await faceMesh.send({image: video});
    },
    width: window.innerWidth,
    height: window.innerHeight
  });
  mpCamera.start();
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  if (glassesModel && lastFaceLandmarks) {
    // Use landmarks for glasses placement
    const leftEye = lastFaceLandmarks[33];
    const rightEye = lastFaceLandmarks[263];
    const nose = lastFaceLandmarks[168];

    // Calculate position and scale
    const eyeDist = Math.sqrt(
      Math.pow(leftEye.x - rightEye.x, 2) +
      Math.pow(leftEye.y - rightEye.y, 2) +
      Math.pow(leftEye.z - rightEye.z, 2)
    );

    // Map normalized coordinates to screen
    const x = (nose.x - 0.5) * window.innerWidth;
    const y = -(nose.y - 0.5) * window.innerHeight;
    const z = -0.5;

    glassesModel.position.set(x / 400, y / 400, z);

    // Scale based on eye distance
    const scale = eyeDist * 8;
    glassesModel.scale.set(scale, scale, scale);

    // Rotation (approximate)
    const dx = rightEye.x - leftEye.x;
    const dy = rightEye.y - leftEye.y;
    const angle = Math.atan2(dy, dx);
    glassesModel.rotation.set(0, 0, -angle);
  }

  renderer.render(scene, camera);
}

// Responsive
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Init everything
initThree();
loadGlasses(glassesSelect.value);
startCamera();
animate();

document.querySelector('.info').innerHTML = '...';
} // End of isARTryOnPage check
