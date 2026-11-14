import axios from 'axios';

// Бэкенд отдаёт API под /api/v1 (см. backend/internal/server/server.go).
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});
