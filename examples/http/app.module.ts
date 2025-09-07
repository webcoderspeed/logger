/** @format */

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { LogitronLoggerModule } from '../../src';

@Module({
	imports: [
		LogitronLoggerModule.forRoot({
			adapter: 'pino',
			level: 'info',
			appName: 'logitron-example',
			traceId: true,
			options: {
				transport: {
					targets: [
						{
							target: 'pino-pretty',
							options: {
								destination: 'api.log',
								singleLine: true,
								colorize: false,
								translateTime: 'yyyy-mm-dd HH:MM:ss',
							},
						},
						{
							target: 'pino-pretty',
							options: {
								colorize: true,
								translateTime: 'yyyy-mm-dd HH:MM:ss',
							},
						},
					],
				},
			},
			environment: 'development',
		}),
	],
	controllers: [AppController],
})
export class AppModule {}
