<template>
  <div class="w-full h-full">
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script>
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default {
  name: 'LineChart',
  props: {
    data: {
      type: Object,
      required: true
    },
    options: {
      type: Object,
      default: () => ({})
    },
    height: {
      type: Number,
      default: 100
    },
    isDarkMode: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      chart: null
    }
  },
  mounted() {
    this.createChart()
  },
  watch: {
    data: {
      deep: true,
      handler() {
        this.updateChart()
      }
    },
    isDarkMode() {
      if (this.chart) {
        this.chart.destroy()
        this.chart = null
      }
      this.createChart()
    }
  },
  beforeUnmount() {
    if (this.chart) {
      this.chart.destroy()
    }
  },
  methods: {
    buildDefaultOptions() {
      const dark = this.isDarkMode
      const gridColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
      const tickColor = dark ? '#94a3b8' : '#9ca3af'
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: dark ? '#1e293b' : '#ffffff',
            borderColor: dark ? '#334155' : '#e5e7eb',
            borderWidth: 1,
            titleColor: dark ? '#f1f5f9' : '#111827',
            bodyColor: dark ? '#cbd5e1' : '#374151',
            cornerRadius: 4,
            padding: { x: 10, y: 8 }
          }
        },
        scales: {
          x: {
            display: true,
            grid: { color: gridColor, tickColor: 'transparent' },
            border: { color: 'transparent' },
            ticks: { color: tickColor, font: { size: 10 } }
          },
          y: {
            display: true,
            grid: { color: gridColor, tickColor: 'transparent' },
            border: { color: 'transparent' },
            ticks: { color: tickColor, font: { size: 10 } }
          }
        },
        elements: {
          line: { tension: 0.3 },
          point: { radius: 3, hoverRadius: 5 }
        },
        interaction: { intersect: false, mode: 'index' }
      }
    },
    createChart() {
      const ctx = this.$refs.chartCanvas.getContext('2d')
      this.chart = new ChartJS(ctx, {
        type: 'line',
        data: this.data,
        options: { ...this.buildDefaultOptions(), ...this.options }
      })
    },
    updateChart() {
      if (this.chart) {
        this.chart.data = this.data
        this.chart.update()
      }
    }
  }
}
</script>
