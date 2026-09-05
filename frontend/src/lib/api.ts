/**
 * API Client Configuration
 * In production on Vercel: Set VITE_API_BASE_URL to your Render backend URL
 * (e.g. https://your-backend.onrender.com)
 * In local development: Defaults to empty string, leveraging Vite's local dev proxy to localhost:8080
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export function apiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}
