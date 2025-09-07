import { MiddlewareConsumer, Module, NestModule, RequestMethod, ModuleMetadata, Type, InjectionToken, OptionalFactoryDependency } from '@nestjs/common';
import { RouteInfo } from '@nestjs/common/interfaces/middleware/middleware-configuration.interface';
import { LoggerConfig, TraceIdConfig } from '../types';
import { LogitronLoggerService } from './logitron-logger.service';
import { LogitronTraceMiddleware } from './middlewares';
import { NextFunction, Request, Response } from 'express';

const DEFAULT_ROUTES: RouteInfo[] = [{ path: '*', method: RequestMethod.ALL }];

// Constants for provider tokens
export const LOGITRON_LOGGER_CONFIG = 'LOGITRON_LOGGER_CONFIG';
export const LOGITRON_LOGGER_PREFIX = 'LOGITRON_LOGGER_';

// Interface for module configuration
interface LogitronModuleConfig {
  forRoutes?: RouteInfo[];
  exclude?: RouteInfo[];
}

// Interface for async configuration
export interface LogitronAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<LogitronOptionsFactory>;
  useClass?: Type<LogitronOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<Partial<LoggerConfig>> | Partial<LoggerConfig>;
  inject?: Array<InjectionToken | OptionalFactoryDependency>;
}

// Interface for options factory
export interface LogitronOptionsFactory {
  createLogitronOptions(): Promise<Partial<LoggerConfig>> | Partial<LoggerConfig>;
}

/**
 * Logitron Logger Module for dependency injection
 */
@Module({})
export class LogitronLoggerModule implements NestModule {
  private config: LogitronModuleConfig = {};
  private static loggerConfig: Partial<LoggerConfig> = {};

  configure(consumer: MiddlewareConsumer) {
    const { forRoutes = DEFAULT_ROUTES, exclude } = this.config;

    // Configure middleware with trace config
     const middlewareConfig = (req: Request, res: Response, next: NextFunction) => {
       let traceConfig: TraceIdConfig | undefined;
       
       if (typeof LogitronLoggerModule.loggerConfig.traceId === 'object') {
         traceConfig = LogitronLoggerModule.loggerConfig.traceId as TraceIdConfig;
       } else if (LogitronLoggerModule.loggerConfig.traceId === true) {
         // Default configuration when traceId is simply true
         traceConfig = {
           enabled: true,
           contextKey: 'traceId',
           generator: () => {
             const timestamp = Date.now().toString(36);
             const random = Math.random().toString(36).substring(2, 8);
             return `${timestamp}-${random}`;
           }
         };
       } else {
         traceConfig = undefined;
       }
       
       const middleware = new LogitronTraceMiddleware(traceConfig);
       return middleware.use(req, res, next);
     };

    if (exclude) {
      consumer
        .apply(middlewareConfig)
        .exclude(...exclude)
        .forRoutes(...forRoutes);
    } else {
      consumer.apply(middlewareConfig).forRoutes(...forRoutes);
    }
  }

  static forRoot(config?: Partial<LoggerConfig>) {
    // Store config for middleware access
    LogitronLoggerModule.loggerConfig = config || {};
    
    return {
      module: LogitronLoggerModule,
      providers: [
        {
          provide: LOGITRON_LOGGER_CONFIG,
          useValue: config || {},
        },
        {
          provide: LogitronLoggerService,
          useFactory: (loggerConfig: Partial<LoggerConfig>) => {
            return new LogitronLoggerService(loggerConfig);
          },
          inject: [LOGITRON_LOGGER_CONFIG],
        },
      ],
      exports: [LogitronLoggerService],
      global: true,
    };
  }

  static forRootAsync(options: LogitronAsyncOptions) {
    return {
      module: LogitronLoggerModule,
      imports: options.imports || [],
      providers: [
        ...this.createAsyncProviders(options),
        {
          provide: LogitronLoggerService,
          useFactory: (loggerConfig: Partial<LoggerConfig>) => {
            return new LogitronLoggerService(loggerConfig);
          },
          inject: [LOGITRON_LOGGER_CONFIG],
        },
      ],
      exports: [LogitronLoggerService],
      global: true,
    };
  }

  private static createAsyncProviders(options: LogitronAsyncOptions) {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass!,
        useClass: options.useClass!,
      },
    ];
  }

  private static createAsyncOptionsProvider(options: LogitronAsyncOptions) {
    if (options.useFactory) {
      return {
        provide: LOGITRON_LOGGER_CONFIG,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }
    return {
      provide: LOGITRON_LOGGER_CONFIG,
      useFactory: async (optionsFactory: LogitronOptionsFactory) =>
        await optionsFactory.createLogitronOptions(),
      inject: [options.useExisting || options.useClass!],
    };
  }

  static forFeature(context: string) {
    const providerToken = `${LOGITRON_LOGGER_PREFIX}${context.toUpperCase()}`;
    return {
      module: LogitronLoggerModule,
      providers: [
        {
          provide: providerToken,
          useFactory: (baseLogger: LogitronLoggerService) => {
            return baseLogger.child(context);
          },
          inject: [LogitronLoggerService],
        },
      ],
      exports: [providerToken],
    };
  }
}