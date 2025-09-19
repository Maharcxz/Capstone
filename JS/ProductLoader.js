// Product Loader for Homepage
// Dynamically loads and displays products from Firebase

let allProductsData = [];
let filteredProductsData = [];
let currentCategory = 'All Frames';

// Initialize product loading when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadProductsFromDatabase();
    
    // Listen for real-time product updates
    if (typeof listenForProductChanges === 'function') {
        listenForProductChanges((products) => {
            allProductsData = products.filter(product => product.visible); // Only show visible products
            applyCurrentFilters();
        });
    }
});

// Load products from Firebase
async function loadProductsFromDatabase() {
    try {
        if (typeof getAllProducts === 'function') {
            const products = await getAllProducts();
            allProductsData = products.filter(product => product.visible); // Only show visible products
            filteredProductsData = [...allProductsData];
            renderProductGrid();
        } else {
            console.warn('Firebase product functions not available, using fallback');
            loadFallbackProducts();
        }
    } catch (error) {
        console.error('Error loading products from database:', error);
        loadFallbackProducts();
    }
}

// Fallback to show some sample products if database fails
function loadFallbackProducts() {
    allProductsData = [
        {
            id: 'sample1',
            title: 'Titanium Slim Frame',
            description: 'Lightweight titanium frame with modern design',
            price: 2499,
            category: 'Titanium Frames',
            image: '',
            visible: true
        },
        {
            id: 'sample2',
            title: 'Classic Metal Frame',
            description: 'Durable metal frame with timeless appeal',
            price: 1899,
            category: 'Metal Frames',
            image: '',
            visible: true
        },
        {
            id: 'sample3',
            title: 'Flexible Plastic Frame',
            description: 'Comfortable and flexible plastic frame',
            price: 1299,
            category: 'Flexible Plastic Frames',
            image: '',
            visible: true
        }
    ];
    filteredProductsData = [...allProductsData];
    renderProductGrid();
}

// Render products in the grid
function renderProductGrid() {
    const productGrid = document.querySelector('.product-grid');
    if (!productGrid) return;
    
    if (filteredProductsData.length === 0) {
        productGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: rgba(255, 255, 255, 0.7);">
                <h3 style="font-size: 24px; margin-bottom: 15px;">No products found</h3>
                <p style="font-size: 16px;">Try adjusting your search or category filter.</p>
            </div>
        `;
        return;
    }
    
    productGrid.innerHTML = filteredProductsData.map(product => `
        <div class="product-card">
            <div class="product-image">
                ${product.image ? 
                    `<img src="${product.image}" alt="${escapeHtml(product.title)}" 
                          style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;"
                          onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                     <div class="image-placeholder" style="display: none;">🖼</div>` :
                    `<div class="image-placeholder">🖼</div>`
                }
            </div>
            <div class="product-info">
                <h3 class="product-title">${escapeHtml(product.title)}</h3>
                <p class="product-price">₱ ${parseFloat(product.price).toLocaleString()}</p>
                <div class="product-buttons">
                    <button class="virtual-try-btn">Virtual Try - On</button>
                    <button class="virtual-try-btn preorder-btn guest-only" onclick="window.location.href='preorder.html'">Pre-Order</button>
                </div>
                <div class="admin-buttons" style="display: none;">
                    <button class="admin-btn edit-btn" onclick="editProductFromHomepage('${product.id}')">Edit</button>
                    <button class="admin-btn delete-btn" onclick="deleteProductFromHomepage('${product.id}', '${escapeHtml(product.title)}')">Delete</button>
                    <button class="admin-btn visible-btn" onclick="toggleProductVisibilityFromHomepage('${product.id}', ${product.visible})">
                        ${product.visible ? 'Hide' : 'Show'}
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Filter products by category
function selectFrameCategory(category) {
    currentCategory = category;
    applyCurrentFilters();
    
    // Update the frame type title
    const frameTypeTitle = document.getElementById('frameTypeTitle');
    if (frameTypeTitle) {
        frameTypeTitle.textContent = category;
    }
    
    // Close sidebar if open
    if (typeof closeSidebar === 'function') {
        closeSidebar();
    }
}

// Apply current filters (category and search)
function applyCurrentFilters() {
    let filtered = [...allProductsData];
    
    // Apply category filter
    if (currentCategory && currentCategory !== 'All Frames') {
        filtered = filtered.filter(product => product.category === currentCategory);
    }
    
    // Apply search filter
    const searchInput = document.getElementById('frameSearchInput');
    if (searchInput && searchInput.value.trim()) {
        const searchTerm = searchInput.value.toLowerCase().trim();
        filtered = filtered.filter(product => 
            product.title.toLowerCase().includes(searchTerm) ||
            (product.description && product.description.toLowerCase().includes(searchTerm))
        );
    }
    
    filteredProductsData = filtered;
    renderProductGrid();
}

// Search functionality
function searchProducts() {
    applyCurrentFilters();
}

// Admin functions for homepage product management
function editProductFromHomepage(productId) {
    window.location.href = `admin-dashboard.html?edit=${productId}`;
}

async function deleteProductFromHomepage(productId, productTitle) {
    if (!confirm(`Are you sure you want to delete "${productTitle}"?`)) {
        return;
    }
    
    try {
        if (typeof deleteProductFromFirebase === 'function') {
            await deleteProductFromFirebase(productId);
            showHomepageNotification('Product deleted successfully', 'success');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        showHomepageNotification('Error deleting product', 'error');
    }
}

async function toggleProductVisibilityFromHomepage(productId, currentVisibility) {
    try {
        if (typeof getProductById === 'function' && typeof saveProductToFirebase === 'function') {
            const product = await getProductById(productId);
            if (product) {
                product.visible = !currentVisibility;
                product.updatedAt = new Date().toISOString();
                await saveProductToFirebase(product);
                showHomepageNotification(`Product ${product.visible ? 'shown' : 'hidden'} successfully`, 'success');
            }
        }
    } catch (error) {
        console.error('Error toggling product visibility:', error);
        showHomepageNotification('Error updating product visibility', 'error');
    }
}

// Show notification on homepage
function showHomepageNotification(message, type = 'info') {
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
    
    setTimeout(() => notification.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
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

// Set up search input listener
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('frameSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', searchProducts);
        searchInput.addEventListener('keyup', searchProducts);
    }
});

// Export functions for global access
window.selectFrameCategory = selectFrameCategory;
window.searchProducts = searchProducts;
window.editProductFromHomepage = editProductFromHomepage;
window.deleteProductFromHomepage = deleteProductFromHomepage;
window.toggleProductVisibilityFromHomepage = toggleProductVisibilityFromHomepage;