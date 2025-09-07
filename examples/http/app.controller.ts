import { Controller, Get, Logger,  } from '@nestjs/common';
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
}