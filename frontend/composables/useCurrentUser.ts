import type { CombinedManifest, PaperManifestEntry, UserCatalogEntry } from '~/types/paper'
import { useCurrentUserStore } from '~/stores/currentUser'

export function subjectFromPaperId(paperId: string): string {
  const match = /^p\d+_([a-z0-9]+)_/i.exec(String(paperId || ''))
  return match?.[1]?.toLowerCase() || ''
}

export function levelFromPaperId(paperId: string): string {
  const match = /^(p\d+)/i.exec(String(paperId || ''))
  return match?.[1]?.toUpperCase() || ''
}

export function paperMatchesUserLevel(
  paper: Pick<PaperManifestEntry, 'level' | 'id'>,
  userLevel: string,
): boolean {
  const expected = String(userLevel || '').trim().toUpperCase()
  if (!expected) return true
  const paperLevel = String(paper.level || levelFromPaperId(paper.id || '')).trim().toUpperCase()
  return paperLevel === expected
}

export function papersForUserLevel(
  papers: PaperManifestEntry[] | undefined,
  userLevel: string,
): PaperManifestEntry[] {
  return (papers || []).filter((paper) => paperMatchesUserLevel(paper, userLevel))
}

export function subjectChoicesForUser(
  manifest: CombinedManifest | null,
  userLevel: string,
  subjectMeta: Record<string, { label: string; icon: string }>,
) {
  const subjects = manifest?.subjects || {}
  return Object.entries(subjects)
    .map(([key, block]) => {
      const papers = papersForUserLevel(block.papers, userLevel)
      return {
        key,
        label: block.label || subjectMeta[key]?.label || key,
        icon: subjectMeta[key]?.icon || 'i-lucide-book-open',
        paperCount: papers.length,
        papers,
      }
    })
    .filter((subject) => subject.paperCount > 0)
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function defaultPaperIdForSubject(
  manifest: CombinedManifest | null,
  subjectKey: string,
  user: UserCatalogEntry | null,
): string {
  if (!user) return ''
  const level = user.level
  const papers = papersForUserLevel(manifest?.subjects?.[subjectKey]?.papers, level)
  if (user.last_viewed && subjectFromPaperId(user.last_viewed) === subjectKey) {
    const lastViewed = { id: user.last_viewed, level: levelFromPaperId(user.last_viewed) }
    if (paperMatchesUserLevel(lastViewed, level)) return user.last_viewed
  }
  const sorted = [...papers].sort((a, b) => String(a.id).localeCompare(String(b.id)))
  return sorted[0]?.id || ''
}

export function formatUserGender(gender: string) {
  if (gender === 'female') return 'Female'
  if (gender === 'male') return 'Male'
  if (gender === 'unspecified') return 'Unspecified'
  return gender || '—'
}

export function useCurrentUser() {
  const store = useCurrentUserStore()
  const api = useTpbApi()

  const { data: usersData, refresh: refreshUsers } = useAsyncData(
    'current-user-list',
    () => api.getUsers(),
    { default: () => [] as UserCatalogEntry[] },
  )

  const users = computed(() => usersData.value || [])

  const currentUser = computed(() => {
    if (!store.userId) return null
    return users.value.find((user) => user.user_id === store.userId) || null
  })

  function login(user: UserCatalogEntry) {
    store.login(user)
  }

  function logout() {
    store.logout()
  }

  function paperHrefForSubject(
    subjectKey: string,
    manifest: CombinedManifest | null,
  ): string {
    const base = `/papers/${subjectKey}`
    const paperId = defaultPaperIdForSubject(manifest, subjectKey, currentUser.value)
    if (paperId) return `${base}?paper=${encodeURIComponent(paperId)}`
    return base
  }

  return {
    userId: computed(() => store.userId),
    isLoggedIn: computed(() => store.isLoggedIn),
    currentUser,
    users,
    refreshUsers,
    login,
    logout,
    paperHrefForSubject,
    subjectFromPaperId,
    levelFromPaperId,
    papersForUserLevel,
    subjectChoicesForUser,
    formatUserGender,
  }
}
