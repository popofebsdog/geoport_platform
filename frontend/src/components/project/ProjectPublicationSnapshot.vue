<template>
  <article v-if="report" class="publication-document" :class="{ compact }">
    <header class="publication-doc-title"><span>{{ report.title }}</span><h1>{{ snapshot.project.name }}</h1></header>
    <section v-for="section in report.sections" :key="section.id" class="publication-section" :data-report-section="section.id">
      <h2>{{ section.title }}</h2>
      <p v-for="(paragraph, index) in section.paragraphs" :key="index" class="publication-prose">{{ paragraph }}</p>
      <dl v-if="section.fields" class="publication-metadata"><div v-for="field in section.fields" :key="field.label"><dt>{{ field.label }}</dt><dd>{{ field.value }}</dd></div></dl>
      <template v-if="section.description"><h3 class="publication-subheading">原始專案說明（登錄內容）</h3><p class="publication-prose">{{ section.description }}</p></template>
      <PublicationMap v-if="section.id === 'location'" :key="snapshot.project.id" :snapshot="snapshot" :asset-loader="assetLoader" />
      <ol v-if="section.entries?.length" class="publication-records">
        <li v-for="entry in section.entries" :key="entry.id" :class="{ 'publication-record-pair': entry.photos?.length }">
          <div><header><strong>{{ entry.title }}</strong></header><dl class="publication-entry-fields"><div v-for="field in entry.fields" :key="field.label"><dt>{{ field.label }}</dt><dd>{{ field.value }}</dd></div></dl><p>原始登錄文字：{{ entry.text }}</p></div>
          <div v-if="entry.photos?.length" class="publication-photos"><PublicationPhoto v-for="photo in entry.photos" :key="photo.id" :photo="photo" :url="photoUrls[photo.id]" :failed="photoErrors[photo.id]" /></div>
        </li>
      </ol>
      <div v-if="section.photos?.length" class="publication-photos"><PublicationPhoto v-for="photo in section.photos" :key="photo.id" :photo="photo" :url="photoUrls[photo.id]" :failed="photoErrors[photo.id]" /></div>
      <div v-for="chart in section.charts || []" :key="chart.key" class="publication-chart">
        <header><h3>{{ chart.title }}</h3><span>{{ chart.status }}</span></header>
        <dl class="publication-entry-fields"><div v-for="field in chart.fields" :key="field.label"><dt>{{ field.label }}</dt><dd>{{ field.value }}</dd></div></dl>
        <p v-for="(paragraph, index) in chart.paragraphs" :key="index" class="publication-prose">{{ paragraph }}</p>
        <div v-if="hasChart(chart.key)" class="publication-chart-area"><component :is="chartInfo(chart.key).component" :data="snapshot.charts[chart.key]" :managed="true" :selected-date="chartInfo(chart.key).date" :region-code="snapshot.project.road" /></div>
        <p v-else class="publication-prose">本次無可繪製的觀測資料。</p>
      </div>
    </section>
    <details class="publication-appendix">
      <summary>{{ report.appendix.title }}</summary>
      <p class="publication-prose">{{ report.appendix.note }}</p>
      <template v-if="report.appendix.description"><h3 class="publication-subheading">專案登錄說明（本次擷取）</h3><p class="publication-prose">{{ report.appendix.description }}</p></template>
      <h3 class="publication-subheading">調查與巡查紀錄</h3>
      <ol v-if="report.appendix.records.length" class="publication-records">
        <li v-for="entry in report.appendix.records" :key="entry.id" :class="{ 'publication-record-pair': entry.photos?.length }">
          <div><header><strong>{{ entry.title }}</strong></header><dl class="publication-entry-fields"><div v-for="field in entry.fields" :key="field.label"><dt>{{ field.label }}</dt><dd>{{ field.value }}</dd></div></dl><p>原始登錄文字：{{ entry.text }}</p></div>
          <div v-if="entry.photos?.length" class="publication-photos"><PublicationPhoto v-for="photo in entry.photos" :key="photo.id" :photo="photo" :url="photoUrls[photo.id]" :failed="photoErrors[photo.id]" /></div>
        </li>
      </ol>
      <p v-else class="publication-prose">本次無調查或巡查紀錄。</p>
      <h3 class="publication-subheading">{{ snapshot.kind === 'warning' ? '燈號登錄紀錄' : '災點登錄紀錄' }}</h3>
      <ol v-if="report.appendix.points.length" class="publication-records"><li v-for="entry in report.appendix.points" :key="entry.id"><header><strong>{{ entry.title }}</strong></header><dl class="publication-entry-fields"><div v-for="field in entry.fields" :key="field.label"><dt>{{ field.label }}</dt><dd>{{ field.value }}</dd></div></dl><p v-if="entry.text">原始登錄文字：{{ entry.text }}</p></li></ol>
      <p v-else class="publication-prose">本次無點位紀錄。</p>
      <div v-if="report.appendix.unassignedPhotos?.length" class="publication-photos"><PublicationPhoto v-for="photo in report.appendix.unassignedPhotos" :key="photo.id" :photo="photo" :url="photoUrls[photo.id]" :failed="photoErrors[photo.id]" /></div>
      <h3 class="publication-subheading">影像與附件索引</h3>
      <ul v-if="attachments.length" class="publication-files"><li v-for="asset in attachments" :key="`${asset.collection}:${asset.id}`"><span>{{ asset.name }}<small v-if="asset.collection === 'media'" class="publication-media-times"><template v-if="asset.caption">{{ asset.caption }}</template><template v-else>拍攝時間：{{ asset.captureLabel }}；上傳時間：{{ asset.uploadLabel }}</template>；資料依據：影像紀錄 {{ asset.id }}</small><small v-if="asset.description" class="publication-media-times">原始登錄說明：{{ asset.description }}</small></span><button type="button" class="publication-icon" :disabled="downloading === asset.id" :title="downloading === asset.id ? '下載中' : '下載附件'" aria-label="下載附件" @click="download(asset)"><Download :size="16" /></button></li></ul>
      <p v-else class="publication-prose">本次無影像或附件紀錄。</p>
      <p v-if="assetError" class="publication-file-error" role="alert">{{ assetError }}</p>
    </details>
    <footer class="publication-sources"><strong>資料來源</strong><span>{{ report.appendix.sources.join('、') }}</span></footer>
  </article>
  <p v-else class="publication-empty" role="alert">報告規格資料尚未提供，請重新整理。</p>
</template>

<script>
import { Download } from '@lucide/vue'
import PublicationMap from './PublicationMap.vue'
import PublicationPhoto from './PublicationPhoto.vue'
import MicroseismicChart from '@/components/warning/charts/MicroseismicChart.vue'
import RainfallChart from '@/components/warning/charts/RainfallChart.vue'
import StrongMotionChart from '@/components/warning/charts/StrongMotionChart.vue'
import { saveBlob } from '@/services/publicationService.js'

export default {
  name: 'ProjectPublicationSnapshot',
  components: { Download, PublicationMap, PublicationPhoto, MicroseismicChart, RainfallChart, StrongMotionChart },
  props: { snapshot: { type: Object, required: true }, assetLoader: { type: Function, required: true }, compact: Boolean },
  data: () => ({ photoUrls: {}, photoErrors: {}, controller: null, downloading: '', assetError: '' }),
  computed: {
    report() { return this.snapshot.report || null },
    photos() { return (this.snapshot.report?.photos || []).map(photo => ({ ...this.snapshot.media.find(media => media.id === photo.id), ...photo })) },
    embeddedPhotos() { return (this.snapshot.report?.embeddedPhotos || []).map(photo => ({ ...this.snapshot.media.find(media => media.id === photo.id), ...photo })) },
    attachments() { const appendix = this.snapshot.report?.appendix; return appendix ? [...appendix.files, ...appendix.media] : [] },
    charts() { return [['chart1', '微地動', 'MicroseismicChart'], ['chart2', '雨量', 'RainfallChart'], ['chart3', '強地動', 'StrongMotionChart']].filter(([key]) => this.snapshot.charts?.[key]).map(([key, label, component]) => {
      const data = this.snapshot.charts[key]
      const observation = data.observedAt || data.sourceDate || data.time_series?.[0]?.datetime
      const date = observation && !Number.isNaN(new Date(observation).getTime()) ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date(observation)) : null
      return { key, label, component, data, date }
    }) }
  },
  mounted() {
    this.controller = new AbortController()
    this.embeddedPhotos.forEach(async media => { try { const blob = await this.assetLoader(media, this.controller.signal); if (!this.controller.signal.aborted) this.photoUrls[media.id] = URL.createObjectURL(blob) } catch { if (!this.controller.signal.aborted) this.photoErrors[media.id] = true } })
  },
  methods: {
    chartInfo(key) { return this.charts.find(chart => chart.key === key) || {} },
    hasChart(key) { const data = this.snapshot.charts?.[key]; return ['ok', 'historical'].includes(data?.dataStatus) && Boolean(data.time_series?.length) },
    async download(asset) { this.downloading = asset.id; this.assetError = ''; try { saveBlob(await this.assetLoader(asset, this.controller.signal), asset.name || '附件') } catch (error) { if (!this.controller.signal.aborted) this.assetError = error.message } finally { this.downloading = '' } }
  },
  beforeUnmount() { this.controller?.abort(); Object.values(this.photoUrls).forEach(url => URL.revokeObjectURL(url)) }
}
</script>

<style>
@font-face{font-family:'GeoPort Report Kai';src:url('../../assets/fonts/Iansui-Regular.woff2') format('woff2');font-weight:400;font-style:normal;font-display:swap}
.publication-prose{font-size:12px;line-height:1.85;margin:8px 0 12px;white-space:pre-wrap}.publication-subheading{font-size:13px;font-weight:600;margin:18px 0 10px}.publication-metadata{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px;margin:16px 0 0}.publication-metadata>div,.publication-entry-fields>div{display:grid;grid-template-columns:110px minmax(0,1fr);gap:10px;min-width:0;padding:8px 0;border-bottom:1px solid #e5edef}.publication-metadata dt,.publication-entry-fields dt{font-size:11px;color:#637781;line-height:1.7}.publication-metadata dd,.publication-entry-fields dd{font-size:12px;line-height:1.7;margin:0;min-width:0;overflow-wrap:anywhere}.publication-entry-fields{margin:7px 0 0}.publication-entry-fields>div{padding:4px 0;border:0}.publication-appendix{padding:20px 0;border-bottom:1px solid #d8e4e8}.publication-appendix>summary{font-size:15px;font-weight:600;cursor:pointer;line-height:1.8;overflow-wrap:anywhere}.publication-appendix>summary:focus-visible{outline:2px solid #167d82;outline-offset:4px}.publication-media-times{display:block;max-width:none!important;margin-top:4px;line-height:1.7}.publication-section .publication-photos{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:18px}@media(max-width:600px){.publication-metadata{grid-template-columns:minmax(0,1fr)}.publication-metadata>div,.publication-entry-fields>div{grid-template-columns:90px minmax(0,1fr);gap:8px}.publication-section .publication-photos{grid-template-columns:minmax(0,1fr)}.publication-files .publication-media-times{display:block}}
.publication-document{max-width:1140px;margin:0 auto;padding:26px 30px 40px;color:#172a33;background:#fff;letter-spacing:0;overflow-wrap:anywhere}.publication-doc-title{padding-bottom:20px;border-bottom:1px solid #d8e4e8}.publication-doc-title>span{font-size:12px;font-weight:600;color:#426c79}.publication-doc-title h1{font-size:24px;line-height:1.4;font-weight:600;margin:7px 0 10px}.publication-doc-title p{font-size:14px;line-height:1.8;white-space:pre-wrap;max-width:850px}.publication-doc-title>div{display:flex;gap:18px;font-size:11px;color:#637781;margin-top:12px;flex-wrap:wrap}.publication-counts{display:flex;flex-wrap:wrap;gap:18px 40px;padding:18px 0;border-bottom:1px solid #d8e4e8}.publication-counts dt{font-size:11px;color:#637781}.publication-counts dd{font-size:23px;font-weight:600;line-height:1.4;margin:4px 0 0}.publication-counts small{font-size:11px;font-weight:400;color:#637781;margin-left:7px}.publication-section{padding:22px 0;border-bottom:1px solid #d8e4e8}.publication-section>h2{font-size:15px;font-weight:600;margin:0 0 15px}.publication-chart{margin-top:14px}.publication-chart>header{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:11px;margin-bottom:8px}.publication-chart h3{font-size:13px;font-weight:600;margin:0}.publication-chart header>span{color:#5b737d}.publication-chart time{color:#71818a}.publication-chart-area{height:260px;border:1px solid #d5e2e6;border-radius:4px;overflow:hidden}.publication-records{list-style:none;padding:0;margin:0}.publication-records li{padding:14px 0;border-bottom:1px solid #e5edef}.publication-records li:last-child{border:0;padding-bottom:0}.publication-records header{display:flex;align-items:baseline;justify-content:space-between;gap:12px}.publication-records strong{font-size:13px;font-weight:600}.publication-records time{font-size:11px;color:#6b7e87;white-space:nowrap}.publication-records p{font-size:12px;line-height:1.8;margin-top:6px;white-space:pre-wrap}.publication-table-wrap{overflow:auto}.publication-table-wrap table{border-collapse:collapse;width:100%;font-size:12px;min-width:490px}.publication-table-wrap th{text-align:left;font-size:11px;font-weight:500;color:#5f7882;background:#f3f7f8;padding:9px 10px}.publication-table-wrap td{border-bottom:1px solid #e5edef;padding:10px;vertical-align:top;max-width:260px}.publication-photos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.publication-photos figure{min-width:0;margin:0}.publication-photos img,.publication-photo-state{width:100%;aspect-ratio:4/3;object-fit:contain;background:#f0f5f6;border:1px solid #d5e2e6}.publication-photo-state{display:flex;align-items:center;justify-content:center;color:#71818a;font-size:12px}.publication-photos figcaption{font-size:11px;line-height:1.6;margin-top:6px;color:#637781}.publication-files{list-style:none;margin:0;padding:0}.publication-files li{display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #e5edef}.publication-files li>span{flex:1;min-width:0;font-size:12px}.publication-files small{font-size:10px;color:#637781;max-width:140px}.publication-file-error{color:#9c4036;font-size:12px;margin-top:10px}.publication-sources{padding-top:20px;color:#637781;font-size:11px;line-height:1.9}.publication-sources strong{margin-right:14px;font-weight:600;color:#385a68}.publication-sources p{margin:4px 0 0}.publication-document.compact .publication-doc-title h1{font-size:21px}@media(max-width:600px){.publication-document{padding:20px 16px 30px}.publication-doc-title h1{font-size:21px}.publication-doc-title p{font-size:13px}.publication-counts{gap:16px 28px}.publication-section{padding:19px 0}.publication-photos{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.publication-records header{flex-direction:column;gap:4px}.publication-chart-area{height:250px}.publication-files small{display:none}}
.publication-records li.publication-record-pair{display:grid;grid-template-columns:minmax(0,0.9fr) minmax(0,1.1fr);gap:24px;align-items:start;padding:24px 0}
.publication-record-pair>div{min-width:0}
.publication-record-pair .publication-photos{grid-template-columns:minmax(0,1fr);margin-top:0}
.publication-document{font-family:'GeoPort Report Kai',serif;font-size:12pt;line-height:1.7}
.publication-document :is(h1,h2,h3,p,dt,dd,strong,small,span,figcaption,time,summary,td,th){font-size:12pt!important;line-height:1.7}
.publication-document .publication-metadata>div,.publication-document .publication-entry-fields>div{grid-template-columns:110px minmax(0,1fr)}
@media(max-width:700px){.publication-records li.publication-record-pair{grid-template-columns:minmax(0,1fr);gap:16px}}
</style>
