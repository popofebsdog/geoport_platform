<template>
  <div class="publication-actions" @click.stop>
    <button v-if="allowShare" type="button" class="publication-icon" :disabled="!projectId" title="分享唯讀連結" aria-label="分享唯讀連結" @click="open('share')"><Share2 :size="16" /></button>
    <button type="button" class="publication-icon" :disabled="!projectId" title="產出專案報告" aria-label="產出專案報告" @click="open('report')"><FileText :size="16" /></button>
    <Teleport to="body">
      <div v-if="mode" class="publication-overlay" @click.self="close" @keydown.esc="close">
        <section ref="dialog" class="publication-dialog" :class="[{ 'is-report': mode === 'report' }, { 'is-dark': isDarkMode }]" role="dialog" aria-modal="true" :aria-label="mode === 'share' ? '專案唯讀分享' : '專案報告'" tabindex="-1" @keydown.tab="trapFocus">
          <header class="publication-modal-header">
            <div><span class="publication-eyebrow">{{ mode === 'share' ? '唯讀分享' : '專案報告' }}</span><h2>{{ projectName }}</h2></div>
            <button type="button" class="publication-icon" title="關閉" aria-label="關閉" @click="close"><X :size="18" /></button>
          </header>
          <p v-if="error" class="publication-error" role="alert">{{ error }}<button v-if="!busy" type="button" @click="reload"><RefreshCw :size="14" />重試</button></p>
          <div v-if="mode === 'share'" class="publication-share-body">
            <div class="publication-access"><LockKeyhole :size="16" /><strong>僅限此專案</strong><span>唯讀</span><span>7 天</span></div>
            <div v-if="createdUrl" class="publication-copy-row">
              <input ref="linkInput" :value="createdUrl" readonly aria-label="唯讀分享網址" @focus="$event.target.select()" />
              <button type="button" class="publication-icon" :title="copied ? '已複製' : '複製連結'" :aria-label="copied ? '已複製' : '複製連結'" @click="copy"><Check v-if="copied" :size="17" /><Copy v-else :size="17" /></button>
            </div>
            <p v-if="createdExpiry" class="publication-date">到期：{{ date(createdExpiry) }}</p>
            <div class="publication-share-toolbar"><h3>分享紀錄</h3><button type="button" class="publication-command" :disabled="busy" @click="create"><Link2 :size="15" />{{ busy ? '處理中…' : '建立連結' }}</button></div>
            <p v-if="loading" class="publication-empty" role="status">載入中…</p>
            <p v-else-if="!shares.length" class="publication-empty">尚無分享紀錄</p>
            <ul v-else class="publication-share-list">
              <li v-for="share in shares" :key="share.id"><div><strong>{{ share.revokedAt ? '已撤銷' : share.active ? '有效' : '已到期' }}</strong><span>到期 {{ date(share.expiresAt) }}</span></div><button v-if="share.active" type="button" class="publication-icon danger" :disabled="busy" title="撤銷分享" aria-label="撤銷分享" @click="revoke(share)"><Unlink :size="16" /></button></li>
            </ul>
            <span class="publication-live" role="status" aria-live="polite">{{ copied ? '已複製連結' : notice }}</span>
          </div>
          <template v-else>
            <div class="publication-export-toolbar"><span>{{ snapshot ? `產出時間 ${date(snapshot.generatedAt)}` : '' }}</span><div><button type="button" class="publication-command" :disabled="!snapshot || busy" @click="download('pdf')"><FileDown :size="15" />{{ exporting === 'pdf' ? '產出中…' : '下載 PDF' }}</button><button type="button" class="publication-command" :disabled="!snapshot || busy" @click="download('docx')"><FileDown :size="15" />{{ exporting === 'docx' ? '產出中…' : '下載 Word' }}</button></div></div>
            <div class="publication-preview"><p v-if="loading" class="publication-empty" role="status">整理專案資料中…</p><ProjectPublicationSnapshot v-else-if="snapshot" :snapshot="snapshot" :asset-loader="loadAsset" compact /></div>
          </template>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { Share2, FileText, X, Copy, Check, Link2, Unlink, FileDown, LockKeyhole, RefreshCw } from '@lucide/vue'
import { buildShareUrl, createShare, listShares, revokeShare, getPublication, downloadProjectReport, publicationAsset, saveBlob } from '@/services/publicationService.js'
import ProjectPublicationSnapshot from './ProjectPublicationSnapshot.vue'

export default {
  name: 'ProjectPublicationActions',
  components: { Share2, FileText, X, Copy, Check, Link2, Unlink, FileDown, LockKeyhole, RefreshCw, ProjectPublicationSnapshot },
  props: { kind: { type: String, required: true }, projectId: String, projectName: String, allowShare: { type: Boolean, default: false }, isDarkMode: Boolean },
  data: () => ({ mode: '', loading: false, busy: false, error: '', shares: [], snapshot: null, createdUrl: '', createdExpiry: '', copied: false, notice: '', exporting: '', generation: 0, previousFocus: null }),
  methods: {
    date(value) { return new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) },
    async open(mode) { this.previousFocus = document.activeElement; this.mode = mode; this.createdUrl = ''; this.createdExpiry = ''; this.notice = ''; this.error = ''; this.copied = false; await this.$nextTick(); this.$refs.dialog?.focus(); this.reload() },
    close() { this.generation++; this.mode = ''; this.snapshot = null; this.createdUrl = ''; this.previousFocus?.focus?.() },
    trapFocus(event) { const nodes = [...this.$refs.dialog.querySelectorAll('button:not(:disabled), input, [tabindex="0"]')]; if (!nodes.length) return; const first = nodes[0], last = nodes.at(-1); if (event.shiftKey && (document.activeElement === first || document.activeElement === this.$refs.dialog)) { event.preventDefault(); last.focus() } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() } },
    async reload() { const generation = ++this.generation; this.loading = true; this.error = ''; try { const value = this.mode === 'share' ? await listShares(this.kind, this.projectId) : await getPublication(this.kind, this.projectId); if (generation !== this.generation) return; if (this.mode === 'share') this.shares = value; else this.snapshot = value } catch (error) { if (generation === this.generation) this.error = error.response?.data?.message || error.message } finally { if (generation === this.generation) this.loading = false } },
    async create() { this.busy = true; this.error = ''; try { const share = await createShare(this.kind, this.projectId); if (!this.mode) return; this.createdUrl = buildShareUrl(share.token); this.createdExpiry = share.expiresAt; this.copied = false; this.shares = await listShares(this.kind, this.projectId) } catch (error) { this.error = error.response?.data?.message || error.message } finally { this.busy = false } },
    async revoke(share) { if (!window.confirm(`撤銷此專案的分享連結？`)) return; this.busy = true; this.error = ''; try { await revokeShare(this.kind, this.projectId, share.id); this.createdUrl = ''; this.createdExpiry = ''; this.notice = '分享已撤銷'; this.shares = await listShares(this.kind, this.projectId) } catch (error) { this.error = error.response?.data?.message || error.message } finally { this.busy = false } },
    async copy() { try { await navigator.clipboard.writeText(this.createdUrl); this.copied = true } catch { this.$refs.linkInput?.select(); this.copied = document.execCommand('copy'); if (!this.copied) this.error = '目前無法使用剪貼簿' } },
    async download(format) { this.busy = true; this.exporting = format; this.error = ''; try { const blob = await downloadProjectReport(this.kind, this.projectId, format); saveBlob(blob, `${this.projectName || '專案報告'}.${format}`) } catch (error) { this.error = error.message } finally { this.busy = false; this.exporting = '' } },
    loadAsset(asset, signal) { return publicationAsset(this.kind, this.projectId, asset, null, signal) }
  },
  beforeUnmount() { this.generation++ }
}
</script>

<style>
.publication-actions{display:inline-flex;align-items:center;gap:2px;flex-shrink:0}.publication-icon{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border:1px solid transparent;border-radius:4px;background:transparent;color:inherit;flex-shrink:0}.publication-icon:hover{background:#eaf2f4;border-color:#cbdce0}.publication-icon:disabled,.publication-command:disabled{opacity:.45;cursor:default}.publication-overlay{position:fixed;inset:0;z-index:1600;background:#13242e80;padding:24px;display:flex;align-items:center;justify-content:center;color:#172a33}.publication-dialog{display:flex;flex-direction:column;width:480px;max-width:100%;max-height:calc(100dvh - 48px);background:#fff;border:1px solid #cad7db;border-radius:6px;box-shadow:0 18px 60px #12242d33;outline:none;overflow:hidden;font-size:13px;letter-spacing:0}.publication-dialog.is-report{width:1100px;height:calc(100dvh - 48px)}.publication-modal-header{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:18px 20px;border-bottom:1px solid #dce5e8;flex-shrink:0}.publication-modal-header h2{font-size:17px;font-weight:600;line-height:1.45;overflow-wrap:anywhere;margin:3px 0 0}.publication-eyebrow{font-size:11px;color:#637781}.publication-share-body{padding:18px 20px;overflow:auto}.publication-access{display:flex;align-items:center;flex-wrap:wrap;gap:12px;padding:0 0 18px;border-bottom:1px solid #dce5e8}.publication-access span{font-size:12px;color:#637781}.publication-copy-row{display:flex;align-items:center;gap:6px;margin-top:18px}.publication-copy-row input{flex:1;min-width:0;border:1px solid #c7d7dc;border-radius:4px;padding:8px;font-size:12px;background:transparent}.publication-date{font-size:11px;color:#637781;margin:7px 0 14px}.publication-share-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:18px}.publication-share-toolbar h3{font-size:13px;font-weight:600}.publication-command{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid #bdced4;background:#fff;border-radius:4px;padding:7px 10px;white-space:nowrap;font-size:12px;font-weight:600;min-height:32px;color:#245c70}.publication-command:hover{background:#edf5f6}.publication-share-list{margin-top:12px;list-style:none;padding:0}.publication-share-list li{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:12px 0;border-top:1px solid #e3ebed}.publication-share-list strong{display:block;font-size:12px}.publication-share-list span{display:block;font-size:11px;margin-top:3px;color:#637781}.publication-icon.danger{color:#a43c37}.publication-live{display:block;min-height:16px;font-size:11px;color:#287169;margin-top:10px}.publication-export-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 20px;border-bottom:1px solid #dce5e8;flex-wrap:wrap;flex-shrink:0}.publication-export-toolbar>span{font-size:11px;color:#637781}.publication-export-toolbar>div{display:flex;gap:8px}.publication-preview{overflow:auto;flex:1;min-height:0}.publication-empty{padding:28px 0;text-align:center;color:#637781;font-size:13px}.publication-error{margin:10px 20px 0;color:#9e3731;font-size:12px;display:flex;gap:10px;align-items:center;overflow-wrap:anywhere}.publication-error button{display:inline-flex;align-items:center;gap:4px;white-space:nowrap}.publication-dialog.is-dark{background:#18242b;color:#edf3f5;border-color:#43545b}.is-dark .publication-modal-header,.is-dark .publication-access,.is-dark .publication-export-toolbar,.is-dark .publication-share-list li{border-color:#3d5059}.is-dark .publication-command{background:#253941;color:#deedf0;border-color:#4d626b}.is-dark .publication-icon:hover{background:#2f454f;border-color:#4d626b}@media(max-width:600px){.publication-overlay{padding:12px}.publication-dialog{max-height:calc(100dvh - 24px)}.publication-dialog.is-report{height:calc(100dvh - 24px)}.publication-modal-header,.publication-export-toolbar{padding:12px 14px}.publication-share-body{padding:14px}.publication-modal-header h2{font-size:15px}.publication-export-toolbar>div{width:100%}.publication-export-toolbar .publication-command{flex:1}}
</style>
