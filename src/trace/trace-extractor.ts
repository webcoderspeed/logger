import { Request } from 'express';
import { RequestLike } from '../types/http.types';
import { TraceIdExtractorConfig } from 'src/types';

// TraceID extractor class
export class TraceIdExtractor {
  private config: TraceIdExtractorConfig;

  constructor(config: TraceIdExtractorConfig = {}) {
    this.config = {
      header: ['x-trace-id', 'x-request-id', 'x-correlation-id'],
      ...config,
    };
  }

  /**
   * Extract trace ID from HTTP request
   */
  public extractFromRequest(request: RequestLike): string | undefined {
    // Try to extract from headers first


    const headerTraceId = this.extractFromHeaders(request.headers);
    if (headerTraceId) {
      return headerTraceId;
    }

    // Try to extract from query parameters
    const queryTraceId = this.extractFromQuery(request.query);
    
    if (queryTraceId) {
      return queryTraceId;
    }

    // Try to extract from request body
    const bodyTraceId = this.extractFromBody(request.body);
    if (bodyTraceId) {
      return bodyTraceId;
    }

    // Try to extract from route parameters
    const paramsTraceId = this.extractFromParams(request.params);
    if (paramsTraceId) {
      return paramsTraceId;
    }

    return undefined;
  }

  /**
   * Extract trace ID from headers
   */
  private extractFromHeaders(headers?: Record<string, string | string[]>): string | undefined {
    if (!headers || !this.config.header) {
      return undefined;
    }

    const headerKeys = Array.isArray(this.config.header) ? this.config.header : [this.config.header];

    for (const key of headerKeys) {
      const value = this.getHeaderValue(headers, key);
      if (value) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * Extract trace ID from query parameters
   */
  private extractFromQuery(query?: Record<string, any>): string | undefined {
    if (!query || !this.config.query) {
      return undefined;
    }

    const queryKeys = Array.isArray(this.config.query) ? this.config.query : [this.config.query];

    for (const key of queryKeys) {
      const value = query[key];
      if (value && typeof value === 'string') {
        return value;
      }
    }

    return undefined;
  }

  /**
   * Extract trace ID from request body
   */
  private extractFromBody(body?: Record<string, any>): string | undefined {
    if (!body || !this.config.body) {
      return undefined;
    }

    const bodyKeys = Array.isArray(this.config.body) ? this.config.body : [this.config.body];

    for (const key of bodyKeys) {
      const value = this.getNestedValue(body, key);
      if (value && typeof value === 'string') {
        return value;
      }
    }

    return undefined;
  }

  /**
   * Extract trace ID from route parameters
   */
  private extractFromParams(params?: Record<string, any>): string | undefined {
    if (!params || !this.config.params) {
      return undefined;
    }

    const paramKeys = Array.isArray(this.config.params) ? this.config.params : [this.config.params];

    for (const key of paramKeys) {
      const value = params[key];
      if (value && typeof value === 'string') {
        return value;
      }
    }

    return undefined;
  }

  /**
   * Get header value (case-insensitive)
   */
  private getHeaderValue(headers: Record<string, string | string[]>, key: string): string | undefined {
    const lowerKey = key.toLowerCase();
    
    for (const [headerKey, headerValue] of Object.entries(headers)) {
      if (headerKey.toLowerCase() === lowerKey) {
        if (Array.isArray(headerValue)) {
          return headerValue[0];
        }
        return headerValue;
      }
    }

    return undefined;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Update extractor configuration
   */
  public updateConfig(config: Partial<TraceIdExtractorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): TraceIdExtractorConfig {
    return { ...this.config };
  }
}

// Default extractor instance
export const defaultTraceExtractor = new TraceIdExtractor();

// Utility function for quick extraction
export function extractTraceId(
  request: RequestLike,
  config?: TraceIdExtractorConfig
): string | undefined {
  if (config) {
    const extractor = new TraceIdExtractor(config);
    return extractor.extractFromRequest(request);
  }
  
  return defaultTraceExtractor.extractFromRequest(request);
}