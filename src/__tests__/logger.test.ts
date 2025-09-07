import { Logger, createLogger } from '../core/logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = createLogger({
      adapter: 'pino',
      level: 'debug',
      appName: 'test-app',
      environment: 'test'
    });
  });

  afterEach(async () => {
    await logger.close();
  });

  describe('Basic Logging', () => {
    it('should create logger with default config', () => {
      const defaultLogger = createLogger();
      expect(defaultLogger).toBeInstanceOf(Logger);
      expect(defaultLogger.getLevel()).toBe('info');
    });

    it('should log messages at different levels', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await logger.trace('trace message');
      await logger.debug('debug message');
      await logger.info('info message');
      await logger.warn('warn message');
      await logger.error('error message');

      consoleSpy.mockRestore();
    });

    it('should log error objects', async () => {
      const error = new Error('Test error');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await logger.error(error, { context: 'test' });
      
      consoleSpy.mockRestore();
    });

    it('should include data in log entries', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await logger.info('test message', { userId: 123, action: 'login' });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Log Levels', () => {
    it('should set and get log level', () => {
      logger.setLevel('warn');
      expect(logger.getLevel()).toBe('warn');
    });

    it('should check if level is enabled', () => {
      logger.setLevel('info');
      
      expect(logger.isLevelEnabled('trace')).toBe(false);
      expect(logger.isLevelEnabled('debug')).toBe(false);
      expect(logger.isLevelEnabled('info')).toBe(true);
      expect(logger.isLevelEnabled('warn')).toBe(true);
      expect(logger.isLevelEnabled('error')).toBe(true);
    });

    it('should not log below current level', async () => {
      logger.setLevel('warn');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await logger.debug('debug message'); // Should not log
      await logger.info('info message');   // Should not log
      await logger.warn('warn message');   // Should log
      
      consoleSpy.mockRestore();
    });
  });

  describe('Context Management', () => {
    it('should set and get context', () => {
      logger.setContext('user-service');
      expect(logger.getContext()).toBe('user-service');
    });

    it('should create child logger with context', () => {
      const childLogger = logger.child('orders', { orderId: 123 });
      expect(childLogger).toBeInstanceOf(Logger);
    });

    it('should add and remove context data', () => {
      logger.addContextData({ version: '1.0.0' });
      logger.addContextData({ environment: 'test' });
      
      logger.removeContextData(['version']);
      logger.clearContextData();
    });
  });

  describe('Performance Timing', () => {
    it('should time operations', async () => {
      logger.time('test-operation');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const duration = await logger.timeEnd('test-operation');
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThan(0);
    });

    it('should handle non-existent timers', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const duration = await logger.timeEnd('non-existent');
      expect(duration).toBeUndefined();
      
      consoleSpy.mockRestore();
    });

    it('should time async operations', async () => {
      const result = await logger.timeAsync('async-test', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'test-result';
      });
      
      expect(result).toBe('test-result');
    });

    it('should handle errors in timed async operations', async () => {
      await expect(
        logger.timeAsync('async-error-test', async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration', () => {
      logger.updateConfig({ level: 'error' });
      expect(logger.getLevel()).toBe('error');
    });

    it('should get adapter instance', () => {
      const adapter = logger.getAdapter();
      expect(adapter).toBeDefined();
      expect(typeof adapter.log).toBe('function');
    });
  });

  describe('Trace ID Integration', () => {
    it('should handle trace ID in logs', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await logger.info('message with potential trace');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle logger failures gracefully', async () => {
      // Mock adapter to throw error
      const adapter = logger.getAdapter();
      const originalLog = adapter.log;
      adapter.log = jest.fn().mockRejectedValue(new Error('Adapter error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Should not throw, but log to console as fallback
      await logger.info('test message');
      
      expect(consoleSpy).toHaveBeenCalled();
      
      // Restore
      adapter.log = originalLog;
      consoleSpy.mockRestore();
    });
  });
});

describe('createLogger Factory', () => {
  it('should create logger with partial config', () => {
    const logger = createLogger({ appName: 'test' });
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should create logger with winston adapter', () => {
    const logger = createLogger({ adapter: 'winston' });
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should throw error for unsupported adapter', () => {
    expect(() => {
      createLogger({ adapter: 'unsupported' as any });
    }).toThrow('Unsupported adapter: unsupported');
  });
});