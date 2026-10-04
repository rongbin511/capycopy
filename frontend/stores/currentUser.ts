import { defineStore } from 'pinia'
import type { UserCatalogEntry } from '~/types/paper'
import { useViewerPreferencesStore } from '~/stores/viewerPreferences'

export const useCurrentUserStore = defineStore('currentUser', {
  state: () => ({
    userId: null as string | null,
  }),

  getters: {
    isLoggedIn: (state) => Boolean(state.userId),
  },

  actions: {
    login(user: UserCatalogEntry) {
      this.userId = String(user.user_id || '').trim() || null
      if (!this.userId) return

      const viewer = useViewerPreferencesStore()
      viewer.resetRemoteHydration()
      viewer.applyPreferences(user.preference || {})
      void viewer.hydrateFromServer()
    },

    logout() {
      this.userId = null
      useViewerPreferencesStore().resetRemoteHydration()
    },
  },

  persist: {
    key: 'tpb-current-user',
    pick: ['userId'],
  },
})
