# Logitron HTTP Example

This example demonstrates how to use Logitron logger with NestJS HTTP applications, including automatic trace ID handling and request/response logging.

## Files Overview

- `main.ts` - Application bootstrap with Logitron logger configuration
- `app.module.ts` - Module configuration with HTTP interceptor setup
- `app.controller.ts` - Controller demonstrating Logitron logger usage with trace IDs
- `app.service.ts` - Service layer with Logitron logging

## Key Features Demonstrated

### 1. Application-Level Logger Setup
```typescript
// main.ts
const logger = new Logger({
  adapter: 'pino',
  appName: 'http-example',
  level: 'info'
});

app.useLogger({
  log: (message: string, context?: string) => logger.info(message, { context }),
  error: (message: string, trace?: string, context?: string) => logger.error(message, { trace, context }),
  // ... other log levels
});
```

### 2. HTTP Interceptor Configuration
```typescript
// app.module.ts
LogitronInterceptorModule.forRoot({
  logger: new Logger({ /* config */ }),
  global: true,
  http: {
    logRequest: true,
    logResponse: true,
    requestTimeout: 5000,
  },
  traceIdFields: {
    http: 'traceId'
  }
})
```

### 3. Controller-Level Logging with Trace IDs
```typescript
// app.controller.ts
this.logger.info('Processing request', {
  traceId: TraceIdHandler.getTraceId(),
  endpoint: '/hello',
  method: 'GET'
});
```

## Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install @nestjs/common @nestjs/core logitron
   ```

2. **Install Development Dependencies**
   ```bash
   npm install -D @nestjs/cli typescript
   ```

## Running the Example

1. **Start the Application**
   ```bash
   npm run start:dev
   ```

2. **Test the Endpoints**
   ```bash
   # Basic hello endpoint
   curl http://localhost:3000/hello
   
   # Trace ID demonstration endpoint
   curl http://localhost:3000/hello/trace
   ```

## Expected Log Output

When you make requests, you'll see structured logs like:

```json
{
  "level": "info",
  "time": "2024-01-15T10:30:00.000Z",
  "msg": "Processing getHello request",
  "traceId": "abc123-def456-ghi789",
  "endpoint": "/hello",
  "method": "GET",
  "appName": "http-example"
}
```

## Trace ID Features

- **Automatic Generation**: Trace IDs are automatically generated for each request
- **Context Propagation**: Trace IDs are maintained throughout the request lifecycle
- **Manual Access**: Use `TraceIdHandler.getTraceId()` to access current trace ID
- **Custom Fields**: Configure custom trace ID field names via `traceIdFields`

## Error Handling

The example includes proper error handling with trace ID logging:

```typescript
catch (error) {
  this.logger.error('Error processing request', {
    traceId: TraceIdHandler.getTraceId(),
    error: error.message,
    stack: error.stack
  });
  throw error;
}
```

## Notes

- The linter errors about missing NestJS modules are expected in this example environment
- In a real project, ensure all NestJS dependencies are properly installed
- The HTTP interceptor automatically handles request/response logging
- Trace IDs are generated per request and available throughout the request context