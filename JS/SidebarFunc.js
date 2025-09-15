// Sidebar functions
let hoverTimeout;

function toggleSidebar() {
    const sidebar = document.getElementById('frameSidebar');
    const mainContent = document.getElementById('mainContent');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.toggle('active');
    if (mainContent) mainContent.classList.toggle('shifted');
    if (overlay) overlay.classList.toggle('active');
}

function openSidebar() {
    const sidebar = document.getElementById('frameSidebar');
    const mainContent = document.getElementById('mainContent');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.add('active');
    if (mainContent) mainContent.classList.add('shifted');
    if (overlay) overlay.classList.add('active');
}

function closeSidebar() {
    const sidebar = document.getElementById('frameSidebar');
    const mainContent = document.getElementById('mainContent');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.remove('active');
    if (mainContent) mainContent.classList.remove('shifted');
    if (overlay) overlay.classList.remove('active');
}

// Initialize hover functionality
function initializeSidebarHover() {
    const frameTypesMenu = document.getElementById('frameTypesMenu');
    const sidebar = document.getElementById('frameSidebar');
    
    if (frameTypesMenu) {
        // Open sidebar on hover with delay
        frameTypesMenu.addEventListener('mouseenter', function() {
            clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(() => {
                openSidebar();
            }, 300); // 300ms delay to prevent accidental opening
        });
        
        // Cancel opening if mouse leaves before delay
        frameTypesMenu.addEventListener('mouseleave', function() {
            clearTimeout(hoverTimeout);
        });
    }
    
    if (sidebar) {
        // Keep sidebar open when hovering over it
        sidebar.addEventListener('mouseenter', function() {
            clearTimeout(hoverTimeout);
        });
        
        // Close sidebar when mouse leaves
        sidebar.addEventListener('mouseleave', function() {
            closeSidebar();
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeSidebarHover);