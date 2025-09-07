/** @format */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestJSLoggerService } from '../../src/nestjs/nestjs-logger';

async function bootstrap() {
  const logger = new NestJSLoggerService({
    adapter: 'pino',
    appName: 'http-example',
    level: 'info',
    traceId: true,
  });

  const app = await NestFactory.create(AppModule, { 
    bufferLogs: true,
  });
  
  app.useLogger(logger);

  await app.listen(3000);
  logger.log('Application is running on: http://localhost:3000');
}

bootstrap().catch(console.error);
