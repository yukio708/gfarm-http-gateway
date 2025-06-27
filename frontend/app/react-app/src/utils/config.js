export const API_URL = import.meta.env.VITE_API_BASE_URL;
export const FETCH_INTERVAL = parseInt(import.meta.VITE_API_CHACE_AGE) || 60000;
export const PARALLEL_LIMIT = parseInt(import.meta.VITE_API_PARALLEL_LIMIT) || 3;
