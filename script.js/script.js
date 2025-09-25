document.addEventListener('DOMContentLoaded', () => {
  // =================================================================
  // --- Constants & Local Storage Helpers ---
  // =================================================================
  const CART_STORAGE_KEY = 'fashion_cart_v1';

  const getLocalCart = () => {
    try {
      const data = localStorage.getItem(CART_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Error reading cart from localStorage:", e);
      return [];
    }
  };

  const saveLocalCart = (cart) => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error("Error saving cart to localStorage:", e);
    }
  };

  const clearLocalCart = () => localStorage.removeItem(CART_STORAGE_KEY);

  // =================================================================
  // --- DOM Elements ---
  // =================================================================
  const hamburger = document.querySelector(".hamburger");
  const sideMenu = document.getElementById("side-menu");
  const closeBtn = document.getElementById("close-btn");
  const loginIcon = document.getElementById("login-icon");
  const logoutContainer = document.getElementById("logout-container");
  const logoutIcon = document.getElementById("logout-icon");
  const cartIcon = document.getElementById("cart-icon");
  const favouritesIcon = document.getElementById("favourites-icon");

  // =================================================================
  // --- Side Menu ---
  // =================================================================
  if (hamburger && sideMenu && closeBtn) {
    hamburger.addEventListener("click", () => sideMenu.classList.add("open"));
    closeBtn.addEventListener("click", () => sideMenu.classList.remove("open"));
    document.querySelectorAll('.side-menu ul li a').forEach(link => {
      link.addEventListener('click', () => sideMenu.classList.remove('open'));
    });
  }

  // =================================================================
  // --- Login & Logout ---
  // =================================================================
  if (loginIcon) loginIcon.addEventListener("click", () => window.location.href = "login.html");
  if (logoutIcon) logoutIcon.addEventListener("click", async () => {
    try {
      await fetch(`${API_BASE_URL}/api/logout`, { method: "POST", credentials: "include" });
      window.location.href = "index.html";
    } catch (e) {
      console.error("Logout failed:", e);
      showNotification("Logout failed. Please try again.", "error");
    }
  });

  // =================================================================
  // --- Cart & Favourites ---
  // =================================================================
  if (cartIcon) cartIcon.addEventListener("click", () => window.location.href = "cart.html");
  if (favouritesIcon) favouritesIcon.addEventListener("click", () => window.location.href = "favourites.html");

  // =================================================================
  // --- Notifications ---
  // =================================================================
  const showNotification = (msg, type = 'success') => {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const notification = document.createElement('div');
    notification.className = `notification ${type} show`;
    notification.textContent = msg;
    container.appendChild(notification);
    setTimeout(() => {
      notification.classList.remove('show');
      notification.addEventListener('transitionend', () => notification.remove());
    }, 3000);
  };

  // =================================================================
  // --- Cart Count ---
  // =================================================================
  const updateCartCount = () => {
    const badge = document.getElementById("cart-count");
    if (!badge) return;
    const cart = getLocalCart();
    const total = cart.reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = total > 0 ? total : "";
    badge.style.display = total > 0 ? "block" : "none";
  };

  // =================================================================
  // --- Slideshow ---
  // =================================================================
  const slides = document.querySelectorAll(".slide");
  const prevBtn = document.querySelector(".prev");
  const nextBtn = document.querySelector(".next");
  let slideIndex = 0;
  let autoSlide;

  const showActiveSlide = () => {
    slides.forEach(s => { s.classList.remove("active"); s.style.opacity = 0; s.style.zIndex = 0; });
    if (slides[slideIndex]) { slides[slideIndex].classList.add("active"); slides[slideIndex].style.opacity = 1; slides[slideIndex].style.zIndex = 1; }
  };
  const nextSlideFunc = () => { slideIndex = (slideIndex + 1) % slides.length; showActiveSlide(); };
  const prevSlideFunc = () => { slideIndex = (slideIndex - 1 + slides.length) % slides.length; showActiveSlide(); };
  const startAutoSlide = () => { autoSlide = setInterval(nextSlideFunc, 4000); };
  const resetAutoSlide = () => { clearInterval(autoSlide); startAutoSlide(); };

  const initializeSlideshow = () => {
    if (window.innerWidth <= 768) { slides.forEach(s => { s.style.display = 'block'; s.style.opacity = 1; }); return; }
    if (nextBtn) nextBtn.addEventListener("click", () => { nextSlideFunc(); resetAutoSlide(); });
    if (prevBtn) prevBtn.addEventListener("click", () => { prevSlideFunc(); resetAutoSlide(); });
    showActiveSlide();
    startAutoSlide();
  };
  initializeSlideshow();

  // =================================================================
  // --- Product Filtering ---
  // =================================================================
  const filterProducts = (categoryId, selectId) => {
    const container = document.getElementById(categoryId);
    const select = document.getElementById(selectId);
    if (!container || !select) return;
    const products = container.getElementsByClassName('product');
    select.addEventListener('change', () => {
      const size = select.value;
      for (let p of products) {
        const details = p.querySelector('.details');
        if (!details) continue;
        const range = details.textContent.replace('–','-').match(/\d+/g)?.map(Number);
        if (!range) continue;
        p.style.display = (size === 'all' || (Number(size) >= range[0] && Number(size) <= range[1])) ? 'block' : 'none';
      }
    });
  };
  filterProducts('boys-products','boys-size');
  filterProducts('girls-products','girls-size');

  // =================================================================
  // --- "Add to Cart" buttons ---
  // =================================================================
  document.querySelectorAll(".add-to-cart").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      showNotification('Please select a size on the product page.', 'error');
      setTimeout(() => { window.location.href = `product.html?id=${id}`; }, 1500);
    });
  });

  // =================================================================
  // --- Authentication UI ---
  // =================================================================
  const checkAndUpdateAuthUI = async () => {
    let isLoggedIn = false, user = null;
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/status`, { method: 'GET', credentials: 'include' });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const auth = await res.json();
      isLoggedIn = auth.isLoggedIn;
      user = auth.user;
      if (loginIcon && logoutContainer) {
        loginIcon.parentElement.style.display = isLoggedIn ? 'none' : 'flex';
        logoutContainer.style.display = isLoggedIn ? 'flex' : 'none';
      }
    } catch(e) {
      console.error("Auth fetch failed", e);
      if (loginIcon && logoutContainer) { loginIcon.parentElement.style.display = 'flex'; logoutContainer.style.display = 'none'; }
    }
    return { isLoggedIn, user };
  };

  (async () => {
    const { isLoggedIn, user } = await checkAndUpdateAuthUI();
    if (isLoggedIn) updateCartCount();
    const params = new URLSearchParams(window.location.search);
    if (params.has('login_success') && isLoggedIn) {
      showNotification(user?.name ? `Welcome back, ${user.name}!` : "Welcome back!");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  })();
});
