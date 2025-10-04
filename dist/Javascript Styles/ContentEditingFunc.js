// Content editing functionality
// isAdminMode is declared globally in FirebaseConfig.js
let currentEditTarget = null;
let isEditMode = false;
let contentCache = new Map(); // Cache for loaded content
let isContentLoaded = false; // Flag to prevent duplicate loading

// Initialize admin mode based on login status
document.addEventListener('DOMContentLoaded', function() {
    // Show content immediately from cache or localStorage
    showCachedContentImmediately();
    
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
        
        // Update admin button visibility based on current page
        if (typeof updateAdminButtonVisibility === 'function') {
            updateAdminButtonVisibility();
        }
    }
    
    // Load content from Firebase asynchronously (non-blocking)
    setTimeout(() => {
        loadContentFromFirebaseAsync();
    }, 0);
});

// Show cached content immediately to reduce perceived loading time
function showCachedContentImmediately() {
    const contentTypes = ['about', 'contact', 'home', 'services'];
    
    contentTypes.forEach(contentType => {
        const contentElement = document.getElementById(contentType + 'Content');
        if (contentElement) {
            // Check localStorage first
            const savedRaw = localStorage.getItem(`content_${contentType}`);
            if (savedRaw !== null) {
                let savedContent = null;
                try {
                    savedContent = JSON.parse(savedRaw);
                } catch (e) {
                    savedContent = savedRaw;
                }
                updateContentElementOptimized(contentType, savedContent);
                contentCache.set(contentType, savedContent);
            }
        }
    });
}

function addEditButtons() {
    // Find all editable content sections
    const editableContents = document.querySelectorAll('[id$="Content"]');
    
    editableContents.forEach(content => {
        const contentType = content.id.replace('Content', '');
        
        // Skip adding edit button for mainContent (Home page)
        if (content.id === 'mainContent') {
            return;
        }
        
        // Create edit button
        const editButton = document.createElement('button');
        editButton.className = 'edit-content-btn admin-only';
        editButton.style.display = 'none'; // Start hidden
        editButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M18.5 2.50023C18.8978 2.1024 19.4374 1.87891 20 1.87891C20.5626 1.87891 21.1022 2.1024 21.5 2.50023C21.8978 2.89805 22.1213 3.43762 22.1213 4.00023C22.1213 4.56284 21.8978 5.1024 21.5 5.50023L12 15.0002L8 16.0002L9 12.0002L18.5 2.50023Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Edit
        `;
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
        // Default modal for other content types - User-friendly version
        modalHTML = `
            <div class="edit-modal-overlay active" id="editModalOverlay">
                <div class="main-content-edit-modal">
                    <div class="edit-modal-header">
                        <h3><i class="fas fa-edit"></i> Edit Main Content</h3>
                        <button class="close-edit-modal" onclick="closeEditModal()">&times;</button>
                    </div>
                    <div class="main-content-edit-content">
                        <div class="edit-instructions">
                            <div class="instruction-card">
                                <i class="fas fa-info-circle"></i>
                                <div>
                                    <h4>Content Editor</h4>
                                    <p>Edit your content below. You can use HTML tags for formatting or write plain text.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="editor-section">
                            <label for="editTextarea">Content</label>
                            <textarea id="editTextarea" placeholder="Enter your content here. You can use HTML tags like &lt;p&gt;, &lt;h1&gt;, &lt;strong&gt;, etc. for formatting..." rows="12">${getContentForEdit(contentType)}</textarea>
                        </div>
                        
                        <div class="edit-modal-actions">
                            <button class="save-edit-btn" onclick="saveEditedContent()">
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
    const descriptionMatch = currentContent.match(/<p class="contact-description">([^<]+)<\/p>/i);
    
    // Helper function to clean extracted text
    function cleanText(text) {
        if (!text) return '';
        return text.replace(/\s+/g, ' ').trim();
    }
    
    return `
        <div class="edit-modal-overlay active" id="editModalOverlay">
            <div class="contact-edit-modal">
                <div class="edit-modal-header">
                    <h3><i class="fas fa-edit"></i> Edit Contact Information</h3>
                    <button class="close-edit-modal" onclick="closeEditModal()">&times;</button>
                </div>
                <div class="contact-edit-content" style="max-height: 70vh; overflow-y: auto; padding-right: 10px;">
                    <div class="form-section">
                        <h4><i class="fas fa-file-text"></i> Contact Description</h4>
                        <div class="form-group">
                            <label for="contactDescription">Description Text</label>
                            <textarea id="contactDescription" rows="3" placeholder="We'd love to hear from you! Whether you have questions about our products, need assistance with your AR try-on experience, or want to schedule an appointment, our team is ready to help.">${descriptionMatch ? cleanText(descriptionMatch[1]) : ''}</textarea>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4><i class="fas fa-info-circle"></i> Contact Details</h4>
                        <div class="form-group">
                            <label for="contactPhone">Phone Number</label>
                            <input type="tel" id="contactPhone" value="${phoneMatch ? cleanText(phoneMatch[1]) : ''}" placeholder="+63 917 123 4567">
                        </div>
                        <div class="form-group">
                            <label for="contactEmail">Email Address</label>
                            <input type="email" id="contactEmail" value="${emailMatch ? cleanText(emailMatch[1]) : ''}" placeholder="info@trinityoptimumvision.com">
                        </div>
                        <div class="form-group">
                            <label for="contactAddress">Physical Address</label>
                            <textarea id="contactAddress" rows="2" placeholder="123 Vision Street, Makati City, Metro Manila, Philippines">${addressMatch ? cleanText(addressMatch[1]) : ''}</textarea>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4><i class="fas fa-clock"></i> Business Hours</h4>
                        <div class="form-group">
                            <label for="mondayFriday">Monday - Friday</label>
                            <input type="text" id="mondayFriday" value="${mondayFridayMatch ? cleanText(mondayFridayMatch[1]) : ''}" placeholder="9:00 AM to 7:00 PM">
                        </div>
                        <div class="form-group">
                            <label for="saturday">Saturday</label>
                            <input type="text" id="saturday" value="${saturdayMatch ? cleanText(saturdayMatch[1]) : ''}" placeholder="9:00 AM to 5:00 PM">
                        </div>
                        <div class="form-group">
                            <label for="sunday">Sunday</label>
                            <input type="text" id="sunday" value="${sundayMatch ? cleanText(sundayMatch[1]) : ''}" placeholder="10:00 AM to 3:00 PM">
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4><i class="fas fa-comment"></i> Footer Message</h4>
                        <div class="form-group">
                            <label for="contactFooter">Contact Footer Text</label>
                            <textarea id="contactFooter" rows="2" placeholder="Feel free to reach out through any of the above channels. We look forward to serving you!">${footerMatch ? cleanText(footerMatch[1]) : ''}</textarea>
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
    const description = document.getElementById('contactDescription').value;
    const phone = document.getElementById('contactPhone').value;
    const email = document.getElementById('contactEmail').value;
    const address = document.getElementById('contactAddress').value;
    const mondayFriday = document.getElementById('mondayFriday').value;
    const saturday = document.getElementById('saturday').value;
    const sunday = document.getElementById('sunday').value;
    const footer = document.getElementById('contactFooter').value;
    
    console.log('Form values:', { description, phone, email, address, mondayFriday, saturday, sunday, footer });
    
    // Build structured JSON content for storage (no HTML tags/classes)
    const structuredContent = {
        description,
        phone,
        email,
        address,
        hours: {
            mondayFriday,
            saturday,
            sunday
        },
        footer
    };
    
    const contentElement = document.getElementById(currentEditTarget + 'Content');
    
    console.log('Content element:', contentElement);
    console.log('Structured content to save:', structuredContent);
    
    if (contentElement) {
        // Update DOM by reconstructing HTML from JSON content
        console.log('Updating DOM via updateContentElementOptimized');
        updateContentElementOptimized(currentEditTarget, structuredContent);
        
        // Save to Firebase/localStorage
        console.log('Calling saveContentToFirebase with JSON content');
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
                                <label for="aboutTextarea">Content</label>
                                <textarea id="aboutTextarea" placeholder="Enter your about us content here. Use double line breaks to separate paragraphs..." rows="12">${combinedText}</textarea>
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
    
    const content = document.getElementById('aboutTextarea').value;
    const contentElement = document.getElementById(currentEditTarget + 'Content');
    
    if (contentElement) {
        // Update DOM by reconstructing structured HTML from plain text
        updateContentElementOptimized(currentEditTarget, content);
        
        // Save plain text to Firebase/localStorage
        saveContentToFirebase(currentEditTarget, content);
        
        // Show success notification
        showNotification('About content updated successfully!', 'success');
    }
    
    closeEditModal();
}

// Function to save content to Firebase
function saveContentToFirebase(contentType, content) {
    console.log('saveContentToFirebase called with:', { contentType, content });
    
    // Always save to localStorage first for immediate persistence
    try {
        if (typeof content === 'string') {
            localStorage.setItem(`content_${contentType}`, content);
        } else {
            localStorage.setItem(`content_${contentType}`, JSON.stringify(content));
        }
    } catch (e) {
        console.warn('Failed to cache content in localStorage:', e);
    }
    console.log('Content saved to localStorage:', localStorage.getItem(`content_${contentType}`));
    
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
        console.error('Firebase database not available, content saved to localStorage only');
        showNotification(`${contentType.charAt(0).toUpperCase() + contentType.slice(1)} content saved locally.`);
    }
}

// Function to load content from Firebase
// Optimized async version of loadContentFromFirebase
async function loadContentFromFirebaseAsync() {
    if (isContentLoaded) return; // Prevent duplicate loading
    
    console.log('loadContentFromFirebaseAsync called');
    
    // Check if Firebase is initialized
    if (!window.firebase || !window.firebase.database) {
        console.error('Firebase database not available');
        loadContentFromLocalStorage();
        return;
    }

    try {
        console.log('Firebase is available, loading content from Firebase');
        const db = window.firebase.database();
        const contentRef = db.ref('content');
        
        const snapshot = await contentRef.once('value');
        const content = snapshot.val();
        console.log('Firebase content loaded:', content);
        
        if (content) {
            // Process content updates in batches to avoid blocking UI
            const contentUpdates = Object.keys(content).map(contentType => ({
                type: contentType,
                data: content[contentType]
            }));
            
            // Process updates in small batches
            await processBatchedContentUpdates(contentUpdates);
        } else {
            console.log('No content found in Firebase');
        }
        
        isContentLoaded = true;
    } catch (error) {
        console.error('Error loading content from Firebase:', error);
        // Fallback to localStorage
        loadContentFromLocalStorage();
    }
}

// Process content updates in batches to prevent UI blocking
async function processBatchedContentUpdates(contentUpdates) {
    const batchSize = 2; // Process 2 items at a time
    
    for (let i = 0; i < contentUpdates.length; i += batchSize) {
        const batch = contentUpdates.slice(i, i + batchSize);
        
        // Process batch
        batch.forEach(({ type: contentType, data }) => {
            console.log(`Processing ${contentType} content from Firebase`);
            
            // Check if there's saved content in localStorage first
            const savedRaw = localStorage.getItem(`content_${contentType}`);
            console.log(`localStorage content for ${contentType}:`, savedRaw !== null ? 'exists' : 'not found');
            
            // Only update if the content element exists
            const contentElement = document.getElementById(contentType + 'Content');
            if (contentElement) {
                // Prefer localStorage content if available; otherwise use Firebase content
                if (savedRaw !== null && !contentCache.has(contentType)) {
                    console.log(`Using localStorage content for ${contentType} instead of Firebase`);
                    let parsed = null;
                    try {
                        parsed = JSON.parse(savedRaw);
                    } catch (e) {
                        parsed = savedRaw;
                    }
                    updateContentElementOptimized(contentType, parsed);
                } else if (!contentCache.has(contentType)) {
                    if (data && (typeof data.text === 'string' || typeof data.text === 'object')) {
                        console.log(`Loading ${contentType} content from Firebase`);
                        updateContentElementOptimized(contentType, data.text);
                        // Cache the content in memory and localStorage
                        contentCache.set(contentType, data.text);
                        try {
                            const toStore = typeof data.text === 'string' ? data.text : JSON.stringify(data.text);
                            localStorage.setItem(`content_${contentType}`, toStore);
                        } catch (e) {
                            console.warn('Failed to cache Firebase content to localStorage:', e);
                        }
                    } else {
                        console.log(`No Firebase text found for ${contentType}`);
                    }
                }
            } else {
                console.log(`Content element not found for ${contentType}`);
            }
        });
        
        // Yield control to browser between batches
        if (i + batchSize < contentUpdates.length) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
}

// Optimized version of updateContentElement
function updateContentElementOptimized(contentType, content) {
    const contentElement = document.getElementById(contentType + 'Content');
    if (contentElement) {
        // Compute HTML to render based on storage format
        let htmlToRender = '';
        const placeholders = {
            about: '<div class="empty-state"><h3>About Us</h3><p>Information is not available yet. Please check back soon.</p></div>',
            contact: '<div class="empty-state"><h3>Contact Information</h3><p>Details are not available yet. Please check back soon.</p></div>'
        };
        if (contentType === 'about') {
            if (typeof content === 'string') {
                const hasHTML = /<[^>]+>/.test(content);
                if (hasHTML) {
                    const sanitized = sanitizeHTML(content);
                    htmlToRender = sanitized && sanitized.trim() ? sanitized : placeholders.about;
                } else {
                    // Plain text: split by double newlines into paragraphs
                    const normalized = (content || '').trim();
                    const paragraphs = normalized ? normalized.split(/\n\s*\n/).filter(p => p.trim()) : [];
                    htmlToRender = paragraphs.length
                        ? paragraphs.map(p => `<p class="about-paragraph">${p.trim()}</p>`).join('')
                        : placeholders.about;
                }
            }
        } else if (contentType === 'contact') {
            if (typeof content === 'object' && content !== null) {
                const desc = content.description || '';
                const phone = content.phone || '';
                const email = content.email || '';
                const address = content.address || '';
                const hours = content.hours || {};
                const mondayFriday = hours.mondayFriday || '';
                const saturday = hours.saturday || '';
                const sunday = hours.sunday || '';
                const footer = content.footer || '';
                const allEmpty = [desc, phone, email, address, mondayFriday, saturday, sunday, footer]
                    .every(v => !String(v || '').trim());
                htmlToRender = allEmpty
                    ? placeholders.contact
                    : `<p class="contact-description">${desc}</p><div class="contact-info"><h3>Contact Information:</h3><ul><li>Phone: ${phone}</li><li>Email: ${email}</li><li>Address: ${address}</li></ul></div><div class="business-hours"><h3>Business Hours:</h3><p class="hours-line">Monday to Friday — ${mondayFriday}</p><p class="hours-line">Saturday — ${saturday}</p><p class="hours-line">Sunday — ${sunday}</p></div><p class="contact-footer">${footer}</p>`;
            } else if (typeof content === 'string') {
                const hasHTML = /<[^>]+>/.test(content);
                if (hasHTML) {
                    const sanitized = sanitizeHTML(content);
                    htmlToRender = sanitized && sanitized.trim() ? sanitized : placeholders.contact;
                } else {
                    htmlToRender = content && content.trim() ? content : placeholders.contact;
                }
            }
        } else {
            const hasHTML = typeof content === 'string' && /<[^>]+>/.test(content);
            const sanitized = hasHTML ? sanitizeHTML(content) : content;
            htmlToRender = sanitized && String(sanitized).trim() ? sanitized : `<div class="empty-state"><h3>${contentType.charAt(0).toUpperCase() + contentType.slice(1)}</h3><p>Content is not available yet. Please check back soon.</p></div>`;
        }
        
        if (htmlToRender && contentElement.innerHTML !== htmlToRender) {
            contentElement.innerHTML = htmlToRender;
            contentCache.set(contentType, content);
            console.log(`Updated ${contentType} content in DOM`);
        }
    }
}

// Basic HTML sanitizer (removes scripts, dangerous attributes, and javascript: URLs)
function sanitizeHTML(html) {
    try {
        if (typeof DOMPurify !== 'undefined') {
            return DOMPurify.sanitize(html);
        }
    } catch (e) {
        // Ignore DOMPurify errors and fallback
    }
    if (typeof html !== 'string') return html;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    // Remove risky elements
    doc.querySelectorAll('script, style, iframe, object, embed, link[rel="import"]').forEach(el => el.remove());
    // Clean attributes
    doc.body.querySelectorAll('*').forEach(el => {
        [...el.attributes].forEach(attr => {
            const name = attr.name.toLowerCase();
            const value = (attr.value || '').toLowerCase();
            if (name.startsWith('on') || name === 'srcdoc') {
                el.removeAttribute(attr.name);
            } else if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(value)) {
                el.removeAttribute(attr.name);
            }
        });
    });
    return doc.body.innerHTML;
}

// Keep the original function for backward compatibility
function loadContentFromFirebase() {
    // Redirect to async version
    loadContentFromFirebaseAsync();
}

// Function to load content from localStorage (fallback)
function loadContentFromLocalStorage() {
    console.log('loadContentFromLocalStorage called');
    
    // Find all editable content sections
    const editableContents = document.querySelectorAll('[id$="Content"]');
    
    editableContents.forEach(content => {
        const contentType = content.id.replace('Content', '');
        const savedRaw = localStorage.getItem(`content_${contentType}`);
        
        console.log(`Checking localStorage for ${contentType}:`, savedRaw !== null ? 'found' : 'not found');
        
        if (savedRaw !== null) {
            console.log(`Loading ${contentType} content from localStorage`);
            let parsed = null;
            try {
                parsed = JSON.parse(savedRaw);
            } catch (e) {
                parsed = savedRaw;
            }
            updateContentElementOptimized(contentType, parsed);
        } else {
            console.log(`No saved content found in localStorage for ${contentType}`);
        }
    });
}

// Function to update content element with loaded content (original version for compatibility)
function updateContentElement(contentType, content) {
    console.log(`updateContentElement called for ${contentType}`);
    console.log('Content to update:', content);
    
    const contentElement = document.getElementById(contentType + 'Content');
    
    if (contentElement) {
        console.log(`Updating ${contentType} content element`);
        console.log('Previous content:', contentElement.innerHTML);
        
        // Clean up content to remove unwanted indentation and whitespace
        let cleanedContent = content;
        if (typeof content === 'string') {
            // Remove excessive whitespace between HTML tags while preserving content
            cleanedContent = content.replace(/>\s+</g, '><').trim();
            // Sanitize if HTML-like content
            if (/<[^>]+>/.test(cleanedContent)) {
                cleanedContent = sanitizeHTML(cleanedContent);
            }
        }
        
        // Set the cleaned HTML content
        contentElement.innerHTML = cleanedContent;
        contentCache.set(contentType, content);
        
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

// Function for settings
function openSettings() {
    if (!isAdminMode) {
        console.log('Not in admin mode, cannot access settings');
        return;
    }
    
    // Create and show settings modal
    const settingsModal = createSettingsModal();
    document.body.insertAdjacentHTML('beforeend', settingsModal);
}

function createSettingsModal() {
    return `
        <div class="edit-modal-overlay active" id="editModalOverlay">
            <div class="contact-edit-modal">
                <div class="edit-modal-header">
                    <h3><i class="fas fa-cog"></i> Admin Settings</h3>
                    <button class="close-edit-modal" onclick="closeEditModal()">&times;</button>
                </div>
                <div class="contact-edit-content" style="max-height: 70vh; overflow-y: auto; padding-right: 10px;">
                    <div class="form-section">
                        <h4><i class="fas fa-database"></i> Cache Management</h4>
                        <div class="form-group">
                            <label>Clear Application Cache</label>
                            <p style="color: rgba(255, 255, 255, 0.7); font-size: 14px; margin: 8px 0;">This will clear all cached content and force reload from Firebase.</p>
                            <button class="admin-btn" onclick="clearApplicationCache()" style="width: 100%; margin-top: 10px;">
                                <i class="fas fa-trash-alt"></i> Clear Cache
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4><i class="fas fa-tools"></i> System Tools</h4>
                        <div class="form-group">
                            <label>Debug Information</label>
                            <p style="color: rgba(255, 255, 255, 0.7); font-size: 14px; margin: 8px 0;">View system debug information and logs.</p>
                            <button class="admin-btn" onclick="showDebugInfo()" style="width: 100%; margin-top: 10px;">
                                <i class="fas fa-bug"></i> Show Debug Info
                            </button>
                        </div>
                    </div>
                    
                    <div class="edit-modal-actions">
                        <button class="cancel-edit-btn" onclick="closeEditModal()"><i class="fas fa-times"></i> Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function clearApplicationCache() {
    // Clear localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('Content') || key.includes('cache') || key.includes('content_'))) {
            keysToRemove.push(key);
        }
    }
    
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log('Removed from localStorage:', key);
    });
    
    // Show success notification
    showNotification('Application cache cleared successfully! Page will reload.', 'success');
    
    // Close modal and reload page after a short delay
    setTimeout(() => {
        closeEditModal();
        window.location.reload();
    }, 1500);
}

function showDebugInfo() {
    const debugInfo = {
        'Admin Mode': isAdminMode,
        'Edit Mode': isEditMode,
        'Current User': firebase.auth().currentUser ? firebase.auth().currentUser.email : 'Not logged in',
        'LocalStorage Keys': Object.keys(localStorage).filter(key => key.includes('Content') || key.includes('cache')),
        'Current Page': window.location.pathname,
        'Firebase Connected': firebase.apps.length > 0
    };
    
    console.log('Debug Information:', debugInfo);
    showNotification('Debug information logged to console. Press F12 to view.', 'info');
}

// Function for user management (placeholder)
function openUserManagement() {
    if (!isAdminMode) {
        console.log('Not in admin mode, cannot access user management');
        return;
    }
    
    showNotification('User management feature is coming soon!', 'info');
}
