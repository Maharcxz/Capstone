// Admin Dashboard JavaScript
// Product Management System

let allProducts = [];
let filteredProducts = [];
let editingProductId = null;

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
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
    
    // Set up form submission
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
});

// Check if user has admin access
function checkAdminAccess() {
    const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true';
    const firebaseUser = firebase.auth().currentUser;
    
    if (!isAdminLoggedIn && !firebaseUser) {
        alert('Access denied. Admin login required.');
        window.location.href = 'index.html';
        return;
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
                ${product.visible ? 'Visible' : 'Hidden'}
            </div>
            
            <div class="product-image-admin">
                ${product.image ? 
                    `<img src="${product.image}" alt="${product.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                     <div class="image-placeholder-admin" style="display: none;">🖼</div>` :
                    `<div class="image-placeholder-admin">🖼</div>`
                }
            </div>
            
            <div class="product-details">
                <h3 class="product-title-admin">${escapeHtml(product.title)}</h3>
                <p class="product-description-admin">${escapeHtml(product.description || 'No description available')}</p>
                <p class="product-price-admin">₱ ${parseFloat(product.price).toLocaleString()}</p>
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
                            onclick="toggleProductVisibility('${product.id}', ${product.visible})">
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
    const searchTerm = document.getElementById('productSearch').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    const visibilityFilter = document.getElementById('visibilityFilter').value;
    
    filteredProducts = allProducts.filter(product => {
        const matchesSearch = product.title.toLowerCase().includes(searchTerm) ||
                            (product.description && product.description.toLowerCase().includes(searchTerm));
        
        const matchesCategory = !categoryFilter || product.category === categoryFilter;
        
        const matchesVisibility = !visibilityFilter || 
                                (visibilityFilter === 'visible' && product.visible) ||
                                (visibilityFilter === 'hidden' && !product.visible);
        
        return matchesSearch && matchesCategory && matchesVisibility;
    });
    
    renderProducts();
}

// Open modal for adding new product
function openAddProductModal() {
    editingProductId = null;
    document.getElementById('modalTitle').textContent = 'Add New Product';
    document.getElementById('productForm').reset();
    document.getElementById('productVisible').checked = true;
    document.getElementById('productModal').classList.add('active');
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
        document.getElementById('productImage').value = product.image || '';
        document.getElementById('productVisible').checked = product.visible;
        
        document.getElementById('productModal').classList.add('active');
    } catch (error) {
        console.error('Error loading product for editing:', error);
        showNotification('Error loading product', 'error');
    }
}

// Close product modal
function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    editingProductId = null;
}

// Handle product form submission
async function handleProductSubmit(event) {
    event.preventDefault();
    
    const formData = {
        title: document.getElementById('productTitle').value.trim(),
        description: document.getElementById('productDescription').value.trim(),
        price: parseFloat(document.getElementById('productPrice').value),
        category: document.getElementById('productCategory').value,
        image: document.getElementById('productImage').value.trim(),
        visible: document.getElementById('productVisible').checked,
        updatedAt: new Date().toISOString()
    };
    
    // Validation
    if (!formData.title || !formData.category || isNaN(formData.price) || formData.price < 0) {
        showNotification('Please fill in all required fields correctly', 'error');
        return;
    }
    
    try {
        if (editingProductId) {
            // Update existing product
            formData.id = editingProductId;
            await saveProductToFirebase(formData);
            showNotification('Product updated successfully', 'success');
        } else {
            // Create new product
            formData.createdAt = new Date().toISOString();
            await saveProductToFirebase(formData);
            showNotification('Product added successfully', 'success');
        }
        
        closeProductModal();
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('Error saving product', 'error');
    }
}

// Delete product
async function deleteProduct(productId, productTitle) {
    if (!confirm(`Are you sure you want to delete "${productTitle}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        await deleteProductFromFirebase(productId);
        showNotification('Product deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Error deleting product', 'error');
    }
}

// Toggle product visibility
async function toggleProductVisibility(productId, currentVisibility) {
    try {
        const product = await getProductById(productId);
        if (!product) {
            showNotification('Product not found', 'error');
            return;
        }
        
        product.visible = !currentVisibility;
        product.updatedAt = new Date().toISOString();
        
        await saveProductToFirebase(product);
        showNotification(`Product ${product.visible ? 'shown' : 'hidden'} successfully`, 'success');
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
    }
});

// Export functions for global access
window.openAddProductModal = openAddProductModal;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.toggleProductVisibility = toggleProductVisibility;
window.closeProductModal = closeProductModal;
window.filterProducts = filterProducts;