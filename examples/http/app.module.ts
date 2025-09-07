/** @format */

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { LogitronLoggerModule } from '../../src';
import winston from 'winston';

@Module({
	imports: [
		LogitronLoggerModule.forRoot({
			adapter: 'winston',
			level: 'info',
			appName: 'logitron-example',
			traceId: false,
			options:{
				transports: [
					new winston.transports.Console({
						format: winston.format.combine(
							winston.format.colorize(),
							winston.format.simple(),
						),
					}),
					new winston.transports.File({
						filename: './logs/app.log',
					}),
					new winston.transports.File({
						filename: './logs/error.log',
						level: 'error',
					}),
				],
			},
			environment: 'production',
		}),
	],
	controllers: [AppController],
})
export class AppModule {}
