import { LogEntry, ILogFormatter } from '../types';
import { safeStringify } from './error-serializer';

// Color codes for console output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

// Level color mapping
const LEVEL_COLORS = {
  trace: COLORS.gray,
  debug: COLORS.blue,
  info: COLORS.green,
  warn: COLORS.yellow,
  error: COLORS.red,
  fatal: COLORS.magenta,
};

// Formatter options
export interface FormatterOptions {
  colorize?: boolean;
  includeTimestamp?: boolean;
  includeAppName?: boolean;
  includeTraceId?: boolean;
  includeLevel?: boolean;
  timestampFormat?: string;
  maxPayloadLength?: number;
  prettyPrint?: boolean;
}

// Default formatter options
const DEFAULT_OPTIONS: FormatterOptions = {
  colorize: true,
  includeTimestamp: true,
  includeAppName: true,
  includeTraceId: true,
  includeLevel: true,
  timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
  maxPayloadLength: 1000,
  prettyPrint: false,
};

// Base log formatter class
export class LogFormatter implements ILogFormatter {
  private options: FormatterOptions;

  constructor(options: FormatterOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Format log entry according to the specified format:
   * [yyyy-mm-dd HH:MM:ss.MS] [log_level] [app_name] [trace_id] [message] [payload]
   */
  public format(entry: LogEntry): string {
    const parts: string[] = [];

    // Add timestamp
    if (this.options.includeTimestamp) {
      const timestamp = this.formatTimestamp(entry.timestamp);
      parts.push(this.colorize(`[${timestamp}]`, COLORS.gray));
    }

    // Add log level
    if (this.options.includeLevel) {
      const level = entry.level.toUpperCase().padEnd(5);
      const levelColor = LEVEL_COLORS[entry.level];
      parts.push(this.colorize(`[${level}]`, levelColor));
    }

    // Add app name
    if (this.options.includeAppName && entry.appName) {
      parts.push(this.colorize(`[${entry.appName}]`, COLORS.cyan));
    }

    // Add trace ID
    if (this.options.includeTraceId && entry.traceId) {
      parts.push(this.colorize(`[${entry.traceId}]`, COLORS.magenta));
    }

    // Add context if present
    if (entry.context) {
      parts.push(this.colorize(`[${entry.context}]`, COLORS.blue));
    }

    // Add message
    parts.push(this.colorize(entry.message, COLORS.white));

    // Add payload if present
    if (entry.payload && Object.keys(entry.payload).length > 0) {
      const payloadStr = this.formatPayload(entry.payload);
      if (payloadStr) {
        parts.push(this.colorize(payloadStr, COLORS.dim));
      }
    }

    // Add error if present
    if (entry.error) {
      const errorStr = this.formatError(entry.error);
      parts.push(this.colorize(errorStr, COLORS.red));
    }

    return parts.join(' ');
  }

  /**
   * Format timestamp
   */
  private formatTimestamp(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      return this.formatDate(date);
    } catch {
      return timestamp;
    }
  }

  /**
   * Format date according to the specified format
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  /**
   * Format payload object
   */
  private formatPayload(payload: Record<string, any>): string {
    try {
      let payloadStr: string;
      
      if (this.options.prettyPrint) {
        payloadStr = safeStringify(payload);
      } else {
        payloadStr = JSON.stringify(payload);
      }

      // Truncate if too long
      if (this.options.maxPayloadLength && payloadStr.length > this.options.maxPayloadLength) {
        payloadStr = payloadStr.substring(0, this.options.maxPayloadLength) + '...[truncated]';
      }

      return payloadStr;
    } catch {
      return '[Payload formatting failed]';
    }
  }

  /**
   * Format error object
   */
  private formatError(error: Error): string {
    try {
      let errorStr = `Error: ${error.message}`;
      
      if (error.stack && this.options.prettyPrint) {
        errorStr += `\n${error.stack}`;
      }
      
      return errorStr;
    } catch {
      return '[Error formatting failed]';
    }
  }

  /**
   * Apply color if colorization is enabled
   */
  private colorize(text: string, color: string): string {
    if (!this.options.colorize) {
      return text;
    }
    return `${color}${text}${COLORS.reset}`;
  }

  /**
   * Update formatter options
   */
  public updateOptions(options: Partial<FormatterOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   */
  public getOptions(): FormatterOptions {
    return { ...this.options };
  }
}

// JSON formatter for structured logging
export class JsonFormatter implements ILogFormatter {
  private options: FormatterOptions;

  constructor(options: FormatterOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  public format(entry: LogEntry): string {
    const logObject: Record<string, any> = {
      timestamp: entry.timestamp,
      level: entry.level,
      appName: entry.appName,
      message: entry.message,
    };

    if (entry.traceId) {
      logObject.traceId = entry.traceId;
    }

    if (entry.context) {
      logObject.context = entry.context;
    }

    if (entry.payload) {
      logObject.payload = entry.payload;
    }

    if (entry.error) {
      logObject.error = {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
      };
    }

    try {
      return JSON.stringify(logObject);
    } catch {
      return JSON.stringify({
        timestamp: entry.timestamp,
        level: entry.level,
        message: 'Log formatting failed',
        error: 'Failed to serialize log entry',
      });
    }
  }
}

// Simple formatter for minimal output
export class SimpleFormatter implements ILogFormatter {
  public format(entry: LogEntry): string {
    const parts = [entry.level.toUpperCase(), entry.message];
    
    if (entry.error) {
      parts.push(`Error: ${entry.error.message}`);
    }
    
    return parts.join(' - ');
  }
}

// Default formatter instances
export const defaultFormatter = new LogFormatter();
export const jsonFormatter = new JsonFormatter();
export const simpleFormatter = new SimpleFormatter();

// Utility function to create formatter based on environment
export function createFormatter(
  environment: string = 'development',
  options: FormatterOptions = {}
): ILogFormatter {
  if (environment === 'production') {
    return new JsonFormatter({ ...options, colorize: false });
  } else if (environment === 'test') {
    return new SimpleFormatter();
  } else {
    return new LogFormatter({ ...options, colorize: true, prettyPrint: true });
  }
}