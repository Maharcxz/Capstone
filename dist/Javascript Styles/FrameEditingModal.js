// Frame Edit Modal functionality
function openFrameEditModal(editButton) {
    if (!isAdminMode) return;
    
    const productCard = editButton ? editButton.closest('.product-card') : null;
    if (!productCard) {
        console.warn('openFrameEditModal: product card element not found for edit button');
        return;
    }
    
    const titleEl = productCard.querySelector('.product-title');
    const priceEl = productCard.querySelector('.product-price');
    const productTitle = titleEl ? titleEl.textContent : '';
    const productPrice = priceEl ? priceEl.textContent : '';
    
    const modal = document.getElementById('frameEditModalOverlay');
    const nameInput = document.getElementById('frameNameInput');
    const priceInput = document.getElementById('framePriceInput');
    const statusInput = document.getElementById('frameStatusInput');
    
    if (!modal) {
        console.warn('openFrameEditModal: frameEditModalOverlay not found');
        return;
    }
    
    // Populate the form with current values
    if (nameInput) nameInput.value = productTitle;
    if (priceInput) priceInput.value = productPrice;
    if (statusInput) statusInput.value = 'Available';
    
    // Store reference to the product card being edited
    const allCards = Array.from(document.querySelectorAll('.product-card'));
    modal.dataset.editingCard = productCard.dataset.cardIndex || allCards.indexOf(productCard);
    
    modal.classList.add('active');
    modal.style.display = 'flex';
}

function closeFrameEditModal() {
    const modal = document.getElementById('frameEditModalOverlay');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        modal.removeAttribute('data-editing-card');
    }
}

function saveFrameEdit() {
    const modal = document.getElementById('frameEditModalOverlay');
    const nameInput = document.getElementById('frameNameInput');
    const priceInput = document.getElementById('framePriceInput');
    const statusInput = document.getElementById('frameStatusInput');
    
    const cardIndex = modal.dataset.editingCard;
    if (cardIndex !== undefined) {
        const productCards = document.querySelectorAll('.product-card');
        const targetCard = productCards[parseInt(cardIndex)];
        
        if (targetCard) {
            const titleElement = targetCard.querySelector('.product-title');
            const priceElement = targetCard.querySelector('.product-price');
            
            if (titleElement && nameInput.value) {
                titleElement.textContent = nameInput.value;
            }
            if (priceElement && priceInput.value) {
                priceElement.textContent = priceInput.value;
            }
        }
    }
    
    closeFrameEditModal();
}