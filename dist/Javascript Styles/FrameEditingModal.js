// Frame Edit Modal functionality
function openFrameEditModal(editButton) {
    if (!isAdminMode) return;
    
    const productCard = editButton.closest('.product-card');
    const productTitle = productCard.querySelector('.product-title').textContent;
    const productPrice = productCard.querySelector('.product-price').textContent;
    
    const modal = document.getElementById('frameEditModalOverlay');
    const nameInput = document.getElementById('frameNameInput');
    const priceInput = document.getElementById('framePriceInput');
    const statusInput = document.getElementById('frameStatusInput');
    
    // Populate the form with current values
    if (nameInput) nameInput.value = productTitle;
    if (priceInput) priceInput.value = productPrice;
    if (statusInput) statusInput.value = 'Available';
    
    // Store reference to the product card being edited
    modal.dataset.editingCard = productCard.dataset.cardIndex || Array.from(document.querySelectorAll('.product-card')).indexOf(productCard);
    
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
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