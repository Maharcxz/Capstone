// Admin Dashboard JavaScript
// Product Management System

let allProducts = [];
let filteredProducts = [];
let editingProductId = null;
let sidebarCategories = [];
let currentCategory = 'all';
let pendingCategoryAdds = new Set();
let glbStore = {};
let isSavingProduct = false;
// Stock thresholds for admin low/critical indicators
const ADMIN_CRITICAL_STOCK_THRESHOLD = 2;
const ADMIN_LOW_STOCK_THRESHOLD = 5;

// Helper to reliably find the product submit button even if it's outside the form
function getProductSubmitBtn() {
    return document.querySelector('#productForm button[type="submit"]') ||
           document.querySelector('button[type="submit"][form="productForm"]');
}

// Load GLB data (in-memory session store)
function loadGlbData(glbId) {
    try {
        return glbStore[glbId] || null;
    } catch (error) {
        console.warn('Error loading GLB data:', error);
        return null;
    }
}

// Save GLB data (in-memory session store)
function saveGlbData(glbId, data) {
    try {
        glbStore[glbId] = data;
        console.log('✅ GLB data saved:', glbId, data);
        return true;
    } catch (error) {
        console.error('❌ Error saving GLB data:', error);
        return false;
    }
}

// Export all GLB data
function exportAllGlbData() {
    try {
        const keys = Object.keys(glbStore || {});
        if (keys.length) {
            const dataStr = JSON.stringify(glbStore, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = 'glb-data.json';
            link.click();
            showNotification('GLB data exported successfully!', 'success');
        } else {
            showNotification('No GLB data to export', 'warning');
        }
    } catch (error) {
        console.error('❌ Error exporting GLB data:', error);
        showNotification('Error exporting GLB data', 'error');
    }
}

// Import GLB data
function importGlbData(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData && typeof importedData === 'object') {
                glbStore = importedData;
            } else {
                glbStore = {};
            }
            renderGlbPreview();
            showNotification('GLB data imported successfully!', 'success');
        } catch (error) {
            console.error('❌ Error importing GLB data:', error);
            showNotification('Error importing GLB data', 'error');
        }
    };
    reader.readAsText(file);
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin dashboard initializing...');
    console.log('Initial sidebarCategories:', sidebarCategories);
    
    // Check if user is admin
    checkAdminAccess();
    
    // Load products
    loadProducts();
    
    // Initialize pre-order notification badge
    if (typeof updatePreorderNotificationBadge === 'function') {
        updatePreorderNotificationBadge();
        
        // Update badge every 30 seconds
        setInterval(updatePreorderNotificationBadge, 30000);
    }
    
    // Set up form submission (guard if element missing)
    const productFormEl = document.getElementById('productForm');
    if (productFormEl) {
        productFormEl.addEventListener('submit', handleProductSubmit);
    } else {
        console.warn('productForm element not found; submit handler not bound.');
    }
    
    // Set up file upload event listener (match actual input id and guard)
    // HTML uses id="productImageFiles"; maintain fallback for legacy id "productImages"
    const productImagesInput = document.getElementById('productImageFiles') || document.getElementById('productImages');
    if (productImagesInput) {
        productImagesInput.addEventListener('change', handleFileUpload);
    } else {
        console.warn('Product image input not found; change handler not bound.');
    }

    // Real-time constraints for product price and stock
    const priceEl = document.getElementById('productPrice');
    const stockEl = document.getElementById('productStock');

    function enforcePriceConstraints(el, mode = 'input') {
        let raw = (el.value || '').replace(/[^\d.]/g, '');
        const firstDot = raw.indexOf('.');
        if (firstDot !== -1) {
            raw = raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, '');
        }
        const endsWithDot = raw.endsWith('.');
        let [intPart, decPart = ''] = raw.split('.');
        intPart = intPart.replace(/^0+(?=\d)/, '');
        if (intPart === '') intPart = '0';
        intPart = intPart.slice(0, 5);
        decPart = decPart.slice(0, 2);

        let formatted = intPart;
        if (firstDot !== -1) {
            if (mode === 'input' && endsWithDot) {
                formatted = intPart + '.'; // keep trailing dot while typing
            } else {
                formatted = intPart + (decPart ? '.' + decPart : '');
            }
        }

        if (mode === 'blur') {
            if (formatted === '.' || formatted === '') formatted = '0';
            let num = parseFloat(formatted);
            if (!isNaN(num)) {
                if (num < 0) num = 0;
                if (num > 99999.99) num = 99999.99;
                // keep decimals only up to 2 if present
                const decimals = decPart ? Math.min(decPart.length, 2) : 0;
                formatted = decimals > 0 ? num.toFixed(decimals) : num.toString();
            } else {
                formatted = '0';
            }
        }
        el.value = formatted;
    }

    function enforceStockConstraints(el) {
        let raw = (el.value || '').replace(/\D/g, '');
        raw = raw.slice(0, 4);
        el.value = raw;
    }

    if (priceEl) {
        priceEl.addEventListener('input', () => enforcePriceConstraints(priceEl));
        priceEl.addEventListener('keydown', (e) => {
            const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','Home','End','Tab'];
            if (allowed.includes(e.key)) return;
            if (e.key === '.' || e.key === 'Decimal' || e.key === 'NumpadDecimal') {
                if (priceEl.value.includes('.')) e.preventDefault();
                return;
            }
            if (!/^[0-9]$/.test(e.key)) e.preventDefault();
        });
        priceEl.addEventListener('blur', () => enforcePriceConstraints(priceEl, 'blur'));
    }

    if (stockEl) {
        stockEl.addEventListener('input', () => enforceStockConstraints(stockEl));
        stockEl.addEventListener('keydown', (e) => {
            const blocked = ['e', 'E', '-', '+', '.'];
            if (blocked.includes(e.key)) e.preventDefault();
        });
        stockEl.addEventListener('blur', () => enforceStockConstraints(stockEl));
    }
    
    // Bind Add Category form submit to handler
    const addCategoryForm = document.getElementById('addCategoryForm');
    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', handleAddCategory);
    }
    
    // Initialize sidebar categories (Firebase-backed with local cache fallback)
    loadSidebarCategories();
    console.log('After loading sidebarCategories:', sidebarCategories);
    
    // Set up sidebar management
    setupSidebarManagement();
    
    console.log('Admin dashboard initialized');
});

// Check if user has admin access (wait for auth state)
function checkAdminAccess() {
    try {
        // Defer redirect until Firebase resolves auth state
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                console.log('Admin access granted; user is authenticated:', user.email);
                // Ensure admin UI visibility updates if available
                if (typeof updateAdminButtonVisibility === 'function') {
                    updateAdminButtonVisibility();
                }
            } else {
                alert('Access denied. Admin login required.');
                window.location.href = 'index.html';
            }
        });
    } catch (e) {
        console.warn('Unable to attach auth state listener:', e);
        alert('Access denied. Admin login required.');
        window.location.href = 'index.html';
    }
}

// Load all products from Firebase
async function loadProducts() {
    try {
        const products = await getAllProducts();
        allProducts = products;
        filteredProducts = [...allProducts];
        renderProducts();
        
        // Listen for real-time updates
        listenForProductChanges((updatedProducts) => {
            allProducts = updatedProducts;
            filterProducts(); // Re-apply current filters
        });
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error loading products', 'error');
    }
}

// Render products in the grid
function renderProducts() {
    const productsGrid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (filteredProducts.length === 0) {
        productsGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    productsGrid.style.display = 'grid';
    emptyState.style.display = 'none';
    
    productsGrid.innerHTML = filteredProducts.map(product => `
        <div class="admin-product-card" data-product-id="${product.id}">
            <div class="product-status ${product.visible ? 'status-visible' : 'status-hidden'}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${product.visible ? 
                        '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>' :
                        '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>'
                    }
                </svg>
                ${product.visible ? 'Visible' : 'Hidden'}
            </div>
            ${(() => {
                const v = product.stock || 0;
                const cls = v === 0 ? 'out-of-stock' : v <= ADMIN_CRITICAL_STOCK_THRESHOLD ? 'critical-stock' : v <= ADMIN_LOW_STOCK_THRESHOLD ? 'low-stock' : 'in-stock';
                const label = v === 0 ? 'Out of Stock' : v <= ADMIN_CRITICAL_STOCK_THRESHOLD ? `Critical (${v})` : v <= ADMIN_LOW_STOCK_THRESHOLD ? `Low (${v})` : `In Stock (${v})`;
                return `<div class=\"stock-badge ${cls}\" title=\"${label}\">${label}</div>`;
            })()}
            
            <div class="product-image-admin">
                ${(() => {
                    const images = product.images || (product.image ? [product.image] : []);
                    const primaryImage = images[0];
                    const imageCount = images.length;
                    
                    if (primaryImage) {
                        return `<img src="${primaryImage}" alt="${escapeHtml(product.title)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                <div class="image-placeholder-admin" style="display: none;">🖼</div>
                                ${imageCount > 1 ? `<div class="image-count-badge">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                        <polyline points="21,15 16,10 5,21"></polyline>
                                    </svg>
                                    ${imageCount} images
                                </div>` : ''}`;
                    } else {
                        return `<div class="image-placeholder-admin">🖼</div>`;
                    }
                })()}
            </div>
            
            <div class="product-details">
                <div class="product-title-price-row-admin">
                    <h3 class="product-title-admin">${escapeHtml(product.title)}</h3>
                    <p class="product-price-admin">₱ ${parseFloat(product.price).toLocaleString()}</p>
                </div>
                <p class="product-description-admin">${escapeHtml(product.description || 'No description available')}</p>
                <p class="product-category-admin">${escapeHtml(product.category)}</p>
                
                <div class="admin-actions">
                    <button class="admin-btn edit-btn" onclick="editProduct('${product.id}')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                    </button>
                    <button class="admin-btn delete-btn" onclick="deleteProduct('${product.id}', '${escapeHtml(product.title)}')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                        </svg>
                        Delete
                    </button>
                    <button class="admin-btn toggle-visibility-btn ${product.visible ? '' : 'hidden'}" 
                            onclick="toggleProductVisibility('${product.id}', ${product.visible}, '${escapeHtml(product.title)}')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            ${product.visible ? 
                                '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>' :
                                '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>'
                            }
                        </svg>
                        ${product.visible ? 'Hide' : 'Show'}
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Filter products based on search and filters
function filterProducts() {
    const searchTerm = (document.getElementById('productSearch')?.value || '').toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const visibilityFilter = document.getElementById('visibilityFilter')?.value || '';
    const stockFilter = document.getElementById('stockFilter')?.value || '';
    
    filteredProducts = allProducts.filter(product => {
        const matchesSearch = product.title.toLowerCase().includes(searchTerm) ||
                            (product.description && product.description.toLowerCase().includes(searchTerm));
        
        const matchesCategory = !categoryFilter || product.category === categoryFilter;
        
        const matchesVisibility = !visibilityFilter ||
                                (visibilityFilter === 'visible' && product.visible) ||
                                (visibilityFilter === 'hidden' && !product.visible);
        
        const v = product.stock || 0;
        const matchesStock = !stockFilter ||
            (stockFilter === 'out' && v === 0) ||
            (stockFilter === 'critical' && v > 0 && v <= ADMIN_CRITICAL_STOCK_THRESHOLD) ||
            (stockFilter === 'low' && v > ADMIN_CRITICAL_STOCK_THRESHOLD && v <= ADMIN_LOW_STOCK_THRESHOLD) ||
            (stockFilter === 'in' && v > ADMIN_LOW_STOCK_THRESHOLD);
        
        return matchesSearch && matchesCategory && matchesVisibility && matchesStock;
    });
    
    renderProducts();
}

// Open modal for adding new product
function openAddProductModal() {
    editingProductId = null;
    document.getElementById('modalTitle').textContent = 'Add New Product';
    document.getElementById('productForm').reset();
    document.getElementById('productStock').value = 0; // Reset stock to 0
    clearAllImages(); // Clear any existing images
    clearAllGlbFiles(); // Clear any existing 3D models
    document.getElementById('productModal').classList.add('active');
    const submitBtn = getProductSubmitBtn();
    if (submitBtn) {
        submitBtn.textContent = 'Save Product';
        submitBtn.dataset.mode = 'create';
    }
}

// Open modal for editing existing product
async function editProduct(productId) {
    try {
        const product = await getProductById(productId);
        if (!product) {
            showNotification('Product not found', 'error');
            return;
        }
        
        editingProductId = productId;
        document.getElementById('modalTitle').textContent = 'Edit Product';
        
        // Populate form with product data
        document.getElementById('productTitle').value = product.title;
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productStock').value = product.stock || 0;
        
        // Handle multiple images - load existing images into the preview
        clearAllImages(); // Clear any existing images first
        
        if (product.images && Array.isArray(product.images)) {
            // Load multiple images from array
            product.images.forEach((imageUrl, index) => {
                addImageToPreview(imageUrl, `Image ${index + 1}`);
            });
        } else if (product.image) {
            // Backward compatibility - load single image
            addImageToPreview(product.image, 'Primary Image');
        }
        
        // Handle .glb files - load existing .glb files into the preview
        clearAllGlbFiles(); // Clear any existing .glb files first
        
        if (product.glbFiles && Array.isArray(product.glbFiles)) {
            // Load multiple .glb files from array; support both saved shapes (url/src)
            product.glbFiles.forEach((glbFile, index) => {
                const source = (glbFile && (glbFile.url || glbFile.src)) || '';
                if (typeof source === 'string' && source.trim()) {
                    addGlbFileToPreview(source, glbFile.name || `GLB Model ${index + 1}`);
                }
            });
        }
        
        // Clear the file inputs when editing
        const imageFileInput = document.getElementById('productImage');
        if (imageFileInput) {
            imageFileInput.value = '';
        }
        
        const glbFileInput = document.getElementById('productGlbFiles');
        if (glbFileInput) {
            glbFileInput.value = '';
        }
        
        document.getElementById('productModal').classList.add('active');
        const submitBtn = getProductSubmitBtn();
        if (submitBtn) {
            submitBtn.textContent = 'Update Product';
            submitBtn.dataset.mode = 'update';
        }
    } catch (error) {
        console.error('Error loading product for editing:', error);
        showNotification('Error loading product', 'error');
    }
}

// Close product modal
function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    editingProductId = null;
    const submitBtn = getProductSubmitBtn();
    if (submitBtn) {
        submitBtn.textContent = 'Save Product';
        submitBtn.dataset.mode = 'create';
        submitBtn.disabled = false;
        submitBtn.classList.remove('disabled', 'loading');
        submitBtn.removeAttribute('aria-busy');
    }
    clearAllImages(); // Clear images when closing modal
    clearAllGlbFiles(); // Clear .glb files when closing modal
}

// Normalize external URLs from common providers to direct links
function normalizeExternalUrl(url) {
    if (typeof url !== 'string') return url;
    let u = url.trim();
    const ghMatch = u.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/(.+)$/);
    if (ghMatch) {
        const [, owner, repo, path] = ghMatch;
        return `https://raw.githubusercontent.com/${owner}/${repo}/${path}`;
    }
    if (u.includes('dropbox.com')) {
        try {
            const dbUrl = new URL(u);
            // Force direct download and swap to direct content host
            dbUrl.searchParams.set('dl', '1');
            if (dbUrl.hostname.endsWith('dropbox.com')) {
                dbUrl.hostname = 'dl.dropboxusercontent.com';
            }
            return dbUrl.toString();
        } catch (e) {}
    }
    const gdFileMatch = u.match(/^https?:\/\/drive\.google\.com\/file\/d\/([^\/]+)\/view.*$/);
    if (gdFileMatch) {
        const id = gdFileMatch[1];
        return `https://drive.google.com/uc?export=download&id=${id}`;
    }
    const gdUcMatch = u.match(/^https?:\/\/drive\.google\.com\/uc\?id=([^&]+).*$/);
    if (gdUcMatch) {
        const id = gdUcMatch[1];
        return `https://drive.google.com/uc?export=download&id=${id}`;
    }
    return u;
}

// Handle product form submission
async function handleProductSubmit(event) {
    event.preventDefault();

    // Prevent double submissions
    if (isSavingProduct) {
        showNotification('Already saving, please wait...', 'info');
        return;
    }
    isSavingProduct = true;

    const submitBtn = (event && event.submitter) ? event.submitter : getProductSubmitBtn();
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.textContent = 'Saving...';
        submitBtn.setAttribute('aria-busy', 'true');
    }

    try {
        // Surface current auth state for clearer diagnostics
        try {
            const firebaseUser = firebase.auth && firebase.auth().currentUser;
            if (!firebaseUser) {
                console.warn('No Firebase user is authenticated. Writes may be blocked by database rules.');
            }
        } catch (e) {
            console.warn('Unable to read Firebase auth state:', e);
        }
        
        // Get images from the productImages array
        const images = productImages.map(img => img.src);

        // Read basic fields early so we can compute productId for Storage paths
        const title = document.getElementById('productTitle').value.trim();
        const category = document.getElementById('productCategory').value;
        const productId = editingProductId || generateProductId(title, category);
        
        // Build final GLB files list: upload local files to Firebase Storage (with timeouts)
        const withTimeout = (promise, ms, label) => new Promise((resolve, reject) => {
             const t = setTimeout(() => reject(new Error(label || `Timeout after ${ms}ms`)), ms);
             promise.then(v => { clearTimeout(t); resolve(v); }).catch(e => { clearTimeout(t); reject(e); });
         });
         const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
             try {
                 const reader = new FileReader();
                 reader.onload = () => resolve(reader.result);
                 reader.onerror = reject;
                 reader.readAsDataURL(file);
             } catch (e) { reject(e); }
         });
         const finalGlbFiles = [];
         for (const glb of productGlbFiles) {
            if (glb && glb.file instanceof File) {
                // Upload the local file to Firebase Storage
                const baseName = (glb.name || glb.file.name || 'model');
                const safeName = baseName.replace(/[^a-z0-9_\-\.]/gi, '_').toLowerCase();
                const storagePath = `glb/${productId}/${Date.now()}-${safeName}`;
                try {
                    const storageRefFactory = firebase.storage && firebase.storage().ref ? firebase.storage().ref : null;
                 let url = null;
                 if (storageRefFactory) {
                     const ref = storageRefFactory(storagePath);
                     const snap = await withTimeout(ref.put(glb.file), 20000, 'Upload timed out');
                     url = await withTimeout(snap.ref.getDownloadURL(), 10000, 'Download URL timed out');
                 } else {
                     console.warn('Firebase Storage not available, storing GLB inline as data URL');
                     url = await withTimeout(readFileAsDataUrl(glb.file), 15000, 'Data URL timed out');
                 }
                 finalGlbFiles.push({ url, name: baseName, size: glb.size });
                } catch (e) {
                    console.error('Failed to upload GLB to Storage:', storagePath, e);
                    try {
                        const dataUrl = await withTimeout(readFileAsDataUrl(glb.file), 15000, 'Data URL timed out');
                         finalGlbFiles.push({ url: dataUrl, name: baseName, size: glb.size });
                     } catch (e2) {
                        showNotification(`Failed to attach 3D model: ${baseName}`, 'error');
                    }
                }
            } else {
                const rawUrl = typeof glb?.src === 'string' ? glb.src : '';
                const normalizedUrl = normalizeExternalUrl(rawUrl);
                if (normalizedUrl && !normalizedUrl.startsWith('blob:')) {
                    finalGlbFiles.push({ url: normalizedUrl, name: glb.name, size: glb.size });
                }
            }
        }
        
        // Debug logging
        console.log('Product Images Array:', productImages);
        console.log('Extracted Images:', images);
        console.log('Images Length:', images.length);
        console.log('Product GLB Files Array:', productGlbFiles);
        console.log('Final GLB Files:', finalGlbFiles);
        console.log('GLB Files Length:', finalGlbFiles.length);
        // Images are optional: allow saving without images
        // (Product cards already show a placeholder when no image is provided)
        
        const formData = {
            title: title,
            description: document.getElementById('productDescription').value.trim(),
            price: parseFloat(document.getElementById('productPrice').value),
            category: category,
            stock: parseInt(document.getElementById('productStock').value) || 0,
            images: images, // Store multiple images
            image: images[0] || '', // Keep first image for backward compatibility (optional)
            glbFiles: finalGlbFiles, // Store .glb files (uploaded + URLs)
            visible: true, // Default to visible since we removed the checkbox
            updatedAt: new Date().toISOString()
        };
        
        // Validation
        if (!formData.title || !formData.category || isNaN(formData.price) || formData.price < 0 || isNaN(formData.stock) || formData.stock < 0) {
            showNotification('Please fill in all required fields correctly', 'error');
            return;
        }
        
        // Additional validation for character/digit limits
        if (formData.title.length > 32) {
            showNotification('Product title cannot exceed 32 characters', 'error');
            return;
        }
        
        if (formData.price > 99999.99) {
            showNotification('Price cannot exceed 99,999.99 (5 digits + 2 decimals)', 'error');
            return;
        }
        
        if (formData.stock > 9999) {
            showNotification('Stock quantity cannot exceed 9999 (4 digits)', 'error');
            return;
        }
        
        if (editingProductId) {
            // Update existing product
            formData.id = editingProductId;
            await saveProductToFirebase(formData);
            showNotification('Product updated successfully', 'success');
        } else {
            // Create new product with a deterministic ID to avoid duplicates
            formData.createdAt = new Date().toISOString();
            formData.id = generateProductId(formData.title, formData.category);
            await saveProductToFirebase(formData);
            showNotification('Product added successfully', 'success');
        }
        
        closeProductModal();
    } catch (error) {
        console.error('Error saving product:', error);
        const msg = (error && (error.message || error.code)) ? (error.message || error.code) : '';
        if (msg) {
            showNotification(`Error saving product: ${msg}`, 'error');
        } else {
            showNotification('Error saving product', 'error');
        }
        if (msg && /PERMISSION_DENIED|permission|auth/i.test(msg)) {
            showNotification('Please log in with your Firebase admin account and retry.', 'error');
        }
    } finally {
        // Always release the submission lock and restore button state
        isSavingProduct = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            submitBtn.textContent = submitBtn.dataset.originalText || 'Save Product';
            submitBtn.removeAttribute('aria-busy');
        }
        // Best-effort refresh of the products list
        try { await loadProducts(); } catch (e) {}
    }
}

// Delete product (uses custom confirmation modal)
async function deleteProduct(productId, productTitle) {
    // Get modal elements
    const overlay = document.getElementById('confirmDeleteOverlay');
    const messageEl = document.getElementById('confirmDeleteMessage');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const cancelBtn = document.getElementById('cancelDeleteBtn');
    const closeBtn = document.getElementById('closeConfirmDeleteBtn');
    const titleEl = document.querySelector('#confirmDeleteModal .modal-title');
    const originalConfirmClass = confirmBtn.className;

    // Fallback to native confirm if modal elements are missing
    if (!overlay || !messageEl || !confirmBtn || !cancelBtn || !closeBtn) {
        if (!confirm(`Are you sure you want to delete "${productTitle}"? This action cannot be undone.`)) return;
        try {
            await deleteProductFromFirebase(productId);
            showNotification('Product deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting product:', error);
            showNotification('Error deleting product', 'error');
        }
        return;
    }

    // Configure message and show modal
    if (titleEl) titleEl.textContent = 'Confirm Deletion';
    if (confirmBtn) confirmBtn.textContent = 'Delete';
    if (cancelBtn) cancelBtn.style.display = '';
    messageEl.textContent = `Are you sure you want to delete "${productTitle}"? This action cannot be undone.`;
    overlay.classList.add('active');

    // Helper to close modal and clean handlers
    const cleanupAndClose = () => {
        overlay.classList.remove('active');
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
        closeBtn.onclick = null;
        overlay.onclick = null;
        confirmBtn.className = originalConfirmClass;
        if (messageEl) messageEl.classList.remove('boxed');
    };

    // Click-outside closes modal
    overlay.onclick = function (event) {
        if (event.target === overlay) cleanupAndClose();
    };

    // Cancel/x handlers
    cancelBtn.onclick = cleanupAndClose;
    closeBtn.onclick = cleanupAndClose;

    // Confirm deletion
    confirmBtn.onclick = async function () {
        try {
            await deleteProductFromFirebase(productId);
            showNotification('Product deleted successfully', 'success');
            // Re-render products list after deletion
            await loadProducts();

            // Show success state inside the same modal
            if (titleEl) titleEl.textContent = 'Deleted Successfully';
            messageEl.textContent = 'Product deleted successfully';
            if (messageEl) messageEl.classList.add('boxed');
            confirmBtn.textContent = 'OK';
            cancelBtn.style.display = 'none';
            // Apply nav-style OK button look
            confirmBtn.classList.remove('delete');
            confirmBtn.classList.add('ok-nav');

            // Clicking OK closes and restores default state for next open
            confirmBtn.onclick = function () {
                cancelBtn.style.display = '';
                cleanupAndClose();
            };
        } catch (error) {
            console.error('Error deleting product:', error);
            showNotification('Error deleting product', 'error');
            cleanupAndClose();
        }
    };
}

// Toggle product visibility
async function toggleProductVisibility(productId, currentVisibility, productTitle) {
    try {
        const actionText = currentVisibility ? 'Hide' : 'Show';

        // Try to use the custom confirm delete modal
        const overlay = document.getElementById('confirmDeleteOverlay');
        const messageEl = document.getElementById('confirmDeleteMessage');
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        const cancelBtn = document.getElementById('cancelDeleteBtn');
        const closeBtn = document.getElementById('closeConfirmDeleteBtn');
        const titleEl = document.querySelector('#confirmDeleteModal .modal-title');

        // Fallback to native confirm if modal elements are missing
        if (!overlay || !messageEl || !confirmBtn || !cancelBtn || !closeBtn) {
            const proceed = confirm(`Are you sure you want to ${actionText.toLowerCase()} "${productTitle}"?`);
            if (!proceed) return;

            // Fetch only when confirmed
            const product = await getProductById(productId);
            if (!product) { showNotification('Product not found', 'error'); return; }
            product.visible = !currentVisibility;
            product.updatedAt = new Date().toISOString();

            await saveProductToFirebase(product);
            showNotification(`Product ${product.visible ? 'shown' : 'hidden'} successfully`, 'success');
            // Refresh list to reflect the change immediately
            await loadProducts();
            return;
        }

        // Configure message and show modal
        const originalConfirmText = confirmBtn.textContent;
        const originalTitleText = titleEl ? titleEl.textContent : null;
        messageEl.textContent = `Are you sure you want to ${actionText.toLowerCase()} "${productTitle}"?`;
        confirmBtn.textContent = actionText;
        if (titleEl) titleEl.textContent = `Confirm ${actionText}`;
        overlay.classList.add('active');

        // Helper to close modal and clean handlers (and restore button text)
        const cleanupAndClose = () => {
            overlay.classList.remove('active');
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
            closeBtn.onclick = null;
            overlay.onclick = null;
            confirmBtn.textContent = originalConfirmText;
            if (titleEl && originalTitleText) titleEl.textContent = originalTitleText;
        };

        // Click-outside closes modal
        overlay.onclick = function (event) {
            if (event.target === overlay) cleanupAndClose();
        };

        // Cancel/x handlers
        cancelBtn.onclick = cleanupAndClose;
        closeBtn.onclick = cleanupAndClose;

        // Confirm visibility toggle
        confirmBtn.onclick = async function () {
            try {
                // Fetch the product only after confirmation
                const product = await getProductById(productId);
                if (!product) { showNotification('Product not found', 'error'); cleanupAndClose(); return; }
                product.visible = !currentVisibility;
                product.updatedAt = new Date().toISOString();
                await saveProductToFirebase(product);
                showNotification(`Product ${product.visible ? 'shown' : 'hidden'} successfully`, 'success');
                // Refresh list to reflect the change immediately
                await loadProducts();
            } catch (error) {
                console.error('Error updating product visibility:', error);
                showNotification('Error updating product visibility', 'error');
            }
            cleanupAndClose();
        };
    } catch (error) {
        console.error('Error toggling product visibility:', error);
        showNotification('Error updating product visibility', 'error');
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text ? text.replace(/[&<>"']/g, function(m) { return map[m]; }) : '';
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.background = 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)';
            break;
        case 'error':
            notification.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
            break;
        default:
            notification.style.background = 'linear-gradient(135deg, #540000 0%, #6d0000 100%)';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Close modal when clicking outside
document.getElementById('productModal').addEventListener('click', function(event) {
    if (event.target === this) {
        closeProductModal();
    }
});

// Handle escape key to close modal
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeProductModal();
        closeSidebarManagerModal();
    }
});

// ===== DYNAMIC SIDEBAR MANAGEMENT =====

// Load sidebar categories (Firebase-backed with local cache fallback)
function loadSidebarCategories() {
    const fallbackLocal = () => {
        sidebarCategories = [];
        renderSidebar();
        populateCategoryDropdowns();
    };

    try {
        if (window.firebaseServices && typeof window.firebaseServices.getAllCategories === 'function') {
            // Initial load from Firebase
            window.firebaseServices.getAllCategories()
                .then(categories => {
                    // Deduplicate by name to prevent double entries
                    sidebarCategories = Array.isArray(categories) ? uniqueCategoriesByName(categories) : [];
                    // Removed localStorage caching; Firebase is source of truth
                    renderSidebar();
                    renderExistingCategories();
                    populateCategoryDropdowns();
                })
                .catch(err => {
                    console.warn('Failed to load categories from Firebase:', err);
                    sidebarCategories = [];
                    renderSidebar();
                    renderExistingCategories();
                    populateCategoryDropdowns();
                });

            // Listen for real-time changes so UI stays in sync
            if (typeof window.firebaseServices.listenForCategoryChanges === 'function') {
                window.firebaseServices.listenForCategoryChanges(categories => {
                    sidebarCategories = Array.isArray(categories) ? uniqueCategoriesByName(categories) : [];
                    renderSidebar();
                    renderExistingCategories();
                    populateCategoryDropdowns();
                });
            }
        } else {
            sidebarCategories = [];
            renderSidebar();
            populateCategoryDropdowns();
        }
    } catch (error) {
        console.error('Error loading sidebar categories:', error);
        sidebarCategories = [];
        renderSidebar();
        populateCategoryDropdowns();
    }
}

// Helper: ensure unique categories by normalized name
function uniqueCategoriesByName(categories) {
    const map = new Map();
    for (const cat of categories) {
        const nameKey = (cat?.name || '').trim().toLowerCase();
        // Prefer deterministic id if multiple entries exist
        const preferredId = generateCategoryId(nameKey);
        if (!map.has(nameKey)) {
            map.set(nameKey, cat);
        } else {
            const current = map.get(nameKey);
            const isPreferredCurrent = (current?.id || '') === preferredId;
            const isPreferredNew = (cat?.id || '') === preferredId;
            // Keep the preferred deterministic id entry if present
            if (!isPreferredCurrent && isPreferredNew) {
                map.set(nameKey, cat);
            }
        }
    }
    return Array.from(map.values());
}

// Populate category dropdowns with available categories
function populateCategoryDropdowns() {
    const categoryFilter = document.getElementById('categoryFilter');
    const productCategory = document.getElementById('productCategory');
    
    // Always use a deduplicated snapshot to render UI elements
    const dedupedCategories = uniqueCategoriesByName(Array.isArray(sidebarCategories) ? sidebarCategories : []);
    
    if (categoryFilter) {
        // Clear existing options except the first one (All Categories)
        while (categoryFilter.children.length > 1) {
            categoryFilter.removeChild(categoryFilter.lastChild);
        }
        
        // Add sidebar categories to filter dropdown
        dedupedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            categoryFilter.appendChild(option);
        });
    }
    
    if (productCategory) {
        // Store current value
        const currentValue = productCategory.value;
        
        // Clear existing options
        productCategory.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select Category';
        productCategory.appendChild(defaultOption);
        
        // Add sidebar categories to product form dropdown
        dedupedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            productCategory.appendChild(option);
        });
        
        // Restore previous value if it still exists
        if (currentValue) {
            productCategory.value = currentValue;
        }
    }
}

// Save sidebar categories (no-op; Firebase is source of truth)
function saveSidebarCategories() {
    // Intentionally left blank.
}

// Setup sidebar management event listeners
function setupSidebarManagement() {
    console.log('Setting up sidebar management event listeners...');
    
    // Manage Categories button
    const manageCategoriesBtn = document.getElementById('manageCategoriesBtn');
    if (manageCategoriesBtn) {
        manageCategoriesBtn.addEventListener('click', openSidebarManagerModal);
        console.log('Manage Categories button event listener added');
    } else {
        console.warn('manageCategoriesBtn not found');
    }
    
    // Close modal button
    const closeSidebarManagerBtn = document.getElementById('closeSidebarManagerBtn');
    if (closeSidebarManagerBtn) {
        closeSidebarManagerBtn.addEventListener('click', closeSidebarManagerModal);
        console.log('Close sidebar manager button event listener added');
    } else {
        console.warn('closeSidebarManagerBtn not found');
    }
    
    // Close modal when clicking outside
    const sidebarManagerModal = document.getElementById('sidebarManagerModal');
    if (sidebarManagerModal) {
        sidebarManagerModal.addEventListener('click', function(event) {
            if (event.target === this) {
                closeSidebarManagerModal();
            }
        });
        console.log('Modal outside click event listener added');
    } else {
        console.warn('sidebarManagerModal not found');
    }
}

// Add category from form (called by button click)
async function addCategoryFromForm() {
    console.log('addCategoryFromForm called');
    const categoryNameInput = document.getElementById('categoryName');
    const categoryName = categoryNameInput.value.trim();
    const normalizedName = categoryName.toLowerCase();

    if (!categoryName) {
        showNotification('Please enter a category name', 'error');
        return;
    }

    if (categoryName.length > 32) {
        showNotification('Brand name must be 32 characters or less', 'error');
        return;
    }

    if (pendingCategoryAdds.has(normalizedName)) {
        showNotification(`Already adding "${categoryName}". Please wait...`, 'info');
        return;
    }
    pendingCategoryAdds.add(normalizedName);

    try {
        const existsInDb = await firebaseServices.categoryNameExists(categoryName);
        if (existsInDb) {
            showNotification(`Category "${categoryName}" already exists.`, 'error');
            return;
        }
    } catch (err) {
        console.warn('Duplicate check failed, falling back to local check:', err);
    }

    const existsLocal = sidebarCategories.some(cat => 
        (cat.name || '').trim().toLowerCase() === normalizedName
    );
    if (existsLocal) {
        showNotification(`Category "${categoryName}" already exists.`, 'error');
        return;
    }

    const newCategory = {
        id: generateCategoryId(categoryName),
        name: categoryName,
        icon: '🏷️',
        createdAt: new Date().toISOString()
    };

    try {
        await saveCategoryToFirebase(newCategory);
        try {
            await firebaseServices.cleanupDuplicateCategories(newCategory.id, normalizedName);
        } catch (cleanupErr) {
            console.warn('Failed to cleanup duplicates:', cleanupErr);
        }
        showNotification(`Category "${categoryName}" added successfully!`, 'success');
    } catch (error) {
        console.error('Error saving category to Firebase:', error);
        showNotification('Failed to save category. Please try again.', 'error');
        return;
    } finally {
        pendingCategoryAdds.delete(normalizedName);
    }

    categoryNameInput.value = '';
}

// Render sidebar with categories
function renderSidebar() {
    const sidebarContent = document.getElementById('sidebarContent');
    
    // Always render from a deduplicated snapshot to avoid duplicates in UI
    const dedupedCategories = uniqueCategoriesByName(Array.isArray(sidebarCategories) ? sidebarCategories : []);
    
    let html = `
        <div class="sidebar-item ${currentCategory === 'all' ? 'active' : ''}" onclick="filterByCategory('all')">
            <span class="sidebar-item-icon">📦</span>
            <span class="sidebar-item-text">All Products</span>
        </div>
    `;
    
    dedupedCategories.forEach(category => {
        html += `
            <div class="sidebar-item ${currentCategory === category.id ? 'active' : ''}" onclick="filterByCategory('${category.id}')">
                <span class="sidebar-item-icon">${category.icon || '🏷️'}</span>
                <span class="sidebar-item-text">${category.name}</span>
            </div>
        `;
    });
    
    sidebarContent.innerHTML = html;
}

// Filter products by category
function filterByCategory(categoryId) {
    currentCategory = categoryId;
    
    if (categoryId === 'all') {
        filteredProducts = [...allProducts];
    } else {
        const category = sidebarCategories.find(cat => cat.id === categoryId);
        if (category) {
            filteredProducts = allProducts.filter(product => {
                const productTag = product.brandType || product.brand || '';
                return productTag.toLowerCase().includes(category.name.toLowerCase()) ||
                       productTag.toLowerCase() === category.name.toLowerCase();
            });
        }
    }
    
    renderProducts();
    renderSidebar(); // Update active state
}

// Open sidebar manager modal
function openSidebarManagerModal() {
    document.getElementById('sidebarManagerModal').style.display = 'flex';
    renderExistingCategories();
}

// Close sidebar manager modal
function closeSidebarManagerModal() {
    console.log('closeSidebarManagerModal called');
    const modal = document.getElementById('sidebarManagerModal');
    const form = document.getElementById('addCategoryForm');
    
    if (modal) {
        modal.style.display = 'none';
        console.log('Modal closed successfully');
    } else {
        console.error('Modal element not found');
    }
    
    if (form) {
        form.reset();
    } else {
        console.error('Form element not found');
    }
}

// Handle add category form submission
async function handleAddCategory(event) {
    event.preventDefault();
    console.log('handleAddCategory called');
    
    const formData = new FormData(event.target);
    const categoryName = (formData.get('categoryName') || '').trim();
    const normalizedName = categoryName.toLowerCase();

    if (!categoryName) {
        showNotification('Please enter a category name', 'error');
        return;
    }

    if (pendingCategoryAdds.has(normalizedName)) {
        showNotification(`Already adding "${categoryName}". Please wait...`, 'info');
        return;
    }
    pendingCategoryAdds.add(normalizedName);

    try {
        const existsInDb = await firebaseServices.categoryNameExists(categoryName);
        if (existsInDb) {
            showNotification(`Category "${categoryName}" already exists.`, 'error');
            return;
        }
    } catch (err) {
        console.warn('Duplicate check failed, falling back to local check:', err);
    }

    const existsLocal = sidebarCategories.some(cat => 
        (cat.name || '').trim().toLowerCase() === normalizedName
    );
    if (existsLocal) {
        showNotification(`Category "${categoryName}" already exists.`, 'error');
        return;
    }

    const newCategory = {
        id: generateCategoryId(categoryName),
        name: categoryName,
        icon: '🏷️',
        createdAt: new Date().toISOString()
    };

    try {
        await saveCategoryToFirebase(newCategory);
        // Immediately update in-memory list and UI for responsiveness
        try {
            sidebarCategories = uniqueCategoriesByName([...(Array.isArray(sidebarCategories) ? sidebarCategories : []), newCategory]);
            renderSidebar();
            renderExistingCategories();
        } catch (uiErr) {
            console.warn('UI update failed after Firebase save:', uiErr);
        }
        try {
            await firebaseServices.cleanupDuplicateCategories(newCategory.id, normalizedName);
        } catch (cleanupErr) {
            console.warn('Failed to cleanup duplicates:', cleanupErr);
        }
        showNotification(`Category "${categoryName}" added successfully!`, 'success');
        event.target.reset();
    } catch (error) {
        console.error('Error saving category to Firebase:', error);
        // No local fallback; rely on Firebase as the source of truth
        showNotification('Failed to save category. Please try again.', 'error');
        return;
    } finally {
        pendingCategoryAdds.delete(normalizedName);
    }
}

// Generate category ID from name
function generateCategoryId(name) {
    return name.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

// Generate a stable product ID from title and category
function generateProductId(title, category) {
    const slug = (s) => String(s || '').toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    const t = slug(title);
    const c = slug(category);
    const id = c ? `${c}-${t}` : t;
    return id || `product-${Date.now()}`;
}

// Render existing categories in modal
function renderExistingCategories() {
    console.log('renderExistingCategories called, categories:', sidebarCategories);
    const container = document.getElementById('existingCategories');
    console.log('Container element:', container);
    
    // Use a deduplicated snapshot to render the list
    const dedupedCategories = uniqueCategoriesByName(Array.isArray(sidebarCategories) ? sidebarCategories : []);
    
    if (dedupedCategories.length === 0) {
        container.innerHTML = '<div class="empty-categories">No categories created yet</div>';
        console.log('No categories, showing empty message');
        return;
    }
    
    let html = '';
    dedupedCategories.forEach(category => {
        html += `
            <div class="category-item">
                <div class="category-item-info">
                    <span class="category-item-icon">${category.icon}</span>
                    <span class="category-item-name">${category.name}</span>
                </div>
                <div class="category-item-actions">
                    <button class="category-action-btn" onclick="editCategory('${category.id}')">Edit</button>
                    <button class="category-action-btn delete" onclick="deleteCategory('${category.id}')">Delete</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Edit category (placeholder for future enhancement)
async function editCategory(categoryId) {
    const category = sidebarCategories.find(cat => cat.id === categoryId);
    if (!category) return;

    const overlay = document.getElementById('editCategoryOverlay');
    const input = document.getElementById('editCategoryName');
    const saveBtn = document.getElementById('saveEditCategoryBtn');
    const cancelBtn = document.getElementById('cancelEditCategoryBtn');
    const closeBtn = document.getElementById('closeEditCategoryBtn');
    const errorEl = document.getElementById('editCategoryError');

    // Fallback to native prompt if modal elements are missing
    if (!overlay || !input || !saveBtn || !cancelBtn || !closeBtn || !errorEl) {
        const newName = prompt('Enter new category name:', category.name);
        if (newName && newName.trim() && newName.trim() !== category.name) {
            const normalizedName = newName.trim().toLowerCase();
            const oldId = category.id;
            const newId = generateCategoryId(newName.trim());

            // Update local object
            category.name = newName.trim();
            category.id = newId;

            try {
                await saveCategoryToFirebase(category);
                try { await firebaseServices.cleanupDuplicateCategories(newId, normalizedName); } catch (cleanupErr) { console.warn('Failed to cleanup duplicates after edit:', cleanupErr); }
                if (newId !== oldId) {
                    try { await deleteCategoryFromFirebase(oldId); } catch (delErr) { console.warn('Failed to delete old category id after edit:', delErr); }
                }
                sidebarCategories = uniqueCategoriesByName(sidebarCategories);
                renderSidebar();
                renderExistingCategories();
                populateCategoryDropdowns();
                showNotification('Category updated successfully!', 'success');
            } catch (error) {
                console.error('Error updating category in Firebase:', error);
                alert('Failed to update category. Please try again.');
            }
        }
        return;
    }

    // Configure and show modal
    input.value = category.name;
    errorEl.style.display = 'none';
    errorEl.textContent = '';
    overlay.classList.add('active');

    const cleanupAndClose = () => {
        overlay.classList.remove('active');
        saveBtn.onclick = null;
        cancelBtn.onclick = null;
        closeBtn.onclick = null;
        overlay.onclick = null;
    };

    // Close modal when clicking outside content
    overlay.onclick = function (event) {
        if (event.target === overlay) {
            cleanupAndClose();
        }
    };

    // Cancel/close handlers
    cancelBtn.onclick = cleanupAndClose;
    closeBtn.onclick = cleanupAndClose;

    // Save handler
    saveBtn.onclick = async function () {
        const newName = (input.value || '').trim();
        if (!newName) {
            errorEl.textContent = 'Please enter a category name.';
            errorEl.style.display = 'block';
            return;
        }

        if (newName === category.name) {
            cleanupAndClose();
            return;
        }

        const normalizedName = newName.toLowerCase();

        // Prevent naming conflict with another category
        const conflict = sidebarCategories.some(c => ((c.name || '').trim().toLowerCase() === normalizedName) && c.id !== category.id);
        if (conflict) {
            errorEl.textContent = 'A category with this name already exists.';
            errorEl.style.display = 'block';
            return;
        }

        const oldId = category.id;
        const newId = generateCategoryId(newName);

        // Update local object
        category.name = newName;
        category.id = newId;

        try {
            await saveCategoryToFirebase(category);
            try { await firebaseServices.cleanupDuplicateCategories(newId, normalizedName); } catch (cleanupErr) { console.warn('Failed to cleanup duplicates after edit:', cleanupErr); }
            if (newId !== oldId) {
                try { await deleteCategoryFromFirebase(oldId); } catch (delErr) { console.warn('Failed to delete old category id after edit:', delErr); }
            }

            // Re-render with a deduplicated snapshot
            sidebarCategories = uniqueCategoriesByName(sidebarCategories);
            renderSidebar();
            renderExistingCategories();
            populateCategoryDropdowns();
            showNotification('Category updated successfully!', 'success');
            cleanupAndClose();
        } catch (error) {
            console.error('Error updating category in Firebase:', error);
            errorEl.textContent = 'Failed to update category. Please try again.';
            errorEl.style.display = 'block';
        }
    };
}

// Delete category (uses custom confirmation modal instead of native confirm)
async function deleteCategory(categoryId) {
    const category = sidebarCategories.find(cat => cat.id === categoryId);
    if (!category) return;

    // Try to use the custom confirm delete modal
    const overlay = document.getElementById('confirmDeleteOverlay');
    const messageEl = document.getElementById('confirmDeleteMessage');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const cancelBtn = document.getElementById('cancelDeleteBtn');
    const closeBtn = document.getElementById('closeConfirmDeleteBtn');
    const titleEl = document.querySelector('#confirmDeleteModal .modal-title');
    const originalConfirmClassCat = confirmBtn.className;

    // Fallback to native confirm if modal elements are missing
    if (!overlay || !messageEl || !confirmBtn || !cancelBtn || !closeBtn) {
        if (!confirm(`Are you sure you want to delete "${category.name}"?`)) return;
        try {
            await deleteCategoryFromFirebase(categoryId);
        } catch (error) {
            console.error('Error deleting category from Firebase:', error);
            alert('Failed to delete category. Please try again.');
            return;
        }
        sidebarCategories = sidebarCategories.filter(cat => cat.id !== categoryId);
        if (currentCategory === categoryId) {
            filterByCategory('all');
        } else {
            renderSidebar();
        }
        renderExistingCategories();
        populateCategoryDropdowns();
        showNotification(`Category "${category.name}" deleted successfully!`, 'success');
        return;
    }

    // Configure and show the modal
    if (titleEl) titleEl.textContent = 'Confirm Deletion';
    if (confirmBtn) confirmBtn.textContent = 'Delete';
    if (cancelBtn) cancelBtn.style.display = '';
    messageEl.textContent = `Are you sure you want to delete "${category.name}"?`;
    overlay.classList.add('active');

    // Helper to close modal and clean handlers
    const cleanupAndClose = () => {
        overlay.classList.remove('active');
        confirmBtn.onclick = null;
        cancelBtn.onclick = null;
        closeBtn.onclick = null;
        overlay.onclick = null;
        confirmBtn.className = originalConfirmClassCat;
        if (messageEl) messageEl.classList.remove('boxed');
    };

    // Close modal when clicking outside content
    overlay.onclick = function (event) {
        if (event.target === overlay) {
            cleanupAndClose();
        }
    };

    // Cancel/close handlers
    cancelBtn.onclick = cleanupAndClose;
    closeBtn.onclick = cleanupAndClose;

    // Confirm deletion handler
    confirmBtn.onclick = async function () {
        try {
            await deleteCategoryFromFirebase(categoryId);
        } catch (error) {
            console.error('Error deleting category from Firebase:', error);
            alert('Failed to delete category. Please try again.');
            cleanupAndClose();
            return;
        }

        // Update UI after successful deletion
        sidebarCategories = sidebarCategories.filter(cat => cat.id !== categoryId);

        // If currently viewing this category, switch to all products
        if (typeof currentCategory !== 'undefined' && currentCategory === categoryId) {
            filterByCategory('all');
        } else {
            renderSidebar();
        }

        renderExistingCategories();
        populateCategoryDropdowns(); // Refresh dropdowns after deletion
        showNotification(`Category "${category.name}" deleted successfully!`, 'success');

        // Show success state inside the same modal
        if (titleEl) titleEl.textContent = 'Deleted Successfully';
        messageEl.textContent = `Category "${category.name}" deleted successfully!`;
        if (messageEl) messageEl.classList.add('boxed');
        confirmBtn.textContent = 'OK';
        cancelBtn.style.display = 'none';
        // Apply nav-style OK button look
        confirmBtn.classList.remove('delete');
        confirmBtn.classList.add('ok-nav');

        // Clicking OK closes and restores default state for next open
        confirmBtn.onclick = function () {
            cancelBtn.style.display = '';
            cleanupAndClose();
        };
    };
}

// Multiple Image Management Functions
// Image preview store
let productImages = [];

// Handle image file input and add to preview
function handleFileUpload(event) {
    const files = event.target.files;
    let invalidCount = 0;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isImageType = file.type && file.type.startsWith('image/');
        const isImageExt = /\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?.*)?$/i.test(file.name);
        if (isImageType || isImageExt) {
            const reader = new FileReader();
            reader.onload = function(e) {
                addImageToPreview(e.target.result, file.name);
            };
            reader.readAsDataURL(file);
        } else {
            invalidCount++;
            showNotification(`ERROR!Only image files are allowed!`);
        }
    }
    // Clear the input to allow re-uploading the same file
    event.target.value = '';

    // Optionally summarize invalid selections
    if (invalidCount > 0) {
        // showNotification(`${invalidCount} non-image file(s) were skipped.`,'warning');
    }
}

// Add image from URL input
function addImageUrl() {
    const urlInput = document.getElementById('productImageUrl');
    const url = urlInput.value.trim();
    
    if (!url) {
        showNotification('Please enter an image URL', 'error');
        return;
    }
    
    // Validate URL format
    try {
        new URL(url);
    } catch (e) {
        showNotification('Please enter a valid URL', 'error');
        return;
    }
    
    // Check if it's likely an image URL
    const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?.*)?$/i;
    const isImageUrl = imageExtensions.test(url) || url.includes('imgur.com') || url.includes('i.pinimg.com') || url.includes('images.') || url.includes('img.');
    
    if (!isImageUrl) {
        // Still allow it but show a warning
        console.warn('URL might not be an image:', url);
    }
    
    // Test if the image can be loaded
    const testImg = new Image();
    testImg.onload = function() {
        addImageToPreview(url, 'URL Image');
        showNotification('Image added successfully', 'success');
        urlInput.value = '';
    };
    testImg.onerror = function() {
        showNotification('Failed to load image from URL. Please check the URL and try again.', 'error');
    };
    
    // Set a timeout for the image loading
    setTimeout(() => {
        if (!testImg.complete) {
            showNotification('Image is taking too long to load. Adding anyway...', 'warning');
            addImageToPreview(url, 'URL Image');
            urlInput.value = '';
        }
    }, 5000);
    
    testImg.src = url;
}

// Push image entry into preview list
function addImageToPreview(src, name) {
    const imageId = Date.now() + Math.random();
    const imageData = {
        id: imageId,
        src: src,
        name: name
    };
    
    productImages.push(imageData);
    renderImagePreview();
}

// Remove image from preview store
function removeImage(imageId) {
    productImages = productImages.filter(img => img.id !== imageId);
    renderImagePreview();
}

// Move image up in preview order
function moveImageUp(imageId) {
    const index = productImages.findIndex(img => img.id === imageId);
    if (index > 0) {
        [productImages[index], productImages[index - 1]] = [productImages[index - 1], productImages[index]];
        renderImagePreview();
    }
}

// Move image down in preview order
function moveImageDown(imageId) {
    const index = productImages.findIndex(img => img.id === imageId);
    if (index < productImages.length - 1) {
        [productImages[index], productImages[index + 1]] = [productImages[index + 1], productImages[index]];
        renderImagePreview();
    }
}

// Render image preview grid with controls
function renderImagePreview() {
    const container = document.getElementById('imagePreviewGrid');
    
    if (productImages.length === 0) {
        container.innerHTML = '<p class="no-images">No images added yet</p>';
        return;
    }
    
    container.innerHTML = productImages.map((image, index) => `
        <div class="image-preview-item ${index === 0 ? 'primary' : ''}" data-image-id="${image.id}">
            <img src="${image.src}" alt="${image.name}" class="image-preview-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="image-error-placeholder" style="display: none; align-items: center; justify-content: center; height: 80px; background: #f8f9fa; color: #666; font-size: 12px;">
                Failed to load image
            </div>
            <div class="image-preview-controls">
                ${index > 0 ? `<button type="button" onclick="moveImageUp(${image.id})" class="image-control-btn" title="Move Up" style="background: rgba(0, 123, 255, 0.9); color: white;">↑</button>` : ''}
                ${index < productImages.length - 1 ? `<button type="button" onclick="moveImageDown(${image.id})" class="image-control-btn" title="Move Down" style="background: rgba(0, 123, 255, 0.9); color: white;">↓</button>` : ''}
                <button type="button" onclick="removeImage(${image.id})" class="image-control-btn remove-image-btn" title="Remove">×</button>
            </div>
        </div>
    `).join('');
}

// Clear all image previews
function clearAllImages() {
    productImages = [];
    renderImagePreview();
}

// GLB File Management Functions
// GLB file preview store
let productGlbFiles = [];

// Handle GLB file input and add to preview
function handleGlbFileUpload(event) {
    const files = event.target.files;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.toLowerCase().endsWith('.glb')) {
            addGlbFileToPreview(file, file.name);
        } else {
            showNotification('ERROR! Only .GLB files are allowed for 3D models');
        }
    }
    // Clear the input to allow re-uploading the same file
    event.target.value = '';
}

// Add GLB model from URL input with validation
function addGlbUrl() {
    const urlInput = document.getElementById('productGlbUrl');
    const rawUrl = urlInput.value.trim();
    
    if (!rawUrl) {
        showNotification('Please enter a 3D model URL', 'error');
        return;
    }
    
    // Validate URL format
    try {
        new URL(rawUrl);
    } catch (e) {
        showNotification('Please enter a valid URL', 'error');
        return;
    }
    
    // Normalize common provider links (Drive/Dropbox/GitHub) to direct URLs
    const normalizedUrl = normalizeExternalUrl(rawUrl);
    const lower = normalizedUrl.toLowerCase();
    
    const isGlbExt = lower.endsWith('.glb');
    const isKnownProvider =
        lower.includes('drive.google.com') ||
        lower.includes('dropbox.com') ||
        lower.includes('dl.dropboxusercontent.com') ||
        lower.includes('github.com') ||
        lower.includes('raw.githubusercontent.com');
    
    // Allow .glb or known provider links; warn for others but still add
    if (!isGlbExt && !isKnownProvider) {
        showNotification('URL added. Ensure it points to a GLB or direct download.', 'warning');
    }
    
    addGlbFileToPreview(normalizedUrl, '3D Model from URL');
    showNotification('3D model URL added successfully', 'success');
    urlInput.value = '';
}

// Push GLB entry into preview list
function addGlbFileToPreview(src, name) {
    const glbId = 'glb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const fileSize = src instanceof File ? formatFileSize(src.size) : 'Unknown size';
    
    const glbFile = {
        id: glbId,
        src: src instanceof File ? URL.createObjectURL(src) : src,
        name: name,
        size: fileSize,
        file: src instanceof File ? src : null
    };
    

    
    productGlbFiles.push(glbFile);
    
    renderGlbPreview();
}

// Remove GLB model from preview list
function removeGlbFile(glbId) {
    productGlbFiles = productGlbFiles.filter(glb => glb.id !== glbId);
    renderGlbPreview();
}

// Move GLB model up in list order
function moveGlbFileUp(glbId) {
    const index = productGlbFiles.findIndex(glb => glb.id === glbId);
    if (index > 0) {
        [productGlbFiles[index], productGlbFiles[index - 1]] = [productGlbFiles[index - 1], productGlbFiles[index]];
        renderGlbPreview();
    }
}

// Move GLB model down in list order
function moveGlbFileDown(glbId) {
    const index = productGlbFiles.findIndex(glb => glb.id === glbId);
    if (index < productGlbFiles.length - 1) {
        [productGlbFiles[index], productGlbFiles[index + 1]] = [productGlbFiles[index + 1], productGlbFiles[index]];
        renderGlbPreview();
    }
}

// Render 3D model list with controls
function renderGlbPreview() {
    const container = document.getElementById('glbPreviewGrid');
    if (!container) return;
    
    if (productGlbFiles.length === 0) {
        container.innerHTML = '<p class="no-images">No 3D models added yet</p>';
        return;
    }
    
    container.innerHTML = productGlbFiles.map((glb, index) => `
        <div class="glb-preview-item ${glb.positioning ? 'positioned' : ''}" data-glb-id="${glb.id}">
            <div class="glb-file-icon">
                <div class="glb-icon-background">
                    <i class="fas fa-cube glb-main-icon"></i>
                    <div class="glb-format-badge">GLB</div>
                </div>
                <div class="glb-3d-indicator">
                    <i class="fas fa-expand-arrows-alt"></i>
                </div>
                ${glb.positioning ? '' : ''}
            </div>
            <div class="glb-file-info">
                <div class="glb-file-name" title="${glb.name}">${glb.name}</div>
                <div class="glb-file-size">${glb.size}</div>
                ${glb.positioning ? '' : ''}
            </div>
            <div class="glb-preview-controls">
                <button type="button" class="control-btn move-up" onclick="moveGlbFileUp('${glb.id}')" 
                        ${index === 0 ? 'disabled' : ''} title="Move up">
                    <i class="fas fa-chevron-up"></i>
                </button>
                <button type="button" class="control-btn move-down" onclick="moveGlbFileDown('${glb.id}')" 
                        ${index === productGlbFiles.length - 1 ? 'disabled' : ''} title="Move down">
                    <i class="fas fa-chevron-down"></i>
                </button>
                <button type="button" class="control-btn remove" onclick="removeGlbFile('${glb.id}')" title="Remove">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Get face anchor name from index
// Map face anchor index to human-readable name
function getFaceAnchorName(anchorIndex) {
    const anchors = {
        168: 'Face Center',
        9: 'Forehead',
        1: 'Nose Tip',
        175: 'Chin',
        234: 'Left Ear',
        454: 'Right Ear'
    };
    return anchors[anchorIndex] || `Anchor ${anchorIndex}`;
}

// Clear all GLB files from preview store
function clearAllGlbFiles() {
    productGlbFiles = [];
    renderGlbPreview();
}

// Format bytes into human-readable file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Export functions for global access
window.openAddProductModal = openAddProductModal;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.toggleProductVisibility = toggleProductVisibility;
window.closeProductModal = closeProductModal;
window.filterProducts = filterProducts;
window.addCategoryFromForm = addCategoryFromForm;
window.openSidebarManagerModal = openSidebarManagerModal;
window.closeSidebarManagerModal = closeSidebarManagerModal;
window.handleFileUpload = handleFileUpload;
window.addImageUrl = addImageUrl;
window.removeImage = removeImage;
window.moveImageUp = moveImageUp;
window.moveImageDown = moveImageDown;
window.clearAllImages = clearAllImages;
window.handleGlbFileUpload = handleGlbFileUpload;
window.addGlbUrl = addGlbUrl;
window.removeGlbFile = removeGlbFile;
window.moveGlbFileUp = moveGlbFileUp;
window.moveGlbFileDown = moveGlbFileDown;
window.clearAllGlbFiles = clearAllGlbFiles;
window.exportAllGlbData = exportAllGlbData;
window.importGlbData = importGlbData;