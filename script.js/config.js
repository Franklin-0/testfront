// config.js

// Detect environment automatically
const isLocalhost = window.location.hostname.includes("localhost");

// Backend API base
const API_BASE_URL = isLocalhost
  ? "http://localhost:1000" // your backend port
  : "https://test2-production-41f3.up.railway.app";

// Frontend base (mostly useful for OAuth / CORS redirects)
const FRONTEND_URL = isLocalhost
  ? "http://localhost:5501" // your frontend port
  : "https://testfront2.onrender.com";

export { API_BASE_URL, FRONTEND_URL };
