import { Logger } from '../core/logger';
import { LoggerConfig, LogLevel } from '../types';

// Optional NestJS types - will be available when @nestjs/common is installed
interface LoggerService {
  log(message: any, context?: string): void;
  error(message: any, trace?: string, context?: string): void;
  warn(message: any, context?: string): void;
  debug(message: any, context?: string): void;
  verbose?(message: any, context?: string): void;
}

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
 * NestJS Logger Service that extends the built-in LoggerService
 * This allows seamless integration with existing NestJS applications
 */
@Injectable({ scope: Scope.TRANSIENT })
export class NestJSLoggerService implements LoggerService {
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
  log(message: any, context?: string): void {
    this.logMessage('info', message, context);
  }

  /**
   * Write an 'error' level log.
   */
  error(message: any, trace?: string, context?: string): void {
    const errorData: Record<string, any> = {};
    
    if (trace) {
      errorData.trace = trace;
    }
    
    this.logMessage('error', message, context, errorData);
  }

  /**
   * Write a 'warn' level log.
   */
  warn(message: any, context?: string): void {
    this.logMessage('warn', message, context);
  }

  /**
   * Write a 'debug' level log.
   */
  debug(message: any, context?: string): void {
    this.logMessage('debug', message, context);
  }

  /**
   * Write a 'verbose' level log (mapped to trace).
   */
  verbose(message: any, context?: string): void {
    this.logMessage('trace', message, context);
  }

  /**
   * Set the log level
   */
  setLogLevels(levels: LogLevel[]): void {
    // NestJS uses an array of levels, we'll use the most restrictive one
    if (levels.length > 0) {
      const levelPriority: Record<LogLevel, number> = {
        trace: 0,
        debug: 1,
        info: 2,
        warn: 3,
        error: 4,
        fatal: 5,
      };

      const minLevel = levels.reduce((min, level) => {
        return levelPriority[level] < levelPriority[min] ? level : min;
      });

      this.logger.setLevel(minLevel);
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
  child(context: string, data?: Record<string, any>): NestJSLoggerService {
    const childLogger = new NestJSLoggerService(
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
    const logData = data || {};
    
    if (logContext) {
      logData.context = logContext;
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
 * Factory function to create NestJS Logger Service
 */
export function createNestJSLogger(
  config?: Partial<LoggerConfig>,
  context?: string
): NestJSLoggerService {
  return new NestJSLoggerService(config, context);
}

/**
 * NestJS Logger Module for dependency injection
 */
export class LoggerModule {
  static forRoot(config?: Partial<LoggerConfig>) {
    return {
      module: LoggerModule,
      providers: [
        {
          provide: 'LOGGER_CONFIG',
          useValue: config || {},
        },
        {
          provide: NestJSLoggerService,
          useFactory: (loggerConfig: Partial<LoggerConfig>) => {
            return new NestJSLoggerService(loggerConfig);
          },
          inject: ['LOGGER_CONFIG'],
        },
      ],
      exports: [NestJSLoggerService],
      global: true,
    };
  }

  static forFeature(context: string) {
    return {
      module: LoggerModule,
      providers: [
        {
          provide: `LOGGER_${context.toUpperCase()}`,
          useFactory: (baseLogger: NestJSLoggerService) => {
            return baseLogger.child(context);
          },
          inject: [NestJSLoggerService],
        },
      ],
      exports: [`LOGGER_${context.toUpperCase()}`],
    };
  }
}