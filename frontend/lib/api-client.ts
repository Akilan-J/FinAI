const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function handleRefresh(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Refresh failed");
      }

      const json = await response.json();
      const token = json.data?.access_token || null;
      accessToken = token;
      return token;
    } catch (err) {
      accessToken = null;
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

interface FetchOptions extends RequestInit {
  json?: any;
}

export async function fetchApi(path: string, options: FetchOptions = {}): Promise<any> {
  const url = `${BASE_URL}${path}`;

  const headers = new Headers(options.headers || {});

  if (options.json) {
    headers.set("Content-Type", "application/json");
    options.body = JSON.stringify(options.json);
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  try {
    const response = await fetch(url, { ...options, headers });

    if (
      response.status === 401 &&
      !path.includes("/auth/login") &&
      !path.includes("/auth/register") &&
      !path.includes("/auth/refresh")
    ) {
      const newAccessToken = await handleRefresh();
      if (newAccessToken) {
        headers.set("Authorization", `Bearer ${newAccessToken}`);
        const retryResponse = await fetch(url, { ...options, headers });
        if (!retryResponse.ok) {
          const errorJson = await retryResponse.json().catch(() => ({}));
          throw new Error(errorJson?.error?.message || "Request failed");
        }
        return retryResponse.json();
      } else {
        throw new Error("Unauthorized");
      }
    }

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson?.error?.message || "Request failed");
    }

    return response.json();
  } catch (err: any) {
    throw new Error(err.message || "Network request failed");
  }
}
