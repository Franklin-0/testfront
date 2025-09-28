let selectedSize = null; // Only one size can be selected at a time.
import { API_BASE_URL } from "./config.js";
import { handleAddToFavourites, updateFavouriteIcons } from "./favourites.js";
const CART_STORAGE_KEY = 'fashion_cart_v1';

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
    showNotification("Your cart cannot be saved in this browser mode.", "error");
  }
}
function expandSizes(sizesStr) {
  if (!sizesStr) return [];
  const normalized = String(sizesStr).replace(/[—–]/g, "-");
  const out = [];
  normalized.split(",").forEach((raw) => {
    const part = raw.trim();
    if (!part) return;

    // Range like "29-36"
    const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      let start = parseInt(m[1], 10);
      let end = parseInt(m[2], 10);
      if (end < start) [start, end] = [end, start]; // tolerate reversed ranges
      for (let i = start; i <= end; i++) out.push(String(i));
      return;
    }
    if (/^\d+$/.test(part)) {
      out.push(part);
      return;
    }
  });
  return [...new Set(out)];
}

function renderProduct(product) {
  const detailsContainer = document.getElementById("product-details");
  if (!detailsContainer) return;
  
  // Clear previous content
  detailsContainer.innerHTML = '';

  const sizesArray = expandSizes(product.sizes);
  const price = product.price ?? "N/A";
  const description = product.description ?? "No description available.";

  // --- Create elements programmatically to prevent XSS ---
  const grid = document.createElement('div');
  grid.className = 'product-details-grid';

  const imagesDiv = document.createElement('div');
  imagesDiv.className = 'product-images';
  const mainImage = document.createElement('img');
  mainImage.id = 'main-image';
  mainImage.src = product.image_url;
  mainImage.alt = product.name;
  imagesDiv.appendChild(mainImage);

  const infoDiv = document.createElement('div');
  infoDiv.className = 'product-info';

  const h1 = document.createElement('h1');
  h1.textContent = product.name;

  const priceP = document.createElement('p');
  priceP.className = 'price';
  priceP.textContent = `KSh ${price}`;

  const sizesDiv = document.createElement('div');
  sizesDiv.className = 'sizes';
  const strong = document.createElement('strong');
  strong.textContent = 'Select Size:';
  const sizeOptionsDiv = document.createElement('div');
  sizeOptionsDiv.className = 'size-options';
  if (sizesArray.length > 0) {
    sizesArray.forEach(size => {
      const btn = document.createElement('button');
      btn.className = 'size-option';
      btn.dataset.size = size;
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = size;
      sizeOptionsDiv.appendChild(btn);
    });
  } else {
    sizeOptionsDiv.innerHTML = '<p>No sizes available</p>';
  }
  sizesDiv.append(strong, sizeOptionsDiv);

  const descP = document.createElement('p');
  descP.className = 'description';
  descP.textContent = description;

  const purchaseDiv = document.createElement('div');
  purchaseDiv.className = 'purchase-options';
  
  const quantityLabel = document.createElement('label');
  quantityLabel.htmlFor = 'quantity';
  quantityLabel.textContent = 'Quantity:';
  
  const quantityInput = document.createElement('input');
  quantityInput.type = 'number';
  quantityInput.id = 'quantity';
  quantityInput.name = 'quantity';
  quantityInput.min = '1';
  quantityInput.value = '1';

  const buttonsDiv = document.createElement('div');
  buttonsDiv.className = 'buttons';
  const addToCartBtn = document.createElement('button');
  addToCartBtn.className = 'add-to-cart';
  addToCartBtn.textContent = 'Add to Cart';
  const buyNowBtn = document.createElement('button');
  buyNowBtn.className = 'buy-now';
  buyNowBtn.textContent = 'Buy Now';
  const favBtn = document.createElement('button');
  favBtn.className = 'add-to-favourites';
  favBtn.textContent = '❤ Add to Favourites';
  buttonsDiv.append(addToCartBtn, buyNowBtn); // Favourite button is handled differently now
  purchaseDiv.append(quantityLabel, quantityInput, buttonsDiv);

  infoDiv.append(h1, priceP, sizesDiv, descP, purchaseDiv);
  grid.append(imagesDiv, infoDiv);
  detailsContainer.appendChild(grid);

  // Use event delegation on the container
  addEventListeners(product, detailsContainer);
}

function addEventListeners(product, container) {
  container.addEventListener('click', (e) => {
    const target = e.target;

    // Size Selection
    if (target.classList.contains('size-option')) {
      const size = target.dataset.size;
      
      // If the clicked size is already selected, deselect it.
      if (selectedSize === size) {
        selectedSize = null;
        target.classList.remove("active");
        target.setAttribute('aria-pressed', 'false');
      } else {
        // Deselect any previously selected size button
        const currentActive = container.querySelector('.size-option.active');
        if (currentActive) {
          currentActive.classList.remove("active");
          currentActive.setAttribute('aria-pressed', 'false');
        }
        // Select the new size
        selectedSize = size;
        target.classList.add("active");
        target.setAttribute('aria-pressed', 'true');
      }
      console.log("Selected size:", selectedSize);
    }

    // Add to Cart
    if (target.classList.contains('add-to-cart')) {
      handleAddToCart(product);
    }

    // Buy Now
    if (target.classList.contains('buy-now')) {
      handleBuyNow(product);
    }

    // Add to Favourites
    if (target.classList.contains('add-to-favourites')) {
      handleAddToFavourites(product.id, product.name);
    }
  });
}

/**
 * Displays a styled notification on the screen.
 * @param {string} message The message to display.
 * @param {string} type The type of notification ('success', 'error', etc.).
 */
function showNotification(message, type = 'success') {
  const container = document.getElementById('notification-container');
  if (!container) return; 

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  container.appendChild(notification);

  setTimeout(() => { notification.classList.add('show'); }, 10);
  setTimeout(() => {
    notification.classList.remove('show');
    notification.addEventListener('transitionend', () => notification.remove());
  }, 3000);
}


function requireSize(action) {
  if (!selectedSize) {
    showNotification("Please select a size before " + action + "!", 'error');
    return false;
  }
  return true;
}

const getQuantity = () => parseInt(document.getElementById("quantity")?.value, 10) || 1;

async function handleAddToCart(product) {
  if (!requireSize("adding to cart")) return;

  const quantity = getQuantity();
  console.log("🛒 Adding to cart:", { product, selectedSize, quantity });

  // --- Optimistic UI Update ---
  let localCart = getLocalCart();
  // Each size is a unique item in the cart. The ID is a composite of product and size.
  const cartItemId = `${product.id}-${selectedSize}`;
  const existingItem = localCart.find(item => item.id === cartItemId);

  if (existingItem) {
    // If the same size is added again, increment its quantity.
    existingItem.quantity += quantity;
  } else {
    // Add a new item for this specific size.
    localCart.push({
      id: cartItemId, // Unique ID for product-size combo
      productId: product.id,
      name: product.name,
      price: product.price,
      size: selectedSize, // Store the single size
      quantity: quantity,
      image: product.image_url
    });
  }
  saveLocalCart(localCart);
  showNotification(`🛒 ${product.name} (Size: ${selectedSize}) added to cart!`);
  if (typeof updateCartCount === 'function') updateCartCount();
  
  // --- Server Sync Logic ---
  // Capture the sizes to be synced before clearing the selection.
  const sizeToSync = selectedSize;

  // Clear selection immediately for better UX
  document.querySelectorAll(".size-option.active").forEach(btn => btn.classList.remove("active"));
  selectedSize = null;

  try {
    // Send "add to cart" request.
    await fetch(`${API_BASE_URL}/api/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ productId: product.id, size: sizeToSync, quantity: quantity }),
    });

    // After all items are added, check if the user is logged in.
    // If they are, we must re-sync the cart from the server to get the definitive state.
    const authState = await fetch(`${API_BASE_URL}/api/auth/status`, { credentials: 'include' }).then(res => res.json());

    if (authState.isLoggedIn) {
      // Fetch the final, correct state of the cart from the server. This avoids race conditions.
      const finalCartResponse = await fetch(`${API_BASE_URL}/api/cart`, { credentials: 'include' });
      if (finalCartResponse.ok) {
        const finalCart = await finalCartResponse.json();
        saveLocalCart(finalCart); // Update local storage with the correct, final cart.
        if (typeof updateCartCount === 'function') updateCartCount(); // Update the UI badge.
      } else {
        console.error("Could not re-sync cart after adding multiple items.");
      }
    }
    // For guests, the optimistic update we did earlier is sufficient.
    // We don't need to do anything else.

  } catch (error) {
    console.error('Error syncing cart with server:', error);
    showNotification('Could not sync cart with the server. Please try again.', 'error');
  }
}

async function handleBuyNow(product) {
  if (!requireSize("buying")) return;
  
  const quantity = getQuantity();
  console.log("💳 Buying now:", { product, selectedSize, quantity: getQuantity() });

  try {
    // Add the selected item to the cart.
    const response = await fetch(`${API_BASE_URL}/api/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        productId: product.id,
        size: selectedSize,
        quantity: quantity
      }),
    });


    if (response.ok) {
      // If the items were added successfully, redirect to checkout.
      window.location.href = 'checkout.html';
    } else {
      throw new Error('Failed to add item to cart before checkout.');
    }
  } catch (error) {
    console.error('Buy Now failed:', error);
    showNotification('Could not proceed to checkout. Please try again.', 'error');
  }
}

function setupRelatedProductSlideshow() {
  const container = document.querySelector('.related-slideshow-container');
  if (!container) return;

  const grid = container.querySelector('.product-grid');
  const prevBtn = container.querySelector('.related-prev');
  const nextBtn = container.querySelector('.related-next');
  if (!grid || !prevBtn || !nextBtn) return;

  if (window.innerWidth <= 768) {
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    return;
  }
  const items = grid.querySelectorAll('.product'); 
  const itemsPerView = 4; 
  const totalItems = items.length;
  let currentIndex = 0;
  let autoSlideInterval;

  
  function advanceSlide() {
    if (currentIndex < totalItems - itemsPerView) {
      currentIndex++;
    } else {
      currentIndex = 0;
    }
    updateSlidePosition();
  }

  function updateSlidePosition() {
    const offset = -currentIndex * (100 / itemsPerView); 
    grid.style.transform = `translateX(${offset}%)`;
  }
  function startAutoSlide() {
    stopAutoSlide(); 
    autoSlideInterval = setInterval(advanceSlide, 4000); 
  }

  function stopAutoSlide() {
    clearInterval(autoSlideInterval);
  }
  nextBtn.addEventListener('click', () => {
    advanceSlide();
    startAutoSlide();
  });

  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
    } else {
      currentIndex = totalItems - itemsPerView;
    }
    updateSlidePosition();
    startAutoSlide(); // Reset the timer on manual interaction
  });

  // Pause on hover
  container.addEventListener('mouseenter', stopAutoSlide);
  container.addEventListener('mouseleave', startAutoSlide);

  startAutoSlide(); // Start the slideshow automatically
}

async function loadRelatedProducts(currentProduct) {
  const relatedContainer = document.getElementById('related-products');
  if (!currentProduct || !currentProduct.category) {
    relatedContainer.style.display = 'none';
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/products`);
    const allProducts = await res.json();

    const relatedProducts = allProducts.filter(p => 
      p.category === currentProduct.category && p.id !== currentProduct.id
    ); // Get all related products

    const gridContainer = document.createElement('div');
    gridContainer.className = 'product-grid';

    relatedProducts.forEach(p => {
      const productDiv = document.createElement('div');
      productDiv.className = 'product';

      const link = document.createElement('a');
      link.href = `product.html?id=${p.id}`;

      const img = document.createElement('img');
      img.src = p.image_url;
      img.alt = p.name;
      link.appendChild(img);

      const h3 = document.createElement('h3');
      h3.textContent = p.name;
      link.appendChild(h3);

      const detailsP = document.createElement('p');
      detailsP.className = 'details';
      detailsP.textContent = `Price: KSh ${p.price}`;

      const viewBtn = document.createElement('button');
      viewBtn.textContent = 'View Details';
      viewBtn.onclick = () => { window.location.href = `product.html?id=${p.id}`; };

      productDiv.append(link, detailsP, viewBtn);
      gridContainer.appendChild(productDiv);
    });

    if (relatedProducts.length > 4) {
      relatedContainer.innerHTML = `<h2>Related Products</h2>`;
      const slideshowContainer = document.createElement('div');
      slideshowContainer.className = 'related-slideshow-container';
      slideshowContainer.innerHTML = `<button class="related-prev">&#10094;</button><button class="related-next">&#10095;</button>`;
      slideshowContainer.prepend(gridContainer);
      relatedContainer.appendChild(slideshowContainer);
      setupRelatedProductSlideshow(); // Initialize the slideshow logic

      // Update favourite icons after rendering the slideshow
      updateFavouriteIcons();
    } else {
      relatedContainer.innerHTML = `<h2>Related Products</h2>`;
      relatedContainer.appendChild(gridContainer);
    }
  } catch (error) {
    console.error("Could not load related products:", error);
    relatedContainer.style.display = 'none';
  }
}
async function main() {
  const detailsContainer = document.getElementById("product-details");
  // If we're not on the product page, don't run the main product-loading logic.
  if (!detailsContainer) return;

  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");
  if (!productId) {
    detailsContainer.innerHTML = "<p>No product ID specified.</p>";
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/products/${productId}`);
    if (!res.ok) {
      // Handle HTTP errors like 404 or 500
      throw new Error(`Server responded with status: ${res.status}`);
    }
    const product = await res.json();

    if (product.error) {
      throw new Error(product.error);
    } else {
      renderProduct(product);
      loadRelatedProducts(product);
    }
  } catch (err) {
    console.error(err);
    detailsContainer.innerHTML = `<p class="error">Error loading product. Please check your connection or try again later.</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  main();
});
