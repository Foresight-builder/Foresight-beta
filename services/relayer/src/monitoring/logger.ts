/**
 * 结构化日志系统
 * 支持 JSON 格式输出，便于 ELK/Loki 等日志聚合系统
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private service: string;
  private defaultContext: LogContext;
  private minLevel: LogLevel;
  private isJson: boolean;

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(
    service: string = "relayer",
    options: {
      minLevel?: LogLevel;
      jsonOutput?: boolean;
      defaultContext?: LogContext;
    } = {}
  ) {
    this.service = service;
    this.minLevel = options.minLevel || (process.env.LOG_LEVEL as LogLevel) || "info";
    this.isJson = options.jsonOutput ?? process.env.LOG_FORMAT === "json";
    this.defaultContext = options.defaultContext || {};
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  private formatEntry(entry: LogEntry): string {
    if (this.isJson) {
      return JSON.stringify(entry);
    }

    // 人类可读格式
    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase().padEnd(5);
    const context = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
    const error = entry.error ? ` [${entry.error.name}: ${entry.error.message}]` : "";
    
    return `${timestamp} [${level}] [${entry.service}] ${entry.message}${context}${error}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
    };

    if (context || Object.keys(this.defaultContext).length > 0) {
      entry.context = { ...this.defaultContext, ...context };
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    const output = this.formatEntry(entry);

    switch (level) {
      case "debug":
      case "info":
        console.log(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "error":
        console.error(output);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    this.log("warn", message, context, error);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log("error", message, context, error);
  }

  /**
   * 创建带有额外上下文的子 logger
   */
  child(context: LogContext): Logger {
    const child = new Logger(this.service, {
      minLevel: this.minLevel,
      jsonOutput: this.isJson,
      defaultContext: { ...this.defaultContext, ...context },
    });
    return child;
  }

  /**
   * 创建带有请求追踪的 logger
   */
  withRequestId(requestId: string): Logger {
    return this.child({ requestId });
  }

  /**
   * 创建带有市场上下文的 logger
   */
  withMarket(marketKey: string): Logger {
    return this.child({ marketKey });
  }
}

// ============================================================
// 专用 Logger 实例
// ============================================================

export const logger = new Logger("relayer", {
  jsonOutput: process.env.LOG_FORMAT === "json",
  minLevel: (process.env.LOG_LEVEL as LogLevel) || "info",
});

export const matchingLogger = new Logger("matching-engine", {
  jsonOutput: process.env.LOG_FORMAT === "json",
  minLevel: (process.env.LOG_LEVEL as LogLevel) || "info",
});

export const settlementLogger = new Logger("settlement", {
  jsonOutput: process.env.LOG_FORMAT === "json",
  minLevel: (process.env.LOG_LEVEL as LogLevel) || "info",
});

export const wsLogger = new Logger("websocket", {
  jsonOutput: process.env.LOG_FORMAT === "json",
  minLevel: (process.env.LOG_LEVEL as LogLevel) || "info",
});

export const redisLogger = new Logger("redis", {
  jsonOutput: process.env.LOG_FORMAT === "json",
  minLevel: (process.env.LOG_LEVEL as LogLevel) || "info",
});

export default logger;

