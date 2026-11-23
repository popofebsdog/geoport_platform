import { test, expect } from '@jest/globals';
import { readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('backend build validates code without installing or removing dependencies', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const commands = JSON.parse(readFileSync(`${root}/package.json`, 'utf8')).scripts;
  expect(commands['build:backend']).not.toMatch(/\binstall\b|\bci\b/);
  const nodemon = `${root}/backend/node_modules/nodemon/package.json`;
  const modified = statSync(nodemon).mtimeMs;
  const result = spawnSync('npm', ['run', 'build:backend'], { cwd: root, encoding: 'utf8', timeout: 15000 });
  expect(result.status).toBe(0);
  expect(statSync(nodemon).mtimeMs).toBe(modified);
});

test('the production backend installs the GDAL commands required by basemap uploads', () => {
  const source = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
  expect(source).toMatch(/apt-get install[\s\S]*?\bgdal-bin\b/);
  expect(source).toMatch(/RUN gdalinfo --version && gdal_translate --version/);
});
