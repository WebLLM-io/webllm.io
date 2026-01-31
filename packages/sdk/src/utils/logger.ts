export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

export class Logger {
  private level: number;
  private prefix: string;

  constructor(prefix = 'webllm', level: LogLevel = 'warn') {
    this.prefix = `[${prefix}]`;
    this.level = LEVELS[level];
  }

  setLevel(level: LogLevel): void {
    this.level = LEVELS[level];
  }

  debug(...args: unknown[]): void {
    if (this.level <= LEVELS.debug) console.debug(this.prefix, ...args);
  }

  info(...args: unknown[]): void {
    if (this.level <= LEVELS.info) console.info(this.prefix, ...args);
  }

  warn(...args: unknown[]): void {
    if (this.level <= LEVELS.warn) console.warn(this.prefix, ...args);
  }

  error(...args: unknown[]): void {
    if (this.level <= LEVELS.error) console.error(this.prefix, ...args);
  }
}

export const logger = new Logger();
