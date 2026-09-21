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
};

export function createApiClient(
  getToken: () => Promise<string | null>,
): ApiClient {
  return {
    async get<T>(path: string) {
      const token = await getToken();
      const response = await fetch(path, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        let message = "No se pudo completar la petición.";
        try {
          const body = (await response.json()) as { message?: string };
          message = body.message ?? message;
        } catch {
          // Keep the user-facing fallback when the server does not return JSON.
        }
        throw new ApiError(message, response.status);
      }

      return (await response.json()) as T;
    },
  };
}
