import { Logger } from '../core/logger';
import { TraceIdExtractor } from '../trace/trace-extractor';
import { traceContext } from '../trace/trace-context';
import type { Request, Response } from 'express';
import { 
  HttpRequest, 
  HttpResponse, 
  RequestLike 
} from '../types/http.types';
import { 
  InterceptorConfig, 
  TraceIdExtractorConfig,
  DEFAULT_INTERCEPTOR_CONFIG 
} from '../types/interceptor.types';
import { RequestContext } from '../types/trace.types';

declare module 'express-serve-static-core' {
  interface Request {
    logContext?: RequestContext;
  }
}



export class HttpInterceptor {
  private logger: Logger;
  private config: InterceptorConfig;
  private traceExtractor: TraceIdExtractor;

  constructor(logger: Logger, config: Partial<InterceptorConfig> = {}) {
    this.logger = logger;
    this.config = { ...DEFAULT_INTERCEPTOR_CONFIG, ...config };
    this.traceExtractor = new TraceIdExtractor(config.traceIdExtractor);
  }

  /**
   * Intercept incoming HTTP request
   */
  public async interceptRequest(request: HttpRequest): Promise<RequestContext> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    
    // Extract trace ID from request
    const traceId = this.traceExtractor.extractFromRequest(request);
    
    const context: RequestContext = {
      requestId,
      traceId,
      startTime,
      request: this.sanitizeRequest(request),
    };

    // Set trace ID in context if available
    if (traceId) {
      await traceContext.runWithTraceId(traceId, async () => {
        if (this.shouldLogRequest(request) && this.config.logRequest) {
          await this.logRequest(context);
        }
      });
    } else {
      if (this.shouldLogRequest(request) && this.config.logRequest) {
        await this.logRequest(context);
      }
    }

    return context;
  }

  /**
   * Intercept outgoing HTTP response
   */
  public async interceptResponse(
    context: RequestContext,
    response: HttpResponse
  ): Promise<void> {
    const endTime = Date.now();
    const duration = endTime - context.startTime;
    
    context.endTime = endTime;
    context.duration = duration;
    context.response = this.sanitizeResponse(response);

    const logWithTrace = async () => {
      if (this.config.logResponse) {
        await this.logResponse(context);
      }

      // Log slow requests
      if (this.config.requestTimeout && duration > this.config.requestTimeout) {
        await this.logSlowRequest(context);
      }
    };

    if (context.traceId) {
      await traceContext.runWithTraceId(context.traceId, logWithTrace);
    } else {
      await logWithTrace();
    }
  }

  /**
   * Intercept HTTP errors
   */
  public async interceptError(
    context: RequestContext,
    error: Error
  ): Promise<void> {
    const endTime = Date.now();
    const duration = endTime - context.startTime;
    
    context.endTime = endTime;
    context.duration = duration;
    context.error = error;

    const logWithTrace = async () => {
      if (this.config.logErrors) {
        await this.logError(context);
      }
    };

    if (context.traceId) {
      await traceContext.runWithTraceId(context.traceId, logWithTrace);
    } else {
      await logWithTrace();
    }
  }

  /**
   * Create Express.js middleware
   */
  public createExpressMiddleware() {
    return async (req: Request, res: Response, next: (err?: Error) => void) => {
      const request: HttpRequest = {
        method: req.method,
        url: req.url || '',
        headers: req.headers as Record<string, string | string[]>,
        query: req.query,
        body: req.body,
        params: req.params,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent') || '',
      };

      try {
        const context = await this.interceptRequest(request);
        
        // Store context in request for later use
        req.logContext = context;

        // Intercept response
        const originalSend = res.send;
        const self = this;
        res.send = function(body: unknown) {
          const response: HttpResponse = {
            statusCode: res.statusCode,
            headers: res.getHeaders() as Record<string, string | string[]>,
            body,
            size: Buffer.isBuffer(body) ? body.length : JSON.stringify(body).length,
          };

          setImmediate(async () => {
            try {
              await self.interceptResponse(context, response);
            } catch (error) {
              console.error('Failed to log response:', error);
            }
          });

          return originalSend.call(this, body);
        };

        next();
      } catch (error) {
        console.error('Failed to intercept request:', error);
        next();
      }
    };
  }

  /**
   * Create NestJS interceptor
   */
  public createNestJSInterceptor() {
    const self = this;
    
    return class LoggingInterceptor {
      async intercept(context: any, next: any) {
        const httpContext = context.switchToHttp();
        const request = httpContext.getRequest();
        const response = httpContext.getResponse();

        const httpRequest: HttpRequest = {
          method: request.method,
          url: request.url,
          headers: request.headers as Record<string, string | string[]>,
          query: request.query,
          body: request.body,
          params: request.params,
          ip: request.ip,
          userAgent: request.get ? request.get('User-Agent') || '' : '',
        };

        try {
          const requestContext = await self.interceptRequest(httpRequest);
          
          return next.handle().pipe(
            // You would need to import from rxjs
            // tap(() => {
            //   const httpResponse: HttpResponse = {
            //     statusCode: response.statusCode,
            //     headers: response.getHeaders(),
            //   };
            //   self.interceptResponse(requestContext, httpResponse);
            // }),
            // catchError((error) => {
            //   self.interceptError(requestContext, error);
            //   throw error;
            // })
          );
        } catch (error) {
          console.error('Failed to intercept request:', error);
          return next.handle();
        }
      }
    };
  }

  /**
   * Check if request should be logged
   */
  private shouldLogRequest(request: HttpRequest): boolean {
    if (this.config.excludePaths) {
      return !this.config.excludePaths.some(path => 
        request.url.startsWith(path)
      );
    }
    return true;
  }

  /**
   * Sanitize request data for logging
   */
  private sanitizeRequest(request: HttpRequest): HttpRequest {
    const sanitized = { ...request };
    
    // Filter headers
    if (this.config.includeHeaders) {
      const filteredHeaders: Record<string, string | string[]> = {};
      for (const header of this.config.includeHeaders) {
        if (request.headers && request.headers[header]) {
          filteredHeaders[header] = this.sanitizeHeader(header, request.headers?.[header] as string | string[] || '');
        }
      }
      sanitized.headers = filteredHeaders;
    }

    // Remove body if not configured to log it
    if (!this.config.logRequestBody) {
      sanitized.body = undefined;
    } else if (sanitized.body && this.config.maxBodySize) {
      // Limit body size
      const bodyStr = JSON.stringify(sanitized.body);
      if (bodyStr.length > this.config.maxBodySize) {
        sanitized.body = {
          _truncated: true,
          _originalSize: bodyStr.length,
          _maxSize: this.config.maxBodySize,
          data: bodyStr.substring(0, this.config.maxBodySize),
        };
      }
    }

    return sanitized;
  }

  /**
   * Sanitize response data for logging
   */
  private sanitizeResponse(response: HttpResponse): HttpResponse {
    const sanitized = { ...response };
    
    // Limit body size
    if (sanitized.body && this.config.maxBodySize) {
      const bodyStr = JSON.stringify(sanitized.body);
      if (bodyStr.length > this.config.maxBodySize) {
        sanitized.body = {
          _truncated: true,
          _originalSize: bodyStr.length,
          _maxSize: this.config.maxBodySize,
          data: bodyStr.substring(0, this.config.maxBodySize),
        };
      }
    }

    return sanitized;
  }

  /**
   * Sanitize header value
   */
  private sanitizeHeader(name: string, value: string | string[]): string | string[] {
    if (this.config.sensitiveHeaders?.includes(name.toLowerCase())) {
      return Array.isArray(value) ? value.map(() => '[REDACTED]') : '[REDACTED]';
    }
    return value;
  }

  /**
   * Sanitize headers object
   */
  private sanitizeHeaders(headers?: Record<string, string | string[]>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    if (!headers) {
      return sanitized;
    }
    
    for (const [key, value] of Object.entries(headers)) {
      if (this.config.sensitiveHeaders?.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = Array.isArray(value) ? value.join(', ') : value;
      }
    }
    
    return sanitized;
  }

  /**
   * Log incoming request
   */
  private async logRequest(context: RequestContext): Promise<void> {
    await this.logger.info('HTTP Request', {
      requestId: context.requestId,
      method: context.request.method,
      url: context.request.url,
      headers: context.request.headers || {},
      query: context.request.query || {},
      body: context.request.body,
      ip: context.request.ip || 'Unknown',
      userAgent: context.request.userAgent || 'Unknown',
    });
  }

  /**
   * Log outgoing response
   */
  private async logResponse(context: RequestContext): Promise<void> {
    await this.logger.info('HTTP Response', {
      requestId: context.requestId,
      method: context.request.method,
      url: context.request.url,
      statusCode: context.response?.statusCode,
      duration: context.duration,
      responseSize: context.response?.size,
    });
  }

  /**
   * Log HTTP errors
   */
  private async logError(context: RequestContext): Promise<void> {
    if (context.error) {
      await this.logger.error(context.error, {
        requestId: context.requestId,
        method: context.request.method,
        url: context.request.url,
        duration: context.duration,
      });
    } else {
      await this.logger.error('HTTP Error', {
        requestId: context.requestId,
        method: context.request.method,
        url: context.request.url,
        duration: context.duration,
      });
    }
  }

  /**
   * Log slow requests
   */
  private async logSlowRequest(context: RequestContext): Promise<void> {
    await this.logger.warn('Slow HTTP Request', {
      requestId: context.requestId,
      method: context.request.method,
      url: context.request.url,
      duration: context.duration,
      threshold: this.config.requestTimeout,
    });
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Factory function to create HTTP interceptor
 */
export function createHttpInterceptor(
  logger: Logger,
  config?: Partial<InterceptorConfig>
): HttpInterceptor {
  return new HttpInterceptor(logger, config);
}