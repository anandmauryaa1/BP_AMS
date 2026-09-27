export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface ApiFetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<{ success: boolean; data?: T; error?: string; message?: string }> {
  const { params, headers, ...customConfig } = options;

  let url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    method: 'GET',
    credentials: 'include', // Ensure cookies are attached for http://localhost:5000 CORS
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    ...customConfig,
  };

  try {
    const response = await fetch(url, config);
    let data: any = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    } else {
      try {
        const text = await response.text();
        if (text) {
          data = { message: text.length > 200 ? text.slice(0, 200) + '...' : text };
        }
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      const fallbackMsg =
        response.status === 500 || response.status === 502 || response.status === 503
          ? 'Backend service is unavailable. Please ensure the backend server is running on port 5000.'
          : `HTTP error ${response.status}: ${response.statusText || 'Request failed'}`;
      return {
        success: false,
        error: data?.error || data?.message || fallbackMsg,
        message: data?.message,
      };
    }

    return data || { success: true };
  } catch (err: any) {
    console.error(`[API Client] Fetch failed for ${url}:`, err);
    return {
      success: false,
      error: err?.message || 'Network communication error',
    };
  }
}
