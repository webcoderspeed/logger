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
    const defaultOptions: WinstonOptions = {
      level: 'info',
      transports: [
        new winston.transports.Console(),
      ],
      ...options,
    };

    this.logger = winston.createLogger(defaultOptions);
    this.currentLevel = this.mapWinstonLevelToLogLevel(this.logger.level as string);
  }

  public async log(entry: LogEntry): Promise<void> {
    const winstonLevel = LEVEL_MAPPING[entry.level];
    const logData = { ...entry.payload };

    this.logger.log(winstonLevel, entry.message, logData);
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
    this.logger.close();
  }

  private mapWinstonLevelToLogLevel(winstonLevel: string): LogLevel {
    return REVERSE_LEVEL_MAPPING[winstonLevel] || 'info';
  }
}