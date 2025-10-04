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

// Initialize hover/touch/click functionality for responsiveness
function initializeSidebarHover() {
    const frameTypesMenu = document.getElementById('frameTypesMenu');
    const sidebar = document.getElementById('frameSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    // Detect touch/coarse pointers to adjust interaction
    const isTouchDevice = window.matchMedia && window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    const openDelay = isTouchDevice ? 0 : 120; // Faster on desktop, instant on touch
    
    if (frameTypesMenu) {
        // Immediate open on click/touch for phones
        frameTypesMenu.addEventListener('click', function() {
            clearTimeout(hoverTimeout);
            openSidebar();
        }, { passive: true });
        frameTypesMenu.addEventListener('touchstart', function() {
            clearTimeout(hoverTimeout);
            openSidebar();
        }, { passive: true });
        
        // Hover open with small delay for desktop
        frameTypesMenu.addEventListener('mouseenter', function() {
            clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(() => {
                openSidebar();
            }, openDelay);
        });
        
        // Cancel opening if mouse leaves before delay
        frameTypesMenu.addEventListener('mouseleave', function() {
            clearTimeout(hoverTimeout);
        });
    }
    
    if (sidebar) {
        // Keep sidebar open when interacting with it
        sidebar.addEventListener('mouseenter', function() {
            clearTimeout(hoverTimeout);
        });
        sidebar.addEventListener('mouseleave', function() {
            // Close on desktop when the pointer leaves the sidebar
            if (!isTouchDevice) {
                closeSidebar();
            }
        });
        // On touch, avoid accidental close while scrolling/interacting
        sidebar.addEventListener('touchstart', function() {
            clearTimeout(hoverTimeout);
        }, { passive: true });
    }
    
    if (overlay) {
        // Tapping the overlay should close the sidebar immediately
        overlay.addEventListener('click', function() {
            closeSidebar();
        });
        overlay.addEventListener('touchstart', function() {
            closeSidebar();
        }, { passive: true });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeSidebarHover);