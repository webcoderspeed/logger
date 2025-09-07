import pino, { Logger as PinoLogger, LoggerOptions as PinoOptions } from 'pino';
import { ILoggerAdapter, LogEntry, LogLevel } from '../types';

// Log level mapping
const LEVEL_MAPPING: Record<LogLevel, string> = {
  trace: 'trace',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
  fatal: 'fatal',
};

const REVERSE_LEVEL_MAPPING: Record<string, LogLevel> = {
  trace: 'trace',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
  fatal: 'fatal',
};

export class PinoAdapter implements ILoggerAdapter {
  private logger: PinoLogger;
  private currentLevel: LogLevel;

  constructor(options: PinoOptions = {}) {
    // Default Pino configuration
    const defaultOptions: PinoOptions = {
      level: 'info',
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
        log: (object) => object,
      },
      serializers: {
        error: pino.stdSerializers.err,
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
      },
      ...options,
    };

    try {
      this.logger = pino(defaultOptions);
    } catch (error) {
      console.error('Failed to initialize Pino logger:', error);
      // Fallback to basic pino logger
      this.logger = pino();
    }
    this.currentLevel = this.mapPinoLevelToLogLevel(this.logger.level);
  }

  public async log(entry: LogEntry): Promise<void> {
    try {
      const logData = this.formatLogEntry(entry);

      // Use Pino's logging methods based on level
       switch (entry.level) {
         case 'trace':
           if (entry.error) {
             this.logger.trace({ ...logData, err: entry.error }, entry.message);
           } else {
             this.logger.trace(logData, entry.message);
           }
           break;
         case 'debug':
           if (entry.error) {
             this.logger.debug({ ...logData, err: entry.error }, entry.message);
           } else {
             this.logger.debug(logData, entry.message);
           }
           break;
         case 'info':
           if (entry.error) {
             this.logger.info({ ...logData, err: entry.error }, entry.message);
           } else {
             this.logger.info(logData, entry.message);
           }
           break;
         case 'warn':
           if (entry.error) {
             this.logger.warn({ ...logData, err: entry.error }, entry.message);
           } else {
             this.logger.warn(logData, entry.message);
           }
           break;
         case 'error':
           if (entry.error) {
             this.logger.error({ ...logData, err: entry.error }, entry.message);
           } else {
             this.logger.error(logData, entry.message);
           }
           break;
         case 'fatal':
           if (entry.error) {
             this.logger.fatal({ ...logData, err: entry.error }, entry.message);
           } else {
             this.logger.fatal(logData, entry.message);
           }
           break;
         default:
           this.logger.info(logData, entry.message);
       }
    } catch (error) {
      // Fallback logging to prevent logger failures from breaking the application
      console.error('Pino adapter logging failed:', error);
      console.log('Original log entry:', entry);
    }
  }

  public setLevel(level: LogLevel): void {
    const pinoLevel = LEVEL_MAPPING[level];
    this.logger.level = pinoLevel;
    this.currentLevel = level;
  }

  public getLevel(): LogLevel {
    return this.currentLevel;
  }

  public async close(): Promise<void> {
    // Pino doesn't have a built-in close method for the base logger
    // But we can flush any pending writes if using a destination
    try {
      if (this.logger.flush) {
        this.logger.flush();
      }
    } catch (error) {
      console.error('Error closing Pino adapter:', error);
    }
  }

  public getPinoLogger(): PinoLogger {
    return this.logger;
  }

  private formatLogEntry(entry: LogEntry): Record<string, any> {
    const logData: Record<string, any> = {
      timestamp: entry.timestamp,
      appName: entry.appName,
      level: entry.level,
    };

    // Add trace ID if present
    if (entry.traceId) {
      logData.traceId = entry.traceId;
    }

    // Add context if present
    if (entry.context) {
      logData.context = entry.context;
    }

    // Add payload if present
    if (entry.payload) {
      logData.payload = entry.payload;
    }

    return logData;
  }

  private mapPinoLevelToLogLevel(pinoLevel: string): LogLevel {
    return REVERSE_LEVEL_MAPPING[pinoLevel] || 'info';
  }

  // Utility method to create child logger
  public child(bindings: Record<string, any>): PinoAdapter {
    const childLogger = this.logger.child(bindings);
    const adapter = new PinoAdapter();
    adapter.logger = childLogger;
    adapter.currentLevel = this.currentLevel;
    return adapter;
  }

  // Method to check if level is enabled
  public isLevelEnabled(level: LogLevel): boolean {
    const pinoLevel = LEVEL_MAPPING[level];
    return this.logger.isLevelEnabled(pinoLevel);
  }

  // Method to add custom serializers
  public addSerializers(serializers: Record<string, (obj: any) => any>): void {
    // Create a new logger with updated serializers
    const currentOptions = {
      level: this.logger.level,
      serializers: {
        ...(this.logger as any).serializers,
        ...serializers,
      },
    };
    this.logger = pino(currentOptions);
  }

  // Method to create a logger with custom destination
  public static createWithDestination(
    destination: pino.DestinationStream,
    options: PinoOptions = {}
  ): PinoAdapter {
    const logger = pino(options, destination);
    const adapter = new PinoAdapter();
    adapter.logger = logger;
    adapter.currentLevel = adapter.mapPinoLevelToLogLevel(logger.level);
    return adapter;
  }

  // Method to create a pretty-printed logger for development
  public static createPretty(options: PinoOptions = {}): PinoAdapter {
    try {
      const prettyOptions = {
        ...options,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'yyyy-mm-dd HH:MM:ss.l',
            ignore: 'pid,hostname',
            messageFormat: '[{appName}] [{traceId}] {msg}',
          },
        },
      };

      return new PinoAdapter(prettyOptions);
    } catch (error) {
      // Fallback to basic pino if pino-pretty is not available
      return new PinoAdapter(options);
    }
  }
}