const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100
}

const normalizeLevel = (level) => {
  const normalized = String(level || '').toLowerCase()
  return Object.prototype.hasOwnProperty.call(LEVELS, normalized) ? normalized : null
}

const configuredLevel = normalizeLevel(import.meta.env.VITE_LOG_LEVEL)
const defaultLevel = import.meta.env.PROD ? 'warn' : 'debug'
const activeLevel = configuredLevel || defaultLevel

const shouldLog = (level) => LEVELS[level] >= LEVELS[activeLevel]

const formatArgs = (scope, args) => {
  if (!scope) return args
  return [`[${scope}]`, ...args]
}

function createLogger(scope = '') {
  return {
    debug: (...args) => {
      if (shouldLog('debug')) globalThis.console.debug(...formatArgs(scope, args))
    },
    log: (...args) => {
      if (shouldLog('info')) globalThis.console.log(...formatArgs(scope, args))
    },
    info: (...args) => {
      if (shouldLog('info')) globalThis.console.info(...formatArgs(scope, args))
    },
    warn: (...args) => {
      if (shouldLog('warn')) globalThis.console.warn(...formatArgs(scope, args))
    },
    error: (...args) => {
      if (shouldLog('error')) globalThis.console.error(...formatArgs(scope, args))
    },
    scoped: (childScope) => createLogger(scope ? `${scope}:${childScope}` : childScope)
  }
}

export const logger = createLogger()
export { createLogger }
