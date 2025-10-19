// Firebase Configuration and Initialization

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBXD_LjPJCrPMHUEMT-VBAt-WqooXH_w2w",
  authDomain: "finalcaps2-1b3dc.firebaseapp.com",
  databaseURL: "https://finalcaps2-1b3dc-default-rtdb.firebaseio.com",
  projectId: "finalcaps2-1b3dc",
  storageBucket: "finalcaps2-1b3dc.appspot.com",
  messagingSenderId: "60099182181",
  appId: "1:60099182181:web:83de041276daf6d847508c",
  measurementId: "G-66ZK8TXQ5Z"
};

// Sanitize databaseURL just in case
firebaseConfig.databaseURL = (firebaseConfig.databaseURL || '').replace(/`/g, '').trim();

// Initialize Firebase app with project configuration
const app = firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.database();

// Global admin mode state flag
// Global flag for enabling admin UI controls
let isAdminMode = false;

// Database reference: pre-orders
const preOrdersRef = db.ref('preOrders');

// Database reference: products
const productsRef = db.ref('products');

// Database reference: categories
const categoriesRef = db.ref('categories');

// Database reference: notifications
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
// Create or update a product in the database
function saveProductToFirebase(product) {
    if (product.id) {
        // Update existing product
        return productsRef.child(product.id).set(product);
    } else {
        // Create new product
        return productsRef.push(product);
    }
}

// Fetch all products and include record ids
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

// Fetch a single product by its id
async function getProductById(productId) {
    const snapshot = await productsRef.child(productId).once('value');
    const product = snapshot.val();
    if (product) {
        product.id = productId;
    }
    return product;
}

// Delete a product by id
function deleteProductFromFirebase(productId) {
    return productsRef.child(productId).remove();
}

// Listen for product collection changes and emit array of products
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
// Atomically decrement product stock using a transaction
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

// Decrement stock by product title (find then update)
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
// Create or update a category; ensure id exists
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

// Fetch all categories and include record ids
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

// Remove duplicate categories with matching normalized names
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

// Delete a category by id
function deleteCategoryFromFirebase(categoryId) {
    return categoriesRef.child(categoryId).remove();
}

// Listen for category collection changes and emit array of categories
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
// Expose Firebase helpers and references globally
// Global export of Firebase helpers and DB references
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