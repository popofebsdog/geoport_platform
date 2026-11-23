<template>
  <div class="shared-project-page">
    <header class="shared-project-header"><strong>GeoPort</strong><span>唯讀專案</span><time v-if="snapshot?.expiresAt">到期 {{ date(snapshot.expiresAt) }}</time><button type="button" class="publication-icon" title="重新整理" aria-label="重新整理" :disabled="loading" @click="load"><RefreshCw :size="17" /></button></header>
    <div v-if="error" class="shared-project-state" role="alert"><Link2Off :size="28" /><h1>分享連結已失效或無法讀取</h1><p>{{ error }}</p><button type="button" class="publication-command" @click="load"><RefreshCw :size="15" />重試</button></div>
    <p v-else-if="loading && !snapshot" class="shared-project-state" role="status">載入專案中…</p>
    <ProjectPublicationSnapshot v-if="snapshot" :key="`${snapshot.project.id}:${snapshot.generatedAt}`" :snapshot="snapshot" :asset-loader="loadAsset" />
  </div>
</template>

<script>
import { RefreshCw, Link2Off } from '@lucide/vue'
import ProjectPublicationSnapshot from '@/components/project/ProjectPublicationSnapshot.vue'
import { readSharedProject, publicationAsset } from '@/services/publicationService.js'

export default {
  name: 'SharedProject', components: { RefreshCw, Link2Off, ProjectPublicationSnapshot },
  data: () => ({ snapshot: null, loading: false, error: '', token: '', requestId: 0, controller: null, expiryTimer: null, refreshTimer: null }),
  watch: { '$route.hash'() { this.snapshot = null; this.load() } },
  mounted() { this.robots = document.createElement('meta'); this.robots.name = 'robots'; this.robots.content = 'noindex,nofollow'; document.head.appendChild(this.robots); this.load(); this.refreshTimer = setInterval(() => { if (!document.hidden && !this.loading) this.load() }, 60000) },
  methods: {
    date(value) { return new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) },
    async load() {
      const requestId = ++this.requestId; this.controller?.abort(); this.controller = new AbortController(); clearTimeout(this.expiryTimer); this.loading = true; this.error = ''; this.token = this.$route.hash.slice(1)
      try {
        if (!/^[A-Za-z0-9_-]{43}$/.test(this.token)) throw new Error('分享網址不完整')
        const snapshot = await readSharedProject(this.token, this.controller.signal)
        if (requestId !== this.requestId) return
        this.snapshot = snapshot
        const remaining = new Date(snapshot.expiresAt).getTime() - Date.now()
        this.expiryTimer = setTimeout(() => { this.snapshot = null; this.error = '分享期限已到，請聯絡分享者' }, Math.max(0, remaining))
      } catch (error) { if (requestId === this.requestId) { this.snapshot = null; this.error = error.message } } finally { if (requestId === this.requestId) this.loading = false }
    },
    loadAsset(asset, signal) { return publicationAsset(this.snapshot.kind, this.snapshot.project.id, asset, this.token, signal) }
  },
  beforeUnmount() { this.requestId++; this.controller?.abort(); clearTimeout(this.expiryTimer); clearInterval(this.refreshTimer); this.robots?.remove() }
}
</script>

<style scoped>
.shared-project-page{height:100%;overflow:auto;background:#f3f7f8;color:#172a33}.shared-project-header{display:flex;align-items:center;gap:18px;padding:14px 24px;background:#fff;border-bottom:1px solid #d8e4e8;min-height:60px}.shared-project-header>strong{font-size:18px;font-weight:600}.shared-project-header>span{font-size:12px;color:#426c79}.shared-project-header time{margin-left:auto;font-size:11px;color:#637781}.shared-project-header>button{margin-left:auto}.shared-project-header time+button{margin-left:0}.shared-project-state{max-width:650px;margin:70px auto;padding:24px;text-align:center;display:flex;align-items:center;flex-direction:column;gap:16px;color:#637781;font-size:13px}.shared-project-state h1{font-size:19px;color:#172a33;font-weight:600}.shared-project-state p{overflow-wrap:anywhere;line-height:1.7}@media(max-width:600px){.shared-project-header{padding:12px 14px;gap:12px;flex-wrap:wrap}.shared-project-header time{font-size:10px}.shared-project-state{margin-top:35px}}
</style>
