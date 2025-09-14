// Content editing functionality
// isAdminMode is declared globally in FirebaseConfig.js
let currentEditTarget = null;
let isEditMode = false;

// Initialize admin mode based on login status
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in as admin
    const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true';
    const currentUser = firebase.auth().currentUser;
    
    // Check URL parameters for edit mode
    const urlParams = new URLSearchParams(window.location.search);
    const editParam = urlParams.get('edit');
    
    if (isAdminLoggedIn || currentUser) {
        isAdminMode = true;
        
        // Set edit mode from URL parameter or localStorage
        if (editParam === 'true') {
            isEditMode = true;
            localStorage.setItem('isEditMode', 'true');
        } else {
            isEditMode = localStorage.getItem('isEditMode') === 'true';
        }
        
        // Add edit buttons to editable content (only for pages without existing edit buttons)
        if (!document.querySelector('.edit-content-btn')) {
            addEditButtons();
        }
        
        // Load saved content from Firebase
        loadContentFromFirebase();
    } else {
        // Load content for guest users too
        loadContentFromFirebase();
    }
});

function addEditButtons() {
    // Find all editable content sections
    const editableContents = document.querySelectorAll('[id$="Content"]');
    
    editableContents.forEach(content => {
        const contentType = content.id.replace('Content', '');
        
        // Create edit button
        const editButton = document.createElement('button');
        editButton.className = 'edit-content-btn admin-only';
        editButton.style.display = 'none'; // Start hidden
        editButton.innerHTML = '✏️ Edit';
        editButton.onclick = function() {
            openEditModal(contentType);
        };
        
        // Add button after content
        content.parentNode.insertBefore(editButton, content.nextSibling);
    });
}

function openEditModal(contentType) {
    if (!isAdminMode) return;
    
    currentEditTarget = contentType;
    
    // Create edit modal
    const modalHTML = `
        <div class="edit-modal-overlay active" id="editModalOverlay">
            <div class="edit-modal">
                <div class="edit-modal-header">
                    <h3>Edit ${contentType.charAt(0).toUpperCase() + contentType.slice(1)} Content</h3>
                    <button class="close-edit-modal" onclick="closeEditModal()">&times;</button>
                </div>
                <div class="edit-modal-content">
                    <div class="edit-instructions">
                        <p><strong>Note:</strong> You can edit HTML directly. Be careful with the structure to maintain proper formatting.</p>
                    </div>
                    <textarea id="editTextarea" placeholder="Enter HTML content here..." rows="15">${getContentForEdit(contentType)}</textarea>
                    <div class="edit-modal-actions">
                        <button class="save-edit-btn" onclick="saveEditedContent()">Save Changes</button>
                        <button class="cancel-edit-btn" onclick="closeEditModal()">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('editModalOverlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add new modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function getContentForEdit(contentType) {
    const contentElement = document.getElementById(contentType + 'Content');
    if (contentElement) {
        // Return the HTML content instead of just text to preserve formatting
        return contentElement.innerHTML.trim();
    }
    return '';
}

function saveEditedContent() {
    if (!currentEditTarget) return;
    
    const textarea = document.getElementById('editTextarea');
    const content = textarea.value;
    const contentElement = document.getElementById(currentEditTarget + 'Content');
    
    if (contentElement) {
        // Save the HTML content directly to preserve formatting
        contentElement.innerHTML = content;
        
        // Save to Firebase
        saveContentToFirebase(currentEditTarget, content);
    }
    
    closeEditModal();
}

// Function to save content to Firebase
function saveContentToFirebase(contentType, content) {
    // Check if Firebase is initialized
    if (window.firebase && window.firebase.database) {
        const db = window.firebase.database();
        const contentRef = db.ref('content/' + contentType);
        
        contentRef.set({
            text: content,
            lastUpdated: new Date().toISOString()
        })
        .then(() => {
            console.log(`${contentType} content saved to Firebase`);
            showNotification(`${contentType.charAt(0).toUpperCase() + contentType.slice(1)} content updated successfully!`);
        })
        .catch(error => {
            console.error('Error saving content to Firebase:', error);
            showNotification('Error saving content. Please try again.', 'error');
        });
    } else {
        console.error('Firebase database not available');
        // Fallback to localStorage
        localStorage.setItem(`content_${contentType}`, content);
        showNotification(`${contentType.charAt(0).toUpperCase() + contentType.slice(1)} content saved locally.`);
    }
}

// Function to load content from Firebase
function loadContentFromFirebase() {
    // Check if Firebase is initialized
    if (window.firebase && window.firebase.database) {
        const db = window.firebase.database();
        const contentRef = db.ref('content');
        
        contentRef.once('value')
            .then(snapshot => {
                const content = snapshot.val();
                
                if (content) {
                    // Update each content type found in Firebase
                    Object.keys(content).forEach(contentType => {
                        // Only update if the content element exists and doesn't already have structured HTML
                        const contentElement = document.getElementById(contentType + 'Content');
                        if (contentElement) {
                            // Check if the element already has structured content (contains HTML tags)
                            const currentContent = contentElement.innerHTML.trim();
                            const hasStructuredContent = currentContent.includes('<') && currentContent.includes('>');
                            
                            // Only overwrite if there's no structured content or if we're in admin mode and explicitly loading
                            if (!hasStructuredContent || (isAdminMode && content[contentType].text.includes('<'))) {
                                updateContentElement(contentType, content[contentType].text);
                            }
                        }
                    });
                }
            })
            .catch(error => {
                console.error('Error loading content from Firebase:', error);
                // Fallback to localStorage
                loadContentFromLocalStorage();
            });
    } else {
        console.error('Firebase database not available');
        // Fallback to localStorage
        loadContentFromLocalStorage();
    }
}

// Function to load content from localStorage (fallback)
function loadContentFromLocalStorage() {
    // Find all editable content sections
    const editableContents = document.querySelectorAll('[id$="Content"]');
    
    editableContents.forEach(content => {
        const contentType = content.id.replace('Content', '');
        const savedContent = localStorage.getItem(`content_${contentType}`);
        
        if (savedContent) {
            // Check if the element already has structured content (contains HTML tags)
            const currentContent = content.innerHTML.trim();
            const hasStructuredContent = currentContent.includes('<') && currentContent.includes('>');
            
            // Only overwrite if there's no structured content or if we're in admin mode and explicitly loading
            if (!hasStructuredContent || (isAdminMode && savedContent.includes('<'))) {
                updateContentElement(contentType, savedContent);
            }
        }
    });
}

// Function to update content element with loaded content
function updateContentElement(contentType, content) {
    const contentElement = document.getElementById(contentType + 'Content');
    
    if (contentElement) {
        // Set the HTML content directly to preserve formatting
        contentElement.innerHTML = content;
    }
}

// Function to show notification
function showNotification(message, type = 'success') {
    // Check if notification container exists, create if not
    let notificationContainer = document.getElementById('notificationContainer');
    
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notificationContainer';
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.top = '20px';
        notificationContainer.style.right = '20px';
        notificationContainer.style.zIndex = '9999';
        document.body.appendChild(notificationContainer);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.backgroundColor = type === 'success' ? '#4CAF50' : type === 'info' ? '#2196F3' : '#F44336';
    notification.style.color = 'white';
    notification.style.padding = '12px 20px';
    notification.style.marginBottom = '10px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s ease';
    
    // Add notification to container
    notificationContainer.appendChild(notification);
    
    // Show notification with animation
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notificationContainer.removeChild(notification);
        }, 300);
    }, 3000);
}

function closeEditModal() {
    const modal = document.getElementById('editModalOverlay');
    if (modal) {
        modal.remove();
    }
    currentEditTarget = null;
}

// Function for content management toggle (used in index.html and preorders.html)
function toggleContentManagement() {
    if (!isAdminMode) {
        console.log('Not in admin mode, cannot access content management');
        return;
    }
    
    // For pages that don't have specific content to edit, show a notification
    // or redirect to a page that does have editable content
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('index.html') || currentPage === '/' || currentPage.endsWith('/')) {
        // Redirect to about page for content editing
        window.location.href = 'about.html';
    } else if (currentPage.includes('preorders.html')) {
        // Redirect to contact page for content editing
        window.location.href = 'contact.html';
    } else {
        // Show notification that content management is not available on this page
        showNotification('Content management is not available on this page. Please navigate to About or Contact pages.', 'info');
    }
}

// Function for user management toggle (placeholder)
function toggleUserManagement() {
    if (!isAdminMode) {
        console.log('Not in admin mode, cannot access user management');
        return;
    }
    
    showNotification('User management feature is coming soon!', 'info');
}

// Function for admin settings toggle (placeholder)
function toggleAdminSettings() {
    if (!isAdminMode) {
        console.log('Not in admin mode, cannot access admin settings');
        return;
    }
    
    showNotification('Admin settings feature is coming soon!', 'info');
}

// Function for settings (placeholder)
function openSettings() {
    if (!isAdminMode) {
        console.log('Not in admin mode, cannot access settings');
        return;
    }
    
    showNotification('Settings feature is coming soon!', 'info');
}

// Function for user management (placeholder)
function openUserManagement() {
    if (!isAdminMode) {
        console.log('Not in admin mode, cannot access user management');
        return;
    }
    
    showNotification('User management feature is coming soon!', 'info');
}
