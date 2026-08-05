export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem('propos_admin_token');
  const headers = new Headers(init?.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    // If request to admin API failed with 401 Unauthorized
    localStorage.removeItem('propos_admin_token');
    localStorage.removeItem('propos_admin_user');
    window.dispatchEvent(new Event('auth_unauthorized'));
  }

  return response;
}
