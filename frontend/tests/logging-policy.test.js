import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readdir, readFile } from 'node:fs/promises'
import { loadSource } from './load-source.js'

for (const level of ['debug', 'info', 'warn', 'error', 'silent']) {
  test(`browser logger is silent even with legacy level=${level}`, async t => {
    const calls = []
    for (const method of ['log', 'debug', 'info', 'warn', 'error']) t.mock.method(console, method, (...args) => calls.push(args))
    const { logger } = await loadSource('src/utils/logger.js', { VITE_LOG_LEVEL: level, VITE_ENABLE_CONSOLE: 'true' })
    for (const method of ['log', 'debug', 'info', 'warn', 'error']) logger.scoped('fixture')[method]('private fixture')
    assert.deepEqual(calls, [])
  })
}

test('browser sources do not call or overwrite console', async () => {
  const root = new URL('../src/', import.meta.url)
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory)
      if (entry.isDirectory()) await walk(file)
      else if (/\.(vue|js)$/.test(entry.name)) assert.doesNotMatch(await readFile(file, 'utf8'), /\bconsole\s*\./, file.pathname)
    }
  }
  await walk(root)
})

test('build and dependency transforms drop console calls without a global monkeypatch', async () => {
  const config = (await loadSource('vite.config.js', {}, new URL('../', import.meta.url).pathname)).default
  const value = config({ mode: 'production' })
  assert.ok(value.esbuild.drop.includes('console'))
  assert.ok(value.optimizeDeps.esbuildOptions.drop.includes('console'))
  assert.doesNotMatch(await readFile(new URL('../src/main.js', import.meta.url), 'utf8'), /installConsolePolicy/)
})

test('account password inputs belong to a submitted form', async () => {
  const source = await readFile(new URL('../src/views/UserManagement.vue', import.meta.url), 'utf8')
  assert.match(source, /<form\s[^>]*@submit\.prevent=/)
  assert.match(source, /type="submit"/)
  assert.match(source, /type="button" @click="cancelModal"/)
})
