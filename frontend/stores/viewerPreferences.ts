import { defineStore } from 'pinia'
import type { ViewMode } from '~/types/paper'
import { useCurrentUserStore } from '~/stores/currentUser'
import {
  DEFAULT_ANSWER_DESIGN,
  normalizeAnswerDesign,
  type AnswerCardDesign,
} from '~/utils/answerDesigns'
import {
  DEFAULT_MARKDOWN_STYLE,
  normalizeMarkdownStyle,
  type MarkdownDisplayStyle,
} from '~/utils/markdownStyles'

const PAPER_ZOOM_MIN = 0.8
const PAPER_ZOOM_MAX = 1.4
const PAPER_ZOOM_STEP = 0.1

const LEGACY_VIEW_MODE_KEY = 'qvGlobalViewMode'
const LEGACY_DESIGN_KEY = 'answerCardDesign'
const LEGACY_INSTRUCTIONS_KEY = 'qvShowSectionInstructions'
const LEGACY_PAPER_ZOOM_KEY = 'tpbPaperZoom'
const LEGACY_MARKDOWN_STYLE_KEY = 'markdownDisplayStyle'

function userPreferencesUrl(userId: string) {
  return `/api/users/${encodeURIComponent(userId)}/preferences`
}

function clampPaperZoom(value: number) {
  return Math.min(PAPER_ZOOM_MAX, Math.max(PAPER_ZOOM_MIN, Math.round(value * 10) / 10))
}

type ViewerPreferencePayload = {
  answerDesign: AnswerCardDesign
  markdownStyle: MarkdownDisplayStyle
  viewMode: ViewMode
  showInstructions: boolean
  paperZoom: number
}

async function loadViewerPreferencesRemote(
  userId: string,
): Promise<Partial<ViewerPreferencePayload> | null> {
  if (!import.meta.client) return null
  try {
    const res = await fetch(userPreferencesUrl(userId), { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json() as Record<string, unknown>
    const patch: Partial<ViewerPreferencePayload> = {}
    if (typeof data.answerDesign === 'string') {
      patch.answerDesign = normalizeAnswerDesign(data.answerDesign)
    }
    if (typeof data.markdownStyle === 'string') {
      patch.markdownStyle = normalizeMarkdownStyle(data.markdownStyle)
    }
    if (data.viewMode === 'study' || data.viewMode === 'answers') {
      patch.viewMode = data.viewMode
    }
    if (typeof data.showInstructions === 'boolean') {
      patch.showInstructions = data.showInstructions
    }
    if (typeof data.paperZoom === 'number') {
      patch.paperZoom = clampPaperZoom(data.paperZoom)
    }
    return patch
  } catch {
    return null
  }
}

async function saveViewerPreferencesRemote(
  userId: string,
  patch: Partial<ViewerPreferencePayload>,
): Promise<void> {
  if (!import.meta.client || !Object.keys(patch).length) return
  try {
    await fetch(userPreferencesUrl(userId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(patch),
    })
  } catch {
    /* ignore */
  }
}

function migrateLegacyViewerPreferences(): Partial<ViewerPreferencePayload> {
  if (!import.meta.client) return {}
  const patch: Partial<ViewerPreferencePayload> = {}
  try {
    const storedMode = localStorage.getItem(LEGACY_VIEW_MODE_KEY)
    if (storedMode === 'answers' || storedMode === 'study') patch.viewMode = storedMode
    const storedDesign = localStorage.getItem(LEGACY_DESIGN_KEY)
    if (storedDesign) patch.answerDesign = normalizeAnswerDesign(storedDesign)
    const storedMarkdownStyle = localStorage.getItem(LEGACY_MARKDOWN_STYLE_KEY)
    if (storedMarkdownStyle) patch.markdownStyle = normalizeMarkdownStyle(storedMarkdownStyle)
    const storedInstructions = localStorage.getItem(LEGACY_INSTRUCTIONS_KEY)
    if (storedInstructions === '1' || storedInstructions === '0') {
      patch.showInstructions = storedInstructions === '1'
    }
    const zoom = Number(localStorage.getItem(LEGACY_PAPER_ZOOM_KEY))
    if (!Number.isNaN(zoom)) patch.paperZoom = clampPaperZoom(zoom)

    localStorage.removeItem(LEGACY_VIEW_MODE_KEY)
    localStorage.removeItem(LEGACY_DESIGN_KEY)
    localStorage.removeItem(LEGACY_MARKDOWN_STYLE_KEY)
    localStorage.removeItem(LEGACY_INSTRUCTIONS_KEY)
    localStorage.removeItem(LEGACY_PAPER_ZOOM_KEY)
  } catch {
    /* ignore */
  }
  return patch
}

export const useViewerPreferencesStore = defineStore('viewerPreferences', {
  state: () => ({
    viewMode: 'study' as ViewMode,
    answerDesign: DEFAULT_ANSWER_DESIGN as AnswerCardDesign,
    markdownStyle: DEFAULT_MARKDOWN_STYLE as MarkdownDisplayStyle,
    showInstructions: false,
    paperZoom: 1,
    legacyMigrated: false,
    remoteHydratedFor: null as string | null,
  }),

  getters: {
    paperZoomPercent: (state) => `${Math.round(state.paperZoom * 100)}%`,
    canZoomOut: (state) => state.paperZoom > PAPER_ZOOM_MIN + 1e-6,
    canZoomIn: (state) => state.paperZoom < PAPER_ZOOM_MAX - 1e-6,
  },

  actions: {
    ensureHydrated() {
      if (this.legacyMigrated || !import.meta.client) return
      this.legacyMigrated = true
      this.applyPreferences(migrateLegacyViewerPreferences())
    },

    resetRemoteHydration() {
      this.remoteHydratedFor = null
    },

    applyPreferences(prefs: Record<string, unknown> | Partial<ViewerPreferencePayload>) {
      if (typeof prefs.answerDesign === 'string') {
        this.answerDesign = normalizeAnswerDesign(prefs.answerDesign)
      }
      if (typeof prefs.markdownStyle === 'string') {
        this.markdownStyle = normalizeMarkdownStyle(prefs.markdownStyle)
      }
      if (prefs.viewMode === 'study' || prefs.viewMode === 'answers') {
        this.viewMode = prefs.viewMode
      }
      if (typeof prefs.showInstructions === 'boolean') {
        this.showInstructions = prefs.showInstructions
      }
      if (typeof prefs.paperZoom === 'number') {
        this.paperZoom = clampPaperZoom(prefs.paperZoom)
      }
    },

    async hydrateFromServer() {
      const userId = useCurrentUserStore().userId
      if (!import.meta.client || !userId) return
      if (this.remoteHydratedFor === userId) return
      this.remoteHydratedFor = userId
      const remote = await loadViewerPreferencesRemote(userId)
      if (remote) this.applyPreferences(remote)
    },

    persistToUser(patch?: Partial<ViewerPreferencePayload>) {
      const userId = useCurrentUserStore().userId
      if (!userId || !import.meta.client) return
      void saveViewerPreferencesRemote(userId, patch ?? {
        answerDesign: this.answerDesign,
        markdownStyle: this.markdownStyle,
        viewMode: this.viewMode,
        showInstructions: this.showInstructions,
        paperZoom: this.paperZoom,
      })
    },

    setViewMode(mode: ViewMode) {
      this.viewMode = mode
      this.persistToUser({ viewMode: mode })
    },

    setAnswerDesign(design: AnswerCardDesign) {
      this.answerDesign = normalizeAnswerDesign(design)
      this.persistToUser({ answerDesign: this.answerDesign })
    },

    setMarkdownStyle(style: MarkdownDisplayStyle) {
      this.markdownStyle = normalizeMarkdownStyle(style)
      this.persistToUser({ markdownStyle: this.markdownStyle })
    },

    setShowInstructions(on: boolean) {
      this.showInstructions = on
      this.persistToUser({ showInstructions: on })
    },

    zoomOut() {
      this.paperZoom = clampPaperZoom(this.paperZoom - PAPER_ZOOM_STEP)
      this.persistToUser({ paperZoom: this.paperZoom })
    },

    zoomIn() {
      this.paperZoom = clampPaperZoom(this.paperZoom + PAPER_ZOOM_STEP)
      this.persistToUser({ paperZoom: this.paperZoom })
    },

    resetPaperZoom() {
      this.paperZoom = 1
      this.persistToUser({ paperZoom: this.paperZoom })
    },
  },

  persist: {
    key: 'tpb-viewer-preferences',
    pick: ['viewMode', 'answerDesign', 'markdownStyle', 'showInstructions', 'paperZoom', 'legacyMigrated'],
  },
})
