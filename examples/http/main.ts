/** @format */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LogitronLoggerService } from '../../src';

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		bufferLogs: true,
	});

	app.useLogger(app.get(LogitronLoggerService));

	await app.listen(3000);
}

bootstrap().catch(console.error);
