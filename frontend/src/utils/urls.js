const trimEnd = value => value.replace(/\/+$/, '')
const join = (base, path) => `${trimEnd(base)}/${path.replace(/^\/+/, '')}`
const hasScheme = value => /^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('//')

export const API_BASE_URL = trimEnd(import.meta.env.VITE_API_URL || '/api')

export function apiUrl(path) {
  return join(API_BASE_URL, path)
}

export function fetchWithAccount(url, options = {}) {
  const target = new URL(url, window.location.origin)
  const api = new URL(API_BASE_URL, window.location.origin)
  const assets = new URL(import.meta.env.VITE_STATIC_URL || '/', window.location.origin)
  const under = base => target.origin === base.origin && target.pathname.startsWith(`${trimEnd(base.pathname)}/`)
  const assetPath = target.pathname.slice(trimEnd(assets.pathname).length)
  if (!under(api) && !(under(assets) && /^\/(uploads|data)(\/|$)/.test(assetPath))) return fetch(url, options)
  const headers = new Headers(options.headers)
  const token = localStorage.getItem('authToken')
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
  return fetch(url, { ...options, headers, credentials: 'include' })
}

export function staticUrl(path) {
  if (!path) return ''
  const normalized = path.replace(/\\/g, '/')
  // Monitoring files may arrive as already-resolved API routes, not static paths.
  if (API_BASE_URL && (normalized === API_BASE_URL || normalized.startsWith(`${API_BASE_URL}/`))) return normalized
  const base = trimEnd(import.meta.env.VITE_STATIC_URL || '')
  if (hasScheme(normalized)) {
    const source = new URL(normalized, window.location.origin)
    if (source.origin !== window.location.origin || !/^\/(uploads|data)(\/|$)/.test(source.pathname)) return normalized
    return join(base, `${source.pathname}${source.search}${source.hash}`)
  }
  // Already resolved relative static prefixes must not be added a second time.
  if (base && (normalized === base || normalized.startsWith(`${base}/`))) return normalized
  return join(base, normalized)
}

export function tiTilerAssetUrl(path) {
  const browserUrl = new URL(staticUrl(path), window.location.origin)
  const browserStaticBase = new URL(import.meta.env.VITE_STATIC_URL || '/', window.location.origin)
  const staticPrefix = trimEnd(browserStaticBase.pathname)
  const assetOrigin = import.meta.env.VITE_TITILER_ASSET_ORIGIN
  // Only local/static assets change origin; third-party COGs stay on their own host.
  if (assetOrigin && browserUrl.origin === browserStaticBase.origin && browserUrl.pathname.startsWith(`${staticPrefix}/`)) {
    const target = new URL(assetOrigin)
    target.pathname = join(target.pathname, browserUrl.pathname.slice(staticPrefix.length))
    target.search = browserUrl.search
    target.hash = browserUrl.hash
    return target.toString()
  }
  return browserUrl.toString()
}
