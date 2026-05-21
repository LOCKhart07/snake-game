<template>
  <div class="gate-wrap">
    <form class="gate-card" @submit.prevent="onSubmit">
      <div class="gate-title">Restricted</div>
      <div class="gate-sub">Enter the admin password to continue.</div>
      <input
        ref="inputEl"
        v-model="password"
        type="password"
        class="gate-input"
        :class="{ 'gate-input-error': errorMessage }"
        autocomplete="off"
        spellcheck="false"
        :disabled="submitting"
        placeholder="password"
      />
      <button class="gate-button" type="submit" :disabled="submitting || !password">
        {{ submitting ? 'Checking…' : 'Unlock' }}
      </button>
      <div v-if="errorMessage" class="gate-error">{{ errorMessage }}</div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { verifyToken, setStoredToken } from './AnalyticsService'

const emit = defineEmits(['unlocked'])

const password = ref('')
const submitting = ref(false)
const errorMessage = ref('')
const inputEl = ref(null)

onMounted(() => {
  inputEl.value?.focus()
})

async function onSubmit() {
  if (!password.value || submitting.value) return
  submitting.value = true
  errorMessage.value = ''
  try {
    const ok = await verifyToken(password.value)
    if (ok) {
      setStoredToken(password.value)
      emit('unlocked')
    } else {
      errorMessage.value = 'Wrong password.'
      password.value = ''
      inputEl.value?.focus()
    }
  } catch (e) {
    errorMessage.value = e?.response?.status === 503
      ? 'Analytics disabled on this server.'
      : 'Could not verify. Try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.gate-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1a1a;
  color: #ccc;
  font-family: 'Roboto', sans-serif;
}
.gate-card {
  background: #232323;
  border: 1px solid #333;
  border-radius: 10px;
  padding: 32px 28px;
  width: 320px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
.gate-title {
  font-size: 1.4em;
  color: #ffcb74;
  margin-bottom: 6px;
}
.gate-sub {
  font-size: 0.9em;
  color: #888;
  margin-bottom: 20px;
}
.gate-input {
  background: #1a1a1a;
  border: 1px solid #444;
  color: #eee;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 1em;
  outline: none;
  margin-bottom: 12px;
}
.gate-input:focus {
  border-color: #ffcb74;
}
.gate-input-error {
  border-color: #c0392b;
}
.gate-button {
  background: #185727;
  color: #fff;
  border: none;
  padding: 10px;
  border-radius: 6px;
  font-size: 1em;
  cursor: pointer;
  transition: background 0.15s;
}
.gate-button:hover:not(:disabled) {
  background: #1f6e32;
}
.gate-button:disabled {
  background: #2a2a2a;
  color: #666;
  cursor: not-allowed;
}
.gate-error {
  color: #e07a6a;
  font-size: 0.85em;
  margin-top: 10px;
}
</style>
