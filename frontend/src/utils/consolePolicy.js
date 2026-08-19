const consoleEnabled = import.meta.env.VITE_ENABLE_CONSOLE === 'true' || Boolean(import.meta.env.VITE_LOG_LEVEL)

export function installConsolePolicy() {
  if (consoleEnabled || typeof globalThis === 'undefined') return

  globalThis.console.debug = () => {}
  globalThis.console.error = () => {}
  globalThis.console.info = () => {}
  globalThis.console.log = () => {}
  globalThis.console.warn = () => {}
}
