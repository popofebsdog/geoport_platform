<template>
  <div class="publication-map-wrap">
    <div ref="map" class="publication-map" aria-label="專案唯讀地圖"></div>
    <div v-if="assets.length" class="publication-map-layers"><label v-for="asset in assets" :key="asset.id"><input type="checkbox" :checked="Boolean(layers[asset.id])" :disabled="Boolean(pending[asset.id])" @change="toggle(asset, $event.target.checked)" /><span>{{ asset.name }}</span><small v-if="pending[asset.id]">載入中…</small></label></div>
    <p v-if="error" class="publication-map-error" role="status">{{ error }}</p>
  </div>
</template>

<script>
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import proj4 from 'proj4'
import { markRaw } from 'vue'
import { convertGeoJsonFromTWD97, extractAllCoordinates } from '@/utils/mapGeoUtils.js'

proj4.defs('EPSG:3826', '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +units=m +no_defs')
export default {
  name: 'PublicationMap',
  props: { snapshot: { type: Object, required: true }, assetLoader: { type: Function, required: true } },
  data: () => ({ map: null, layers: {}, pending: {}, error: '', controller: null }),
  computed: {
    assets() { return [...this.snapshot.layers, ...this.snapshot.files.filter(file => ['vector', 'raster', 'potential_analysis', 'profile_observation'].includes(file.type))].slice(0, 20) }
  },
  mounted() {
    this.controller = new AbortController()
    this.map = markRaw(L.map(this.$refs.map, { scrollWheelZoom: false }).setView([23.7, 121], 7))
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(this.map)
    const points = [this.snapshot.project.location, ...this.snapshot.children.map(child => ({ ...child.location, name: child.name })), ...this.snapshot.points]
      .filter(point => point && Number.isFinite(point.longitude) && Number.isFinite(point.latitude))
    const bounds = []
    points.forEach((point, index) => {
      const coordinate = [point.latitude, point.longitude]
      bounds.push(coordinate)
      const popup = document.createElement('span')
      popup.textContent = point.name || (index === 0 ? this.snapshot.project.name : `點位 ${index + 1}`)
      L.circleMarker(coordinate, { radius: index ? 6 : 9, color: '#fff', weight: 2, fillColor: index ? '#b95142' : '#167d82', fillOpacity: 1 }).bindPopup(popup).addTo(this.map)
    })
    if (bounds.length) this.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 })
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize())
    this.resizeObserver.observe(this.$refs.map)
    const road = this.assets.find(asset => asset.type === 'road')
    if (road) this.toggle(road, true)
  },
  methods: {
    scopedRoad(data) {
      const normalize = value => {
        const input = String(value || '').replace(/^臺/, '台')
        const match = input.match(/^taiwan(\d+)(?:l(\d+))?$/i)
        return match ? `台${match[1]}${match[2] ? `臨${match[2]}` : ''}線` : input.replace(/^national(\d+)$/i, '國道$1號')
      }
      const section = this.snapshot.project.description?.match(/工務段[：:]\s*([^，,]+)/)?.[1]?.trim()
      return { ...data, features: data.features.filter(feature => {
        const props = feature.properties || {}
        return (!props.公路編 || normalize(props.公路編) === normalize(this.snapshot.project.road)) && (!section || !props.工務段 || props.工務段 === section)
      }) }
    },
    async toggle(asset, enabled) {
      this.error = ''
      if (!enabled) { if (this.layers[asset.id]) this.map.removeLayer(this.layers[asset.id]); delete this.layers[asset.id]; return }
      this.pending[asset.id] = true
      try {
        const blob = await this.assetLoader(asset, this.controller.signal)
        if (this.controller.signal.aborted) return
        if (blob.size > 30 * 1024 * 1024) throw new Error('圖層較大，目前僅提供附件下載')
        const bytes = await blob.arrayBuffer()
        let layer
        const signature = new Uint8Array(bytes, 0, Math.min(4, bytes.byteLength))
        if ((signature[0] === 73 && signature[1] === 73) || (signature[0] === 77 && signature[1] === 77)) {
          window.proj4 ||= proj4
          const module = await import('georaster')
          const parse = module.default || module.parseGeoraster
          const GeoRasterLayer = (await import('georaster-layer-for-leaflet')).default
          const raster = await parse(bytes)
          layer = new GeoRasterLayer({ georaster: raster, opacity: 0.75, resolution: 128, proj4, debugLevel: 0 })
        } else {
          if (blob.size > 5 * 1024 * 1024) throw new Error('向量圖層較大，目前僅提供附件下載')
          let data = JSON.parse(new TextDecoder().decode(bytes))
          if (data.type === 'Feature') data = { type: 'FeatureCollection', features: [data] }
          if (data.type !== 'FeatureCollection' || !Array.isArray(data.features) || data.features.length > 20000) throw new Error('圖層格式或數量不適合預覽')
          if (asset.type === 'road' && this.snapshot.kind === 'warning') data = this.scopedRoad(data)
          const first = data.features.map(feature => extractAllCoordinates(feature.geometry)[0]).find(Boolean)
          if (first && (Math.abs(first[0]) > 180 || Math.abs(first[1]) > 90)) data = convertGeoJsonFromTWD97(data)
          layer = L.geoJSON(data, { style: { color: '#167d82', weight: 3, fillOpacity: 0.2 }, pointToLayer: (_feature, latlng) => L.circleMarker(latlng, { radius: 4, color: '#167d82' }) })
        }
        if (this.controller.signal.aborted || !this.map) return
        this.layers[asset.id] = markRaw(layer)
        layer.addTo(this.map)
        const bounds = layer.getBounds?.()
        if (bounds?.isValid()) this.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 })
      } catch (error) { if (!this.controller.signal.aborted) this.error = error.message || '圖層目前無法預覽' } finally { this.pending[asset.id] = false }
    }
  },
  beforeUnmount() { this.controller?.abort(); this.resizeObserver?.disconnect(); this.map?.remove(); this.map = null }
}
</script>

<style scoped>
.publication-map-wrap{border:1px solid #d5e2e6;border-radius:4px;overflow:hidden}.publication-map{height:340px;width:100%;z-index:0}.publication-map-layers{display:flex;gap:10px 20px;flex-wrap:wrap;padding:10px 12px;background:#f5f9fa;border-top:1px solid #d5e2e6}.publication-map-layers label{display:inline-flex;align-items:center;gap:7px;font-size:12px;max-width:100%}.publication-map-layers span{overflow-wrap:anywhere}.publication-map-layers small{color:#637781;white-space:nowrap}.publication-map-error{padding:8px 12px;color:#9c4036;background:#fff4f1;font-size:12px}@media(max-width:600px){.publication-map{height:270px}.publication-map-layers{display:grid;grid-template-columns:minmax(0,1fr)}}
</style>
