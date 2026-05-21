import { createRouter, createWebHistory } from 'vue-router'
import GameView from '../views/GameView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'game', component: GameView },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('../analytics/AnalyticsView.vue'),
    },
  ],
})

export default router
