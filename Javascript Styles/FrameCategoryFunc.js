// Frame category selection
function selectFrameCategory(category) {
    const frameTypeTitle = document.getElementById('frameTypeTitle');
    if (frameTypeTitle) {
        frameTypeTitle.textContent = category;
    }
    closeSidebar();
    filterProductsByCategory(category);
}

function filterProductsByCategory(category) {
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.style.display = 'block';
    });
}

// Dynamic category management
let sidebarCategories = [];

// Load categories from memory (Firebase-backed)
function loadSidebarCategories() {
    return Array.isArray(sidebarCategories) ? sidebarCategories : [];
}

// Attempt to fetch categories from Firebase (asynchronous)
async function fetchCategoriesFromFirebase() {
    try {
        if (window.firebaseServices && typeof window.firebaseServices.getAllCategories === 'function') {
            const categories = await window.firebaseServices.getAllCategories();
            const deduped = Array.isArray(categories) ? categories : [];
            sidebarCategories = deduped;
            console.log('Fetched categories from Firebase:', deduped.length);
            renderSidebarCategories();
        } else {
            console.warn('Firebase category services not available on this page.');
        }
    } catch (err) {
        console.error('Error fetching categories from Firebase:', err);
    }
}

// Render dynamic categories in the sidebar
function renderSidebarCategories() {
    const sidebarContent = document.querySelector('.sidebar-content');
    if (!sidebarContent) {
        console.error('Sidebar content not found');
        return;
    }

    // Clear existing categories
    sidebarContent.innerHTML = '';

    // Always add "All Frame Brands" as the first option
    const allFramesLink = document.createElement('a');
    allFramesLink.href = './index.html';
    allFramesLink.className = 'frame-category';
    allFramesLink.textContent = 'All Frame Brands';
    sidebarContent.appendChild(allFramesLink);

    // Load and add dynamic categories
    const categories = loadSidebarCategories();

    if (!categories || categories.length === 0) {
        // Optional: show a subtle placeholder while waiting for Firebase
        const placeholder = document.createElement('div');
        placeholder.className = 'sidebar-placeholder';
        placeholder.style.cssText = 'padding: 10px 16px; color: rgba(255,255,255,0.6); font-size: 13px;';
        placeholder.textContent = 'Loading brands...';
        sidebarContent.appendChild(placeholder);
    } else {
        categories.forEach(category => {
            const categoryLink = document.createElement('a');
            categoryLink.href = '#';
            categoryLink.className = 'frame-category';
            categoryLink.textContent = category.name;
            categoryLink.onclick = () => selectFrameCategory(category.name);
            sidebarContent.appendChild(categoryLink);
        });
    }

    console.log('Rendered', (categories || []).length, 'dynamic categories');
}

// Initialize categories when page loads
function initializeFrameCategories() {
    // Only initialize if the sidebar content exists (i.e., we're on the main page)
    const sidebarContent = document.querySelector('.sidebar-content');
    if (!sidebarContent) {
        console.log('Sidebar content not found - skipping frame category initialization');
        return;
    }
    
    // Initial render from memory snapshot
    renderSidebarCategories();
    
    // Try to fetch latest categories from Firebase and re-render when done
    fetchCategoriesFromFirebase();
    
    // If available, listen to Firebase live category changes to keep UI in sync
    if (window.firebaseServices && typeof window.firebaseServices.listenForCategoryChanges === 'function') {
        window.firebaseServices.listenForCategoryChanges((categories) => {
            const deduped = Array.isArray(categories) ? categories : [];
            sidebarCategories = deduped;
            renderSidebarCategories();
        });
    }
}

// Call initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeFrameCategories);