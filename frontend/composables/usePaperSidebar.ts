import type { PaperManifestEntry } from '~/types/paper'

export interface PaperYearGroup {
  year: string
  papers: PaperManifestEntry[]
}

export function usePaperSidebar() {
  const enabled = useState('paper-sidebar-enabled', () => false)
  const subject = useState('paper-sidebar-subject', () => '')
  const subjectLabel = useState('paper-sidebar-label', () => '')
  const yearGroups = useState<PaperYearGroup[]>('paper-sidebar-years', () => [])
  const paperId = useState('paper-sidebar-paper-id', () => '')
  const collapsedYears = useState<string[]>('paper-sidebar-collapsed-years', () => [])

  function enable(data: {
    subject: string
    subjectLabel: string
    yearGroups: PaperYearGroup[]
    paperId: string
  }) {
    enabled.value = true
    subject.value = data.subject
    subjectLabel.value = data.subjectLabel
    yearGroups.value = data.yearGroups
    paperId.value = data.paperId
  }

  function disable() {
    enabled.value = false
    subject.value = ''
    subjectLabel.value = ''
    yearGroups.value = []
    paperId.value = ''
    collapsedYears.value = []
  }

  function setPaperId(id: string) {
    paperId.value = id
  }

  function toggleYear(year: string) {
    const set = new Set(collapsedYears.value)
    if (set.has(year)) set.delete(year)
    else set.add(year)
    collapsedYears.value = [...set]
  }

  function isYearCollapsed(year: string) {
    return collapsedYears.value.includes(year)
  }

  return {
    enabled,
    subject,
    subjectLabel,
    yearGroups,
    paperId,
    enable,
    disable,
    setPaperId,
    toggleYear,
    isYearCollapsed,
  }
}
