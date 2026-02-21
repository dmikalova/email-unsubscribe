// CSRF-aware fetch helper

function getCsrfToken(): string | null {
  const match = document.cookie.match(/csrf=([^;]+)/);
  return match ? match[1] : null;
}

export function fetchWithCsrf(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const csrfToken = getCsrfToken();
  const headers = new Headers(options.headers);

  if (csrfToken && options.method && options.method !== "GET") {
    headers.set("X-CSRF-Token", csrfToken);
  }

  return fetch(url, { ...options, headers });
}
