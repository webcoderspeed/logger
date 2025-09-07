# Logitron

A powerful, flexible, and production-ready logging library for Node.js applications with TypeScript support. Logitron provides unified logging with multiple adapters, automatic trace ID management, and seamless integration with popular frameworks like NestJS.

## Features

- 🚀 **Multiple Adapters**: Support for Pino and Winston with unified API
- 🔍 **Automatic Trace ID**: Built-in trace ID generation and propagation using AsyncLocalStorage
- 🎯 **Environment Detection**: Automatic pretty printing in development, structured logging in production
- 🔧 **Framework Integration**: First-class NestJS support with backward compatibility
- 📊 **HTTP Interceptors**: Request/response logging with configurable options
- 🛡️ **Error Serialization**: Safe error serialization with circular reference handling
- ⚡ **Performance**: Optimized for high-throughput applications
- 📝 **TypeScript**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install logitron
# or
yarn add logitron
# or
pnpm add logitron
```

### Peer Dependencies

Depending on which adapter you want to use:

```bash
# For Pino adapter
npm install pino pino-pretty

# For Winston adapter
npm install winston

# For NestJS integration (optional)
npm install @nestjs/common @nestjs/core
```

## Quick Start

### Basic Usage

```typescript
import { createLogger } from 'logitron';

// Create a logger with default settings (Pino adapter)
const logger = createLogger({
  appName: 'my-app',
  level: 'info'
});

// Basic logging
logger.info('Application started');
logger.error('Something went wrong', { userId: 123 });
logger.debug('Debug information', { data: { key: 'value' } });

// Error logging
try {
  throw new Error('Database connection failed');
} catch (error) {
  logger.error(error, { context: 'database' });
}
```

### With Winston Adapter

```typescript
import { createLogger } from 'logitron';

const logger = createLogger({
  adapter: 'winston',
  appName: 'my-app',
  level: 'info',
  options: {
    transports: [
      { type: 'console' },
      { type: 'file', filename: 'app.log' }
    ]
  }
});
```

## Configuration

### Logger Configuration

```typescript
import { LoggerConfig } from 'logitron';

const config: LoggerConfig = {
  adapter: 'pino', // 'pino' | 'winston'
  level: 'info', // 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  appName: 'my-application',
  environment: 'production', // 'development' | 'production' | 'test'
  traceId: true, // Enable automatic trace ID generation
  options: {
    // Adapter-specific options
  }
};
```

### Trace ID Configuration

```typescript
const logger = createLogger({
  traceId: {
    enabled: true,
    generator: () => `custom-${Date.now()}`, // Custom trace ID generator
    header: 'x-trace-id', // Header to extract trace ID from
    contextKey: 'traceId' // Key in log context
  }
});
```

## Advanced Usage

### Child Loggers

```typescript
const logger = createLogger({ appName: 'my-app' });

// Create child logger with additional context
const userLogger = logger.child('user-service', { userId: 123 });
const orderLogger = userLogger.child('orders', { orderId: 456 });

userLogger.info('User logged in'); // Includes userId in context
orderLogger.info('Order created'); // Includes both userId and orderId
```

### Performance Timing

```typescript
// Manual timing
logger.time('database-query');
// ... perform database operation
logger.timeEnd('database-query'); // Logs: Timer 'database-query' completed { duration: '150ms' }

// Async timing
const result = await logger.timeAsync('api-call', async () => {
  return await fetch('https://api.example.com/data');
});
```

### Context Management

```typescript
// Add persistent context data
logger.addContextData({ version: '1.0.0', environment: 'production' });

// All subsequent logs will include this context
logger.info('Application event'); // Includes version and environment

// Remove specific context
logger.removeContextData(['version']);

// Clear all context
logger.clearContextData();
```

## NestJS Integration

### Basic Setup

```typescript
import { Module } from '@nestjs/common';
import { LoggerModule } from 'logitron';

@Module({
  imports: [
    LoggerModule.forRoot({
      adapter: 'pino',
      appName: 'nestjs-app',
      level: 'info'
    })
  ]
})
export class AppModule {}
```

### Using in Services

```typescript
import { Injectable } from '@nestjs/common';
import { NestJSLoggerService } from 'logitron';

@Injectable()
export class UserService {
  constructor(private readonly logger: NestJSLoggerService) {
    this.logger.setContext('UserService');
  }

  async createUser(userData: any) {
    this.logger.log('Creating new user', { userData });
    
    try {
      // ... user creation logic
      this.logger.log('User created successfully', { userId: user.id });
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', error.stack, 'UserService');
      throw error;
    }
  }
}
```

### Feature-Specific Loggers

```typescript
@Module({
  imports: [
    LoggerModule.forFeature('payments')
  ],
  providers: [PaymentService]
})
export class PaymentModule {}

@Injectable()
export class PaymentService {
  constructor(
    @Inject('LOGGER_PAYMENTS') private readonly logger: NestJSLoggerService
  ) {}
}
```

## HTTP Interceptors

### Express.js Integration

```typescript
import express from 'express';
import { createLogger, createHttpInterceptor } from 'logitron';

const app = express();
const logger = createLogger({ appName: 'express-app' });
const interceptor = createHttpInterceptor(logger, {
  logRequest: true,
  logResponse: true,
  excludePaths: ['/health', '/metrics'],
  sensitiveHeaders: ['authorization', 'cookie']
});

app.use(interceptor.createExpressMiddleware());
```

### NestJS Interceptor

```typescript
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { createLogger, createHttpInterceptor } from 'logitron';

const logger = createLogger({ appName: 'nestjs-app' });
const httpInterceptor = createHttpInterceptor(logger);

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: httpInterceptor.createNestJSInterceptor()
    }
  ]
})
export class AppModule {}
```

## Trace ID Management

### Automatic Trace ID Propagation

```typescript
import { traceContext, createLogger } from 'logitron';

const logger = createLogger({ traceId: true });

// Trace ID is automatically generated and propagated
traceContext.runWithTraceId('custom-trace-123', async () => {
  logger.info('This log will include the trace ID');
  
  await someAsyncOperation();
  
  logger.info('This log will also include the same trace ID');
});
```

### Manual Trace ID Management

```typescript
import { traceContext, getCurrentTraceId, generateTraceId } from 'logitron';

// Generate a new trace ID
const traceId = generateTraceId();

// Set trace ID for current context
traceContext.setTraceId(traceId);

// Get current trace ID
const currentTraceId = getCurrentTraceId();
console.log(currentTraceId); // outputs the trace ID
```

## Error Handling

### Safe Error Serialization

```typescript
import { serializeError } from 'logitron';

try {
  throw new Error('Something went wrong');
} catch (error) {
  // Safe serialization handles circular references
  const serialized = serializeError(error);
  
  logger.error('Operation failed', {
    error: serialized,
    context: 'payment-processing'
  });
}
```

### Custom Error Serialization

```typescript
import { ErrorSerializer } from 'logitron';

const customSerializer = new ErrorSerializer({
  includeStack: true,
  maxDepth: 3,
  includeNonEnumerable: false
});

const serialized = customSerializer.serialize(error);
```

## Environment-Specific Configuration

### Development

```typescript
const logger = createLogger({
  adapter: 'pino',
  level: 'debug',
  environment: 'development'
  // Automatically enables pretty printing
});
```

### Production

```typescript
const logger = createLogger({
  adapter: 'pino',
  level: 'info',
  environment: 'production',
  options: {
    // Production-optimized settings
    timestamp: true,
    level: 'info'
  }
});
```

### Testing

```typescript
const logger = createLogger({
  adapter: 'pino',
  level: 'silent', // Disable logging in tests
  environment: 'test'
});
```

## API Reference

### Logger Methods

- `logger.trace(message, data?)` - Log trace level message
- `logger.debug(message, data?)` - Log debug level message
- `logger.info(message, data?)` - Log info level message
- `logger.warn(message, data?)` - Log warning message
- `logger.error(messageOrError, data?)` - Log error message or Error object
- `logger.time(label)` - Start a timer
- `logger.timeEnd(label)` - End a timer and log duration
- `logger.timeAsync(label, fn)` - Time an async function
- `logger.child(context, data?)` - Create child logger
- `logger.setLevel(level)` - Set log level
- `logger.setContext(context)` - Set logger context
- `logger.addContextData(data)` - Add persistent context data
- `logger.close()` - Close logger and cleanup resources

### Configuration Types

```typescript
interface LoggerConfig {
  adapter: 'pino' | 'winston';
  level: LogLevel;
  appName?: string;
  environment?: Environment;
  traceId?: boolean | TraceIdConfig;
  options?: Record<string, any>;
}

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
type Environment = 'development' | 'production' | 'test';
```

## Best Practices

1. **Use Structured Logging**: Always include relevant context data
   ```typescript
   logger.info('User action', { userId, action: 'login', ip: req.ip });
   ```

2. **Leverage Child Loggers**: Create child loggers for different components
   ```typescript
   const dbLogger = logger.child('database');
   const apiLogger = logger.child('api');
   ```

3. **Handle Errors Properly**: Use the error method for Error objects
   ```typescript
   logger.error(error, { context: 'payment-processing' });
   ```

4. **Use Appropriate Log Levels**: Follow standard log level conventions
   - `trace`: Very detailed debugging information
   - `debug`: Debugging information
   - `info`: General information about application flow
   - `warn`: Warning messages for potentially harmful situations
   - `error`: Error messages for error conditions
   - `fatal`: Critical errors that may cause application termination

5. **Configure for Environment**: Use different configurations for different environments

## Performance Considerations

- Logitron is optimized for high-throughput applications
- Pino adapter provides better performance for high-volume logging
- Winston adapter offers more flexibility and transport options
- Async operations are used to minimize blocking
- Trace ID propagation uses AsyncLocalStorage for minimal overhead

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions, please use the GitHub issue tracker.