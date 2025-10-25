// Firebase Configuration and Initialization

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBXD_LjPJCrPMHUEMT-VBAt-WqooXH_w2w",
  authDomain: "finalcaps2-1b3dc.firebaseapp.com",
  databaseURL: " `https://finalcaps2-1b3dc-default-rtdb.firebaseio.com` ",
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
const auditLogsRef = db.ref('auditLogs');

// Server-side validation functions
function normalizePhoneToE164PH(input) {
    const raw = String(input || '').trim();
    const digits = raw.replace(/\D/g, '');
    if (/^639\d{9}$/.test(digits)) return '+' + digits;
    if (/^09\d{9}$/.test(digits)) return '+63' + digits.slice(1);
    if (/^\+639\d{9}$/.test(raw)) return raw;
    const tail = digits.replace(/^63|^0/, '').slice(0, 10);
    return '+63' + tail;
}

function validatePreOrderData(preOrder) {
    const errors = [];
    
    // Validate required fields
    if (!preOrder.firstName || typeof preOrder.firstName !== 'string' || preOrder.firstName.trim().length === 0) {
        errors.push('First name is required');
    } else if (!/^[A-Za-z\s]+$/.test(preOrder.firstName.trim())) {
        errors.push('First name must contain only alphabetical characters and spaces');
    }
    
    if (!preOrder.lastName || typeof preOrder.lastName !== 'string' || preOrder.lastName.trim().length === 0) {
        errors.push('Last name is required');
    } else if (!/^[A-Za-z\s]+$/.test(preOrder.lastName.trim())) {
        errors.push('Last name must contain only alphabetical characters and spaces');
    }
    
    if (!preOrder.email || typeof preOrder.email !== 'string') {
        errors.push('Email is required');
    } else if (!/^[A-Za-z0-9._%+-]+@gmail\.com$/.test(preOrder.email.trim())) {
        errors.push('Email must be a valid Gmail address');
    }
    
    if (!preOrder.phone || typeof preOrder.phone !== 'string') {
        errors.push('Phone number is required');
    } else {
        const raw = preOrder.phone.trim();
        const digits = raw.replace(/\D/g, '');
        const isE164 = /^\+639\d{9}$/.test(raw);
        const isNoPlusE164 = /^639\d{9}$/.test(digits);
        const isLocal = /^09\d{9}$/.test(digits);
        if (!(isE164 || isNoPlusE164 || isLocal)) {
            errors.push('Phone must be a valid PH mobile (e.g., +639XXXXXXXXX)');
        }
    }
    
    if (!preOrder.frameName || typeof preOrder.frameName !== 'string' || preOrder.frameName.trim().length === 0) {
        errors.push('Frame name is required');
    }
    
    const quantity = parseInt(preOrder.quantity, 10);
    if (!Number.isFinite(quantity) || quantity < 1) {
        errors.push('Quantity must be a positive number');
    }
    
    // Validate order type
    if (preOrder.orderType && !['standard', 'pre-order'].includes(preOrder.orderType)) {
        errors.push('Invalid order type');
    }
    
    // Validate status
    if (preOrder.status && !['pending', 'confirmed', 'completed', 'cancelled'].includes(preOrder.status)) {
        errors.push('Invalid status');
    }
    
    // Validate optional billing
    if (preOrder.billing) {
        const b = preOrder.billing;
        const toNum = (v) => Number.isFinite(Number(v)) ? Number(v) : NaN;
        const checks = [
            ['frameUnitPrice', b.frameUnitPrice],
            ['lensUnitUpgrade', b.lensUnitUpgrade],
            ['totalFramePrice', b.totalFramePrice],
            ['totalLensUpgradePrice', b.totalLensUpgradePrice],
            ['totalPrice', b.totalPrice]
        ];
        checks.forEach(([name, val]) => {
            const n = toNum(val);
            if (!Number.isFinite(n) || n < 0) {
                errors.push(`Billing field ${name} must be a non-negative number`);
            }
        });
    }
    
    return errors;
}

// Audit logging functions
function createAuditLog(action, entityType, entityId, details, userId = null) {
    const auditEntry = {
        action: action, // 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE'
        entityType: entityType, // 'PREORDER', 'PRODUCT', 'USER'
        entityId: entityId,
        details: details,
        userId: userId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ipAddress: null // Would need server-side implementation for real IP
    };
    
    return auditLogsRef.push(auditEntry);
}

async function getAuditLogs(entityType = null, entityId = null, limit = 100) {
    let query = auditLogsRef.orderByChild('timestamp').limitToLast(limit);
    
    const snapshot = await query.once('value');
    const logs = [];
    
    snapshot.forEach(childSnapshot => {
        const log = childSnapshot.val();
        log.id = childSnapshot.key;
        
        // Filter by entityType and entityId if provided
        if (entityType && log.entityType !== entityType) return;
        if (entityId && log.entityId !== entityId) return;
        
        logs.push(log);
    });
    
    return logs.reverse(); // Most recent first
}

// Function to save pre-order to Firebase and attach confirmation details on the same record
async function savePreOrderToFirebase(preOrder) {
    // Server-side validation
    const validationErrors = validatePreOrderData(preOrder);
    if (validationErrors.length > 0) {
        return Promise.reject(new Error('Validation failed: ' + validationErrors.join(', ')));
    }
    
    // Sanitize data before saving
    const sanitizedPreOrder = {
        firstName: preOrder.firstName.trim(),
        lastName: preOrder.lastName.trim(),
        email: preOrder.email.trim().toLowerCase(),
        phone: normalizePhoneToE164PH(preOrder.phone),
        frameName: preOrder.frameName.trim(),
        productId: preOrder.productId || null,
        quantity: parseInt(preOrder.quantity, 10),
        prescription: preOrder.prescription ? preOrder.prescription.trim() : '',
        notes: preOrder.notes ? preOrder.notes.trim() : '',
        orderType: preOrder.orderType || 'standard',
        specialRequestKeywordsMatched: Boolean(preOrder.specialRequestKeywordsMatched),
        date: new Date().toISOString(),
        status: 'pending',
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        expiryPolicyDays: 5
    };
    
    // Normalize helper to parse integer-like amounts
    const normalizeAmount = (v) => {
        if (v === null || v === undefined) return null;
        const n = parseInt(String(v).replace(/[^0-9\-]/g, ''), 10);
        return Number.isFinite(n) ? n : null;
    };

    // Compute sanitized billing from input or product data
    let productForBilling = null;
    try {
        if (sanitizedPreOrder.productId) {
            const snap = await productsRef.child(sanitizedPreOrder.productId).once('value');
            productForBilling = snap.val() || null;
        }
    } catch (_) {}

    const q = sanitizedPreOrder.quantity || 1;
    const incomingBilling = preOrder.billing || {};
    const frameUnitPrice = normalizeAmount(incomingBilling.frameUnitPrice) ?? normalizeAmount(productForBilling && productForBilling.price) ?? 0;
    const lensUnitUpgrade = normalizeAmount(incomingBilling.lensUnitUpgrade) ?? 0;
    const totalFramePrice = frameUnitPrice * q;
    const totalLensUpgradePrice = lensUnitUpgrade * q;
    const totalPrice = totalFramePrice + totalLensUpgradePrice;
    sanitizedPreOrder.billing = {
        quantity: q,
        frameUnitPrice,
        lensUnitUpgrade,
        totalFramePrice,
        totalLensUpgradePrice,
        totalPrice,
        currency: 'PHP'
    };

    // Server-side stock validation as backup
    try {
        if (sanitizedPreOrder.productId || sanitizedPreOrder.frameName) {
            let product = null;
            if (sanitizedPreOrder.productId) {
                const snap = await productsRef.child(sanitizedPreOrder.productId).once('value');
                product = snap.val();
            } else {
                const snap = await productsRef.orderByChild('title').equalTo(sanitizedPreOrder.frameName).once('value');
                if (snap.exists()) {
                    snap.forEach(child => { if (!product) product = child.val(); });
                }
            }
            if (product && Number.isFinite(parseInt(product.stock, 10))) {
                const stock = parseInt(product.stock, 10);
                if (sanitizedPreOrder.quantity > stock) {
                    throw new Error(`Quantity exceeds available stock (${stock} available).`);
                }
            }
        }
    } catch (stockErr) {
        return Promise.reject(stockErr);
    }

    // First write only the customer-provided pre-order data
    const result = await preOrdersRef.push(sanitizedPreOrder);
    // Then attach confirmation details to the SAME document
    const confirmationAttachment = {
        confirmationDetails: {
            message: 'Pre-order submitted successfully!',
            status: 'submitted',
            timestamp: new Date().toISOString()
        }
    };
    await preOrdersRef.child(result.key).update(confirmationAttachment);

    try {
        await createAuditLog('CREATE', 'PREORDER', result.key, {
            firstName: sanitizedPreOrder.firstName,
            lastName: sanitizedPreOrder.lastName,
            email: sanitizedPreOrder.email,
            phone: sanitizedPreOrder.phone,
            frameName: sanitizedPreOrder.frameName,
            productId: sanitizedPreOrder.productId,
            quantity: sanitizedPreOrder.quantity,
            orderType: sanitizedPreOrder.orderType,
            billingTotalPrice: sanitizedPreOrder.billing ? sanitizedPreOrder.billing.totalPrice : null
        });
    } catch (auditErr) {
        console.warn('Failed to write audit log for pre-order creation:', auditErr);
    }

    return { key: result.key };
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
        // Create new product with deterministic ID to avoid duplicates on rapid clicks
        const slug = (s) => String(s || '').toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        const t = slug(product.title);
        const c = slug(product.category);
        const id = c ? `${c}-${t}` : t;
        const safeId = id || `product-${Date.now()}`;
        product.id = safeId;
        return productsRef.child(safeId).set(product);
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

// Send password reset email
async function sendPasswordResetEmail(email) {
    try {
        if (!email) throw new Error('Email is required');
        await auth.sendPasswordResetEmail(email);
    } catch (error) {
        console.error('Error sending password reset email:', error);
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
    // Audit logs
    auditLogsRef,
    createAuditLog,
    getAuditLogs,
    // Auth
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    onAuthStateChanged
};