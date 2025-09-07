import { Controller, Get, Post, Body, Param, Logger } from '@nestjs/common';
import { getCurrentTraceId } from '../../src';


@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);


  @Get()
  getHello(): string {
    const traceId = getCurrentTraceId();
    this.logger.log(`Processing GET / request - TraceID: ${traceId}`);
    
    try {
      const result = 'Hello from Logitron!';
      this.logger.log(`Request processed successfully - TraceID: ${traceId} - Result: ${result}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Error processing request - TraceID: ${traceId} - Error: ${error?.message}`, error?.stack);
      throw error;
    }
  }

  @Get('world')
  getWorld(): string {
    const traceId = getCurrentTraceId();
    this.logger.log(`Processing GET /world request - TraceID: ${traceId}`);
    
    try {
      const result = 'Hello World!';
      
      this.logger.log(`World request processed successfully - TraceID: ${traceId} - Result: ${result}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Error processing world request - TraceID: ${traceId} - Error: ${error?.message}`, error?.stack);
      throw error;
    }
  }

  @Post('test')
  postTest(@Body() body: any): any {
    const traceId = getCurrentTraceId();
    this.logger.log(`Processing POST /test request - TraceID: ${traceId}`);
    
    try {
      const result = { message: 'POST request processed', receivedBody: body, traceId };
      
      this.logger.log(`POST request processed successfully - TraceID: ${traceId} - Result: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Error processing POST request - TraceID: ${traceId} - Error: ${error?.message}`, error?.stack);
      throw error;
    }
  }

  @Get('param/:id')
  getParam(@Param('id') id: string): any {
    const traceId = getCurrentTraceId();
    this.logger.log(`Processing GET /param/${id} request - TraceID: ${traceId}`);
    
    try {
      const result = { message: 'Param request processed', paramId: id, traceId };
      
      this.logger.log(`Param request processed successfully - TraceID: ${traceId} - Result: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Error processing param request - TraceID: ${traceId} - Error: ${error?.message}`, error?.stack);
      throw error;
    }
  }
}