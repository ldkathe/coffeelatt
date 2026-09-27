const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function request(path, { method = 'GET', session, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API ${path} respondió ${response.status}`);
  }

  return response.json();
}

export function fetchShopItems() {
  return request('/shop/items');
}

export function fetchPlayerState(session) {
  return request('/player/me', { session });
}

export function savePlayerState(session, state) {
  return request('/player/state', { method: 'PUT', session, body: state });
}
