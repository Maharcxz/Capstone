// Search functionality
function initializeSearch() {
    const searchInput = document.getElementById('frameSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function(event) {
            const searchTerm = event.target.value.toLowerCase();
            const productCards = document.querySelectorAll('.product-card');
            
            productCards.forEach(card => {
                const productTitle = card.querySelector('.product-title');
                if (productTitle) {
                    const productName = productTitle.textContent.toLowerCase();
                    if (productName.includes(searchTerm)) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                }
            });
        });
    }
}