/**
 * API Client - Unified fetch wrapper with error handling
 * Provides consistent request/response format across the app
 */

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

/**
 * Build URL with query parameters
 */
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
  const url = new URL(endpoint, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }

  return url.toString();
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi<T = unknown>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;

  const url = buildUrl(`${API_BASE}${endpoint}`, params);

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...fetchOptions,
    headers: {
      ...defaultHeaders,
      ...fetchOptions.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      if (!response.ok) {
        throw new ApiError(
          'HTTP_ERROR',
          `HTTP ${response.status}: ${response.statusText}`
        );
      }
      return {} as T;
    }

    const data: ApiResponse<T> = await response.json();

    // Handle API error responses
    if (!data || typeof data !== 'object') {
      throw new ApiError(
        'INVALID_RESPONSE',
        'Invalid response format from server'
      );
    }

    if (!data.success) {
      // Ensure error object exists with proper structure
      const errorCode = data.error?.code || 'UNKNOWN_ERROR';
      const errorMessage = data.error?.message || 'An unknown error occurred';
      const errorDetails = data.error?.details;

      throw new ApiError(errorCode, errorMessage, errorDetails);
    }

    return data.data;
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError) {
      throw new ApiError('NETWORK_ERROR', 'Network request failed. Please check your connection.');
    }

    // Handle unknown errors
    throw new ApiError(
      'UNKNOWN_ERROR',
      error instanceof Error ? error.message : 'An unknown error occurred'
    );
  }
}

/**
 * API client methods
 */
export const api = {
  /**
   * GET request
   */
  get: <T = unknown>(endpoint: string, params?: Record<string, string | number | boolean>) =>
    fetchApi<T>(endpoint, { method: 'GET', params }),

  /**
   * POST request
   */
  post: <T = unknown>(endpoint: string, body?: unknown) =>
    fetchApi<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  /**
   * PUT request
   */
  put: <T = unknown>(endpoint: string, body?: unknown) =>
    fetchApi<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  /**
   * PATCH request
   */
  patch: <T = unknown>(endpoint: string, body?: unknown) =>
    fetchApi<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  /**
   * DELETE request
   */
  delete: <T = unknown>(endpoint: string) =>
    fetchApi<T>(endpoint, { method: 'DELETE' }),
};
