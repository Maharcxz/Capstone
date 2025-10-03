// Product Loader for Homepage
// Dynamically loads and displays products from Firebase

let allProductsData = [];
let filteredProductsData = [];
let currentCategory = 'All Frames';
let currentProductId = null; // Track currently viewed product in modal

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
        <div class="product-card" onclick="openProductDetailModal('${product.id}')" style="cursor: pointer;">
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
                <div class="product-title-price-row">
                    <h3 class="product-title">${escapeHtml(product.title)}</h3>
                    <div class="price-stock-container">
                        <p class="product-price">₱ ${parseFloat(product.price).toLocaleString()}</p>
                        <p class="product-stock ${(product.stock || 0) === 0 ? 'out-of-stock' : (product.stock || 0) <= 5 ? 'low-stock' : ''}">
                            Stock: ${product.stock || 0}
                        </p>
                    </div>
                </div>
                <div class="product-buttons">
                    <button class="virtual-try-btn">Virtual Try - On</button>
                    <button class="virtual-try-btn preorder-btn guest-only ${(product.stock || 0) === 0 ? 'disabled' : ''}" 
                            onclick="${(product.stock || 0) === 0 ? 'return false;' : `window.location.href='preorder.html?frameName=${encodeURIComponent(product.title)}'`}">
                        ${(product.stock || 0) === 0 ? 'Out of Stock' : 'Pre-Order'}
                    </button>
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
    
    // Ensure admin buttons are properly hidden/shown based on current page and admin status
    if (typeof updateAdminButtonVisibility === 'function') {
        updateAdminButtonVisibility();
    }
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

// Product Detail Modal Functions
function openProductDetailModal(productId) {
    const product = allProductsData.find(p => p.id === productId);
    if (!product) return;

    // Store current product ID for reference
    currentProductId = productId;

    // Populate modal with product data
    document.getElementById('productDetailTitle').textContent = product.title;
    document.getElementById('productDetailPrice').textContent = `₱ ${parseFloat(product.price).toLocaleString()}`;
    document.getElementById('productDetailDescription').textContent = product.description || 'No description available.';

    // Update stock information
    updateStockDisplay(product.stock || 0);
    
    // Initialize admin stock controls
    initializeAdminStockControls(product.stock || 0);
    
    // Update pre-order button state
    updatePreorderButton(product.stock || 0);

    // Handle images
    const mainImage = document.getElementById('mainProductImage');
    const thumbnailContainer = document.getElementById('thumbnailContainer');
    
    if (product.images && product.images.length > 0) {
        // Set main image
        mainImage.src = product.images[0];
        mainImage.alt = product.title;
        
        // Create thumbnails
        thumbnailContainer.innerHTML = product.images.map((image, index) => `
            <img src="${image}" alt="${product.title} ${index + 1}" 
                 class="thumbnail-image ${index === 0 ? 'active' : ''}"
                 onclick="setMainImage('${image}', ${index})">
        `).join('');
    } else if (product.image) {
        // Fallback to single image
        mainImage.src = product.image;
        mainImage.alt = product.title;
        thumbnailContainer.innerHTML = `
            <img src="${product.image}" alt="${product.title}" 
                 class="thumbnail-image active">
        `;
    } else {
        // No image available
        mainImage.src = '';
        mainImage.alt = 'No image available';
        thumbnailContainer.innerHTML = '<div class="no-image-placeholder">No images available</div>';
    }

    // Update Pre-Order button with product title
    const preorderBtn = document.querySelector('#productDetailModal .preorder-btn');
    if (preorderBtn) {
        preorderBtn.onclick = function() {
            window.location.href = `preorder.html?frameName=${encodeURIComponent(product.title)}`;
        };
    }

    // Update Virtual Try-On button with product information
    const virtualTryOnBtn = document.querySelector('#productDetailModal .virtual-try-btn');
    if (virtualTryOnBtn) {
        virtualTryOnBtn.onclick = function() {
            // Navigate to try-on page with productId and productName for auto-selection
            window.location.href = `try-on.html?productId=${encodeURIComponent(product.id)}&productName=${encodeURIComponent(product.title)}`;
        };
    }

    // Show modal
    document.getElementById('productDetailModal').style.display = 'flex';
}

function setMainImage(imageSrc, index) {
    document.getElementById('mainProductImage').src = imageSrc;
    
    // Update active thumbnail
    document.querySelectorAll('.thumbnail-image').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

function closeProductDetailModal() {
    document.getElementById('productDetailModal').style.display = 'none';
}

// Add click-outside-to-close functionality for product detail modal
document.addEventListener('DOMContentLoaded', function() {
    const productDetailModal = document.getElementById('productDetailModal');
    if (productDetailModal) {
        productDetailModal.addEventListener('click', function(event) {
            if (event.target === this) {
                closeProductDetailModal();
            }
        });
    }
    
    // Handle escape key to close modal
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const modal = document.getElementById('productDetailModal');
            if (modal && modal.style.display === 'flex') {
                closeProductDetailModal();
            }
        }
    });
});



// Export functions for global access
// Inventory Management Functions

// Update stock display in modal
function updateStockDisplay(stock) {
    const stockQuantityElement = document.getElementById('stockQuantity');
    const stockDisplayElement = document.getElementById('stockDisplay');
    
    if (stockQuantityElement && stockDisplayElement) {
        stockQuantityElement.textContent = stock;
        
        // Update styling based on stock level
        stockDisplayElement.className = 'stock-display';
        if (stock === 0) {
            stockDisplayElement.classList.add('out-of-stock');
        } else if (stock <= 5) {
            stockDisplayElement.classList.add('low-stock');
        }
    }
}

// Initialize quantity selector


// Initialize admin stock controls
function initializeAdminStockControls(stock) {
    const adminStockInput = document.getElementById('adminStockInput');
    
    if (adminStockInput) {
        adminStockInput.value = stock;
    }
}





// Update pre-order button state
function updatePreorderButton(stock) {
    const preorderBtn = document.getElementById('preorderBtn');
    
    if (!preorderBtn) return;
    
    if (stock === 0) {
        preorderBtn.disabled = true;
        preorderBtn.textContent = 'Out of Stock';
        preorderBtn.onclick = null;
    } else {
        preorderBtn.disabled = false;
        preorderBtn.textContent = 'Pre-Order';
        preorderBtn.onclick = handlePreOrder;
    }
}

// Handle pre-order
function handlePreOrder() {
    const product = allProductsData.find(p => p.id === currentProductId);
    
    if (!product) return;
    
    const stock = product.stock || 0;
    
    if (stock === 0) {
        alert('This product is out of stock.');
        return;
    }
    
    // Store product ID for the pre-order page
    sessionStorage.setItem('preorderProductId', currentProductId);
    
    // Redirect to pre-order page (quantity will be selected on the pre-order page)
    window.location.href = `preorder.html?frameName=${encodeURIComponent(product.title)}`;
}

// Update product stock (Admin function)
async function updateProductStock() {
    if (!currentProductId) {
        alert('No product selected.');
        return;
    }
    
    const adminStockInput = document.getElementById('adminStockInput');
    if (!adminStockInput) return;
    
    const newStock = parseInt(adminStockInput.value);
    
    if (isNaN(newStock) || newStock < 0) {
        alert('Please enter a valid stock quantity (0 or greater).');
        return;
    }
    
    try {
        // Update product in Firebase
        const productRef = firebase.database().ref(`products/${currentProductId}`);
        await productRef.update({ stock: newStock });
        
        // Update local data
        const product = allProductsData.find(p => p.id === currentProductId);
        if (product) {
            product.stock = newStock;
        }
        
        // Update displays
        updateStockDisplay(newStock);
        initializeQuantitySelector(newStock);
        
        // Refresh product grid to show updated stock
        renderProductGrid();
        
        // Show success notification
        if (typeof showHomepageNotification === 'function') {
            showHomepageNotification('Stock updated successfully!', 'success');
        } else {
            alert('Stock updated successfully!');
        }
        
    } catch (error) {
        console.error('Error updating stock:', error);
        alert('Error updating stock: ' + error.message);
    }
}

// Reduce stock after successful pre-order
async function reduceProductStock(productId, quantity) {
    try {
        const product = allProductsData.find(p => p.id === productId);
        if (!product) return false;
        
        const newStock = Math.max(0, (product.stock || 0) - quantity);
        
        // Update product in Firebase
        const productRef = firebase.database().ref(`products/${productId}`);
        await productRef.update({ stock: newStock });
        
        // Update local data
        product.stock = newStock;
        
        // If modal is open for this product, update displays
        if (currentProductId === productId) {
            updateStockDisplay(newStock);
            initializeQuantitySelector(newStock);
        }
        
        // Refresh product grid
        renderProductGrid();
        
        return true;
    } catch (error) {
        console.error('Error reducing stock:', error);
        return false;
    }
}

// Export functions to global scope
window.selectFrameCategory = selectFrameCategory;
window.searchProducts = searchProducts;
window.editProductFromHomepage = editProductFromHomepage;
window.deleteProductFromHomepage = deleteProductFromHomepage;
window.toggleProductVisibilityFromHomepage = toggleProductVisibilityFromHomepage;
window.openProductDetailModal = openProductDetailModal;
window.closeProductDetailModal = closeProductDetailModal;
window.setMainImage = setMainImage;
window.handlePreOrder = handlePreOrder;
window.updateProductStock = updateProductStock;
window.reduceProductStock = reduceProductStock;