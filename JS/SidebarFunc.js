// Sidebar functions
function toggleSidebar() {
    const sidebar = document.getElementById('frameSidebar');
    const mainContent = document.getElementById('mainContent');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.toggle('active');
    if (mainContent) mainContent.classList.toggle('shifted');
    if (overlay) overlay.classList.toggle('active');
}

function closeSidebar() {
    const sidebar = document.getElementById('frameSidebar');
    const mainContent = document.getElementById('mainContent');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.remove('active');
    if (mainContent) mainContent.classList.remove('shifted');
    if (overlay) overlay.classList.remove('active');
}