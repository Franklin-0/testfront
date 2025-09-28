// config.js

// Detect environment automatically
const isLocalhost = window.location.hostname.includes("localhost");

// Backend API base
const API_BASE_URL = isLocalhost
  ? "http://localhost:3000" // match the port where your backend runs locally
  : "https://test2-production-41f3.up.railway.app";

// Frontend base (mostly useful for OAuth / CORS redirects)
const FRONTEND_URL = isLocalhost
  ? "http://localhost:3000" // your dev frontend
  : "https://testfront2.onrender.com";

export { API_BASE_URL, FRONTEND_URL };
