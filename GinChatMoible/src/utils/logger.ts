// Use global __DEV__ variable
declare const __DEV__: boolean;

// Simple logger for the app
export const Logger = {
  api: {
    debug: (message: string, ...args: any[]) => __DEV__ && console.log(`[API] ${message}`, ...args),
    info: (message: string, ...args: any[]) => __DEV__ && console.info(`[API] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => console.warn(`[API] ${message}`, ...args),
    error: (message: string, ...args: any[]) => console.error(`[API] ${message}`, ...args),
  },
  websocket: {
    debug: (message: string, ...args: any[]) => __DEV__ && console.log(`[WS] ${message}`, ...args),
    info: (message: string, ...args: any[]) => __DEV__ && console.info(`[WS] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => console.warn(`[WS] ${message}`, ...args),
    error: (message: string, ...args: any[]) => console.error(`[WS] ${message}`, ...args),
  },
  auth: {
    debug: (message: string, ...args: any[]) => __DEV__ && console.log(`[AUTH] ${message}`, ...args),
    info: (message: string, ...args: any[]) => __DEV__ && console.info(`[AUTH] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => console.warn(`[AUTH] ${message}`, ...args),
    error: (message: string, ...args: any[]) => console.error(`[AUTH] ${message}`, ...args),
  },
  chat: {
    debug: (message: string, ...args: any[]) => __DEV__ && console.log(`[CHAT] ${message}`, ...args),
    info: (message: string, ...args: any[]) => __DEV__ && console.info(`[CHAT] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => console.warn(`[CHAT] ${message}`, ...args),
    error: (message: string, ...args: any[]) => console.error(`[CHAT] ${message}`, ...args),
  },
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
  info: (message: string, ...args: any[]) => __DEV__ && console.info(message, ...args),
  debug: (message: string, ...args: any[]) => __DEV__ && console.log(message, ...args),
};

// Setup production logging - keep errors and warnings, remove debug/info
export const setupProductionLogging = () => {
  if (!__DEV__) {
    // Remove debug and info logs in production
    console.log = () => {};
    console.info = () => {};
    console.debug = () => {};

    // Keep warnings and errors for important issues
    // console.warn and console.error are preserved
  }
};

// Error boundary helper
export const logError = (error: Error, errorInfo?: any) => {
  console.error('Unhandled error:', error.message, __DEV__ ? error.stack : '');
};