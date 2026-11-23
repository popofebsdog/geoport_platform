import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const names = ['database.sql.gz','uploads.tar.gz','data.tar.gz'];
async function fingerprint(root, name) {
  const file = path.join(root, name);
  const stat = await fs.lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Backup archives must be regular files');
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return { name, bytes: stat.size, sha256: hash.digest('hex') };
}
async function writeManifest(root) {
  const files = [];
  for (const name of names) files.push(await fingerprint(root, name));
  await fs.writeFile(path.join(root,'manifest.json'), JSON.stringify({ format:1, createdAt:new Date().toISOString(), files },null,2), { flag:'wx',mode:0o600 });
}
export async function verifyBackup(root) {
  const manifest = JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
  if (manifest.format !== 1 || manifest.files?.length !== names.length) throw new Error('Invalid backup manifest');
  for (const name of names) {
    const expected = manifest.files.find(file => file.name === name);
    const actual = await fingerprint(root, name);
    if (!expected || expected.sha256 !== actual.sha256 || expected.bytes !== actual.bytes) throw new Error(`Backup checksum mismatch: ${name}`);
  }
  return { verified:true, createdAt:manifest.createdAt, files:names.length };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const root = process.argv[2] === '--create' ? process.argv[3] : process.argv[2];
    if (!root) throw new Error('Provide a backup bundle directory');
    if (process.argv[2] === '--create') await writeManifest(root);
    process.stdout.write(`${JSON.stringify(await verifyBackup(root))}\n`);
  } catch (error) { process.stderr.write(`Backup verification failed: ${error.code || error.message}\n`); process.exitCode=1; }
}
