type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
}

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
  };

  const formatted = formatLog(entry);
  
  if (level === "error") {
    console.error(formatted);
  } else if (level === "warn") {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

export const logger = {
  info: (message: string, data?: Record<string, unknown>) => log("info", message, data),
  warn: (message: string, data?: Record<string, unknown>) => log("warn", message, data),
  error: (message: string, data?: Record<string, unknown>) => log("error", message, data),

  authFailure: (reason: string, data?: Record<string, unknown>) => {
    log("warn", `Auth failure: ${reason}`, data);
  },

  messageDeliveryFailure: (chatId: string, userId: string, error: string) => {
    log("error", "Message delivery failed", { chatId, userId, error });
  },

  dbConnection: (status: "connected" | "error", error?: string) => {
    if (status === "connected") {
      log("info", "Database connected");
    } else {
      log("error", "Database connection error", { error });
    }
  },
};
