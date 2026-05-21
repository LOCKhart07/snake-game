<template>
  <div class="chart">
    <svg
      v-if="filled.length"
      :viewBox="`0 0 ${W} ${H}`"
      class="chart-svg"
    >
      <line
        v-for="(yt, i) in yTicks"
        :key="`g${i}`"
        :x1="PAD.l"
        :x2="W - PAD.r"
        :y1="yt.y"
        :y2="yt.y"
        stroke="#2c2c2c"
        stroke-width="1"
      />
      <text
        v-for="(yt, i) in yTicks"
        :key="`yl${i}`"
        :x="PAD.l - 6"
        :y="yt.y + 4"
        text-anchor="end"
        font-size="13"
        fill="#666"
      >{{ yt.value }}</text>

      <g v-for="(d, i) in filled" :key="d.date">
        <rect
          :x="PAD.l + i * barW + 0.5"
          :y="yScale(d.count)"
          :width="Math.max(barW - 1, 0.6)"
          :height="Math.max(H - PAD.b - yScale(d.count), 0)"
          :fill="d.count > 0 ? '#ffcb74' : 'transparent'"
        >
          <title>{{ d.date }}: {{ d.count }} plays</title>
        </rect>
      </g>
    </svg>
    <div v-else class="empty">No activity in the last 90 days.</div>
    <div v-if="filled.length" class="x-axis">
      <span v-for="lbl in xLabels" :key="lbl.date">{{ lbl.label }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ data: { type: Array, required: true } })

const W = 1600
const H = 240
const PAD = { l: 40, r: 12, t: 12, b: 28 }

const filled = computed(() => props.data)

const maxCount = computed(() => {
  let m = 0
  for (const d of filled.value) if (d.count > m) m = d.count
  return m || 1
})

const barW = computed(() => (W - PAD.l - PAD.r) / filled.value.length)

function yScale(v) {
  const h = H - PAD.t - PAD.b
  return PAD.t + h - (v / maxCount.value) * h
}

const yTicks = computed(() => {
  const m = maxCount.value
  const ticks = [0, Math.ceil(m / 2), m]
  return ticks.map(v => ({ value: v, y: yScale(v) }))
})

const xLabels = computed(() => {
  const n = filled.value.length
  if (!n) return []
  const targetCount = Math.min(n, 5)
  const indices = targetCount === 1
    ? [0]
    : Array.from({ length: targetCount }, (_, k) => Math.round(k * (n - 1) / (targetCount - 1)))
  const seen = new Set()
  return indices
    .filter(i => !seen.has(i) && seen.add(i))
    .map(i => {
      const f = filled.value[i]
      const dt = new Date(f.date)
      return {
        date: f.date,
        label: dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      }
    })
})
</script>

<style scoped>
.chart { width: 100%; }
.chart-svg {
  width: 100%;
  aspect-ratio: 1600 / 240;
  display: block;
}
.x-axis {
  display: flex;
  justify-content: space-between;
  padding: 4px 12px 0 40px;
  font-size: 0.75em;
  color: #666;
}
.empty {
  padding: 60px 0;
  text-align: center;
  color: #666;
  font-size: 0.9em;
}
</style>
