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

// Load categories from localStorage
function loadSidebarCategories() {
    const saved = localStorage.getItem('sidebarCategories');
    sidebarCategories = saved ? JSON.parse(saved) : [];
    
    // If no categories exist, create some default ones
    if (sidebarCategories.length === 0) {
        sidebarCategories = [
            { id: 'metal-frames', name: 'Metal Frames', icon: '🏷️', createdAt: new Date().toISOString() },
            { id: 'plastic-frames', name: 'Plastic Frames', icon: '🏷️', createdAt: new Date().toISOString() },
            { id: 'titanium-frames', name: 'Titanium Frames', icon: '🏷️', createdAt: new Date().toISOString() },
            { id: 'alloy-frames', name: 'Alloy Frames', icon: '🏷️', createdAt: new Date().toISOString() }
        ];
        // Save the default categories
        localStorage.setItem('sidebarCategories', JSON.stringify(sidebarCategories));
        console.log('Created default categories');
    }
    
    console.log('Loaded sidebar categories:', sidebarCategories);
    return sidebarCategories;
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

    // Always add "All Frames" as the first option
    const allFramesLink = document.createElement('a');
    allFramesLink.href = '#';
    allFramesLink.className = 'frame-category';
    allFramesLink.textContent = 'All Frames';
    allFramesLink.onclick = () => selectFrameCategory('All Frames');
    sidebarContent.appendChild(allFramesLink);

    // Load and add dynamic categories
    const categories = loadSidebarCategories();
    categories.forEach(category => {
        const categoryLink = document.createElement('a');
        categoryLink.href = '#';
        categoryLink.className = 'frame-category';
        categoryLink.textContent = category.name;
        categoryLink.onclick = () => selectFrameCategory(category.name);
        sidebarContent.appendChild(categoryLink);
    });

    console.log('Rendered', categories.length, 'dynamic categories');
}

// Initialize categories when page loads
function initializeFrameCategories() {
    // Only initialize if the sidebar content exists (i.e., we're on the main page)
    const sidebarContent = document.querySelector('.sidebar-content');
    if (!sidebarContent) {
        console.log('Sidebar content not found - skipping frame category initialization');
        return;
    }
    
    // Load categories and render them
    renderSidebarCategories();
    
    // Listen for storage changes to update categories in real-time (for cross-tab updates)
    window.addEventListener('storage', function(e) {
        if (e.key === 'sidebarCategories') {
            console.log('Categories updated in localStorage (cross-tab), re-rendering...');
            renderSidebarCategories();
        }
    });
    
    // Listen for custom categoriesUpdated event (for same-window updates)
    window.addEventListener('categoriesUpdated', function(e) {
        console.log('Categories updated via custom event, re-rendering...');
        renderSidebarCategories();
    });
}

// Call initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeFrameCategories);