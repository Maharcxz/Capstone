// Frame category selection
function selectFrameCategory(category) {
    const frameTypeTitle = document.getElementById('frameTypeTitle');
    if (frameTypeTitle) {
        frameTypeTitle.textContent = category;
    }
    closeSidebar();
    filterProductsByCategory(category);
}

function filterProductsByCategory(category) {
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.style.display = 'block';
    });
}