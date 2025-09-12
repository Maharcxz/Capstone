// Content editing functionality
// isAdminMode is declared globally
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
        
        // Load content from Firebase
        loadContentFromFirebase();
    } else {
        // Ensure guest mode - load content but don't add edit functionality
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
                    <textarea id="editTextarea" placeholder="Enter content here...">${getContentForEdit(contentType)}</textarea>
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
        return contentElement.innerText.trim();
    }
    return '';
}

function saveEditedContent() {
    if (!currentEditTarget) return;
    
    const textarea = document.getElementById('editTextarea');
    const content = textarea.value;
    const contentElement = document.getElementById(currentEditTarget + 'Content');
    
    if (contentElement) {
        // Convert plain text to HTML with basic formatting
        const formattedContent = content
            .split('\n\n')
            .map(paragraph => `<p class="${currentEditTarget}-description">${paragraph.trim()}</p>`)
            .join('');
        
        contentElement.innerHTML = formattedContent;
        
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
                        updateContentElement(contentType, content[contentType].text);
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
            updateContentElement(contentType, savedContent);
        }
    });
}

// Function to update content element with loaded content
function updateContentElement(contentType, content) {
    const contentElement = document.getElementById(contentType + 'Content');
    
    if (contentElement) {
        // Convert plain text to HTML with basic formatting
        const formattedContent = content
            .split('\n\n')
            .map(paragraph => `<p class="${contentType}-description">${paragraph.trim()}</p>`)
            .join('');
        
        contentElement.innerHTML = formattedContent;
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
    notification.style.backgroundColor = type === 'success' ? '#4CAF50' : '#F44336';
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
