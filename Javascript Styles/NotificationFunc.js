// Notifications functionality
function toggleNotifications() {
    const panel = document.getElementById('notificationsPanel');
    if (panel) {
        panel.classList.toggle('active');
        updateNotificationsList();
    }
}

// Pre-order notifications functionality
function togglePreorderNotifications() {
    // Navigate to pre-orders page to view new orders
    window.location.href = 'preorders.html';
}

function updatePreorderNotificationBadge() {
    const badge = document.getElementById('preorderNotificationBadge');
    
    // Get count from Firebase
    firebaseServices.getAllPreOrders()
        .then(preOrders => {
            // Filter for new/unread pre-orders (you can add a 'read' status later)
            const newPreOrders = preOrders.filter(order => !order.read);
            const count = newPreOrders.length;
            
            if (badge) {
                badge.textContent = count;
                if (count === 0) {
                    badge.classList.add('hidden');
                } else {
                    badge.classList.remove('hidden');
                }
            }
        })
        .catch(error => {
            console.error('Error getting pre-orders count:', error);
            if (badge) {
                badge.textContent = '0';
                badge.classList.add('hidden');
            }
        });
}

function hideNotifications() {
    const panel = document.getElementById('notificationsPanel');
    if (panel) {
        panel.classList.remove('active');
    }
}

function addPreOrderNotification(frameName, customerName, orderDetails) {
    const notification = {
        frameName: frameName || 'Titanium Slim Frame',
        customerName: customerName || 'Customer',
        message: `Pre-order confirmed for "${frameName || 'Titanium Slim Frame'}". We'll contact you when available.`,
        confirmationDetails: `Thank you for your interest in the "${frameName || 'Titanium Slim Frame'}". We've received your pre-order request. Our team will contact you once the item becomes available.`,
        timestamp: new Date().toISOString(),
        status: 'confirmed'
    };
    
    // Save to Firebase
    firebaseServices.savePreOrderToFirebase(notification)
        .then(() => {
            // Update UI
            updateNotificationBadge();
            updateNotificationsList();
        })
        .catch(error => {
            console.error('Error saving pre-order notification:', error);
        });
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    
    // Get count from Firebase
    firebaseServices.getAllPreOrders()
        .then(preOrders => {
            const count = preOrders.length;
            
            if (badge) {
                badge.textContent = count;
                if (count === 0) {
                    badge.classList.add('hidden');
                } else {
                    badge.classList.remove('hidden');
                }
            }
        })
        .catch(error => {
            console.error('Error getting pre-order count:', error);
            if (badge) {
                badge.textContent = '0';
                badge.classList.add('hidden');
            }
        });
}

function updateNotificationsList() {
    const list = document.getElementById('notificationsList');
    if (!list) return;
    
    // Show loading state
    list.innerHTML = '<div class="loading-notifications"><p>Loading...</p></div>';
    
    // Get notifications from Firebase
    firebaseServices.getAllPreOrders()
        .then(preOrders => {
            if (preOrders.length === 0) {
                list.innerHTML = '<div class="empty-notifications"><p>No pre-orders yet</p></div>';
                return;
            }
            
            list.innerHTML = preOrders.map(notification => `
                <div class="notification-item" onclick="showNotificationDetails('${notification.id}')">
                    <div class="notification-title">${notification.frameName}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${formatNotificationTime(notification.timestamp)}</div>
                </div>
            `).join('');
        })
        .catch(error => {
            console.error('Error getting pre-orders:', error);
            list.innerHTML = '<div class="error-notifications"><p>Error loading notifications</p></div>';
        });
}

function showNotificationDetails(notificationId) {
    // Get notification details from Firebase
    firebaseServices.db.ref('preOrders/' + notificationId).once('value')
        .then(snapshot => {
            const notification = snapshot.val();
            if (notification) {
                notification.id = notificationId;
                hideNotifications();
                showConfirmationModal(notification);
            }
        })
        .catch(error => {
            console.error('Error getting notification details:', error);
        });
}

function showConfirmationModal(notification) {
    const overlay = document.createElement('div');
    overlay.className = 'confirmation-modal-overlay';
    overlay.onclick = hideConfirmationModal;
    
    overlay.innerHTML = `
        <div class="confirmation-modal" onclick="event.stopPropagation()">
            <div class="confirmation-modal-header">
                <h3>Pre-Order Confirmation</h3>
                <span class="close-confirmation" onclick="hideConfirmationModal()">×</span>
            </div>
            <div class="confirmation-modal-content">
                <h4>${notification.frameName}</h4>
                <p>${notification.confirmationDetails}</p>
                <div class="confirmation-modal-time">
                    Ordered on ${formatDetailedTime(notification.timestamp)}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('active'), 10);
}

function hideConfirmationModal() {
    const modal = document.querySelector('.confirmation-modal-overlay');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

function formatNotificationTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
}

function formatDetailedTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}