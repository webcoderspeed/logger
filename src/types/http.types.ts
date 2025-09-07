/**
 * HTTP-related type definitions
 */

// Base request interface for type compatibility
export interface RequestLike {
  headers?: Record<string, string | string[]>;
  query?: Record<string, any>;
  body?: Record<string, any>;
  params?: Record<string, any>;
}

// Extended HTTP request interface
export interface HttpRequest extends RequestLike {
  method: string;
  url: string;
  ip?: string;
  userAgent?: string;
}

// HTTP response interface
export interface HttpResponse {
  statusCode: number;
  headers?: Record<string, string | string[]>;
  body?: any;
  size?: number;
}