document.addEventListener('DOMContentLoaded', () => {
  const API_BASE_URL = 'http://localhost:3000'; // Or your production URL
  const CART_STORAGE_KEY = 'fashion_cart_v1';

  // --- Local Storage Helpers ---
  function getLocalCart() {
    try {
      const localData = localStorage.getItem(CART_STORAGE_KEY);
      return localData ? JSON.parse(localData) : [];
    } catch (e) {
      console.error("Could not read cart from localStorage:", e);
      return [];
    }
  }

  function saveLocalCart(cart) {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error("Could not save cart to localStorage:", e);
    }
  }

  function clearLocalCart() {
    localStorage.removeItem(CART_STORAGE_KEY);
  }

  // --- DOM References ---
  const cartItemsContainer = document.getElementById("cart-items-container");
  const cartTotalSpan = document.getElementById("cart-total");
  const clearCartBtn = document.getElementById("clear-cart");
  const checkoutBtn = document.getElementById("checkout-btn");

  if (!cartItemsContainer) return;

  const currencyFormatter = new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
  });

  // --- Render Cart ---
  function displayCart(cart) {
    cartItemsContainer.innerHTML = "";
    if (!cart || cart.length === 0) {
      cartItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
      cartTotalSpan.textContent = currencyFormatter.format(0);
      checkoutBtn.disabled = true;
      clearCartBtn.disabled = true;
      return;
    }

    checkoutBtn.disabled = false;
    clearCartBtn.disabled = false;

    let total = 0;
    cart.forEach(item => {
      const price = Number(item.price) || 0;
      const quantity = parseInt(item.quantity, 10) || 0;
      const itemTotal = price * quantity;
      total += itemTotal;

      const itemDiv = document.createElement("div");
      itemDiv.className = "cart-item";

      const img = document.createElement('img');
      img.className = 'cart-item-image';
      img.src = item.image || '';
      img.alt = item.name || 'Product image';

      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'cart-item-details';
      const nameH4 = document.createElement('h4');
      nameH4.textContent = item.name || 'Unnamed Product';
      const sizeP = document.createElement('p');
      sizeP.textContent = `Size: ${item.size || 'N/A'}`;
      detailsDiv.append(nameH4, sizeP);

      const quantityDiv = document.createElement('div');
      const quantityInput = document.createElement('input');
      quantityInput.type = 'number';
      quantityInput.className = 'quantity-input';
      quantityInput.dataset.id = item.id;
      quantityInput.value = item.quantity;
      quantityInput.readOnly = false; // Allow quantity to be edited
      quantityInput.min = '1';
      quantityDiv.appendChild(quantityInput);

      const priceP = document.createElement('p');
      priceP.textContent = currencyFormatter.format(itemTotal);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-item-btn';
      removeBtn.dataset.id = item.id;
      removeBtn.innerHTML = '&#10006;';

      itemDiv.append(img, detailsDiv, quantityDiv, priceP, removeBtn);
      cartItemsContainer.appendChild(itemDiv);
    });

    cartTotalSpan.textContent = currencyFormatter.format(total);
  }

  // --- Fetch Cart ---
  async function fetchAndDisplayCart() {
    const localCart = getLocalCart();
    displayCart(localCart);

    // Check login status
    let isLoggedIn = false;
    try {
      const authResponse = await fetch(`${API_BASE_URL}/api/auth/status`, { credentials: 'include' });
      if (authResponse.ok) {
        const data = await authResponse.json();
        isLoggedIn = data.isLoggedIn;
      }
    } catch (e) {
      console.warn("Auth check failed, using local cart only.", e);
    }

    if (!isLoggedIn) return;

    // --- If logged in, merge guest → server before showing server cart ---
    if (localCart.length > 0) {
      try { 
        const mergeResponse = await fetch(`${API_BASE_URL}/api/cart/merge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ cart: localCart }), 
        });
        clearLocalCart();
      } catch (e) {
        console.error("Error merging guest cart:", e);
      }
    }

    // Now that the merge is complete, fetch the definitive cart from the server.
    try {
      const cartResponse = await fetch(`${API_BASE_URL}/api/cart`, { credentials: 'include' });
      if (!cartResponse.ok) throw new Error(cartResponse.statusText);
      const serverCart = await cartResponse.json();
      displayCart(serverCart); 
      saveLocalCart(serverCart); // keep local in sync
    } catch (e) {
      console.error("Error fetching server cart:", e);
    }
  }

  // --- Event Listeners ---
  function setupEventListeners() {
    cartItemsContainer.addEventListener('click', async (e) => {
      if (e.target.classList.contains('remove-item-btn')) {
        const id = e.target.dataset.id; // This is the cartItemId

        try {
          // Wait for the server to confirm deletion before updating the UI
          const response = await fetch(`${API_BASE_URL}/api/cart`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ cartItemId: id }),
          });
          if (response.ok) {
            const serverCart = await response.json();
            displayCart(serverCart);
            saveLocalCart(serverCart);
          }
        } catch (err) {
          console.error("Failed to remove item from server cart:", err);
        }
      }
    });

    cartItemsContainer.addEventListener('input', (e) => {
      if (e.target.classList.contains('quantity-input')) {
        const id = e.target.dataset.id;
        const qty = parseInt(e.target.value, 10);

        let cart = getLocalCart();
        const item = cart.find(i => i.id === id);
        if (item) item.quantity = qty;
        saveLocalCart(cart);
        displayCart(cart);

        fetch(`${API_BASE_URL}/api/cart`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ cartItemId: id, quantity: qty }),
        }).catch((err) => {
            console.error("Failed to update item quantity on server:", err);
            showNotification('Could not update item quantity. Please check your connection.', 'error');
        });
      }
    });

    clearCartBtn.addEventListener("click", async () => {
      if (!confirm("Clear cart?")) return;
      
      // Disable the button to prevent multiple clicks
      clearCartBtn.disabled = true;

      try {
        const response = await fetch(`${API_BASE_URL}/api/cart`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({}), // Send an empty body to prevent backend error
        });

        if (response.ok) {
          const serverCart = await response.json(); // The server will respond with an empty array
          saveLocalCart(serverCart);
          displayCart(serverCart);
        } else {
          throw new Error(`Server responded with status: ${response.status}`);
        }
      } catch (err) { 
          console.error("Failed to clear cart:", err);
          showNotification('Could not clear cart on the server. Please try again.', 'error');
          clearCartBtn.disabled = false; // Re-enable on error
      }
    });

    checkoutBtn.addEventListener('click', () => {
      window.location.href = 'checkout.html';
    });
  }

  fetchAndDisplayCart();
  setupEventListeners();
});
