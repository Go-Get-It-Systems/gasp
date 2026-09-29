import Reactotron from 'reactotron-react-native';

// ── Types ─────────────────────────────────────────────────────────

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface TronLogger {
  log: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
  debug: (message: string, data?: unknown) => void;
}

declare global {
  interface Console {
    tron: typeof Reactotron;
    tronLog: TronLogger;
  }
}

// ── Setup ─────────────────────────────────────────────────────────

const reactotron = Reactotron
  .configure({ name: 'GASP' })
  .useReactNative({
    asyncStorage: false,
    networking: {
      ignoreUrls: /symbolicate|logs/,
    },
    errors: { veto: () => false },
  })
  .connect();

// Patch console.log to also show in Reactotron
const originalLog = console.log;
console.log = (...args: unknown[]) => {
  originalLog(...args);
  reactotron.log?.(...args);
};

console.tron = reactotron;

// ── Typed log helper ──────────────────────────────────────────────
// Usage: console.tronLog.log('authStore | login', { userId })
//        console.tronLog.error('socket | connect_error', { message })

const LEVEL_ICONS: Record<LogLevel, string> = {
  info:  'ℹ️',
  warn:  '⚠️',
  error: '🔴',
  debug: '🔵',
};

function createLogger(level: LogLevel) {
  return (message: string, data?: unknown) => {
    const prefix = LEVEL_ICONS[level];
    const label = `${prefix} ${message}`;

    if (data !== undefined) {
      reactotron.display?.({
        name: label,
        value: data,
        preview: typeof data === 'object' ? JSON.stringify(data).slice(0, 100) : String(data),
        important: level === 'error',
      });
    } else {
      if (level === 'error') {
        reactotron.error?.(label, null);
      } else if (level === 'warn') {
        reactotron.warn?.(label);
      } else {
        reactotron.log?.(label);
      }
    }
  };
}

console.tronLog = {
  log:   createLogger('info'),
  warn:  createLogger('warn'),
  error: createLogger('error'),
  debug: createLogger('debug'),
};

export default reactotron;
