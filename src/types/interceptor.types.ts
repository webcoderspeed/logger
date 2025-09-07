/**
 * Interceptor configuration type definitions
 */

// Trace ID extractor configuration
export interface TraceIdExtractorConfig {
  header?: string | string[];
  query?: string | string[];
  body?: string | string[];
  params?: string | string[];
}

// HTTP interceptor configuration
export interface InterceptorConfig {
  includeHeaders?: string[];
  excludePaths?: string[];
  traceIdExtractor?: TraceIdExtractorConfig;
  logRequest?: boolean;
  logResponse?: boolean;
  logErrors?: boolean;
  requestTimeout?: number;
  sensitiveHeaders?: string[];
  maxBodySize?: number;
  logRequestBody?: boolean;
}

// Default interceptor configuration
export const DEFAULT_INTERCEPTOR_CONFIG: InterceptorConfig = {
  includeHeaders: ['content-type', 'user-agent', 'authorization'],
  excludePaths: ['/health', '/metrics', '/favicon.ico'],
  logRequest: true,
  logResponse: true,
  logErrors: true,
  requestTimeout: 30000, // 30 seconds
  sensitiveHeaders: ['authorization', 'cookie', 'x-api-key', 'x-auth-token'],
  maxBodySize: 1024 * 10, // 10KB
  logRequestBody: false,
};