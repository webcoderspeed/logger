import { LoggerOptions as PinoOptions } from 'pino';
import { LoggerOptions as WinstonOptions } from 'winston';

// Export all type definitions
export * from './http.types';
export * from './interceptor.types';
export * from './trace.types';

// Log levels
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// Adapter types
export type LoggerAdapter = 'pino' | 'winston';

// Environment types
export type Environment = 'development' | 'production' | 'test';

// TraceID configuration
export interface TraceIdConfig {
  enabled: boolean;
  generator?: () => string;
  header?: string;
  contextKey?: string;
}

// Note: TraceIdExtractorConfig and InterceptorConfig are now defined in types module

// Base logger configuration
export interface LoggerConfig {
  adapter: LoggerAdapter;
  level?: LogLevel;
  appName?: string;
  environment?: Environment;
  traceId?: boolean | TraceIdConfig;
  options?: PinoOptions | WinstonOptions;
  format?: {
    timestamp?: boolean;
    colorize?: boolean;
    json?: boolean;
  };
  interceptor?: import('./interceptor.types').InterceptorConfig;
}

// Log entry structure
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  appName: string;
  traceId?: string;
  message: string;
  payload?: Record<string, any>;
  context?: string;
  error?: Error;
}

// Logger interface
export interface ILogger {
  error(message: string, data?: Record<string, any>): Promise<void>;
  error(error: Error, data?: Record<string, any>): Promise<void>;
  warn(message: string, data?: Record<string, any>): Promise<void>;
  info(message: string, data?: Record<string, any>): Promise<void>;
  debug(message: string, data?: Record<string, any>): Promise<void>;
  trace(message: string, data?: Record<string, any>): Promise<void>;
  
  time(label: string): void;
  timeEnd(label: string): Promise<number | undefined>;
  timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T>;
  
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
  setContext(context: string): void;
  getContext(): string | undefined;
  
  child(context: string, data?: Record<string, any>): ILogger;
  close(): Promise<void>;
}

// Adapter interface
export interface ILoggerAdapter {
  log(entry: LogEntry): Promise<void>;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
  close(): Promise<void>;
}

// Error serialization options
export interface ErrorSerializationOptions {
  includeStack?: boolean;
  maxDepth?: number;
  excludeFields?: string[];
}

// Performance timing interface
export interface TimingEntry {
  label: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

// Context data interface
export interface ContextData {
  [key: string]: any;
}

// Log formatter interface
export interface ILogFormatter {
  format(entry: LogEntry): string;
}

// Default configuration
export const DEFAULT_CONFIG: Partial<LoggerConfig> = {
  level: 'info',
  appName: 'app',
  environment: 'development',
  traceId: true,
  format: {
    timestamp: true,
    colorize: true,
    json: false,
  },
};