import { 
  ILogger, 
  ILoggerAdapter, 
  LoggerConfig, 
  LogEntry, 
  LogLevel, 
  Environment,
  TimingEntry,
  ContextData,
  DEFAULT_CONFIG,
  TraceIdConfig
} from '../types';
import { PinoAdapter } from '../adapters/pino-adapter';
import { WinstonAdapter } from '../adapters/winston-adapter';
import { traceContext, getCurrentTraceId } from '../trace';
import { serializeError } from '../utils/error-serializer';

// Performance timing storage
const timings = new Map<string, TimingEntry>();

export class Logger implements ILogger {
  private adapter: ILoggerAdapter;
  private config: LoggerConfig;
  private context?: string;
  private contextData: ContextData = {};
  private environment: Environment;

  constructor(config: LoggerConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.environment = this.detectEnvironment();
    this.adapter = this.createAdapter();
    this.configureTraceId();
  }

  /**
   * Log an error message or Error object
   */
  public async error(messageOrError: string | Error, data?: Record<string, any>): Promise<void> {
    if (messageOrError instanceof Error) {
      await this.logEntry('error', messageOrError.message, data, messageOrError);
    } else {
      await this.logEntry('error', messageOrError, data);
    }
  }

  /**
   * Log a warning message
   */
  public async warn(message: string, data?: Record<string, any>): Promise<void> {
    await this.logEntry('warn', message, data);
  }

  /**
   * Log an info message
   */
  public async info(message: string, data?: Record<string, any>): Promise<void> {
    await this.logEntry('info', message, data);
  }

  /**
   * Log a debug message
   */
  public async debug(message: string, data?: Record<string, any>): Promise<void> {
    await this.logEntry('debug', message, data);
  }

  /**
   * Log a trace message
   */
  public async trace(message: string, data?: Record<string, any>): Promise<void> {
    await this.logEntry('trace', message, data);
  }

  /**
   * Start a timer with the given label
   */
  public time(label: string): void {
    const timing: TimingEntry = {
      label,
      startTime: Date.now(),
    };
    timings.set(label, timing);
  }

  /**
   * End a timer and log the duration
   */
  public async timeEnd(label: string): Promise<number | undefined> {
    const timing = timings.get(label);
    if (!timing) {
      await this.warn(`Timer '${label}' does not exist`);
      return undefined;
    }

    const endTime = Date.now();
    const duration = endTime - timing.startTime;
    
    timing.endTime = endTime;
    timing.duration = duration;
    
    await this.info(`Timer '${label}' completed`, { duration: `${duration}ms` });
    timings.delete(label);
    
    return duration;
  }

  /**
   * Execute a function and measure its execution time
   */
  public async timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.time(label);
    try {
      const result = await fn();
      await this.timeEnd(label);
      return result;
    } catch (error) {
      await this.timeEnd(label);
      throw error;
    }
  }

  /**
   * Set the log level
   */
  public setLevel(level: LogLevel): void {
    this.adapter.setLevel(level);
  }

  /**
   * Get the current log level
   */
  public getLevel(): LogLevel {
    return this.adapter.getLevel();
  }

  /**
   * Set the context for this logger instance
   */
  public setContext(context: string): void {
    this.context = context;
  }

  /**
   * Get the current context
   */
  public getContext(): string | undefined {
    return this.context;
  }

  /**
   * Create a child logger with additional context
   */
  public child(context: string, data?: Record<string, any>): ILogger {
    const childLogger = new Logger(this.config);
    childLogger.context = this.context ? `${this.context}.${context}` : context;
    
    if (data) {
      childLogger.contextData = { ...this.contextData, ...data };
    }
    
    return childLogger;
  }

  /**
   * Close the logger and clean up resources
   */
  public async close(): Promise<void> {
    await this.adapter.close();
    timings.clear();
  }

  /**
   * Get the underlying adapter
   */
  public getAdapter(): ILoggerAdapter {
    return this.adapter;
  }

  /**
   * Update logger configuration
   */
  public updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    this.adapter = this.createAdapter();
    this.configureTraceId();
    
    // Ensure the adapter level is set if provided in config
    if (config.level) {
      this.adapter.setLevel(config.level);
    }
  }

  /**
   * Check if a log level is enabled
   */
  public isLevelEnabled(level: LogLevel): boolean {
    const currentLevel = this.getLevel();
    const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    const currentIndex = levels.indexOf(currentLevel);
    const targetIndex = levels.indexOf(level);
    return targetIndex >= currentIndex;
  }

  /**
   * Add context data that will be included in all log entries
   */
  public addContextData(data: ContextData): void {
    this.contextData = { ...this.contextData, ...data };
  }

  /**
   * Remove context data
   */
  public removeContextData(keys: string[]): void {
    for (const key of keys) {
      delete this.contextData[key];
    }
  }

  /**
   * Clear all context data
   */
  public clearContextData(): void {
    this.contextData = {};
  }

  /**
   * Create the appropriate adapter based on configuration
   */
  private createAdapter(): ILoggerAdapter {
    if (!this.config.adapter) {
      throw new Error('Logger adapter is required in configuration');
    }
    
    const adapterOptions = this.config.options || {};
    
    switch (this.config.adapter) {
      case 'pino':
        if (this.environment === 'development') {
          return PinoAdapter.createPretty(adapterOptions);
        }
        return new PinoAdapter(adapterOptions);
      
      case 'winston':
        if (this.environment === 'development') {
          return WinstonAdapter.createPretty(adapterOptions);
        }
        return new WinstonAdapter(adapterOptions);
      
      default:
        throw new Error(`Unsupported adapter: ${this.config.adapter}`);
    }
  }

  /**
   * Configure trace ID system
   */
  private configureTraceId(): void {
    if (this.config.traceId === false) {
      traceContext.disable();
      return;
    }

    traceContext.enable();
    
    if (typeof this.config.traceId === 'object') {
      const traceConfig = this.config.traceId as TraceIdConfig;
      traceContext.configure({
        enabled: true,
        generator: traceConfig.generator,
        contextKey: traceConfig.contextKey || 'traceId',
      });
    }
  }

  /**
   * Detect the current environment
   */
  private detectEnvironment(): Environment {
    if (this.config.environment) {
      return this.config.environment;
    }

    const nodeEnv = process.env.NODE_ENV;
    
    if (nodeEnv === 'production') {
      return 'production';
    } else {
      return 'development';
    }
  }

  /**
   * Create and log a log entry
   */
  private async logEntry(
    level: LogLevel,
    message: string,
    data?: Record<string, any>,
    error?: Error
  ): Promise<void> {
    try {
      // Check if level is enabled
      if (!this.isLevelEnabled(level)) {
        return;
      }

      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        appName: this.config.appName || 'app',
        message,
        traceId: getCurrentTraceId(),
        context: this.context,
      };

      // Add payload if present
      if (data || Object.keys(this.contextData).length > 0) {
        entry.payload = {
          ...this.contextData,
          ...data,
        };
      }

      // Add error if present
      if (error) {
        entry.error = error;
        // Also add serialized error to payload for structured logging
        if (!entry.payload) {
          entry.payload = {};
        }
        entry.payload.serializedError = serializeError(error);
      }

      await this.adapter.log(entry);
    } catch (logError) {
      // Fallback logging to prevent logger failures from breaking the application
      console.error('Logger failed:', logError);
      console.log('Original log:', { level, message, data, error });
    }
  }
}

// Factory function to create logger with sensible defaults
export function createLogger(config: Partial<LoggerConfig> = {}): Logger {
  const defaultConfig: LoggerConfig = {
    adapter: 'pino',
    level: 'info',
    appName: 'app',
    traceId: true,
    ...config,
  };

  return new Logger(defaultConfig);
}

// Create default logger instance
export const defaultLogger = createLogger();