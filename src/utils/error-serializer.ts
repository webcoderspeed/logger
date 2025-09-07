import { ErrorSerializationOptions } from '../types';
import fastSafeStringify from 'fast-safe-stringify';

// Default serialization options
const DEFAULT_OPTIONS: ErrorSerializationOptions = {
  includeStack: true,
  maxDepth: 5,
  excludeFields: ['password', 'token', 'secret', 'key', 'authorization'],
};

// Circular reference tracker
class CircularReferenceTracker {
  private seen = new WeakSet();
  private depth = 0;
  private maxDepth: number;

  constructor(maxDepth: number = 5) {
    this.maxDepth = maxDepth;
  }

  public isCircular(obj: any): boolean {
    if (obj && typeof obj === 'object') {
      if (this.seen.has(obj)) {
        return true;
      }
      this.seen.add(obj);
    }
    return false;
  }

  public incrementDepth(): boolean {
    this.depth++;
    return this.depth > this.maxDepth;
  }

  public decrementDepth(): void {
    this.depth--;
  }

  public reset(): void {
    this.seen = new WeakSet();
    this.depth = 0;
  }
}

// Error serializer class
export class ErrorSerializer {
  private options: ErrorSerializationOptions;

  constructor(options: ErrorSerializationOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Serialize an error object safely
   */
  public serialize(error: Error | any): Record<string, any> {
    const tracker = new CircularReferenceTracker(this.options.maxDepth);
    return this.serializeValue(error, tracker);
  }

  /**
   * Serialize any value with circular reference protection
   */
  public serializeValue(value: any, tracker?: CircularReferenceTracker): any {
    if (!tracker) {
      tracker = new CircularReferenceTracker(this.options.maxDepth);
    }

    // Handle null and undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle primitive types
    if (typeof value !== 'object') {
      return value;
    }

    // Check for circular references
    if (tracker.isCircular(value)) {
      return '[Circular Reference]';
    }

    // Check depth limit
    if (tracker.incrementDepth()) {
      tracker.decrementDepth();
      return '[Max Depth Exceeded]';
    }

    let result: any;

    try {
      if (value instanceof Error) {
        result = this.serializeError(value, tracker);
      } else if (Array.isArray(value)) {
        result = this.serializeArray(value, tracker);
      } else if (value instanceof Date) {
        result = value.toISOString();
      } else if (value instanceof RegExp) {
        result = value.toString();
      } else if (typeof value.toJSON === 'function') {
        // Handle objects with toJSON method
        try {
          result = this.serializeValue(value.toJSON(), tracker);
        } catch {
          result = this.serializeObject(value, tracker);
        }
      } else {
        result = this.serializeObject(value, tracker);
      }
    } catch (error) {
      result = `[Serialization Error: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }

    tracker.decrementDepth();
    return result;
  }

  /**
   * Serialize an Error object
   */
  private serializeError(error: Error, tracker: CircularReferenceTracker): Record<string, any> {
    const serialized: Record<string, any> = {
      name: error.name,
      message: error.message,
    };

    // Include stack trace if enabled
    if (this.options.includeStack && error.stack) {
      serialized.stack = error.stack;
    }

    // Include additional error properties
    const errorKeys = Object.getOwnPropertyNames(error);
    for (const key of errorKeys) {
      if (key !== 'name' && key !== 'message' && key !== 'stack') {
        if (!this.shouldExcludeField(key)) {
          try {
            serialized[key] = this.serializeValue((error as any)[key], tracker);
          } catch {
            serialized[key] = '[Serialization Failed]';
          }
        }
      }
    }

    // Handle specific error types
    if (error instanceof TypeError) {
      serialized.type = 'TypeError';
    } else if (error instanceof ReferenceError) {
      serialized.type = 'ReferenceError';
    } else if (error instanceof SyntaxError) {
      serialized.type = 'SyntaxError';
    }

    return serialized;
  }

  /**
   * Serialize an array
   */
  private serializeArray(array: any[], tracker: CircularReferenceTracker): any[] {
    const result: any[] = [];
    
    for (let i = 0; i < array.length; i++) {
      try {
        result[i] = this.serializeValue(array[i], tracker);
      } catch {
        result[i] = '[Serialization Failed]';
      }
    }
    
    return result;
  }

  /**
   * Serialize a plain object
   */
  private serializeObject(obj: Record<string, any>, tracker: CircularReferenceTracker): Record<string, any> {
    const result: Record<string, any> = {};
    
    const keys = Object.keys(obj).concat(Object.getOwnPropertyNames(obj));
    const uniqueKeys = Array.from(new Set(keys));
    
    for (const key of uniqueKeys) {
      if (!this.shouldExcludeField(key)) {
        try {
          const descriptor = Object.getOwnPropertyDescriptor(obj, key);
          if (descriptor && descriptor.enumerable !== false) {
            result[key] = this.serializeValue(obj[key], tracker);
          }
        } catch {
          result[key] = '[Serialization Failed]';
        }
      }
    }
    
    return result;
  }

  /**
   * Check if a field should be excluded from serialization
   */
  private shouldExcludeField(fieldName: string): boolean {
    if (!this.options.excludeFields) {
      return false;
    }
    
    const lowerFieldName = fieldName.toLowerCase();
    return this.options.excludeFields.some(excludeField => 
      lowerFieldName.includes(excludeField.toLowerCase())
    );
  }

  /**
   * Update serialization options
   */
  public updateOptions(options: Partial<ErrorSerializationOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   */
  public getOptions(): ErrorSerializationOptions {
    return { ...this.options };
  }
}

// Default serializer instance
export const defaultErrorSerializer = new ErrorSerializer();

// Utility functions
export function serializeError(
  error: Error | any,
  options?: ErrorSerializationOptions
): Record<string, any> {
  if (options) {
    const serializer = new ErrorSerializer(options);
    return serializer.serialize(error);
  }
  return defaultErrorSerializer.serialize(error);
}

export function serializeValue(
  value: any,
  options?: ErrorSerializationOptions
): any {
  if (options) {
    const serializer = new ErrorSerializer(options);
    return serializer.serializeValue(value);
  }
  return defaultErrorSerializer.serializeValue(value);
}

// Safe JSON stringify with circular reference handling
export function safeStringify(
  value: any,
  options?: ErrorSerializationOptions
): string {
  try {
    const serialized = serializeValue(value, options);
    return fastSafeStringify(serialized, undefined, 2);
  } catch (error) {
    return `[JSON Stringify Failed: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}