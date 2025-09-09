// Content editing functionality
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
    }
    
    closeEditModal();
}

function closeEditModal() {
    const modal = document.getElementById('editModalOverlay');
    if (modal) {
        modal.remove();
    }
    currentEditTarget = null;
}
