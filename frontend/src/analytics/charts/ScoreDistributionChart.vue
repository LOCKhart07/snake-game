<template>
  <div class="chart">
    <svg
      v-if="buckets.length"
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

      <rect
        v-for="(b, i) in buckets"
        :key="b.label"
        :x="PAD.l + i * barW + 2"
        :y="yScale(b.count)"
        :width="Math.max(barW - 4, 1)"
        :height="Math.max(H - PAD.b - yScale(b.count), 0)"
        fill="#ffcb74"
      >
        <title>{{ b.label }}: {{ b.count }}</title>
      </rect>

      <text
        v-for="(b, i) in buckets"
        :key="`xl${i}`"
        :x="PAD.l + i * barW + barW / 2"
        :y="H - PAD.b + 14"
        text-anchor="middle"
        font-size="13"
        fill="#666"
      >{{ b.label }}</text>
    </svg>
    <div v-else class="empty">No scores yet.</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ samples: { type: Array, required: true } })

const W = 800
const H = 280
const PAD = { l: 40, r: 12, t: 12, b: 32 }

const buckets = computed(() => {
  if (!props.samples.length) return []
  let max = 0
  for (const s of props.samples) if (s.score > max) max = s.score
  // Choose bucket size: aim for ~10-12 buckets
  const target = 10
  const raw = Math.max(1, Math.ceil((max + 1) / target))
  // Round to a nice multiple (1, 2, 5, 10, 20, 50, ...)
  const niceSteps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500]
  let size = niceSteps[niceSteps.length - 1]
  for (const s of niceSteps) {
    if (s >= raw) { size = s; break }
  }
  const count = Math.floor(max / size) + 1
  const arr = []
  for (let i = 0; i < count; i++) {
    const lo = i * size
    const hi = lo + size - 1
    arr.push({ lo, hi, count: 0, label: size === 1 ? `${lo}` : `${lo}-${hi}` })
  }
  for (const s of props.samples) {
    const idx = Math.floor(s.score / size)
    if (arr[idx]) arr[idx].count++
  }
  return arr
})

const maxCount = computed(() => {
  let m = 0
  for (const b of buckets.value) if (b.count > m) m = b.count
  return m || 1
})

const barW = computed(() => (W - PAD.l - PAD.r) / Math.max(buckets.value.length, 1))

function yScale(v) {
  const h = H - PAD.t - PAD.b
  return PAD.t + h - (v / maxCount.value) * h
}

const yTicks = computed(() => {
  const m = maxCount.value
  const ticks = [0, Math.ceil(m / 2), m]
  return ticks.map(v => ({ value: v, y: yScale(v) }))
})
</script>

<style scoped>
.chart { width: 100%; }
.chart-svg {
  width: 100%;
  aspect-ratio: 800 / 280;
  display: block;
}
.empty {
  padding: 60px 0;
  text-align: center;
  color: #666;
  font-size: 0.9em;
}
</style>
