// AR Positioning Integration
// This module integrates the GLB positioning data with the AR virtual try-on application

class ARPositioningIntegration {
    constructor() {
        this.positioningData = new Map(); // Store positioning data for GLB files
        this.currentProductId = null;
        this.arScene = null;
        this.initialized = false;
    }

    // Initialize the integration system
    async initialize() {
        try {
            // Wait for A-Frame scene to be ready
            await this.waitForAFrameScene();
            
            // Load positioning data from admin dashboard
            await this.loadPositioningData();
            
            // Apply positioning to current product
            this.applyCurrentProductPositioning();
            
            this.initialized = true;
            console.log('✅ AR Positioning Integration initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize AR Positioning Integration:', error);
        }
    }

    // Wait for A-Frame scene to be ready
    waitForAFrameScene() {
        return new Promise((resolve) => {
            const checkScene = () => {
                const scene = document.querySelector('a-scene');
                if (scene && scene.hasLoaded) {
                    this.arScene = scene;
                    resolve();
                } else {
                    setTimeout(checkScene, 100);
                }
            };
            checkScene();
        });
    }

    // Load positioning data from localStorage or API
    async loadPositioningData() {
        try {
            // Try to load from localStorage first (admin dashboard data)
            const savedData = localStorage.getItem('glbPositioningData');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                this.positioningData = new Map(Object.entries(parsedData));
                console.log('📦 Loaded positioning data from localStorage:', this.positioningData);
            }

            // Get current product ID from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            this.currentProductId = urlParams.get('productId') || urlParams.get('frame');
            
            console.log('🎯 Current product ID:', this.currentProductId);
        } catch (error) {
            console.error('❌ Error loading positioning data:', error);
        }
    }

    // Apply positioning to the current product
    applyCurrentProductPositioning() {
        if (!this.currentProductId || !this.arScene) {
            console.log('⚠️ No product ID or AR scene available');
            return;
        }

        // Find positioning data for current product
        const positioning = this.positioningData.get(this.currentProductId);
        if (!positioning) {
            console.log('⚠️ No positioning data found for product:', this.currentProductId);
            return;
        }

        console.log('🎯 Applying positioning for product:', this.currentProductId, positioning);

        // Apply positioning to all GLB models in the scene
        this.applyPositioningToModels(positioning);
    }

    // Apply positioning data to GLB models
    applyPositioningToModels(positioning) {
        // Find all mindar-face-target entities
        const faceTargets = this.arScene.querySelectorAll('[mindar-face-target]');
        
        faceTargets.forEach((entity, index) => {
            const glbModel = entity.querySelector('a-gltf-model');
            if (glbModel && !glbModel.hasAttribute('mindar-face-occluder')) {
                // Skip head occluder, only apply to glasses models
                this.applyPositioningToModel(entity, glbModel, positioning);
            }
        });
    }

    // Apply positioning to a specific model
    applyPositioningToModel(entity, glbModel, positioning) {
        try {
            // Update anchor index
            entity.setAttribute('mindar-face-target', `anchorIndex: ${positioning.anchorIndex}`);
            
            // Update position
            const position = `${positioning.position.x} ${positioning.position.y} ${positioning.position.z}`;
            glbModel.setAttribute('position', position);
            
            // Update rotation
            const rotation = `${positioning.rotation.x} ${positioning.rotation.y} ${positioning.rotation.z}`;
            glbModel.setAttribute('rotation', rotation);
            
            // Update scale
            const scale = `${positioning.scale.x} ${positioning.scale.y} ${positioning.scale.z}`;
            glbModel.setAttribute('scale', scale);
            
            console.log('✅ Applied positioning to model:', {
                anchorIndex: positioning.anchorIndex,
                position,
                rotation,
                scale
            });
        } catch (error) {
            console.error('❌ Error applying positioning to model:', error);
        }
    }

    // Update positioning data for a product
    updateProductPositioning(productId, positioningData) {
        this.positioningData.set(productId, positioningData);
        
        // Save to localStorage
        const dataObject = Object.fromEntries(this.positioningData);
        localStorage.setItem('glbPositioningData', JSON.stringify(dataObject));
        
        // Apply if it's the current product
        if (productId === this.currentProductId) {
            this.applyPositioningToModels(positioningData);
        }
    }

    // Get positioning data for a product
    getProductPositioning(productId) {
        return this.positioningData.get(productId) || null;
    }

    // Reset positioning for a product to defaults
    resetProductPositioning(productId) {
        const defaultPositioning = {
            anchorIndex: 168,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
        };
        
        this.updateProductPositioning(productId, defaultPositioning);
    }

    // Export positioning data for sharing or backup
    exportPositioningData() {
        return Object.fromEntries(this.positioningData);
    }

    // Import positioning data from external source
    importPositioningData(data) {
        try {
            this.positioningData = new Map(Object.entries(data));
            localStorage.setItem('glbPositioningData', JSON.stringify(data));
            
            // Reapply current product positioning
            this.applyCurrentProductPositioning();
            
            console.log('✅ Imported positioning data successfully');
        } catch (error) {
            console.error('❌ Error importing positioning data:', error);
        }
    }

    // Real-time positioning update (for live preview)
    updateLivePositioning(positioningData) {
        if (!this.initialized || !this.currentProductId) return;
        
        this.applyPositioningToModels(positioningData);
    }

    // Get face anchor information
    getFaceAnchorInfo() {
        return {
            'face-center': { index: 168, name: 'Face Center' },
            'forehead': { index: 9, name: 'Forehead' },
            'nose': { index: 1, name: 'Nose Tip' },
            'chin': { index: 175, name: 'Chin' },
            'left-ear': { index: 234, name: 'Left Ear' },
            'right-ear': { index: 454, name: 'Right Ear' }
        };
    }

    // Validate positioning data
    validatePositioningData(data) {
        const required = ['anchorIndex', 'position', 'rotation', 'scale'];
        const positionKeys = ['x', 'y', 'z'];
        
        if (!data || typeof data !== 'object') return false;
        
        for (const key of required) {
            if (!(key in data)) return false;
            
            if (key !== 'anchorIndex' && typeof data[key] !== 'object') return false;
            
            if (key !== 'anchorIndex') {
                for (const axis of positionKeys) {
                    if (!(axis in data[key]) || typeof data[key][axis] !== 'number') {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }
}

// Create global instance
const arPositioningIntegration = new ARPositioningIntegration();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    arPositioningIntegration.initialize();
});

// Export for global access
window.arPositioningIntegration = arPositioningIntegration;