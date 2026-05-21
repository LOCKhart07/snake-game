<template>
  <div class="wrap">
    <table v-if="players.length" class="t">
      <thead>
        <tr>
          <th class="rank">#</th>
          <th>Player</th>
          <th class="num">Best</th>
          <th class="num">Plays</th>
          <th class="num">Total time</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(p, i) in players" :key="p.username" :class="{ champ: i === 0 }">
          <td class="rank">{{ i + 1 }}</td>
          <td>{{ truncate(p.username) }}</td>
          <td class="num">{{ p.bestScore }}</td>
          <td class="num">{{ p.plays }}</td>
          <td class="num">{{ formatTime(p.totalTimeSeconds) }}</td>
        </tr>
      </tbody>
    </table>
    <div v-else class="empty">No plays in this period.</div>
  </div>
</template>

<script setup>
defineProps({ players: { type: Array, required: true } })

function truncate(s) {
  return s.length > 14 ? s.slice(0, 13) + '…' : s
}

function formatTime(seconds) {
  if (!seconds || seconds <= 0) return '—'
  const s = Math.round(seconds)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  if (m < 60) return `${m}m ${rem}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}
</script>

<style scoped>
.wrap { width: 100%; }
.t {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;
}
.t th, .t td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid #2c2c2c;
}
.t th {
  color: #888;
  font-weight: 500;
  font-size: 0.8em;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.t td { color: #ccc; }
.t tr:last-child td { border-bottom: none; }
.rank {
  width: 30px;
  color: #666;
  font-variant-numeric: tabular-nums;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.champ td { color: #ffcb74; }
.empty {
  padding: 40px 0;
  text-align: center;
  color: #666;
  font-size: 0.9em;
}
</style>
