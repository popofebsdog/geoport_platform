const silent = () => {}

// Keep the shared call sites compatible without writing browser diagnostics.
export const logger = Object.freeze({
  debug: silent, log: silent, info: silent, warn: silent, error: silent,
  scoped: () => logger
})
export const createLogger = () => logger
