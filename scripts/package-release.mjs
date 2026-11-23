import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const digest = content => createHash('sha256').update(content).digest('hex');
const roots = new Set(['backend','frontend','docs','scripts','deploy','.github']);
const topFiles = new Set(['.nvmrc','.gitignore','.env.example','AGENTS.md','README.md','package.json','package-lock.json','docker-compose.yml','nginx.conf','start.sh']);
const excluded = new Set(['node_modules','uploads','backups','dist','coverage','.git','.Codex','.agents','.venv','__pycache__']);

function allowed(file) {
  const parts = file.split('/');
  const name = parts.at(-1);
  const isUploadComponent = file.startsWith('frontend/src/components/uploads/');
  if (parts.some((part, index) => excluded.has(part) &&
    !(part === 'dist' && index === 1 && parts[0] === 'frontend') &&
    !(part === 'uploads' && index === 3 && isUploadComponent)) || /(?:credential|secret|service[-_]account)/i.test(name)) return false;
  if (parts.some(part => part.startsWith('.env') && part !== '.env.example')) return false;
  if (parts.length === 1) return topFiles.has(file);
  if (!roots.has(parts[0])) return false;
  return /\.(?:js|cjs|mjs|ts|vue|css|html|json|geojson|csv|sql|sh|md|py|txt|yml|yaml|example|svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|tiff?|pdf|wasm)$/.test(name) || name === 'Dockerfile' || name === '.dockerignore';
}

export async function createRelease(sourceRoot, destination) {
  sourceRoot = path.resolve(sourceRoot);
  destination = path.resolve(destination);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const work = await fs.mkdtemp(path.join(path.dirname(destination), '.geoport-release-'));
  try {
    const staging = path.join(work, 'source');
    await fs.mkdir(staging);
    const files = new Set(execFileSync('git', ['ls-files','--cached','--others','--exclude-standard','-z'], { cwd: sourceRoot, maxBuffer: 10 * 1024 * 1024 }).toString().split('\0').filter(Boolean));
    async function assets(directory) {
      for (const entry of await fs.readdir(path.join(sourceRoot, directory), { withFileTypes: true }).catch(error => {
        if (error.code === 'ENOENT') return [];
        throw error;
      })) {
        const relative = `${directory}/${entry.name}`;
        if (entry.isDirectory()) await assets(relative);
        else files.add(relative);
      }
    }
    await assets('frontend/public');
    await assets('frontend/src/assets');
    await assets('frontend/dist');
    const manifest = { format: 1, createdAt: new Date().toISOString(), sourceCommit: null, files: [] };
    try { manifest.sourceCommit = execFileSync('git', ['rev-parse','--verify','HEAD'], { cwd: sourceRoot, stdio: ['ignore','pipe','ignore'] }).toString().trim(); } catch {}
    for (const file of [...files].sort().filter(allowed)) {
      if (path.posix.isAbsolute(file) || file.split('/').includes('..')) throw new Error('Invalid source path');
      const source = path.join(sourceRoot, file);
      const stat = await fs.lstat(source).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (!stat) continue;
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Refusing non-regular source: ${file}`);
      const contents = await fs.readFile(source);
      const target = path.join(staging, file);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, contents, { mode: stat.mode & 0o777 });
      manifest.files.push({ path: file, bytes: stat.size, sha256: digest(contents) });
    }
    manifest.releaseId = digest(JSON.stringify(manifest.files));
    await fs.writeFile(path.join(staging, 'release-manifest.json'), JSON.stringify(manifest, null, 2));
    const archive = path.join(work, 'source.tar.gz');
    execFileSync('tar', ['-czf',archive,'-C',staging,'.']);
    const sha256 = digest(await fs.readFile(archive));
    await fs.link(archive, destination);
    return { archive: destination, sha256, releaseId: manifest.releaseId, files: manifest.files.length };
  } finally { await fs.rm(work, { recursive: true, force: true }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const destination = process.argv[2] || `releases/geoport-${new Date().toISOString().replace(/[:.]/g, '-')}.tar.gz`;
    process.stdout.write(`${JSON.stringify(await createRelease(process.cwd(), destination))}\n`);
  } catch (error) {
    process.stderr.write(`Release export failed: ${error.code || error.message}\n`);
    process.exitCode = 1;
  }
}
