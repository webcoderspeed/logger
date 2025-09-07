import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { LoggerModule  } from '../../src';

@Module({
  imports: [
    LoggerModule.forRoot({
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
                levelFirst: false,
                translateTime: 'dd-mm-yyyy hh:mm:ss TT',
                ignore: 'level',
              },
            },
            {
              target: 'pino-pretty',
              options: {
                singleLine: true,
                colorize: true,
                levelFirst: false,
                translateTime: 'dd-mm-yyyy hh:mm:ss TT',
                ignore: 'level',
              },
            },
          ],
        },
      },
    }),
  ],
  controllers: [AppController],

})
export class AppModule {}