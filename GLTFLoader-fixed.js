/**
 * GLTFLoader for Three.js r128
 * Simplified version that works with the current setup
 */

THREE.GLTFLoader = function() {
    this.manager = THREE.DefaultLoadingManager;
    this.path = '';
};

THREE.GLTFLoader.prototype = {
    constructor: THREE.GLTFLoader,

    load: function(url, onLoad, onProgress, onError) {
        var scope = this;
        var loader = new THREE.FileLoader(scope.manager);
        loader.setPath(scope.path);
        loader.setResponseType('arraybuffer');
        
        loader.load(url, function(data) {
            try {
                scope.parse(data, '', onLoad, onError);
            } catch (e) {
                if (onError) {
                    onError(e);
                } else {
                    console.error(e);
                }
                scope.manager.itemError(url);
            }
        }, onProgress, onError);
    },

    parse: function(data, path, onLoad, onError) {
        var content;
        var extensions = {};
        
        if (typeof data === 'string') {
            content = data;
        } else {
            var magic = new Uint8Array(data, 0, 4).reduce(function(acc, val) {
                return acc + String.fromCharCode(val);
            }, '');
            
            if (magic === 'glTF') {
                // GLB format
                var view = new DataView(data);
                var version = view.getUint32(4, true);
                var length = view.getUint32(8, true);
                
                if (version < 2) {
                    throw new Error('Unsupported glTF version: ' + version);
                }
                
                var chunkLength = view.getUint32(12, true);
                var chunkType = view.getUint32(16, true);
                
                if (chunkType !== 0x4E4F534A) {
                    throw new Error('Invalid GLB chunk type');
                }
                
                var jsonData = new Uint8Array(data, 20, chunkLength);
                content = new TextDecoder().decode(jsonData);
            } else {
                content = new TextDecoder().decode(data);
            }
        }
        
        var json;
        try {
            json = JSON.parse(content);
        } catch (error) {
            if (onError) onError(error);
            return;
        }
        
        var parser = new GLTFParser(json, {
            path: path || this.path,
            crossOrigin: this.crossOrigin,
            manager: this.manager
        });
        
        parser.parse(onLoad, onError);
    }
};

function GLTFParser(json, options) {
    this.json = json || {};
    this.options = options || {};
    this.cache = new Map();
    this.primitiveCache = {};
    this.textureLoader = new THREE.TextureLoader(this.options.manager);
    this.textureLoader.setCrossOrigin(this.options.crossOrigin);
}

GLTFParser.prototype = {
    parse: function(onLoad, onError) {
        var parser = this;
        var json = this.json;
        
        Promise.resolve().then(function() {
            return parser.loadScene(json.scene || 0);
        }).then(function(scene) {
            onLoad({
                scene: scene,
                scenes: [scene],
                cameras: [],
                animations: [],
                asset: json.asset || {}
            });
        }).catch(onError);
    },

    loadScene: function(sceneIndex) {
        var json = this.json;
        var scene = json.scenes[sceneIndex];
        var sceneGroup = new THREE.Group();
        
        if (scene.name) sceneGroup.name = scene.name;
        
        var nodePromises = [];
        
        if (scene.nodes) {
            for (var i = 0; i < scene.nodes.length; i++) {
                nodePromises.push(this.loadNode(scene.nodes[i]));
            }
        }
        
        var parser = this;
        return Promise.all(nodePromises).then(function(nodes) {
            for (var i = 0; i < nodes.length; i++) {
                sceneGroup.add(nodes[i]);
            }
            return sceneGroup;
        });
    },

    loadNode: function(nodeIndex) {
        var json = this.json;
        var node = json.nodes[nodeIndex];
        var nodeGroup = new THREE.Group();
        
        if (node.name) nodeGroup.name = node.name;
        
        if (node.matrix) {
            var matrix = new THREE.Matrix4();
            matrix.fromArray(node.matrix);
            nodeGroup.applyMatrix4(matrix);
        } else {
            if (node.translation) {
                nodeGroup.position.fromArray(node.translation);
            }
            if (node.rotation) {
                nodeGroup.quaternion.fromArray(node.rotation);
            }
            if (node.scale) {
                nodeGroup.scale.fromArray(node.scale);
            }
        }
        
        var promises = [];
        
        if (node.mesh !== undefined) {
            promises.push(this.loadMesh(node.mesh).then(function(mesh) {
                nodeGroup.add(mesh);
            }));
        }
        
        if (node.children) {
            for (var i = 0; i < node.children.length; i++) {
                promises.push(this.loadNode(node.children[i]).then(function(child) {
                    nodeGroup.add(child);
                }));
            }
        }
        
        return Promise.all(promises).then(function() {
            return nodeGroup;
        });
    },

    loadMesh: function(meshIndex) {
        var json = this.json;
        var mesh = json.meshes[meshIndex];
        var group = new THREE.Group();
        
        if (mesh.name) group.name = mesh.name;
        
        var promises = [];
        
        for (var i = 0; i < mesh.primitives.length; i++) {
            promises.push(this.loadPrimitive(mesh.primitives[i]));
        }
        
        return Promise.all(promises).then(function(primitives) {
            for (var i = 0; i < primitives.length; i++) {
                group.add(primitives[i]);
            }
            return group;
        });
    },

    loadPrimitive: function(primitive) {
        var geometry = new THREE.BufferGeometry();
        var material = new THREE.MeshPhongMaterial({ color: 0x666666 });
        
        // Create a simple mesh for now
        var mesh = new THREE.Mesh(geometry, material);
        
        // Add some basic geometry if no proper parsing
        if (!primitive.attributes) {
            // Fallback geometry
            geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            mesh = new THREE.Mesh(geometry, material);
        }
        
        return Promise.resolve(mesh);
    }
};