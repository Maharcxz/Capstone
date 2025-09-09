// Notifications functionality
function toggleNotifications() {
    const panel = document.getElementById('notificationsPanel');
    if (panel) {
        panel.classList.toggle('active');
        updateNotificationsList();
    }
}

function hideNotifications() {
    const panel = document.getElementById('notificationsPanel');
    if (panel) {
        panel.classList.remove('active');
    }
}

function addPreOrderNotification(frameName, customerName, orderDetails) {
    const notification = {
        id: Date.now(),
        frameName: frameName || 'Titanium Slim Frame',
        customerName: customerName || 'Customer',
        message: `Pre-order confirmed for "${frameName || 'Titanium Slim Frame'}". We'll contact you when available.`,
        confirmationDetails: `Thank you for your interest in the "${frameName || 'Titanium Slim Frame'}". We've received your pre-order request. Our team will contact you once the item becomes available.`,
        timestamp: new Date().toISOString(),
        status: 'confirmed'
    };
    
    preOrderNotifications.unshift(notification);
    localStorage.setItem('preOrderNotifications', JSON.stringify(preOrderNotifications));
    updateNotificationBadge();
    updateNotificationsList();
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const count = preOrderNotifications.length;
    
    if (badge) {
        badge.textContent = count;
        if (count === 0) {
            badge.classList.add('hidden');
        } else {
            badge.classList.remove('hidden');
        }
    }
}

function updateNotificationsList() {
    const list = document.getElementById('notificationsList');
    if (!list) return;
    
    if (preOrderNotifications.length === 0) {
        list.innerHTML = '<div class="empty-notifications"><p>No pre-orders yet</p></div>';
        return;
    }
    
    list.innerHTML = preOrderNotifications.map(notification => `
        <div class="notification-item" onclick="showNotificationDetails('${notification.id}')">
            <div class="notification-title">${notification.frameName}</div>
            <div class="notification-message">${notification.message}</div>
            <div class="notification-time">${formatNotificationTime(notification.timestamp)}</div>
        </div>
    `).join('');
}

function showNotificationDetails(notificationId) {
    const notification = preOrderNotifications.find(n => n.id === parseInt(notificationId));
    if (notification) {
        hideNotifications();
        showConfirmationModal(notification);
    }
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