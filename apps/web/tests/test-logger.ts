interface LogEntry {
  timestamp: number;
  level: string;
  source: string;
  message: string;
  args: any[];
}

class TestLogger {
  private logs: LogEntry[] = [];
  private verbose = process.env.TEST_VERBOSE === 'true';
  private originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
  };

  constructor() {
    this.interceptConsole();
  }

  private interceptConsole() {
    console.log = (...args) => this.log('log', 'console', args[0], ...args.slice(1));
    console.error = (...args) => this.log('error', 'console', args[0], ...args.slice(1));
    console.warn = (...args) => this.log('warn', 'console', args[0], ...args.slice(1));
    console.info = (...args) => this.log('info', 'console', args[0], ...args.slice(1));
    console.debug = (...args) => this.log('debug', 'console', args[0], ...args.slice(1));
  }

  log(level: string, source: string, message: string, ...args: any[]) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      source,
      message,
      args,
    };
    
    this.logs.push(entry);
    
    if (this.verbose) {
      this.originalConsole[level as keyof typeof this.originalConsole]?.(
        `[${source}] ${message}`,
        ...args
      );
    }
  }

  clear() {
    this.logs = [];
  }

  dumpLogs() {
    if (this.logs.length === 0) return;
    
    this.originalConsole.log('\n=== TEST LOGS ===');
    this.logs.forEach(entry => {
      const time = new Date(entry.timestamp).toISOString();
      this.originalConsole.log(
        `[${time}] [${entry.source}] [${entry.level.toUpperCase()}] ${entry.message}`,
        ...entry.args
      );
    });
    this.originalConsole.log('=== END LOGS ===\n');
  }

  restore() {
    Object.assign(console, this.originalConsole);
  }
}

export const testLogger = new TestLogger();
