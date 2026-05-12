import util from 'node:util';

const LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  silent: 100
};

const SENSITIVE_KEYS = [
  'authorization',
  'cookie',
  'password',
  'token',
  'secret',
  'jwt',
  'apiKey',
  'accessKey',
  'refreshToken'
];

let consoleBridgeInstalled = false;

function normalizeLevel(level) {
  const normalized = String(level || '').toLowerCase();
  return Object.prototype.hasOwnProperty.call(LEVELS, normalized) ? normalized : null;
}

function activeLevel() {
  return normalizeLevel(process.env.LOG_LEVEL) || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
}

function logFormat() {
  return String(process.env.LOG_FORMAT || (process.env.NODE_ENV === 'production' ? 'json' : 'pretty')).toLowerCase();
}

function shouldLog(level) {
  return LEVELS[level] >= LEVELS[activeLevel()];
}

function isSensitiveKey(key) {
  const normalized = String(key).toLowerCase();
  return SENSITIVE_KEYS.some((sensitive) => normalized.includes(sensitive.toLowerCase()));
}

function serializeError(error) {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: error.code,
    statusCode: error.statusCode,
    status: error.status
  };
}

function sanitize(value, depth = 0) {
  if (depth > 6) return '[MaxDepth]';
  if (value instanceof Error) return serializeError(value);
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1));

  const result = {};
  for (const [key, child] of Object.entries(value)) {
    result[key] = isSensitiveKey(key) ? '[REDACTED]' : sanitize(child, depth + 1);
  }
  return result;
}

function normalizeArgs(args) {
  if (args.length === 0) return { message: '' };

  const [first, ...rest] = args;
  const meta = {};
  const details = [];

  for (const arg of rest) {
    if (arg instanceof Error) {
      meta.error = sanitize(arg);
    } else if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
      Object.assign(meta, sanitize(arg));
    } else {
      details.push(arg);
    }
  }

  if (details.length > 0) {
    meta.details = sanitize(details);
  }

  if (first instanceof Error) {
    meta.error = sanitize(first);
    return { message: first.message, meta };
  }

  if (first && typeof first === 'object' && !Array.isArray(first)) {
    return { message: 'log event', meta: { ...sanitize(first), ...meta } };
  }

  return { message: String(first), meta };
}

function write(level, scope, args) {
  if (!shouldLog(level)) return;

  const { message, meta } = normalizeArgs(args);
  const event = {
    timestamp: new Date().toISOString(),
    level,
    service: process.env.SERVICE_NAME || 'geoport-backend',
    scope,
    message,
    ...meta
  };

  const stream = level === 'error' || level === 'fatal' ? process.stderr : process.stdout;

  if (logFormat() === 'json') {
    stream.write(`${JSON.stringify(event)}\n`);
    return;
  }

  const { timestamp, service, ...rest } = event;
  const metaText = Object.keys(rest).some((key) => !['level', 'scope', 'message'].includes(key))
    ? ` ${util.inspect(Object.fromEntries(Object.entries(rest).filter(([key]) => !['level', 'scope', 'message'].includes(key))), {
      colors: false,
      depth: 6,
      breakLength: 120
    })}`
    : '';
  stream.write(`${timestamp} ${level.toUpperCase()} [${service}:${scope}] ${message}${metaText}\n`);
}

export function createLogger(scope = 'app') {
  return {
    trace: (...args) => write('trace', scope, args),
    debug: (...args) => write('debug', scope, args),
    info: (...args) => write('info', scope, args),
    warn: (...args) => write('warn', scope, args),
    error: (...args) => write('error', scope, args),
    fatal: (...args) => write('fatal', scope, args),
    child: (childScope) => createLogger(scope ? `${scope}:${childScope}` : childScope)
  };
}

export function installConsoleBridge() {
  if (consoleBridgeInstalled) return;
  consoleBridgeInstalled = true;

  const consoleLogger = createLogger('console');
  console.log = (...args) => consoleLogger.info(...args);
  console.info = (...args) => consoleLogger.info(...args);
  console.warn = (...args) => consoleLogger.warn(...args);
  console.error = (...args) => consoleLogger.error(...args);
  console.debug = (...args) => consoleLogger.debug(...args);
}

export const logger = createLogger();
