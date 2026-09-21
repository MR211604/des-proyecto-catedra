export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type ApiClient = {
  get: <T>(path: string) => Promise<T>;
  post: <T>(path: string, body: unknown) => Promise<T>;
  put: <T>(path: string, body: unknown) => Promise<T>;
  patch: <T>(path: string, body?: unknown) => Promise<T>;
};

export function createApiClient(
  getToken: () => Promise<string | null>,
): ApiClient {
  return {
    async get<T>(path: string) {
      return request<T>(getToken, path, "GET");
    },
    async post<T>(path: string, body: unknown) {
      return request<T>(getToken, path, "POST", body);
    },
    async put<T>(path: string, body: unknown) {
      return request<T>(getToken, path, "PUT", body);
    },
    async patch<T>(path: string, body?: unknown) {
      return request<T>(getToken, path, "PATCH", body);
    },
  };
}

async function request<T>(
  getToken: () => Promise<string | null>,
  path: string,
  method: "GET" | "PATCH" | "POST" | "PUT",
  body?: unknown,
) {
  const token = await getToken();
  const response = await fetch(path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    let message = "No se pudo completar la petición.";
    try {
      const responseBody = (await response.json()) as {
        error?: string;
        message?: string;
      };
      message = responseBody.error ?? responseBody.message ?? message;
    } catch {
      // Keep the user-facing fallback when the server does not return JSON.
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}
