<template>
  <div class="chart">
    <div v-if="totalPlays === 0" class="empty">No plays in this period.</div>
    <template v-else>
      <div class="row">
        <div
          v-for="b in buckets"
          :key="b.hour"
          class="cell"
          :style="{ background: cellColor(b.count) }"
        >
          <span class="cell-count">{{ b.count > 0 ? b.count : '' }}</span>
          <title>{{ formatHour(b.hour) }}: {{ b.count }} plays</title>
        </div>
      </div>
      <div class="row labels">
        <div v-for="b in buckets" :key="`l${b.hour}`" class="label">
          {{ b.hour % 6 === 0 ? formatHour(b.hour) : '' }}
        </div>
      </div>
      <div class="legend">
        <span class="legend-label">Less</span>
        <div
          v-for="step in legendSteps"
          :key="step"
          class="legend-cell"
          :style="{ background: cellColor(step * maxCount / 4) }"
        />
        <span class="legend-label">More</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ samples: { type: Array, required: true } })

const legendSteps = [0, 1, 2, 3, 4]

const buckets = computed(() => {
  const counts = new Array(24).fill(0)
  for (const s of props.samples) {
    if (!s.scoredAt) continue
    const dt = new Date(s.scoredAt)
    if (Number.isNaN(dt.getTime())) continue
    counts[dt.getHours()]++
  }
  return counts.map((count, hour) => ({ hour, count }))
})

const maxCount = computed(() => {
  let m = 0
  for (const b of buckets.value) if (b.count > m) m = b.count
  return m
})

const totalPlays = computed(() => buckets.value.reduce((sum, b) => sum + b.count, 0))

function cellColor(count) {
  if (maxCount.value === 0 || count === 0) return '#2a2a2a'
  const t = count / maxCount.value
  // Interpolate from dark to game-gold (#ffcb74)
  const r = Math.round(42 + (255 - 42) * t)
  const g = Math.round(42 + (203 - 42) * t)
  const b = Math.round(42 + (116 - 42) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function formatHour(h) {
  const period = h < 12 ? 'AM' : 'PM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}${period}`
}
</script>

<style scoped>
.chart { width: 100%; }
.row {
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  gap: 3px;
}
.cell {
  position: relative;
  aspect-ratio: 1;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cell-count {
  font-size: 0.7em;
  color: #1a1a1a;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.row.labels {
  margin-top: 4px;
}
.label {
  text-align: center;
  font-size: 0.7em;
  color: #666;
}
.legend {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
  margin-top: 12px;
}
.legend-label {
  font-size: 0.75em;
  color: #666;
}
.legend-cell {
  width: 14px;
  height: 14px;
  border-radius: 2px;
}
.empty {
  padding: 40px 0;
  text-align: center;
  color: #666;
  font-size: 0.9em;
}
</style>
