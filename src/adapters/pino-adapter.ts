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
    const defaultOptions: PinoOptions = {
      level: 'info',
      ...options,
    };

    this.logger = pino(defaultOptions);
    this.currentLevel = this.mapPinoLevelToLogLevel(this.logger.level);
  }

  public async log(entry: LogEntry): Promise<void> {
    const pinoLevel = LEVEL_MAPPING[entry.level] as keyof PinoLogger;
    const logData = { ...entry.payload };
    
    (this.logger[pinoLevel] as any)(logData, entry.message);
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
    if (this.logger.flush) {
      this.logger.flush();
    }
  }

  private mapPinoLevelToLogLevel(pinoLevel: string): LogLevel {
    return REVERSE_LEVEL_MAPPING[pinoLevel] || 'info';
  }
}