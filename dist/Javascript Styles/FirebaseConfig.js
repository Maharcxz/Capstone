// Firebase Configuration and Initialization

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCGnk5t973s-dFvZsK1VJW3yUpQDuAIPuc",
    authDomain: "capstone-66529.firebaseapp.com",
    projectId: "capstone-66529",
    storageBucket: "capstone-66529.firebasestorage.app",
    messagingSenderId: "202809244213",
    appId: "1:202809244213:web:c0ee9b358d4ab83579cf7c",
    measurementId: "G-ZGV2HWPZ46",
    databaseURL: "https://capstone-66529-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.database();

// Global admin mode state
let isAdminMode = false;

// Reference to pre-orders collection in the database
const preOrdersRef = db.ref('preOrders');

// Reference to products collection in the database
const productsRef = db.ref('products');

// Reference to categories collection in the database
const categoriesRef = db.ref('categories');

// Reference to notifications collection in the database
const notificationsRef = db.ref('notifications');

// Function to save pre-order to Firebase and attach confirmation details on the same record
function savePreOrderToFirebase(preOrder) {
    // First write only the customer-provided pre-order data
    return preOrdersRef.push(preOrder).then((result) => {
        // Then attach confirmation details to the SAME document (no separate entry)
        const confirmationAttachment = {
            confirmationDetails: {
                message: 'Pre-order submitted successfully!',
                status: 'submitted',
                timestamp: new Date().toISOString()
            }
        };

        return preOrdersRef.child(result.key).update(confirmationAttachment).then(() => {
            return { key: result.key };
        });
    });
}

// Function to get all pre-orders from Firebase
async function getAllPreOrders() {
    const snapshot = await preOrdersRef.once('value');
    const preOrders = [];
    
    snapshot.forEach(childSnapshot => {
        const preOrder = childSnapshot.val();
        preOrder.id = childSnapshot.key;
        preOrders.push(preOrder);
    });
    
    return preOrders;
}

// Function to listen for new pre-orders
function listenForNewPreOrders(callback) {
    preOrdersRef.on('child_added', snapshot => {
        const preOrder = snapshot.val();
        preOrder.id = snapshot.key;
        callback(preOrder);
    });
}

// Product Management Functions
function saveProductToFirebase(product) {
    if (product.id) {
        // Update existing product
        return productsRef.child(product.id).set(product);
    } else {
        // Create new product
        return productsRef.push(product);
    }
}

async function getAllProducts() {
    const snapshot = await productsRef.once('value');
    const products = [];
    
    snapshot.forEach(childSnapshot => {
        const product = childSnapshot.val();
        product.id = childSnapshot.key;
        products.push(product);
    });
    
    return products;
}

async function getProductById(productId) {
    const snapshot = await productsRef.child(productId).once('value');
    const product = snapshot.val();
    if (product) {
        product.id = productId;
    }
    return product;
}

function deleteProductFromFirebase(productId) {
    return productsRef.child(productId).remove();
}

function listenForProductChanges(callback) {
    productsRef.on('value', snapshot => {
        const products = [];
        snapshot.forEach(childSnapshot => {
            const product = childSnapshot.val();
            product.id = childSnapshot.key;
            products.push(product);
        });
        callback(products);
    });
}

// Inventory helpers
async function decrementProductStock(productId, qty = 1) {
    const amount = parseInt(qty, 10);
    const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 1;
    const stockRef = productsRef.child(productId).child('stock');
    // Use a transaction to avoid race conditions and prevent negative stock
    const result = await stockRef.transaction(current => {
        const currentVal = parseInt(current || 0, 10);
        const nextVal = Math.max(currentVal - safeAmount, 0);
        return nextVal;
    });
    return { productId, committed: result.committed, newStock: result.snapshot && result.snapshot.val() };
}

async function decrementProductStockByTitle(title, qty = 1) {
    if (!title) throw new Error('Product title is required');
    // Find product by exact title match
    const snap = await productsRef.orderByChild('title').equalTo(title).once('value');
    if (!snap.exists()) {
        throw new Error('Product not found for title: ' + title);
    }

    // If multiple match, take the first
    let targetId = null;
    snap.forEach(child => {
        if (!targetId) targetId = child.key;
    });

    if (!targetId) throw new Error('Unable to resolve product id');
    return decrementProductStock(targetId, qty);
}

// Category Management Functions
function saveCategoryToFirebase(category) {
    if (category.id) {
        // Use deterministic id for categories
        return categoriesRef.child(category.id).set(category);
    } else {
        // Fallback to auto key if no id provided
        const newRef = categoriesRef.push();
        const catWithId = { ...category, id: newRef.key };
        return newRef.set(catWithId);
    }
}

async function getAllCategories() {
    const snapshot = await categoriesRef.once('value');
    const categories = [];
    snapshot.forEach(childSnapshot => {
        const category = childSnapshot.val();
        category.id = childSnapshot.key;
        categories.push(category);
    });
    return categories;
}

// Check if a category name already exists (case-insensitive)
async function categoryNameExists(name) {
    const normalized = (name || '').trim().toLowerCase();
    const snapshot = await categoriesRef.once('value');
    let exists = false;
    snapshot.forEach(childSnapshot => {
        const category = childSnapshot.val();
        const catName = (category && category.name ? category.name : '').trim().toLowerCase();
        if (catName === normalized) {
            exists = true;
        }
    });
    return exists;
}

async function cleanupDuplicateCategories(preferredId, normalizedName) {
    const target = (normalizedName || '').trim().toLowerCase();
    const snapshot = await categoriesRef.once('value');
    const deletions = [];
    snapshot.forEach(childSnapshot => {
        const category = childSnapshot.val();
        const catName = (category && category.name ? category.name : '').trim().toLowerCase();
        const key = childSnapshot.key;
        if (catName === target && key !== preferredId) {
            deletions.push(categoriesRef.child(key).remove());
        }
    });
    if (deletions.length) {
        await Promise.all(deletions);
    }
}

function deleteCategoryFromFirebase(categoryId) {
    return categoriesRef.child(categoryId).remove();
}

function listenForCategoryChanges(callback) {
    categoriesRef.on('value', snapshot => {
        const categories = [];
        snapshot.forEach(childSnapshot => {
            const category = childSnapshot.val();
            category.id = childSnapshot.key;
            categories.push(category);
        });
        callback(categories);
    });
}

// Function to stop listening for new pre-orders
function stopListeningForNewPreOrders() {
    preOrdersRef.off('child_added');
}

// Function to sign in with email and password
async function signInWithEmailAndPassword(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return userCredential.user;
    } catch (error) {
        console.error('Error signing in:', error);
        throw error;
    }
}

// Function to sign out
async function signOut() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Error signing out:', error);
        throw error;
    }
}

// Function to check if user is authenticated
function onAuthStateChanged(callback) {
    return auth.onAuthStateChanged(callback);
}

// Export Firebase services and functions
window.firebaseServices = {
    auth,
    db,
    preOrdersRef,
    productsRef,
    savePreOrderToFirebase,
    getAllPreOrders,
    listenForNewPreOrders,
    stopListeningForNewPreOrders,
    saveProductToFirebase,
    getAllProducts,
    getProductById,
    deleteProductFromFirebase,
    listenForProductChanges,
    decrementProductStock,
    decrementProductStockByTitle,
    // Categories
    categoriesRef,
    saveCategoryToFirebase,
    getAllCategories,
    deleteCategoryFromFirebase,
    listenForCategoryChanges,
    categoryNameExists,
    cleanupDuplicateCategories,
    // Notifications
    notificationsRef,
    saveNotificationToFirebase: (notification) => notificationsRef.push(notification),
    getAllNotifications: async () => {
        const snapshot = await notificationsRef.once('value');
        const notifications = [];
        snapshot.forEach(childSnapshot => {
            const n = childSnapshot.val();
            n.id = childSnapshot.key;
            notifications.push(n);
        });
        return notifications;
    },
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
};