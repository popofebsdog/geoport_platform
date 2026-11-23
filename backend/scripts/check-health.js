import { pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';
import { verifyBackup } from './verify-backup.js';

export async function checkHealth({ url = process.env.HEALTHCHECK_URL || 'http://localhost/api/ready',
  webhook = process.env.ALERT_WEBHOOK_URL, timeout = 10000 } = {}) {
  const report = { service: 'geoport', checkedAt: new Date().toISOString(), status: 'error', components: {} };
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeout), redirect: 'error' });
    const health = await response.json();
    for (const [name, component] of Object.entries(health.components || {})) report.components[name] = component.status;
    report.status = response.ok && health.status === 'ok' && Object.keys(report.components).length > 0 &&
      Object.values(report.components).every(status => status === 'ok') ? 'ok' : 'error';
  } catch { report.components.endpoint = 'unavailable'; }
  if (process.env.BACKUP_MAX_AGE_HOURS) {
    try {
      const hours = Number(process.env.BACKUP_MAX_AGE_HOURS);
      if (!Number.isFinite(hours) || hours <= 0 || !process.env.BACKUP_ROOT) throw new Error('Backup policy is incomplete');
      const root = process.env.BACKUP_ROOT;
      let latest = 0;
      for (const entry of await fs.readdir(root, { withFileTypes: true })) {
        if (!entry.isDirectory() || !entry.name.startsWith('geoport_bundle_')) continue;
        try {
          const backup = await verifyBackup(path.join(root, entry.name));
          latest = Math.max(latest, Date.parse(backup.createdAt) || 0);
        } catch { /* An incomplete or corrupt bundle is not a usable backup. */ }
      }
      const age = Date.now() - latest;
      report.components.backups = latest && age >= 0 && age <= hours * 3600000 ? 'ok' : 'stale';
      if (report.components.backups !== 'ok') report.status = 'error';
    } catch { report.components.backups = 'unavailable'; report.status = 'error'; }
  }
  if (report.status !== 'ok' && webhook) {
    try {
      const target = new URL(webhook);
      if (target.protocol !== 'https:' && !(target.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(target.hostname))) {
        throw new Error('Webhook must use HTTPS');
      }
      const response = await fetch(target, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(timeout),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `GeoPort health check failed: ${Object.entries(report.components).map(([name,status]) => `${name}:${status}`).join(', ')}` }) });
      report.alert = response.ok ? 'sent' : 'failed';
    } catch { report.alert = 'failed'; }
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await checkHealth();
  process.stdout.write(`${JSON.stringify(report)}\n`);
  process.exitCode = report.status === 'ok' ? 0 : 1;
}
