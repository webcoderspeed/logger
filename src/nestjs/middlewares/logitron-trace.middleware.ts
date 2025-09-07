/** @format */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TraceIdConfig, TraceIdExtractorConfig } from '../../types';
import {traceContext, TraceIdExtractor} from '../../trace'


const trace_ids = ['x-trace-id', 'x-request-id', 'x-correlation-id', 'trace-id', 'request-id']

@Injectable()
export class LogitronTraceMiddleware implements NestMiddleware {
  private traceConfig?: TraceIdConfig;

  constructor(traceConfig?: TraceIdConfig) {
    this.traceConfig = traceConfig;
  }

  use(req: Request, res: Response, next: NextFunction) {
    try {
      // Use custom extractor config if provided, otherwise use defaults
      const extractorConfig: TraceIdExtractorConfig = this.traceConfig?.extractor || {
        header: trace_ids,
        query: trace_ids,
        body: trace_ids,
        params: trace_ids
      };
      
      const extractor = new TraceIdExtractor(extractorConfig);
      
      // Extract route parameters properly for NestJS
      const routeParams: Record<string, any> = {};
      if (req.params && typeof req.params === 'object') {
        // Handle NestJS route parameters
        if ('path' in req.params && Array.isArray(req.params.path)) {
          // Extract id from path array for routes like /param/:id
          const pathSegments = req.params.path;
          if (pathSegments.length >= 2 && pathSegments[0] === 'param') {
            routeParams.id = pathSegments[1];
          }
        } else {
          // Handle standard Express route parameters
          Object.assign(routeParams, req.params);
        }
      }
      
      const requestData = {
        headers: req.headers as Record<string, string | string[]>,
        query: req.query as Record<string, any>,
        body: req.body,
        params: routeParams
      };
      
      
      
      const traceId = extractor.extractFromRequest(requestData);
      
      if (traceId) {
        traceContext.runWithTraceId(traceId, () => {
          next();
        });
      } else {
        next();
      }
    } catch (error) {
      console.error('Failed to set up trace context:', error);
      next();
    }
  }
}