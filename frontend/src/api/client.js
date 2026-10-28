// ============================================================================
// File: frontend/src/api/client.js
// Description: Unified Fetch API wrapper for authentication, train search,
// live seat maps, bookings, PNR status, and admin dashboards.
// ============================================================================

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

function getToken() {
  return localStorage.getItem('railway_token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || (data.errors && data.errors[0]?.msg) || 'API request failed';
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Authentication
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name, email, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  getCurrentUser: () => request('/auth/me'),

  // Stations & Search
  getStations: () => request('/stations'),

  searchTrains: (from, to, date, travelClass) => {
    const params = new URLSearchParams({
      from,
      to,
      date,
      ...(travelClass ? { class: travelClass } : {}),
    });
    return request(`/search?${params.toString()}`);
  },

  // Seat Availability & Visual Map
  getSeatMap: (scheduleId, travelClass) => {
    const query = travelClass ? `?class=${travelClass}` : '';
    return request(`/schedules/${scheduleId}/seats${query}`);
  },

  // Bookings
  createBooking: (bookingData) =>
    request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    }),

  getMyBookings: () => request('/bookings/my'),

  getPNRStatus: (pnr) => request(`/pnr/${pnr}`),

  cancelBooking: (pnr) =>
    request(`/bookings/${pnr}/cancel`, {
      method: 'POST',
    }),

  // Admin
  getAdminStats: () => request('/admin/stats'),

  createTrain: (trainData) =>
    request('/admin/trains', {
      method: 'POST',
      body: JSON.stringify(trainData),
    }),

  createStation: (stationData) =>
    request('/admin/stations', {
      method: 'POST',
      body: JSON.stringify(stationData),
    }),

  createSchedule: (scheduleData) =>
    request('/admin/schedules', {
      method: 'POST',
      body: JSON.stringify(scheduleData),
    }),
};
