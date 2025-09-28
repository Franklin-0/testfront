0,0 @@
/**
 * Displays a styled notification on the screen.
 * @param {string} message The message to display.
 * @param {string} [type='success'] The type of notification ('success', 'error', etc.).
 */
export function showNotification(message, type = 'success') {
  const container = document.getElementById('notification-container');
  if (!container) {
    console.error('Notification container not found!');
    return; 
  }

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  container.appendChild(notification);

  // Add 'show' class after a short delay to trigger the CSS transition
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  // Set a timeout to remove the notification
  setTimeout(() => {
    notification.classList.remove('show');
    // Remove the element from the DOM after the transition is complete
    notification.addEventListener('transitionend', () => notification.remove());
  }, 3000);
}