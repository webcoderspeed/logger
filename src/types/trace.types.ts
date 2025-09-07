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