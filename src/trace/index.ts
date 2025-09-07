export * from './trace-extractor';
export * from './trace-context';
// Re-export types for backward compatibility
export type { RequestLike } from '../types/http.types';
export type { RequestContext } from '../types/trace.types';

// Re-export commonly used functions
export {
  getCurrentTraceId,
  generateTraceId,
  runWithTraceId,
  runWithNewTraceId,
  runWithTraceIdAsync,
  runWithNewTraceIdAsync,
  traceContext,
} from './trace-context';

export {
  extractTraceId,
  defaultTraceExtractor,
  TraceIdExtractor,
} from './trace-extractor';