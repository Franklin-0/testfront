function setupProductButtons() {
  // Select all Add to Cart buttons from the hardcoded HTML
  const cartButtons = document.querySelectorAll(".add-to-cart");
  cartButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const productId = btn.dataset.id;

      if (typeof showNotification === "function") {
        showNotification(
          "Please select a size on the product page.",
          "error"
        );
      }

      setTimeout(() => {
        window.location.href = `product.html?id=${productId}`;
      }, 1500); // Wait 1.5 seconds before redirecting
    });
  });

  // Select all Favourites buttons from the hardcoded HTML
  const favouriteButtons = document.querySelectorAll(".favourite-btn");
  favouriteButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault(); // Prevent link navigation
      e.stopPropagation(); // Stop click bubbling

      const productId = btn.dataset.id;
      const productName = btn.dataset.name;

      if (typeof handleAddToFavourites === "function") {
        handleAddToFavourites(productId, productName);
      }
    });
  });

  // Update all favourite icons to match saved state
  updateFavouriteIcons();
}

// In production, consider using a config or router instead of hardcoding product.html
// Run after DOM is loaded
document.addEventListener("DOMContentLoaded", setupProductButtons);
