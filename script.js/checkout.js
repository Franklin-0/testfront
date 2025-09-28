document.addEventListener('DOMContentLoaded', () => {
  const summaryItemsContainer = document.getElementById('summary-items-container');
  const summaryTotalContainer = document.getElementById('summary-total');
  const placeOrderBtn = document.getElementById('place-order-btn');
  const shippingForm = document.getElementById('shipping-form');
  const loaderText = document.getElementById('loader-text');

  // Helper to format currency
  const currencyFormatter = new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
  });

  function displayOrderSummary(cart) {
    if (cart.length === 0) {
      summaryItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
      summaryTotalContainer.innerHTML = '';
      placeOrderBtn.disabled = true;
      return;
    }

    // Build the HTML for cart items
    const itemsHtml = cart.map(item => `
      <div class="summary-item">
        <span>${item.name} - Size: ${item.size || 'N/A'} (x${item.quantity})</span>
        <strong>${currencyFormatter.format(item.price * item.quantity)}</strong>
      </div>
    `).join('');
    summaryItemsContainer.innerHTML = itemsHtml;

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = 500; // Fixed shipping cost
    const total = subtotal + shipping;

    // Build the HTML for the totals section
    const totalsHtml = `
      <div class="summary-item summary-total">
        <span>Subtotal</span>
        <strong>${currencyFormatter.format(subtotal)}</strong>
      </div>
      <div class="summary-item">
        <span>Shipping</span>
        <strong>${currencyFormatter.format(shipping)}</strong>
      </div>
      <div class="summary-item summary-total">
        <span>Total</span>
        <strong>${currencyFormatter.format(total)}</strong>
      </div>
    `;
    summaryTotalContainer.innerHTML = totalsHtml;
  }

  // Fetches the latest cart data from the server.
  async function fetchCart() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/cart`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`Failed to fetch cart: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch cart:", error);
      summaryItemsContainer.innerHTML = '<p class="error">Could not load your cart summary.</p>';
      placeOrderBtn.disabled = true;
      return []; // Return empty cart on error
    }
  }

  // Fetch cart from server to display summary on page load
  async function initializeCheckout() {
    const cart = await fetchCart();
    displayOrderSummary(cart);
  }

  // --- Main Payment Logic ---
  async function handleMpesaPayment(event) {
    event.preventDefault();

    if (!shippingForm.checkValidity()) {
      shippingForm.reportValidity(); // Trigger browser's native validation UI
      return; // Stop if shipping details are not valid
    }

    const phone = document.getElementById('mpesa-phone').value;
    if (!phone || !/^(07|2547)\d{8}$/.test(phone.trim().replace(/\s+/g, ''))) {
      alert('Please enter a valid M-Pesa phone number, e.g., 0712345678 or 254712345678.');
      return;
    }

    placeOrderBtn.disabled = true;
    loaderText.style.display = 'block';
    loaderText.textContent = 'Processing payment...';
    loaderText.style.color = '#555';

    // --- FIX: Fetch the LATEST cart state right before payment ---
    const cart = await fetchCart();
    if (!cart || cart.length === 0) {
      loaderText.textContent = 'Your cart is empty. Please add items before placing an order.';
      loaderText.style.color = 'red';
      placeOrderBtn.disabled = true; // Disable button as there's nothing to order
      return;
    }

    // --- FIX: Calculate the final total amount to be sent to the backend ---
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = 500; // This must match the shipping cost displayed to the user
    const totalAmount = subtotal + shipping;

    try {
      const response = await fetch(`${API_BASE_URL}/api/mpesa/stk-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phone,
          cart,
          shippingDetails: {
            name: document.getElementById('name').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            postalCode: document.getElementById('postal-code').value,
            phone: document.getElementById('phone').value,
          },
          amount: totalAmount // Send the correct total amount
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // The backend successfully told Safaricom to send the prompt.
        loaderText.textContent = result.CustomerMessage || 'STK Push sent! Check your phone to complete the payment.';
        loaderText.style.color = 'green';
        // should not re-enable the button immediately to prevent duplicate requests.
        // The user should complete the transaction or refresh if needed.
      } else {
        // Use the detailed error from the backend if available
        const errorMsg = result.details || result.error || 'Failed to initiate M-Pesa payment.';
        throw new Error(errorMsg);
      }
    } catch (err) {
      loaderText.textContent = err.message;
      loaderText.style.color = 'red';
      placeOrderBtn.disabled = false;
    }
  }

  // Initialize the page and set up the event listener
  function setupPage() {
    initializeCheckout(); // Display the summary on page load
    placeOrderBtn.addEventListener('click', handleMpesaPayment);
  }

  setupPage();
}); //end