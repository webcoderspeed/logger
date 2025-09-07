/** @format */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LogitronTraceMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    try {
      const { traceContext } = require('../trace/trace-context');
      const { TraceExtractor } = require('../trace/trace-extractor');
      
      const extractor = new TraceExtractor();
      const traceId = extractor.extractTraceId({
        headers: req.headers as Record<string, string | string[]>,
        query: req.query as Record<string, any>,
        body: req.body
      });
      
      traceContext.runWithTraceId(traceId, () => {
        next();
      });
    } catch (error) {
      console.error('Failed to set up trace context:', error);
      next();
    }
  }
}