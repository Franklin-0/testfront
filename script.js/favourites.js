// --- Dependency & Global State ---
import { API_BASE_URL } from "./config.js";
import { showNotification } from "./notifications.js";
import { setupRelatedProductSlideshow } from "./product.js";
if (typeof API_BASE_URL === 'undefined') {
  console.error("CRITICAL: API_BASE_URL is not defined! Favourites functionality will fail.");
}

let authStateCache = null; // Cache for the user's login status

/**
 * Fetches the user's authentication status, using a cache to avoid redundant requests.
 * @returns {Promise<Object>} A promise that resolves to the auth state { isLoggedIn, user }.
 */
async function getAuthState() {
  if (authStateCache) return authStateCache;
  const response = await fetch(`${API_BASE_URL}/api/auth/status`, { credentials: 'include' });
  if (!response.ok) throw new Error('Could not verify authentication status.');
  authStateCache = await response.json();
  return authStateCache;
}
/**
 * Updates all favourite icons on the page to show their current state.
 * It fetches favourites from both localStorage and the server.
 */
export async function updateFavouriteIcons() {
  let favouriteIds = new Set();

  // 1. Get from localStorage
  try {
    const localFavourites = JSON.parse(localStorage.getItem('favourites')) || [];
    localFavourites.forEach(fav => favouriteIds.add(String(fav.id)));
  } catch (e) {
    console.error("Could not read favourites from localStorage for icon update:", e);
  }

  // 2. Get from server, but only if the user might be logged in.
  try {
    const authState = await getAuthState();

    if (authState && authState.isLoggedIn) {
      const response = await fetch(`${API_BASE_URL}/api/favourites`, { credentials: 'include' });
      if (response.ok) {
        const serverFavourites = await response.json();
        serverFavourites.forEach(fav => favouriteIds.add(String(fav.id)));
      }
    }
  } catch (error) {
    console.warn("Could not fetch server favourites for icon update:", error.message);
  }

  // 3. Update all favourite buttons on the page
  document.querySelectorAll('.favourite-btn').forEach(btn => {
    const productId = btn.dataset.id;
    if (favouriteIds.has(productId)) {
      btn.classList.add('favourited');
    } else {
      btn.classList.remove('favourited');
    }
  });
}

export async function handleAddToFavourites(productId, productName) {

  try {
    const authState = await getAuthState();

    if (authState.isLoggedIn) {
      // --- LOGGED-IN USER LOGIC ---
      const response = await fetch(`${API_BASE_URL}/api/favourites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId: productId }),
      });

      if (response.ok) {
        showNotification(`❤️ ${productName} added to favourites!`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Could not add to favourites.');
      }
    } else {
      // --- GUEST USER LOGIC ---
      console.log("User not logged in. Saving favourite to localStorage.");
      const localFavourites = JSON.parse(localStorage.getItem('favourites')) || [];

      // Avoid adding duplicates
      if (!localFavourites.find(fav => fav.id == productId)) {
        const productRes = await fetch(`${API_BASE_URL}/api/products/${productId}`);
        if (!productRes.ok) throw new Error('Could not fetch product details to save locally.');

        const product = await productRes.json();
        // Ensure the object shape matches what the server would provide for consistency
        const favProduct = {
          ...product,
          image_url: product.image_url || product.image // Normalize image property
        };
        localFavourites.push(favProduct);
        localStorage.setItem('favourites', JSON.stringify(localFavourites));
      }
      showNotification(`❤️ ${productName} added to local favourites!`);
    }

    document.querySelectorAll(`.favourite-btn[data-id='${productId}']`).forEach(btn => {
      btn.classList.add('favourited');
    });

  } catch (error) {
    console.error("Error adding to favourites:", error);
    showNotification(error.message, 'error');
  }
}

// --- LOGIC FROM my-favourites.js ---
// This code runs only on the es.html page

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('favourites-container');

  // If we are not on the favourites page, do nothing.
  if (!container) {
    return;
  }

  /**
   * Renders a list of product items into the container.
   * @param {Array<Object>} products - An array of product objects.
   */
  function renderFavourites(products) {
    if (!products || products.length === 0) {
      container.innerHTML = '<p>You have no favourite items yet. Start by adding some! ❤️</p>';
      return;
    }

    // Use a Map to ensure no duplicate products are shown
    const uniqueProducts = new Map();
    products.forEach(p => uniqueProducts.set(p.id, p));

    container.innerHTML = Array.from(uniqueProducts.values()).map(p => `
      <div class="product">
        <!-- Add a remove button, positioned absolutely like the favourite-btn -->
        <button class="remove-favourite-btn" data-id="${p.id}" title="Remove from Favourites">&times;</button>
        <a href="product.html?id=${p.id}">
          <img src="${p.image_url}" alt="${p.name}">
          <h3>${p.name}</h3>
        </a>
        <p>Price: KSh ${p.price}</p>
        <button class="add-to-cart" onclick="window.location.href='product.html?id=${p.id}'">View Product</button>
      </div>
    `).join('');
  }

  /**
   * Fetches favourites from both the server (if logged in) and localStorage.
   */
  async function loadFavourites() {
    let allFavourites = [];

    // 1. Get favourites from localStorage
    try {
      const localFavourites = JSON.parse(localStorage.getItem('favourites')) || [];
      if (localFavourites.length > 0) {
        allFavourites.push(...localFavourites);
      }
    } catch (e) {
      console.error("Could not read favourites from localStorage:", e);
    }

    // 2. Try to get favourites from the server
    try {
      const response = await fetch(`${API_BASE_URL}/api/favourites`, { credentials: 'include' });
      if (response.ok) {
        const serverFavourites = await response.json();
        allFavourites.push(...serverFavourites);
      } else if (response.status !== 401) {
        console.error('Failed to fetch server favourites:', await response.json());
      }
    } catch (error) {
      console.error("Error fetching server favourites:", error);
    }

    // 3. Render the combined list of unique favourites
    const uniqueFavourites = Array.from(new Map(allFavourites.map(p => [p.id, p])).values());
    renderFavourites(uniqueFavourites);

    // 4. Load recommended products based on the fetched favourites
    loadRecommendedProducts(uniqueFavourites);
  }

  /**
   * Handles removing a product from favourites from both localStorage and the server.
   * @param {string} productId - The ID of the product to remove.
   */
  async function handleRemoveFromFavourites(productId) {
    // 1. Optimistically remove from localStorage
    try {
      let localFavourites = JSON.parse(localStorage.getItem('favourites')) || [];
      localFavourites = localFavourites.filter(fav => fav.id != productId);
      localStorage.setItem('favourites', JSON.stringify(localFavourites));
    } catch (e) {
      console.error("Could not remove favourite from localStorage:", e);
    }

    // 2. Attempt to remove from server (for logged-in users)
    try {
      const authState = await getAuthState(); // Check if the user is logged in
      if (authState && authState.isLoggedIn) {
        await fetch(`${API_BASE_URL}/api/favourites/${productId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        // The UI is already updated, so we don't need to strictly handle the response
        // unless we want to show a specific error message on failure.
      }
    } catch (error) {
      console.error("Error removing favourite from server:", error);
      // Optional: show a notification if the server-side delete fails for a logged-in user.
    }

    // 3. Re-render the UI
    loadFavourites();
  }

  // --- Initial Icon State Update ---
  //called here to ensure icons on the favourites page itself are correct
  // (e.g., on the recommended products slideshow).
  updateFavouriteIcons();

  // --- Event Delegation for Remove Buttons ---
  container.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-favourite-btn')) {
      const productId = e.target.dataset.id;
      handleRemoveFromFavourites(productId);
    }
  });

  /**
   * Loads and displays a slideshow of recommended products.
   * @param {Array<Object>} favouriteProducts - The user's current list of favourite products.
   */
  async function loadRecommendedProducts(favouriteProducts) {
    const recommendedContainer = document.getElementById('recommended-products');
    if (!recommendedContainer) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/products`);
      const allProducts = await res.json();

      let recommendedProducts = [];
      let title = "You Might Also Like";

      if (favouriteProducts && favouriteProducts.length > 0) {
        // Recommend based on the category of the last favourited item
        const lastFavourite = favouriteProducts[favouriteProducts.length - 1];
        const favouriteIds = new Set(favouriteProducts.map(p => p.id));
        
        recommendedProducts = allProducts.filter(p => 
          p.category === lastFavourite.category && !favouriteIds.has(p.id)
        );
        title = `More in ${lastFavourite.category}`;

        // If no related products are found in the same category, fall back to showing featured products.
        if (recommendedProducts.length === 0) {
          recommendedProducts = allProducts.filter(p => !favouriteIds.has(p.id)).slice(0, 8);
          title = "Featured Products";
        }

      } else {
        // If no favourites, show the first 8 products as "Featured"
        recommendedProducts = allProducts.slice(0, 8);
        title = "Featured Products";
      }

      if (recommendedProducts.length > 0) {
        renderSlideshow(recommendedContainer, title, recommendedProducts);
        recommendedContainer.style.display = 'block';
      }

    } catch (error) {
      console.error("Could not load recommended products:", error);
      recommendedContainer.style.display = 'none';
    }
  }

  /**
   * Renders the slideshow HTML structure and initializes it.
   * @param {HTMLElement} container - The container element for the slideshow.
   * @param {string} title - The title for the section.
   * @param {Array<Object>} products - The products to display.
   */
  function renderSlideshow(container, title, products) {
    const gridContainer = document.createElement('div');
    gridContainer.className = 'product-grid';

    gridContainer.innerHTML = products.map(p => `
      <div class="product">
        <button class="favourite-btn" data-id="${p.id}" data-name="${p.name}">❤</button>
        <a href="product.html?id=${p.id}"><img src="${p.image_url}" alt="${p.name}"><h3>${p.name}</h3></a>
        <p>Price: KSh ${p.price}</p>
        <button class="add-to-cart" onclick="window.location.href='product.html?id=${p.id}'">View Product</button>
      </div>`).join('');

    // Add slideshow wrapper and controls
    container.innerHTML = `<h2>${title}</h2>`;
    const slideshowContainer = document.createElement('div');
    slideshowContainer.className = 'related-slideshow-container';
    slideshowContainer.innerHTML = `<button class="related-prev">&#10094;</button><button class="related-next">&#10095;</button>`;
    slideshowContainer.prepend(gridContainer);
    container.appendChild(slideshowContainer);

    // Add event listeners to the new favourite buttons in the slideshow
    container.querySelectorAll(".favourite-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleAddToFavourites(btn.dataset.id, btn.dataset.name);
      });
    });

    // Initialize the slideshow logic (using the function from product.js, which needs to be available)
    setupRelatedProductSlideshow();
  }

  // --- Initial Load ---
  loadFavourites();
});
