/** @format */

import { Controller, Get, Post, Body, Param, Logger } from '@nestjs/common';
import { getCurrentTraceId } from '../../src';

@Controller()
export class AppController {
	private readonly logger = new Logger(AppController.name);

	@Get()
	getHello(): string {
		this.logger.log(`Processing GET / request `);

		try {
			const result = 'Hello from Logitron!';
			this.logger.log(`Request processed successfully  - Result: ${result}`, {
				statusCode: 500,
				message: 'Internal server error',
			});
			return result;
		} catch (error: any) {
			this.logger.error(`Error processing request  - Error: ${error?.message}`, error?.stack);
			throw error;
		}
	}

	@Post('test')
	postTest(@Body() body: any): any {
		this.logger.log(`Processing POST /test request `);

		try {
			const result = { message: 'POST request processed', receivedBody: body };

			this.logger.log(`POST request processed successfully  - Result: ${JSON.stringify(result)}`);
			return result;
		} catch (error: any) {
			this.logger.error(`Error processing POST request  - Error: ${error?.message}`, error?.stack);
			throw error;
		}
	}

	@Get('param/:id')
	getParam(@Param('id') id: string): any {
		const traceId = getCurrentTraceId();
		this.logger.log(`Processing GET /param/${id} request `);

		try {
			const result = { message: 'Param request processed', paramId: id, traceId };

			this.logger.log(`Param request processed successfully  - Result: ${JSON.stringify(result)}`);
			return result;
		} catch (error: any) {
			this.logger.error(`Error processing param request  - Error: ${error?.message}`, error?.stack);
			throw error;
		}
	}
}
