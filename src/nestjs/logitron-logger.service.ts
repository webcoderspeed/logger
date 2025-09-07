import { Logger } from '../core/logger';
import { LoggerConfig, LogLevel } from '../types';
import { getCurrentTraceId } from '../trace/trace-context';
import { LoggerService } from '@nestjs/common';

interface Injectable {
  (options?: { scope?: any }): ClassDecorator;
}

// Try to import NestJS decorators if available
let Injectable: Injectable;
let Scope: any;

try {
  const nestjsCommon = require('@nestjs/common');
  Injectable = nestjsCommon.Injectable;
  Scope = nestjsCommon.Scope;
} catch {
  // Fallback when @nestjs/common is not available
  Injectable = () => (target: any) => target;
  Scope = { TRANSIENT: 'transient' };
}

/**
 * Logitron Logger Service that extends the built-in LoggerService
 * This allows seamless integration with existing NestJS applications
 */
@Injectable({ scope: Scope.TRANSIENT })
export class LogitronLoggerService implements LoggerService {
  private logger: Logger;
  private context?: string;

  constructor(config?: Partial<LoggerConfig>, context?: string) {
    this.logger = new Logger({
      adapter: 'pino',
      level: 'info',
      appName: 'nestjs-app',
      traceId: true,
      ...config,
    });
    this.context = context;
  }

  /**
   * Write a 'log' level log.
   */
  log(message: any, contextOrPayload?: string | Record<string, any>): void {
    if (typeof contextOrPayload === 'string') {
      this.logMessage('info', message, contextOrPayload);
    } else {
      this.logMessage('info', message, undefined, contextOrPayload);
    }
  }

  /**
   * Write an 'error' level log.
   */
  error(message: any, traceOrPayload?: string | Record<string, any>, context?: string): void {
    if (typeof traceOrPayload === 'string') {
      this.logMessage('error', message, context, { trace: traceOrPayload });
    } else {
      this.logMessage('error', message, context, traceOrPayload);
    }
  }

  /**
   * Write a 'warn' level log.
   */
  warn(message: any, contextOrPayload?: string | Record<string, any>): void {
    if (typeof contextOrPayload === 'string') {
      this.logMessage('warn', message, contextOrPayload);
    } else {
      this.logMessage('warn', message, undefined, contextOrPayload);
    }
  }

  /**
   * Write a 'debug' level log.
   */
  debug(message: any, contextOrPayload?: string | Record<string, any>): void {
    if (typeof contextOrPayload === 'string') {
      this.logMessage('debug', message, contextOrPayload);
    } else {
      this.logMessage('debug', message, undefined, contextOrPayload);
    }
  }

  /**
   * Write a 'verbose' level log (mapped to trace).
   */
  verbose(message: any, contextOrPayload?: string | Record<string, any>): void {
    if (typeof contextOrPayload === 'string') {
      this.logMessage('trace', message, contextOrPayload);
    } else {
      this.logMessage('trace', message, undefined, contextOrPayload);
    }
  }

  /**
   * Set the log level
   */
  setLogLevels(levels: ('log' | 'error' | 'warn' | 'debug' | 'verbose' | 'fatal')[]): void {
    // NestJS uses an array of levels, we'll use the most restrictive one
    if (levels.length > 0) {
      const levelMapping: Record<string, LogLevel> = {
        log: 'info',
        error: 'error',
        warn: 'warn',
        debug: 'debug',
        verbose: 'trace',
        fatal: 'fatal',
      };

      const levelPriority: Record<LogLevel, number> = {
        trace: 0,
        debug: 1,
        info: 2,
        warn: 3,
        error: 4,
        fatal: 5,
      };

      const mappedLevels = levels.map(level => levelMapping[level]).filter((level): level is LogLevel => Boolean(level));
      if (mappedLevels.length > 0) {
        const minLevel = mappedLevels.reduce((min, level) => {
          return levelPriority[level] < levelPriority[min] ? level : min;
        });
        this.logger.setLevel(minLevel);
      }
    }
  }

  /**
   * Set the context for this logger instance
   */
  setContext(context: string): void {
    this.context = context;
    this.logger.setContext(context);
  }

  /**
   * Get the underlying logger instance
   */
  getLogger(): Logger {
    return this.logger;
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string, data?: Record<string, any>): LogitronLoggerService {
    const childLogger = new LogitronLoggerService(
      {},
      this.context ? `${this.context}.${context}` : context
    );
    
    if (data) {
      childLogger.logger.addContextData(data);
    }
    
    return childLogger;
  }

  /**
   * Close the logger and clean up resources
   */
  async close(): Promise<void> {
    await this.logger.close();
  }

  /**
   * Internal method to handle logging with context
   */
  private logMessage(
    level: LogLevel,
    message: any,
    context?: string,
    data?: Record<string, any>
  ): void {
    const logContext = context || this.context;
    const logData = data ? { ...data } : {};
    
    if (logContext) {
      logData.context = logContext;
    }

    // Include trace ID if available
    const traceId = getCurrentTraceId();
    if (traceId) {
      logData.traceId = traceId;
    }

    // Handle different message types
    let logMessage: string;
    if (typeof message === 'string') {
      logMessage = message;
    } else if (message instanceof Error) {
      logMessage = message.message;
      if (level === 'error') {
        // For error level, pass the Error object directly
        this.logger.error(message, logData).catch(console.error);
        return;
      }
    } else {
      logMessage = JSON.stringify(message);
      logData.originalMessage = message;
    }

    // Call the appropriate logger method
    switch (level) {
      case 'trace':
        this.logger.trace(logMessage, logData).catch(console.error);
        break;
      case 'debug':
        this.logger.debug(logMessage, logData).catch(console.error);
        break;
      case 'info':
        this.logger.info(logMessage, logData).catch(console.error);
        break;
      case 'warn':
        this.logger.warn(logMessage, logData).catch(console.error);
        break;
      case 'error':
        this.logger.error(logMessage, logData).catch(console.error);
        break;
      default:
        this.logger.info(logMessage, logData).catch(console.error);
    }
  }
}

/**
 * Factory function to create Logitron Logger Service
 */
export function createLogitronLogger(
  config?: Partial<LoggerConfig>,
  context?: string
): LogitronLoggerService {
  return new LogitronLoggerService(config, context);
}