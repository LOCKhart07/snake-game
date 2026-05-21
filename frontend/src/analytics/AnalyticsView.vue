<template>
  <PasswordGate v-if="!unlocked" @unlocked="onUnlocked" />
  <div v-else class="dash">
    <header class="dash-header">
      <div class="dash-title">Slither Stats</div>
      <div class="dash-controls">
        <div class="period-group">
          <button
            v-for="opt in periodOptions"
            :key="opt.value"
            class="period-btn"
            :class="{ active: period === opt.value }"
            :disabled="loading"
            @click="changePeriod(opt.value)"
          >{{ opt.label }}</button>
        </div>
        <button class="logout-btn" @click="logout">Logout</button>
      </div>
    </header>

    <div v-if="loading" class="dash-state">Loading…</div>
    <div v-else-if="loadError" class="dash-state error">{{ loadError }}</div>
    <div v-else-if="summary" class="dash-body">
      <section class="totals">
        <div class="total-card">
          <div class="total-label">Plays</div>
          <div class="total-value">{{ summary.totals.plays }}</div>
        </div>
        <div class="total-card">
          <div class="total-label">Unique players</div>
          <div class="total-value">{{ summary.totals.uniquePlayers }}</div>
        </div>
        <div class="total-card">
          <div class="total-label">Top score</div>
          <div class="total-value">{{ topScoreInPeriod }}</div>
        </div>
      </section>

      <section class="panel">
        <h2 class="panel-title">Daily activity ({{ activityTitleSuffix }})</h2>
        <DailyActivityChart :data="summary.dailyActivity" />
      </section>

      <div class="two-col">
        <section class="panel">
          <h2 class="panel-title">Top players</h2>
          <TopPlayersTable :players="summary.topPlayers" />
        </section>

        <section class="panel">
          <h2 class="panel-title">Score distribution</h2>
          <ScoreDistributionChart :samples="summary.samples" />
        </section>
      </div>

      <section class="panel">
        <h2 class="panel-title">Hour of day (your local time)</h2>
        <HourlyHeatmap :samples="summary.samples" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import PasswordGate from './PasswordGate.vue'
import DailyActivityChart from './charts/DailyActivityChart.vue'
import TopPlayersTable from './charts/TopPlayersTable.vue'
import ScoreDistributionChart from './charts/ScoreDistributionChart.vue'
import HourlyHeatmap from './charts/HourlyHeatmap.vue'
import { fetchSummary, getStoredToken, clearStoredToken, verifyToken } from './AnalyticsService'

const periodOptions = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'all', label: 'All' },
]

const unlocked = ref(false)
const period = ref('week')
const summary = ref(null)
const loading = ref(false)
const loadError = ref('')

const topScoreInPeriod = computed(() => {
  if (!summary.value?.samples?.length) return 0
  let m = 0
  for (const s of summary.value.samples) if (s.score > m) m = s.score
  return m
})

const activityTitleSuffix = computed(() => {
  const n = summary.value?.dailyActivity?.length ?? 0
  if (period.value === 'all') return `all ${n} days`
  if (n <= 1) return 'today'
  return `last ${n} days`
})

onMounted(async () => {
  document.body.classList.add('analytics-active')
  const stored = getStoredToken()
  if (!stored) return
  const ok = await verifyToken(stored).catch(() => false)
  if (ok) {
    unlocked.value = true
    await load()
  } else {
    clearStoredToken()
  }
})

onUnmounted(() => {
  document.body.classList.remove('analytics-active')
})

async function onUnlocked() {
  unlocked.value = true
  await load()
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    summary.value = await fetchSummary(period.value)
  } catch (e) {
    if (e?.response?.status === 401) {
      clearStoredToken()
      unlocked.value = false
      summary.value = null
      return
    }
    loadError.value = 'Failed to load analytics.'
  } finally {
    loading.value = false
  }
}

function changePeriod(p) {
  if (p === period.value || loading.value) return
  period.value = p
  load()
}

function logout() {
  clearStoredToken()
  unlocked.value = false
  summary.value = null
}
</script>

<style>
/* Release the analytics view from the game-page #app constraints */
body.analytics-active {
  display: block !important;
  place-items: initial !important;
  margin: 0;
}
body.analytics-active #app {
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  grid-template-columns: none !important;
  width: 100vw;
}
</style>

<style scoped>
.dash {
  min-height: 100vh;
  background: #1a1a1a;
  color: #ccc;
  font-family: 'Roboto', sans-serif;
  padding: 24px 32px 48px;
  box-sizing: border-box;
}
.dash-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}
.dash-title {
  font-size: 1.6em;
  color: #ffcb74;
  letter-spacing: 0.02em;
}
.dash-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}
.period-group {
  display: inline-flex;
  background: #232323;
  border: 1px solid #333;
  border-radius: 8px;
  overflow: hidden;
}
.period-btn {
  background: transparent;
  color: #ccc;
  border: none;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background 0.15s, color 0.15s;
}
.period-btn:hover:not(:disabled):not(.active) {
  background: #2c2c2c;
}
.period-btn.active {
  background: #185727;
  color: #fff;
}
.period-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.logout-btn {
  background: transparent;
  color: #888;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 0.9em;
}
.logout-btn:hover {
  color: #ccc;
  border-color: #555;
}
.dash-state {
  text-align: center;
  padding: 60px 0;
  color: #888;
}
.dash-state.error {
  color: #e07a6a;
}
.dash-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.totals {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
}
.total-card {
  background: #232323;
  border: 1px solid #333;
  border-radius: 10px;
  padding: 16px 20px;
}
.total-label {
  font-size: 0.85em;
  color: #888;
  margin-bottom: 6px;
}
.total-value {
  font-size: 1.8em;
  color: #ffcb74;
  font-weight: 500;
}
.panel {
  background: #232323;
  border: 1px solid #333;
  border-radius: 10px;
  padding: 20px;
}
.panel-title {
  font-size: 1em;
  color: #ccc;
  margin: 0 0 16px 0;
  font-weight: 500;
}
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
@media (max-width: 900px) {
  .two-col {
    grid-template-columns: 1fr;
  }
  .dash {
    padding: 16px;
  }
}
</style>
