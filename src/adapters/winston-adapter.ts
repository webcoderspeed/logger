import winston, { Logger as WinstonLogger, LoggerOptions as WinstonOptions } from 'winston';
import { ILoggerAdapter, LogEntry, LogLevel } from '../types';

// Log level mapping
const LEVEL_MAPPING: Record<LogLevel, string> = {
  trace: 'silly',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
  fatal: 'error',
};

const REVERSE_LEVEL_MAPPING: Record<string, LogLevel> = {
  silly: 'trace',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

export class WinstonAdapter implements ILoggerAdapter {
  private logger: WinstonLogger;
  private currentLevel: LogLevel;

  constructor(options: WinstonOptions = {}) {
    // Default Winston configuration
    const defaultOptions: WinstonOptions = {
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
      ],
      ...options,
    };

    this.logger = winston.createLogger(defaultOptions);
    this.currentLevel = this.mapWinstonLevelToLogLevel(this.logger.level as string);
  }

  public async log(entry: LogEntry): Promise<void> {
    try {
      const winstonLevel = LEVEL_MAPPING[entry.level];
      const logData = this.formatLogEntry(entry);

      // Use Winston's logging method
      this.logger.log(winstonLevel, entry.message, logData);
    } catch (error) {
      // Fallback logging to prevent logger failures from breaking the application
      console.error('Winston adapter logging failed:', error);
      console.log('Original log entry:', entry);
    }
  }

  public setLevel(level: LogLevel): void {
    const winstonLevel = LEVEL_MAPPING[level];
    this.logger.level = winstonLevel;
    this.currentLevel = level;
  }

  public getLevel(): LogLevel {
    return this.currentLevel;
  }

  public async close(): Promise<void> {
    return new Promise((resolve) => {
      try {
        this.logger.close();
        resolve();
      } catch (error) {
        console.error('Error closing Winston logger:', error);
        resolve(); // Don't reject to prevent breaking the application
      }
    });
  }

  public getWinstonLogger(): WinstonLogger {
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

    // Add error if present
    if (entry.error) {
      logData.error = {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
      };
    }

    return logData;
  }

  private mapWinstonLevelToLogLevel(winstonLevel: string): LogLevel {
    return REVERSE_LEVEL_MAPPING[winstonLevel] || 'info';
  }

  // Utility method to create child logger
  public child(defaultMeta: Record<string, any>): WinstonAdapter {
    const childLogger = this.logger.child(defaultMeta);
    const adapter = new WinstonAdapter();
    adapter.logger = childLogger;
    adapter.currentLevel = this.currentLevel;
    return adapter;
  }

  // Method to check if level is enabled
  public isLevelEnabled(level: LogLevel): boolean {
    const winstonLevel = LEVEL_MAPPING[level];
    return this.logger.isLevelEnabled(winstonLevel);
  }

  // Method to add transport
  public addTransport(transport: winston.transport): void {
    this.logger.add(transport);
  }

  // Method to remove transport
  public removeTransport(transport: winston.transport): void {
    this.logger.remove(transport);
  }

  // Method to clear all transports
  public clearTransports(): void {
    this.logger.clear();
  }

  // Static method to create logger with file transport
  public static createWithFile(
    filename: string,
    options: WinstonOptions = {}
  ): WinstonAdapter {
    const existingTransports = options.transports ? 
      (Array.isArray(options.transports) ? options.transports : [options.transports]) : [];
    
    const fileOptions: WinstonOptions = {
      ...options,
      transports: [
        new winston.transports.File({ filename }),
        new winston.transports.Console(),
        ...existingTransports,
      ],
    };

    return new WinstonAdapter(fileOptions);
  }

  // Static method to create logger with custom format
  public static createWithFormat(
    format: winston.Logform.Format,
    options: WinstonOptions = {}
  ): WinstonAdapter {
    const formatOptions: WinstonOptions = {
      ...options,
      format,
    };

    return new WinstonAdapter(formatOptions);
  }

  // Static method to create pretty logger for development
  public static createPretty(options: WinstonOptions = {}): WinstonAdapter {
    const prettyFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, appName, traceId, ...meta }) => {
        const traceInfo = traceId ? `[${traceId}]` : '';
        const appInfo = appName ? `[${appName}]` : '';
        const metaInfo = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `[${timestamp}] ${level} ${appInfo} ${traceInfo} ${message} ${metaInfo}`;
      })
    );

    const existingTransports = options.transports ? 
      (Array.isArray(options.transports) ? options.transports : [options.transports]) : [];
    
    const prettyOptions: WinstonOptions = {
      ...options,
      format: prettyFormat,
      transports: [
        new winston.transports.Console(),
        ...existingTransports,
      ],
    };

    return new WinstonAdapter(prettyOptions);
  }
}