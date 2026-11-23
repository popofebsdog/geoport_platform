import api from './api.js'
import { apiUrl } from '@/utils/urls.js'

const target = (kind, id) => `/project-publications/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`
async function json(response) {
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.success) throw new Error(result.message || '目前無法讀取資料，請稍後重試')
  return result.data
}

export function buildShareUrl(token, origin = window.location.origin) {
  const url = new URL('/shared-project', origin)
  url.hash = token
  return url.toString()
}

export const getPublication = async (kind, id) => (await api.get(target(kind, id))).data
export const listShares = async (kind, id) => (await api.get(`${target(kind, id)}/shares`)).data
export const createShare = async (kind, id) => (await api.post(`${target(kind, id)}/shares`)).data
export const revokeShare = (kind, id, shareId) => api.delete(`${target(kind, id)}/shares/${encodeURIComponent(shareId)}`)
export const readSharedProject = (token, signal) => fetch(apiUrl('/shared-project'), {
  headers: { 'X-Share-Token': token }, credentials: 'omit', cache: 'no-store', signal
}).then(json)

export async function publicationAsset(kind, id, asset, token, signal) {
  const suffix = `/assets/${encodeURIComponent(asset.collection)}/${encodeURIComponent(asset.id)}`
  const path = token ? `/shared-project${suffix}` : `${target(kind, id)}${suffix}`
  const headers = token ? { 'X-Share-Token': token } : { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` }
  const response = await fetch(apiUrl(path), { headers, credentials: token ? 'omit' : 'include', cache: 'no-store', signal })
  if (!response.ok) throw new Error('附件已失效或目前無法讀取')
  return response.blob()
}

export async function downloadProjectReport(kind, id, format) {
  if (!['pdf', 'docx'].includes(format)) throw new Error('不支援的報告格式')
  const response = await fetch(apiUrl(`${target(kind, id)}/report/${format}`), {
    headers: { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` }, credentials: 'include', cache: 'no-store'
  })
  if (!response.ok) { const result = await response.json().catch(() => ({})); throw new Error(result.message || '報告產出失敗，請稍後重試') }
  return response.blob()
}

export function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name.replace(/[\r\n/\\]/g, '_')
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}
