export * from './http-interceptor';
// Re-export types for backward compatibility
export type { 
  HttpRequest, 
  HttpResponse, 
  RequestLike 
} from '../types/http.types';
export type { 
  InterceptorConfig, 
  TraceIdExtractorConfig,
  DEFAULT_INTERCEPTOR_CONFIG 
} from '../types/interceptor.types';
export type { RequestContext } from '../types/trace.types';

// Re-export commonly used classes and functions
export {
  HttpInterceptor,
  createHttpInterceptor,
} from './http-interceptor';

// Note: HttpRequest, HttpResponse, RequestContext are TypeScript interfaces
// and are automatically available through the wildcard export above