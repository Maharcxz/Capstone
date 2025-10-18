// Centralized Firebase service module
(function(window) {
    if (!window.firebase) {
        console.error("Firebase is not loaded. Ensure Firebase SDK scripts are included before this file.");
        return;
    }

    // Realtime Database instance
    const db = firebase.database();
    // Reference: notifications collection
    const notificationsRef = db.ref('notifications');
    // Reference: pre-orders collection
    const preOrdersRef = db.ref('preOrders');

    // --- Category Services ---

    /**
     * Fetches all categories from Firebase.
     * @returns {Promise<Array>} A promise that resolves to an array of categories.
     */
    async function getAllCategories() {
        const snapshot = await db.ref('categories').once('value');
        const categories = snapshot.val();
        return categories ? Object.values(categories) : [];
    }

    /**
     * Listens for real-time updates to categories.
     * @param {Function} callback - The function to call with the updated categories.
     */
    function listenForCategoryChanges(callback) {
        db.ref('categories').on('value', (snapshot) => {
            const categories = snapshot.val();
            callback(categories ? Object.values(categories) : []);
        });
    }

    /**
     * Checks if a category name already exists in Firebase.
     * @param {string} name - The category name to check.
     * @returns {Promise<boolean>} A promise that resolves to true if the name exists, false otherwise.
     */
    async function categoryNameExists(name) {
        const normalizedName = name.trim().toLowerCase();
        const snapshot = await db.ref('categories').orderByChild('name_lowercase').equalTo(normalizedName).once('value');
        return snapshot.exists();
    }

    /**
     * Saves a new category to Firebase.
     * @param {Object} category - The category object to save.
     * @returns {Promise<void>}
     */
    async function saveCategory(category) {
        const categoryRef = db.ref('categories/' + category.id);
        await categoryRef.set(category);
    }

    /**
     * Deletes a category from Firebase.
     * @param {string} categoryId - The ID of the category to delete.
     * @returns {Promise<void>}
     */
    async function deleteCategory(categoryId) {
        await db.ref('categories/' + categoryId).remove();
    }
    
    // --- Product Services ---
    
    /**
     * Fetches all products from Firebase.
     * @returns {Promise<Array>} A promise that resolves to an array of products.
     */
    async function getAllProducts() {
        const snapshot = await db.ref('products').once('value');
        const products = snapshot.val();
        return products ? Object.values(products) : [];
    }

    /**
     * Listens for real-time updates to products.
     * @param {Function} callback - The function to call with the updated products.
     */
    function listenForProductChanges(callback) {
        db.ref('products').on('value', (snapshot) => {
            const products = snapshot.val();
            callback(products ? Object.values(products) : []);
        });
    }

    /**
     * Fetches a single product by its ID.
     * @param {string} productId - The ID of the product to fetch.
     * @returns {Promise<Object|null>} A promise that resolves to the product object or null if not found.
     */
    async function getProductById(productId) {
        const snapshot = await db.ref('products/' + productId).once('value');
        return snapshot.val();
    }

    /**
     * Saves a product to Firebase.
     * @param {Object} product - The product object to save.
     * @returns {Promise<void>}
     */
    async function saveProduct(product) {
        const productRef = db.ref('products/' + product.id);
        await productRef.set(product);
    }
    
    /**
     * Deletes a product from Firebase.
     * @param {string} productId - The ID of the product to delete.
     * @returns {Promise<void>}
     */
    async function deleteProduct(productId) {
        await db.ref('products/' + productId).remove();
    }

    // --- Auth Services ---

    /**
     * Signs in a user with email and password.
     * @param {string} email - The user's email.
     * @param {string} password - The user's password.
     * @returns {Promise<Object>} A promise that resolves to the user credential.
     */
    async function signInWithEmailAndPassword(email, password) {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        return userCredential.user;
    }

    // --- Notifications Services ---
    
    /**
     * Fetches all notifications and includes their Firebase keys as `id`.
     * @returns {Promise<Array>} Array of notification objects with `id`.
     */
    async function getAllNotifications() {
        const snapshot = await notificationsRef.once('value');
        const data = snapshot.val();
        return data ? Object.entries(data).map(([id, v]) => ({ id, ...v })) : [];
    }

    /**
     * Saves a notification to Firebase under `notifications` with an auto-generated key.
     * @param {Object} notification
     * @returns {Promise<string>} The generated notification id.
     */
    async function saveNotificationToFirebase(notification) {
        const ref = notificationsRef.push();
        await ref.set(notification);
        return ref.key;
    }

    /**
     * Listens for changes to notifications and invokes the callback with an array.
     * @param {Function} callback
     */
    function listenForNotificationChanges(callback) {
        notificationsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            const arr = data ? Object.entries(data).map(([id, v]) => ({ id, ...v })) : [];
            try {
                callback(arr);
            } catch (err) {
                console.error('Error in listenForNotificationChanges callback:', err);
            }
        });
    }

    // --- PreOrders Services ---
    
    /**
     * Fetches all pre-orders and includes their Firebase keys as `id`.
     * @returns {Promise<Array>} Array of pre-order objects with `id`.
     */
    async function getAllPreOrders() {
        const snapshot = await preOrdersRef.once('value');
        const data = snapshot.val();
        return data ? Object.entries(data).map(([id, v]) => ({ id, ...v })) : [];
    }

    /**
     * Removes duplicate categories by normalized name, keeping the preferred id.
     * @param {string} preferredId
     * @param {string} normalizedName - lowercase name to check against `name_lowercase`.
     */
    async function cleanupDuplicateCategories(preferredId, normalizedName) {
        const snap = await db.ref('categories').orderByChild('name_lowercase').equalTo(normalizedName).once('value');
        const data = snap.val() || {};
        const deletions = [];
        for (const [id] of Object.entries(data)) {
            if (id !== preferredId) {
                deletions.push(db.ref('categories/' + id).remove());
            }
        }
        if (deletions.length) {
            await Promise.all(deletions);
        }
    }

    // --- PreOrders Services ---
    
    /**
     * Listens for newly added pre-orders and invokes the callback.
     * @param {Function} callback - Called with each new pre-order object.
     */
    function listenForNewPreOrders(callback) {
        db.ref('preOrders').on('child_added', (snapshot) => {
            const newPreOrder = snapshot.val();
            try {
                callback(newPreOrder);
            } catch (err) {
                console.error('Error in listenForNewPreOrders callback:', err);
            }
        });
    }

    // Expose service functions and references to global window
    window.firebaseServices = {
        getAllCategories,
        listenForCategoryChanges,
        categoryNameExists,
        saveCategory,
        deleteCategory,
        getAllProducts,
        listenForProductChanges,
        getProductById,
        saveProduct,
        deleteProduct,
        signInWithEmailAndPassword,
        listenForNewPreOrders,
        // Notifications
        getAllNotifications,
        saveNotificationToFirebase,
        listenForNotificationChanges,
        // PreOrders
        getAllPreOrders,
        // Raw refs for code that uses them directly
        db,
        notificationsRef,
        preOrdersRef,
        // Admin helpers
        cleanupDuplicateCategories
    };

})(window);