import { defineStore } from 'pinia'
import type { CombinedManifest, EnrichedPaperBundle } from '~/types/paper'

export const API_CACHE_VERSION = 16
const LEGACY_PREFIX = `tpb:api:${API_CACHE_VERSION}:`

function isValidPaperDoc(doc: unknown): doc is EnrichedPaperBundle {
  if (!doc || typeof doc !== 'object') return false
  const sections = (doc as EnrichedPaperBundle).sections
  if (!sections || typeof sections !== 'object' || Array.isArray(sections)) return false
  const sid = Object.keys(sections)[0]
  if (!sid) return true
  const bucket = sections[sid]
  return !!(bucket && typeof bucket === 'object' && bucket.questions && bucket.answers)
}

function migrateLegacyApiCache(): { manifest: CombinedManifest | null; papers: Record<string, EnrichedPaperBundle> } {
  if (!import.meta.client) return { manifest: null, papers: {} }
  let manifest: CombinedManifest | null = null
  const papers: Record<string, EnrichedPaperBundle> = {}
  try {
    const manifestRaw = localStorage.getItem(LEGACY_PREFIX + 'manifest')
    if (manifestRaw) {
      manifest = JSON.parse(manifestRaw) as CombinedManifest
      localStorage.removeItem(LEGACY_PREFIX + 'manifest')
    }
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(LEGACY_PREFIX + 'paper:')) continue
      const paperId = key.slice((LEGACY_PREFIX + 'paper:').length)
      const raw = localStorage.getItem(key)
      if (!raw) continue
      try {
        const doc = JSON.parse(raw) as EnrichedPaperBundle
        if (isValidPaperDoc(doc)) papers[paperId] = doc
      } catch {
        /* skip */
      }
      keysToRemove.push(key)
    }
    for (const key of keysToRemove) localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
  return { manifest, papers }
}

export const useApiCacheStore = defineStore('apiCache', {
  state: () => ({
    cacheVersion: API_CACHE_VERSION,
    manifest: null as CombinedManifest | null,
    papers: {} as Record<string, EnrichedPaperBundle>,
    legacyMigrated: false,
  }),

  actions: {
    ensureHydrated() {
      if (this.legacyMigrated || !import.meta.client) return
      this.legacyMigrated = true
      const legacy = migrateLegacyApiCache()
      if (!this.manifest && legacy.manifest) this.manifest = legacy.manifest
      for (const [id, doc] of Object.entries(legacy.papers)) {
        if (!this.papers[id]) this.papers[id] = doc
      }
    },

    getCachedManifest(): CombinedManifest | null {
      this.ensureHydrated()
      if (this.cacheVersion !== API_CACHE_VERSION) {
        this.clearAll()
        return null
      }
      return this.manifest
    },

    setManifest(doc: CombinedManifest) {
      this.cacheVersion = API_CACHE_VERSION
      this.manifest = doc
    },

    getCachedPaper(paperId: string): EnrichedPaperBundle | null {
      this.ensureHydrated()
      if (this.cacheVersion !== API_CACHE_VERSION) {
        this.clearAll()
        return null
      }
      const doc = this.papers[paperId]
      return doc && isValidPaperDoc(doc) ? doc : null
    },

    setPaper(paperId: string, doc: EnrichedPaperBundle) {
      if (!isValidPaperDoc(doc)) return
      this.cacheVersion = API_CACHE_VERSION
      this.papers[paperId] = doc
    },

    invalidateManifest() {
      this.manifest = null
    },

    invalidatePaper(paperId: string) {
      const id = String(paperId || '')
      if (!id) return
      delete this.papers[id]
    },

    clearAll() {
      this.cacheVersion = API_CACHE_VERSION
      this.manifest = null
      this.papers = {}
    },
  },

  persist: {
    key: `tpb-api-cache-v${API_CACHE_VERSION}`,
    pick: ['cacheVersion', 'manifest', 'papers', 'legacyMigrated'],
  },
})
