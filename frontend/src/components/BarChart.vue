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
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend
)

export default {
  name: 'BarChart',
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
    }
  },
  beforeUnmount() {
    if (this.chart) {
      this.chart.destroy()
    }
  },
  methods: {
    createChart() {
      const ctx = this.$refs.chartCanvas.getContext('2d')
      
      const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#e5e7eb',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            display: true,
            grid: {
              display: true,
              color: '#e5e7eb',
              lineWidth: 0.5
            },
            ticks: {
              color: '#6b7280',
              font: {
                size: 10
              }
            }
          },
          y: {
            display: true,
            grid: {
              display: true,
              color: '#e5e7eb',
              lineWidth: 0.5
            },
            ticks: {
              color: '#6b7280',
              font: {
                size: 10
              }
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }

      this.chart = new ChartJS(ctx, {
        type: 'bar',
        data: this.data,
        options: { ...defaultOptions, ...this.options }
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