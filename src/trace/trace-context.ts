import { AsyncLocalStorage } from 'async_hooks';
import { randomBytes } from 'crypto';
import { TraceIdConfig } from '../types';

// Simple UUID generator to avoid ES module issues
function generateId(): string {
  return randomBytes(16).toString('hex');
}

// Context data interface
interface TraceContext {
  traceId: string;
  startTime: number;
  metadata?: Record<string, any>;
}

// Singleton class for managing trace context
export class TraceContextManager {
  private static instance: TraceContextManager;
  private asyncLocalStorage: AsyncLocalStorage<TraceContext>;
  private config: TraceIdConfig;
  private defaultGenerator: () => string;

  private constructor() {
    this.asyncLocalStorage = new AsyncLocalStorage<TraceContext>();
    this.defaultGenerator = () => generateId().substring(0, 12);
    this.config = {
      enabled: true,
      generator: this.defaultGenerator,
      contextKey: 'traceId',
    };
  }

  public static getInstance(): TraceContextManager {
    if (!TraceContextManager.instance) {
      TraceContextManager.instance = new TraceContextManager();
    }
    return TraceContextManager.instance;
  }

  public configure(config: Partial<TraceIdConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): TraceIdConfig {
    return { ...this.config };
  }

  public getCurrentTraceId(): string | undefined {
    if (!this.config.enabled) {
      return undefined;
    }

    const context = this.asyncLocalStorage.getStore();
    return context?.traceId;
  }

  public getCurrentContext(): TraceContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  public generateTraceId(): string {
    const generator = this.config.generator || generateId;
    return generator();
  }

  public runWithTraceId<T>(
    traceId: string,
    callback: () => T,
    metadata?: Record<string, any>
  ): T {
    if (!this.config.enabled) {
      return callback();
    }

    const context: TraceContext = {
      traceId,
      startTime: Date.now(),
      metadata,
    };

    return this.asyncLocalStorage.run(context, callback);
  }

  public runWithNewTraceId<T>(
    callback: () => T,
    metadata?: Record<string, any>
  ): T {
    const traceId = this.generateTraceId();
    return this.runWithTraceId(traceId, callback, metadata);
  }

  public async runWithTraceIdAsync<T>(
    traceId: string,
    callback: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.config.enabled) {
      return callback();
    }

    const context: TraceContext = {
      traceId,
      startTime: Date.now(),
      metadata,
    };

    return new Promise((resolve, reject) => {
      this.asyncLocalStorage.run(context, async () => {
        try {
          const result = await callback();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  public async runWithNewTraceIdAsync<T>(
    callback: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const traceId = this.generateTraceId();
    return this.runWithTraceIdAsync(traceId, callback, metadata);
  }

  public setMetadata(key: string, value: any): void {
    const context = this.asyncLocalStorage.getStore();
    if (context) {
      if (!context.metadata) {
        context.metadata = {};
      }
      context.metadata[key] = value;
    }
  }

  public getMetadata(key?: string): any {
    const context = this.asyncLocalStorage.getStore();
    if (!context?.metadata) {
      return undefined;
    }

    if (key) {
      return context.metadata[key];
    }

    return { ...context.metadata };
  }

  public getElapsedTime(): number | undefined {
    const context = this.asyncLocalStorage.getStore();
    if (!context) {
      return undefined;
    }

    return Date.now() - context.startTime;
  }

  public clear(): void {
    // Note: AsyncLocalStorage doesn't have a direct clear method
    // The context will be cleared when the async operation completes
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public disable(): void {
    this.config.enabled = false;
  }

  public enable(): void {
    this.config.enabled = true;
  }
}

// Export singleton instance
export const traceContext = TraceContextManager.getInstance();

// Utility functions
export function getCurrentTraceId(): string | undefined {
  return traceContext.getCurrentTraceId();
}

export function generateTraceId(): string {
  return traceContext.generateTraceId();
}

export function runWithTraceId<T>(
  traceId: string,
  callback: () => T,
  metadata?: Record<string, any>
): T {
  return traceContext.runWithTraceId(traceId, callback, metadata);
}

export function runWithNewTraceId<T>(
  callback: () => T,
  metadata?: Record<string, any>
): T {
  return traceContext.runWithNewTraceId(callback, metadata);
}

export async function runWithTraceIdAsync<T>(
  traceId: string,
  callback: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  return traceContext.runWithTraceIdAsync(traceId, callback, metadata);
}

export async function runWithNewTraceIdAsync<T>(
  callback: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  return traceContext.runWithNewTraceIdAsync(callback, metadata);
}