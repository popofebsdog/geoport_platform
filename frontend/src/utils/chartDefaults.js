/**
 * Shared Chart.js styling defaults.
 * Import and call applyChartDefaults(Chart) right after registering registerables.
 */

const FONT_FAMILY = "'Inter', system-ui, -apple-system, sans-serif"

const COLORS = {
  grid: {
    light: 'rgba(30,92,138,0.12)',
    dark:  'rgba(148,163,184,0.16)'
  },
  tick: {
    light: '#6b7d8f',
    dark:  '#94a3b8'
  },
  axisTitle: {
    light: '#6b7280',
    dark:  '#6b7280'
  },
  tooltip: {
    bg: '#1e293b',
    border: '#334155'
  }
}

/**
 * Build a minimal shared chart options object.
 * @param {boolean} isDark
 */
export function baseChartOptions(isDark = false) {
  const gridColor  = isDark ? COLORS.grid.dark  : COLORS.grid.light
  const tickColor  = isDark ? COLORS.tick.dark  : COLORS.tick.light
  const titleColor = isDark ? '#94a3b8' : COLORS.axisTitle.light

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 220 },
    interaction: { intersect: false, mode: 'nearest' },
    elements: {
      line: {
        borderCapStyle: 'round',
        borderJoinStyle: 'round'
      },
      point: {
        hitRadius: 8
      }
    },
    plugins: {
    legend: {
      display: true,
      position: 'top',
      align: 'end',
      labels: {
        font: { family: FONT_FAMILY, size: 10, weight: '700' },
        color: tickColor,
        boxWidth: 7,
        boxHeight: 7,
        padding: 8,
        usePointStyle: true,
        pointStyle: 'circle'
      }
      },
      title: { display: false },
      tooltip: {
        backgroundColor: COLORS.tooltip.bg,
        borderColor: COLORS.tooltip.border,
        borderWidth: 1,
        padding: { x: 10, y: 8 },
        titleFont: { family: FONT_FAMILY, size: 11, weight: '600' },
        bodyFont:  { family: FONT_FAMILY, size: 11 },
        titleColor: '#f1f5f9',
        bodyColor:  '#cbd5e1',
        cornerRadius: 6,
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8
      }
    }
  }
}

/**
 * Build clean axis scale config.
 * @param {'x'|'y'} axis
 * @param {string}  titleText
 * @param {boolean} isDark
 * @param {object}  extra   - any extra overrides merged in
 */
export function axisScale(axis, titleText, isDark = false, extra = {}) {
  const gridColor  = isDark ? COLORS.grid.dark  : COLORS.grid.light
  const tickColor  = isDark ? COLORS.tick.dark  : COLORS.tick.light
  const titleColor = isDark ? '#94a3b8' : '#9ca3af'

  return {
    display: true,
    title: {
      display: !!titleText,
      text: titleText,
      color: titleColor,
      font: { family: FONT_FAMILY, size: 10, weight: '500' },
      padding: { top: 4, bottom: 4 }
    },
    ticks: {
      color: tickColor,
      font: { family: FONT_FAMILY, size: 10, weight: '600' }
    },
    grid: {
      color: gridColor,
      tickColor: 'transparent',
      drawTicks: false,
      lineWidth: 1
    },
    border: { color: 'transparent' },
    ...extra
  }
}

/**
 * Apply Inter as Chart.js global defaults.
 * Call immediately after Chart.register(...registerables).
 */
export function applyChartDefaults(Chart) {
  Chart.defaults.font.family = FONT_FAMILY
  Chart.defaults.font.size   = 11
  Chart.defaults.color       = '#9ca3af'
}
