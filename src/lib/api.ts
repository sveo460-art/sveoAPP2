export const apiFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  let config: any = init ? { ...init } : {};
  let isAuthEndpoint = false;
  if (typeof input === 'string' && input.startsWith('/api/')) {
    if (input.includes('/api/auth/')) {
      isAuthEndpoint = true;
    }
    if (!config.headers) {
      config.headers = {};
    }
    const token = localStorage.getItem('tg_web_chat_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    config.credentials = 'include';
  }
  const response = await fetch(input, config);
  if (!response.ok) {
    if (!isAuthEndpoint && (response.status === 401 || response.status === 403)) {
      localStorage.removeItem('tg_web_chat_token');
      localStorage.removeItem('tg_web_chat_user');
      window.location.reload();
      throw new Error(`API Auth Error: ${response.status}`);
    }
    if (!isAuthEndpoint) {
       throw new Error(`API Error: ${response.status}`);
    }
  }
  return response;
};
