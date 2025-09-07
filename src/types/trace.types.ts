/**
 * Trace-related type definitions
 */

import { HttpRequest, HttpResponse } from './http.types';

// Request context interface for tracking request lifecycle
export interface RequestContext {
  requestId: string;
  traceId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  request: HttpRequest;
  response?: HttpResponse;
  error?: Error;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
}

export interface TraceIdExtractorConfig {
  header?: string | string[];
  query?: string | string[];
  body?: string | string[];
  params?: string | string[];
}

export interface TraceIdConfig {
  enabled: boolean;
  generator?: () => string;
  header?: string;
  contextKey?: string;
}
