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
    
    // Create different modal based on content type
    let modalHTML;
    
    if (contentType === 'contact') {
        modalHTML = createContactEditModal();
    } else if (contentType === 'about') {
        modalHTML = createAboutEditModal();
    } else {
        // Default modal for other content types
        modalHTML = `
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
    }
    
    // Remove existing modal if any
    const existingModal = document.getElementById('editModalOverlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add new modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function createContactEditModal() {
    // Parse current contact content to populate form fields
    const contactElement = document.getElementById('contactContent');
    const currentContent = contactElement ? contactElement.innerHTML : '';
    
    // Extract current values using regex patterns
    const phoneMatch = currentContent.match(/Phone:\s*([^<]+)/i);
    const emailMatch = currentContent.match(/Email:\s*([^<]+)/i);
    const addressMatch = currentContent.match(/Address:\s*([^<]+)/i);
    const mondayFridayMatch = currentContent.match(/Monday to Friday[^\d]*([\d:]+\s*[AP]M\s*to\s*[\d:]+\s*[AP]M)/i);
    const saturdayMatch = currentContent.match(/Saturday[^\d]*([\d:]+\s*[AP]M\s*to\s*[\d:]+\s*[AP]M)/i);
    const sundayMatch = currentContent.match(/Sunday[^\d]*([\d:]+\s*[AP]M\s*to\s*[\d:]+\s*[AP]M)/i);
    const footerMatch = currentContent.match(/<p class="contact-footer">([^<]+)<\/p>/i);
    
    return `
        <div class="edit-modal-overlay active" id="editModalOverlay">
            <div class="contact-edit-modal">
                <div class="edit-modal-header">
                    <h3><i class="fas fa-edit"></i> Edit Contact Information</h3>
                    <button class="close-edit-modal" onclick="closeEditModal()">&times;</button>
                </div>
                <div class="contact-edit-content">
                    <div class="contact-form-grid">
                        <div class="form-section">
                            <h4><i class="fas fa-info-circle"></i> Contact Details</h4>
                            <div class="form-group">
                                <label for="contactPhone">Phone Number</label>
                                <input type="tel" id="contactPhone" value="${phoneMatch ? phoneMatch[1].trim() : '+63 917 123 4567'}" placeholder="+63 917 123 4567">
                            </div>
                            <div class="form-group">
                                <label for="contactEmail">Email Address</label>
                                <input type="email" id="contactEmail" value="${emailMatch ? emailMatch[1].trim() : 'info@trinityoptimumvision.com'}" placeholder="info@trinityoptimumvision.com">
                            </div>
                            <div class="form-group">
                                <label for="contactAddress">Physical Address</label>
                                <textarea id="contactAddress" rows="2" placeholder="123 Vision Street, Makati City, Metro Manila, Philippines">${addressMatch ? addressMatch[1].trim() : '123 Vision Street, Makati City, Metro Manila, Philippines'}</textarea>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h4><i class="fas fa-clock"></i> Business Hours</h4>
                            <div class="form-group">
                                <label for="mondayFriday">Monday - Friday</label>
                                <input type="text" id="mondayFriday" value="${mondayFridayMatch ? mondayFridayMatch[1].trim() : '9:00 AM to 7:00 PM'}" placeholder="9:00 AM to 7:00 PM">
                            </div>
                            <div class="form-group">
                                <label for="saturday">Saturday</label>
                                <input type="text" id="saturday" value="${saturdayMatch ? saturdayMatch[1].trim() : '9:00 AM to 5:00 PM'}" placeholder="9:00 AM to 5:00 PM">
                            </div>
                            <div class="form-group">
                                <label for="sunday">Sunday</label>
                                <input type="text" id="sunday" value="${sundayMatch ? sundayMatch[1].trim() : '10:00 AM to 3:00 PM'}" placeholder="10:00 AM to 3:00 PM">
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-section full-width">
                        <h4><i class="fas fa-comment"></i> Footer Message</h4>
                        <div class="form-group">
                            <label for="contactFooter">Contact Footer Text</label>
                            <textarea id="contactFooter" rows="2" placeholder="Feel free to reach out through any of the above channels. We look forward to serving you!">${footerMatch ? footerMatch[1].trim() : 'Feel free to reach out through any of the above channels. We look forward to serving you!'}</textarea>
                        </div>
                    </div>
                    
                    <div class="edit-modal-actions">
                        <button class="save-edit-btn" onclick="saveContactEditedContent()"><i class="fas fa-save"></i> Save Changes</button>
                        <button class="cancel-edit-btn" onclick="closeEditModal()"><i class="fas fa-times"></i> Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    `;
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

function saveContactEditedContent() {
    console.log('saveContactEditedContent called');
    if (!currentEditTarget) {
        console.log('No currentEditTarget, returning');
        return;
    }
    
    console.log('currentEditTarget:', currentEditTarget);
    
    // Get form values
    const phone = document.getElementById('contactPhone').value;
    const email = document.getElementById('contactEmail').value;
    const address = document.getElementById('contactAddress').value;
    const mondayFriday = document.getElementById('mondayFriday').value;
    const saturday = document.getElementById('saturday').value;
    const sunday = document.getElementById('sunday').value;
    const footer = document.getElementById('contactFooter').value;
    
    console.log('Form values:', { phone, email, address, mondayFriday, saturday, sunday, footer });
    
    // Build structured HTML content to match original format exactly
    const structuredContent = `
                <p class="contact-description">
                    We'd love to hear from you! Whether you have questions about our products, need assistance with your AR try-on experience, or want to schedule an appointment, our team is ready to help.
                </p>

                <div class="contact-info">
                    <h3>Contact Information:</h3>
                    <ul>
                        <li>Phone: ${phone}</li>
                        <li>Email: ${email}</li>
                        <li>Address: ${address}</li>
                    </ul>
                </div>

                <div class="business-hours">
                    <h3>Business Hours:</h3>
                    <p class="hours-line">Monday to Friday — ${mondayFriday}</p>
                    <p class="hours-line">Saturday — ${saturday}</p>
                    <p class="hours-line">Sunday — ${sunday}</p>
                </div>

                <p class="contact-footer">
                    ${footer}
                </p>`;
    
    const contentElement = document.getElementById(currentEditTarget + 'Content');
    
    console.log('Content element:', contentElement);
    console.log('Structured content to save:', structuredContent);
    
    if (contentElement) {
        // Save the structured HTML content
        console.log('Setting innerHTML to content element');
        contentElement.innerHTML = structuredContent;
        
        console.log('Content element innerHTML after update:', contentElement.innerHTML);
        
        // Save to Firebase
        console.log('Calling saveContentToFirebase');
        saveContentToFirebase(currentEditTarget, structuredContent);
        
        // Show success notification
        showNotification('Contact information updated successfully!', 'success');
    } else {
        console.log('Content element not found!');
    }
    
    closeEditModal();
}

function createAboutEditModal() {
    const aboutElement = document.getElementById('aboutContent');
    let currentContent = aboutElement ? aboutElement.innerHTML : '';

    // Parse current content to extract text from paragraphs
    const parser = new DOMParser();
    const doc = parser.parseFromString(currentContent, 'text/html');
    const paragraphs = doc.querySelectorAll('p.about-paragraph');
    
    let combinedText = '';
    paragraphs.forEach((p, index) => {
        if (index > 0) combinedText += '\n\n';
        combinedText += p.textContent || '';
    });

    return `
        <div class="edit-modal-overlay active" id="editModalOverlay">
            <div class="about-edit-modal">
                <div class="edit-modal-header">
                    <h3><i class="fas fa-info-circle"></i> Edit About Content</h3>
                    <button class="close-edit-modal" onclick="closeEditModal()">&times;</button>
                </div>
                <div class="about-edit-content">
                    <div class="about-form-grid">
                        <div class="form-section full-width">
                            <h4><i class="fas fa-edit"></i> About Us Content</h4>
                            <div class="form-group">
                                <label for="aboutContent">Content</label>
                                <textarea id="aboutContent" placeholder="Enter your about us content here. Use double line breaks to separate paragraphs..." rows="12">${combinedText}</textarea>
                            </div>
                        </div>
                    </div>
                    
                    <div class="edit-modal-actions">
                        <button class="save-edit-btn" onclick="saveAboutEditedContent()">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                        <button class="cancel-edit-btn" onclick="closeEditModal()">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function saveAboutEditedContent() {
    if (!currentEditTarget) return;
    
    const content = document.getElementById('aboutContent').value;
    
    // Split content by double line breaks and create paragraphs
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    
    // Build structured HTML content
    let structuredContent = '';
    paragraphs.forEach(paragraph => {
        structuredContent += `        <p class="about-paragraph">
            ${paragraph.trim()}
        </p>

`;
    });
    
    const contentElement = document.getElementById(currentEditTarget + 'Content');
    
    if (contentElement) {
        // Save the structured HTML content
        contentElement.innerHTML = structuredContent;
        
        // Save to Firebase
        saveContentToFirebase(currentEditTarget, structuredContent);
        
        // Show success notification
        showNotification('About content updated successfully!', 'success');
    }
    
    closeEditModal();
}

// Function to save content to Firebase
function saveContentToFirebase(contentType, content) {
    console.log('saveContentToFirebase called with:', { contentType, content });
    
    // Check if Firebase is initialized
    if (window.firebase && window.firebase.database) {
        console.log('Firebase is available, saving to Firebase');
        const db = window.firebase.database();
        const contentRef = db.ref('content/' + contentType);
        
        contentRef.set({
            text: content,
            lastUpdated: new Date().toISOString()
        })
        .then(() => {
            console.log(`${contentType} content saved to Firebase successfully`);
            showNotification(`${contentType.charAt(0).toUpperCase() + contentType.slice(1)} content updated successfully!`);
        })
        .catch(error => {
            console.error('Error saving content to Firebase:', error);
            showNotification('Error saving content. Please try again.', 'error');
        });
    } else {
        console.error('Firebase database not available, using localStorage fallback');
        // Fallback to localStorage
        localStorage.setItem(`content_${contentType}`, content);
        console.log('Content saved to localStorage:', localStorage.getItem(`content_${contentType}`));
        showNotification(`${contentType.charAt(0).toUpperCase() + contentType.slice(1)} content saved locally.`);
    }
}

// Function to load content from Firebase
function loadContentFromFirebase() {
    console.log('loadContentFromFirebase called');
    
    // Check if Firebase is initialized
    if (window.firebase && window.firebase.database) {
        console.log('Firebase is available, loading content from Firebase');
        const db = window.firebase.database();
        const contentRef = db.ref('content');
        
        contentRef.once('value')
            .then(snapshot => {
                const content = snapshot.val();
                console.log('Firebase content loaded:', content);
                
                if (content) {
                    // Update each content type found in Firebase
                    Object.keys(content).forEach(contentType => {
                        console.log(`Processing ${contentType} content from Firebase`);
                        // Only update if the content element exists
                        const contentElement = document.getElementById(contentType + 'Content');
                        if (contentElement) {
                            // Check if the element already has structured content (contains HTML tags)
                            const currentContent = contentElement.innerHTML.trim();
                            const hasStructuredContent = currentContent.includes('<') && currentContent.includes('>');
                            
                            console.log(`${contentType} - hasStructuredContent:`, hasStructuredContent);
                            console.log(`${contentType} - current content length:`, currentContent.length);
                            
                            // For contact content, only load from Firebase if:
                            // 1. There's no existing structured content, OR
                            // 2. The saved content is significantly different from current content
                            if (contentType === 'contact') {
                                // Only load if there's no structured content or if explicitly requested
                                if (!hasStructuredContent) {
                                    console.log(`Loading ${contentType} content from Firebase (no structured content)`);
                                    updateContentElement(contentType, content[contentType].text);
                                } else {
                                    console.log(`Skipping ${contentType} content load - structured content exists`);
                                }
                            } else {
                                // For other content types, use the original logic
                                if (!hasStructuredContent || (isAdminMode && content[contentType].text.includes('<'))) {
                                    console.log(`Loading ${contentType} content from Firebase`);
                                    updateContentElement(contentType, content[contentType].text);
                                } else {
                                    console.log(`Skipping ${contentType} content load`);
                                }
                            }
                        } else {
                            console.log(`Content element not found for ${contentType}`);
                        }
                    });
                } else {
                    console.log('No content found in Firebase');
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
    console.log(`updateContentElement called for ${contentType}`);
    console.log('Content to update:', content);
    
    const contentElement = document.getElementById(contentType + 'Content');
    
    if (contentElement) {
        console.log(`Updating ${contentType} content element`);
        console.log('Previous content:', contentElement.innerHTML);
        
        // Set the HTML content directly to preserve formatting
        contentElement.innerHTML = content;
        
        console.log('New content set:', contentElement.innerHTML);
    } else {
        console.log(`Content element not found for ${contentType}`);
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
