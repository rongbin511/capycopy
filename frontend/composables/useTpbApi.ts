import type { CombinedManifest, EnrichedPaperBundle, PaperCatalogEntry, SectionsCatalog, UserCatalogEntry } from '~/types/paper'
import { useApiCacheStore } from '~/stores/apiCache'

export function useTpbApi() {
  const config = useRuntimeConfig()
  const cache = useApiCacheStore()

  async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const resolved =
      import.meta.server && url.startsWith('/')
        ? `${config.apiProxyTarget}${url}`
        : url
    const res = await fetch(resolved, { cache: 'no-store', ...init })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || res.statusText)
    }
    return res.json() as Promise<T>
  }

  const getManifest = async (): Promise<CombinedManifest> => {
    const cached = cache.getCachedManifest()
    if (cached) return cached
    const doc = await fetchJson<CombinedManifest>('/api/manifest')
    cache.setManifest(doc)
    return doc
  }

  const getPapers = async (): Promise<PaperCatalogEntry[]> => {
    return fetchJson<PaperCatalogEntry[]>('/api/manifest/papers')
  }

  const getUsers = async (): Promise<UserCatalogEntry[]> => {
    return fetchJson<UserCatalogEntry[]>('/api/users')
  }

  const createUser = async (
    user: {
      user_id: string
      gender?: string
      level?: string
      role?: string
      preference?: Record<string, unknown>
      last_viewed?: string
    },
  ): Promise<{ ok: boolean; user: UserCatalogEntry }> => {
    return fetchJson('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(user),
    })
  }

  const deleteUser = async (userId: string): Promise<unknown> => {
    return fetchJson(
      `/api/users/${encodeURIComponent(String(userId || ''))}`,
      {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      },
    )
  }

  type ViewerPreferencesDoc = {
    answerDesign: string
    markdownStyle: string
    viewMode: string
    showInstructions: boolean
    paperZoom: number
  }

  const getUserPreferences = async (userId: string): Promise<ViewerPreferencesDoc> => {
    return fetchJson<ViewerPreferencesDoc>(
      `/api/users/${encodeURIComponent(String(userId || ''))}/preferences`,
    )
  }

  const updateUserPreferences = async (
    userId: string,
    patch: Partial<ViewerPreferencesDoc>,
  ): Promise<ViewerPreferencesDoc> => {
    return fetchJson<ViewerPreferencesDoc>(
      `/api/users/${encodeURIComponent(String(userId || ''))}/preferences`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(patch),
      },
    )
  }

  const getPaper = async (
    paperId: string,
    opts?: { bypassCache?: boolean },
  ): Promise<EnrichedPaperBundle> => {
    const id = String(paperId || '')
    if (!opts?.bypassCache) {
      const cached = cache.getCachedPaper(id)
      if (cached) return cached
    }
    const doc = await fetchJson<EnrichedPaperBundle>(
      '/api/papers/' + encodeURIComponent(id),
    )
    cache.setPaper(id, doc)
    return doc
  }

  const setPaper = (paperId: string, doc: EnrichedPaperBundle) => {
    cache.setPaper(String(paperId), doc)
  }

  const invalidatePaper = (paperId: string) => {
    cache.invalidatePaper(paperId)
  }

  const invalidateManifest = () => {
    cache.invalidateManifest()
  }

  const updateQuestion = async (
    paperId: string,
    sectionId: string | number,
    questionId: string,
    question: unknown,
  ): Promise<unknown> => {
    return fetchJson(
      `/api/papers/${encodeURIComponent(String(paperId || ''))}/questions/${encodeURIComponent(String(sectionId || ''))}/${encodeURIComponent(String(questionId || ''))}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ question }),
      },
    )
  }

  const updateAnswer = async (
    paperId: string,
    sectionId: string | number,
    questionId: string,
    answer: unknown,
  ): Promise<unknown> => {
    return fetchJson(
      `/api/papers/${encodeURIComponent(String(paperId || ''))}/answers/${encodeURIComponent(String(sectionId || ''))}/${encodeURIComponent(String(questionId || ''))}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ answer }),
      },
    )
  }

  const updateSectionQuestions = async (
    paperId: string,
    sectionId: string | number,
    questions: unknown,
  ): Promise<unknown> => {
    return fetchJson(
      `/api/papers/${encodeURIComponent(String(paperId || ''))}/questions/${encodeURIComponent(String(sectionId || ''))}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ questions }),
      },
    )
  }

  const updateSectionAnswers = async (
    paperId: string,
    sectionId: string | number,
    answers: unknown,
  ): Promise<unknown> => {
    return fetchJson(
      `/api/papers/${encodeURIComponent(String(paperId || ''))}/answers/${encodeURIComponent(String(sectionId || ''))}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ answers }),
      },
    )
  }

  const replaceSection = async (
    paperId: string,
    sectionId: string | number,
    section: unknown,
  ): Promise<unknown> => {
    return fetchJson(
      `/api/papers/${encodeURIComponent(String(paperId || ''))}/sections/${encodeURIComponent(String(sectionId || ''))}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ section }),
      },
    )
  }

  const updateSectionNote = async (
    paperId: string,
    sectionId: string | number,
    markdown: string,
  ): Promise<unknown> => {
    return fetchJson(
      `/api/papers/${encodeURIComponent(String(paperId || ''))}/notes/${encodeURIComponent(String(sectionId || ''))}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ markdown }),
      },
    )
  }

  const updateSubject = async (
    subjectId: string,
    subject: { label?: string | null; sectionids?: string[] | null },
  ): Promise<unknown> => {
    return fetchJson(
      `/api/manifest/subjects/${encodeURIComponent(String(subjectId || ''))}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(subject),
      },
    )
  }

  const createSubject = async (
    subject: {
      subject_id: string
      label: string
      sectionids?: string[]
    },
  ): Promise<unknown> => {
    return fetchJson('/api/manifest/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(subject),
    })
  }

  const createSection = async (
    section: {
      subject_id: string
      section_id: string
      stem: string
      label: string
      title: string
      interaction: string
      marks?: number
      instruction?: string
      template?: Record<string, unknown>
    },
  ): Promise<unknown> => {
    return fetchJson('/api/manifest/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(section),
    })
  }

  const updateSection = async (
    sectionId: string,
    section: {
      stem?: string | null
      label?: string | null
      title?: string | null
      interaction?: string | null
      marks?: number | null
      instruction?: string | null
      template?: Record<string, unknown> | null
    },
  ): Promise<unknown> => {
    return fetchJson(`/api/manifest/sections/${encodeURIComponent(String(sectionId || ''))}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(section),
    })
  }

  const updateSchool = async (
    schoolId: string,
    school: {
      slug?: string | null
      official_name?: string | null
      zh?: string | null
      short_name?: string | null
    },
  ): Promise<unknown> => {
    return fetchJson(
      `/api/manifest/schools/${encodeURIComponent(String(schoolId || ''))}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(school),
      },
    )
  }

  const createSchool = async (
    school: {
      school_id: string
      slug: string
      official_name: string
      zh?: string | null
      short_name?: string | null
    },
  ): Promise<unknown> => {
    return fetchJson('/api/manifest/schools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(school),
    })
  }

  const deleteSchool = async (schoolId: string): Promise<unknown> => {
    return fetchJson(
      `/api/manifest/schools/${encodeURIComponent(String(schoolId || ''))}`,
      {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      },
    )
  }

  const deletePaper = async (paperId: string): Promise<unknown> => {
    return fetchJson(
      `/api/manifest/papers/${encodeURIComponent(String(paperId || ''))}`,
      {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      },
    )
  }

  return {
    getManifest,
    getPapers,
    getUsers,
    createUser,
    deleteUser,
    getUserPreferences,
    updateUserPreferences,
    getPaper,
    setPaper,
    invalidatePaper,
    invalidateManifest,
    updateQuestion,
    updateAnswer,
    updateSectionQuestions,
    updateSectionAnswers,
    replaceSection,
    updateSectionNote,
    updateSubject,
    createSubject,
    createSection,
    updateSection,
    updateSchool,
    createSchool,
    deleteSchool,
    deletePaper,
    fetchJson,
  }
}

export function sectionsFromManifest(manifest: CombinedManifest): SectionsCatalog {
  return {
    sections: manifest.sections ?? {},
    subjects: Object.fromEntries(
      Object.entries(manifest.subjects ?? {}).map(([k, v]) => [
        k,
        { label: v.label, sectionids: v.sectionids.map(String) },
      ]),
    ),
  }
}
