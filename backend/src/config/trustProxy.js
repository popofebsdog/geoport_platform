export function parseTrustProxy(value, production = false) {
  if (value === undefined || value === '') return production ? 1 : false;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'false') return false;
  if (normalized === 'true') throw new Error('TRUST_PROXY must specify proxy hops or trusted subnets, not trust every client');
  if (/^\d+$/.test(normalized) && Number.isSafeInteger(Number(normalized))) return Number(normalized);
  if (/^-\d/.test(normalized)) throw new Error('TRUST_PROXY cannot be negative');
  return normalized.split(',').map(subnet => subnet.trim()).filter(Boolean);
}
