<template>
  <UDashboardNavbar title="Settings" />
  <div class="settings-page flex-1 min-w-0 min-h-0 overflow-y-auto p-4 sm:p-6 max-w-6xl w-full space-y-6 text-slate-900">
    <div class="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-sm">
      <UButton
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        size="sm"
        :color="activeTab === tab.key ? 'primary' : 'neutral'"
        :variant="activeTab === tab.key ? 'solid' : 'ghost'"
        class="rounded-xl"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </UButton>
    </div>

    <div v-if="activeTab === 'schools'" class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
        <h2 class="text-lg font-semibold text-slate-900">Schools</h2>
        <p class="text-sm text-slate-600">Edit or remove schools in the manifest database.</p>
        </div>
        <UButton icon="i-lucide-plus" @click="openSchoolCreate">
          New school
        </UButton>
      </div>
      <div v-if="schoolRows.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SchoolSettingCard
          v-for="school in schoolRows"
          :key="school.schoolId"
          :school="school"
          @edit="openSchoolEditor(school)"
          @delete="confirmDeleteSchool(school)"
        />
      </div>
      <UAlert
        v-else
        color="neutral"
        variant="subtle"
        icon="i-lucide-school"
        title="No schools found"
        description="The manifest does not include any school entries yet."
      />
    </div>

    <div v-else-if="activeTab === 'subjects'" class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
        <h2 class="text-lg font-semibold text-slate-900">Subjects</h2>
        <p class="text-sm text-slate-600">Pick a subject to inspect the sections connected to it.</p>
        </div>
        <UButton icon="i-lucide-plus" @click="openSubjectCreate">
          New subject
        </UButton>
      </div>

      <SubjectPillNav
        :items="subjectRows"
        :active-key="activeSubjectKey"
        @select="activeSubjectKey = $event"
      />

      <SubjectSectionsInfo
        v-if="activeSubject"
        :subject="activeSubject"
        :sections="activeSubjectSections"
        @edit="openSubjectEditor"
        @create="openSectionCreate"
        @edit-section="openSectionEditor"
      />
      <UAlert
        v-else
        color="neutral"
        variant="subtle"
        icon="i-lucide-list-tree"
        title="No subject selected"
        description="Select a subject above to see its section information."
      />
    </div>

    <div v-else-if="activeTab === 'papers'" class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">Papers</h2>
          <p class="text-sm text-slate-600">Browse papers in the manifest database or create a new paper bundle.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <UButton icon="i-lucide-plus" @click="openPaperCreate">
            New paper
          </UButton>
          <UBadge color="neutral" variant="subtle">{{ filteredPaperRows.length }} rows</UBadge>
        </div>
      </div>

      <div class="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <UFormField label="Search" class="min-w-[220px] flex-1">
          <UInput
            v-model="paperSearch"
            icon="i-lucide-search"
            placeholder="Search paper id, school, subject..."
          />
        </UFormField>
        <UFormField label="Level" class="min-w-[140px]">
          <USelect v-model="paperLevel" :items="paperLevelItems" />
        </UFormField>
        <UFormField label="Subject" class="min-w-[140px]">
          <USelect v-model="paperSubject" :items="paperSubjectItems" />
        </UFormField>
        <UFormField label="Year" class="min-w-[120px]">
          <USelect v-model="paperYear" :items="paperYearItems" />
        </UFormField>
        <UFormField label="Term" class="min-w-[120px]">
          <USelect v-model="paperTerm" :items="paperTermItems" />
        </UFormField>
        <UFormField label="School" class="min-w-[160px]">
          <USelect v-model="paperSchool" :items="paperSchoolItems" />
        </UFormField>
        <UButton color="neutral" variant="ghost" icon="i-lucide-rotate-ccw" @click="clearPaperFilters">
          Clear
        </UButton>
      </div>

      <div v-if="filteredPaperRows.length" class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="max-h-[34rem] overflow-auto">
          <UTable
            :data="filteredPaperRows"
            :columns="paperTableColumns"
            sticky="header"
            class="min-w-full"
          >
            <template #paper_id-cell="{ row }">
              <NuxtLink
                :to="paperViewerHref(row.original)"
                class="font-mono text-xs text-primary hover:underline"
              >
                {{ row.original.paper_id }}
              </NuxtLink>
            </template>
            <template #actions-cell="{ row }">
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                :loading="deletingPaperId === row.original.paper_id"
                aria-label="Delete paper"
                @click="confirmDeletePaper(row.original)"
              />
            </template>
          </UTable>
        </div>
      </div>
      <UAlert
        v-else
        color="neutral"
        variant="subtle"
        icon="i-lucide-file-text"
        title="No papers found"
        description="Try clearing the filters or check whether the papers table includes any rows yet."
      />
    </div>

    <div v-else-if="activeTab === 'users'" class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">Users</h2>
          <p class="text-sm text-slate-600">Learner profiles with level, role, and last viewed paper.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <UButton icon="i-lucide-plus" @click="openUserCreate">
            New user
          </UButton>
          <UBadge color="neutral" variant="subtle">{{ userRows.length }} rows</UBadge>
        </div>
      </div>

      <div v-if="userRows.length" class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="max-h-[34rem] overflow-auto">
          <UTable
            :data="userRows"
            :columns="userTableColumns"
            sticky="header"
            class="min-w-full"
          >
            <template #actions-cell="{ row }">
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                :loading="deletingUserId === row.original.user_id"
                aria-label="Delete user"
                @click="confirmDeleteUser(row.original)"
              />
            </template>
          </UTable>
        </div>
      </div>
      <UAlert
        v-else
        color="neutral"
        variant="subtle"
        icon="i-lucide-user-plus"
        title="No users yet"
        description="Create the first learner profile to get started."
      >
        <template #actions>
          <UButton icon="i-lucide-plus" @click="openUserCreate">
            Add user
          </UButton>
        </template>
      </UAlert>
    </div>

    <div v-else-if="activeTab === 'preferences'" class="space-y-4">
      <div>
        <h2 class="text-lg font-semibold text-slate-900">Preferences</h2>
        <p class="text-sm text-slate-600">Viewer preferences for the paper viewer update immediately.</p>
      </div>

      <section class="space-y-3">
        <div>
          <h3 class="text-base font-semibold text-slate-900">Answer cards</h3>
          <p class="text-sm text-slate-600">Choose how answer explanations are framed in the viewer.</p>
        </div>
        <div class="grid gap-4">
          <button
            v-for="d in ANSWER_CARD_DESIGNS"
            :key="d.id"
            type="button"
            role="radio"
            :aria-checked="answerDesign === d.id"
            class="block w-full rounded-xl border border-slate-200 p-4 text-left transition-colors bg-white/90 hover:bg-slate-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            :class="{ 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/70': answerDesign === d.id }"
            @click="setAnswerDesign(d.id)"
          >
            <div class="flex items-start gap-3 mb-3">
              <span class="mt-0.5 size-5 rounded-full shrink-0" :class="d.swatch" />
              <div>
                <p class="font-medium text-slate-900">{{ d.label }}</p>
                <p class="text-sm text-slate-600">{{ d.description }}</p>
              </div>
            </div>
            <div class="design-preview pointer-events-none select-none rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3">
              <div class="tpb-answer-card" :data-answer-design="d.id">
                <div class="tpb-answer-card-body space-y-1.5 text-sm">
                  <p class="tpb-answer-card-concept font-medium">词汇辨析 - get ahead</p>
                  <p class="tpb-answer-card-muted tpb-zh-surface">母亲常勉励我努力，以便在人生路上出人头地。</p>
                  <p class="tpb-answer-card-answer">(2) get ahead</p>
                </div>
              </div>
            </div>
          </button>
        </div>
      </section>

      <section class="space-y-3">
        <div>
          <h3 class="text-base font-semibold text-slate-900">Markdown display</h3>
          <p class="text-sm text-slate-600">Choose a reading style for notes and other markdown content.</p>
        </div>
        <div class="grid gap-4">
          <button
            v-for="d in MARKDOWN_DISPLAY_STYLES"
            :key="d.id"
            type="button"
            role="radio"
            :aria-checked="markdownStyle === d.id"
            class="block w-full rounded-xl border border-slate-200 p-4 text-left transition-colors bg-white/90 hover:bg-slate-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            :class="{ 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/70': markdownStyle === d.id }"
            @click="setMarkdownStyle(d.id)"
          >
            <div class="flex items-start gap-3 mb-3">
              <span class="mt-0.5 size-5 rounded-full shrink-0" :class="d.swatch" />
              <div>
                <p class="font-medium text-slate-900">{{ d.label }}</p>
                <p class="text-sm text-slate-600">{{ d.description }}</p>
              </div>
            </div>
            <div class="design-preview pointer-events-none select-none rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3">
              <div class="tpb-markdown rounded-xl border border-slate-200 bg-white px-4 py-4" :class="`tpb-markdown--${d.id}`">
                <div v-html="sampleHtml"></div>
              </div>
            </div>
          </button>
        </div>
      </section>
    </div>
  </div>
  <SubjectEditModal ref="subjectModal" :save-fn="saveSubject" @close="subjectModalOpen = false" />
  <SubjectCreateModal ref="subjectCreateModal" :save-fn="createSubject" />
  <SectionCreateModal ref="sectionCreateModal" :save-fn="createSection" />
  <SectionEditModal ref="sectionEditModal" :save-fn="saveSection" />
  <SchoolEditModal ref="schoolModal" :save-fn="saveSchool" />
  <SchoolCreateModal ref="schoolCreateModal" :save-fn="createSchool" />
  <PaperCreateModal ref="paperCreateModal" :save-fn="createPaper" />
  <UserCreateModal ref="userCreateModal" :save-fn="createUser" @created="onUserCreated" />
</template>

<script setup lang="ts">
import { marked } from 'marked'
import type { CombinedManifest, PaperCatalogEntry, SectionCatalogEntry, UserCatalogEntry } from '~/types/paper'
import { ANSWER_CARD_DESIGNS } from '~/utils/answerDesigns'
import { MARKDOWN_DISPLAY_STYLES } from '~/utils/markdownStyles'
import { sectionsFromManifest, useTpbApi } from '~/composables/useTpbApi'
import { useCurrentUserStore } from '~/stores/currentUser'

const api = useTpbApi()
const currentUserStore = useCurrentUserStore()
const route = useRoute()
const { data: manifest, refresh: refreshManifest } = await useAsyncData('settings-manifest', () => api.getManifest())
const { data: paperRowsData, refresh: refreshPapers } = await useAsyncData('settings-papers', () => api.getPapers())
const { data: usersData, refresh: refreshUsers } = await useAsyncData('settings-users', () => api.getUsers())

const { answerDesign, markdownStyle, setAnswerDesign, setMarkdownStyle } = useViewerPreferences()

const tabs = [
  { key: 'schools', label: 'Schools' },
  { key: 'subjects', label: 'Subjects' },
  { key: 'papers', label: 'Papers' },
  { key: 'users', label: 'Users' },
  { key: 'preferences', label: 'Preferences' },
] as const

type TabKey = (typeof tabs)[number]['key']

function isTabKey(value: unknown): value is TabKey {
  return typeof value === 'string' && tabs.some((tab) => tab.key === value)
}

const activeTab = ref<TabKey>(
  isTabKey(route.query.tab) ? route.query.tab : 'preferences',
)

watch(activeTab, (tab) => {
  if (route.query.tab === tab) return
  navigateTo({ path: '/settings', query: { tab } }, { replace: true })
})

const manifestDoc = computed(() => manifest.value as CombinedManifest | null)
const sectionsCatalog = computed(() => sectionsFromManifest(manifestDoc.value))
const paperRows = computed(() => paperRowsData.value || [])
const userRows = computed(() => usersData.value || [])

const schoolRows = computed(() =>
  Object.entries(manifestDoc.value?.schools || {})
    .map(([schoolId, school]) => ({ schoolId, ...school }))
    .sort((a, b) => a.official_name.localeCompare(b.official_name)),
)

const ALL_FILTER = '__all__'
const paperSearch = ref('')
const paperLevel = ref(ALL_FILTER)
const paperSubject = ref(ALL_FILTER)
const paperYear = ref(ALL_FILTER)
const paperTerm = ref(ALL_FILTER)
const paperSchool = ref(ALL_FILTER)
const deletingPaperId = ref('')
const deletingUserId = ref('')

const paperTableColumns = [
  { id: 'actions', header: '' },
  { accessorKey: 'paper_id', header: 'paper_id' },
  { accessorKey: 'level', header: 'level' },
  { accessorKey: 'subject', header: 'subject' },
  { accessorKey: 'year', header: 'year' },
  { accessorKey: 'term', header: 'term' },
  { accessorKey: 'school', header: 'school' },
]

const userTableColumns = [
  { id: 'actions', header: '' },
  { accessorKey: 'user_id', header: 'user_id' },
  { accessorKey: 'gender', header: 'gender' },
  { accessorKey: 'level', header: 'level' },
  { accessorKey: 'role', header: 'role' },
  { accessorKey: 'last_viewed', header: 'last_viewed' },
]

function filterItems(values: string[], labelAll: string) {
  return [
    { label: labelAll, value: ALL_FILTER },
    ...values.map((value) => ({ label: value, value })),
  ]
}

const paperLevelItems = computed(() =>
  filterItems(
    [...new Set(paperRows.value.map((row) => row.level).filter(Boolean))].sort(),
    'All levels',
  ),
)

const paperSubjectItems = computed(() =>
  filterItems(
    [...new Set(paperRows.value.map((row) => row.subject).filter(Boolean))].sort(),
    'All subjects',
  ),
)

const paperYearItems = computed(() =>
  filterItems(
    [...new Set(paperRows.value.map((row) => String(row.year)).filter(Boolean))].sort((a, b) => Number(b) - Number(a)),
    'All years',
  ),
)

const paperTermItems = computed(() =>
  filterItems(
    [...new Set(paperRows.value.map((row) => row.term).filter(Boolean))].sort(),
    'All terms',
  ),
)

const paperSchoolItems = computed(() =>
  filterItems(
    [...new Set(paperRows.value.map((row) => row.school).filter(Boolean))].sort(),
    'All schools',
  ),
)

const filteredPaperRows = computed(() => {
  const query = paperSearch.value.trim().toLowerCase()
  return paperRows.value.filter((row) => {
    if (paperLevel.value !== ALL_FILTER && row.level !== paperLevel.value) return false
    if (paperSubject.value !== ALL_FILTER && row.subject !== paperSubject.value) return false
    if (paperYear.value !== ALL_FILTER && String(row.year) !== paperYear.value) return false
    if (paperTerm.value !== ALL_FILTER && row.term !== paperTerm.value) return false
    if (paperSchool.value !== ALL_FILTER && row.school !== paperSchool.value) return false
    if (!query) return true
    const haystack = [
      row.paper_id,
      row.level,
      row.subject,
      String(row.year),
      row.term,
      row.school,
    ].join(' ').toLowerCase()
    return haystack.includes(query)
  })
})

function clearPaperFilters() {
  paperSearch.value = ''
  paperLevel.value = ALL_FILTER
  paperSubject.value = ALL_FILTER
  paperYear.value = ALL_FILTER
  paperTerm.value = ALL_FILTER
  paperSchool.value = ALL_FILTER
}

const subjectRows = computed(() =>
  Object.entries(manifestDoc.value?.subjects || {})
    .map(([key, value]) => ({
      key,
      label: value.label,
      sectionids: value.sectionids || [],
      defaultPaper: value.default,
    }))
    .sort((a, b) => a.label.localeCompare(b.label)),
)

const activeSubjectKey = ref('')
watch(
  subjectRows,
  (rows) => {
    if (!rows.length) {
      activeSubjectKey.value = ''
      return
    }
    if (!rows.some((row) => row.key === activeSubjectKey.value)) {
      activeSubjectKey.value = rows[0].key
    }
  },
  { immediate: true },
)

const activeSubject = computed(() =>
  subjectRows.value.find((row) => row.key === activeSubjectKey.value) || null,
)

const activeSubjectSections = computed(() =>
  activeSubject.value
    ? activeSubject.value.sectionids
        .map((sid) => {
          const row = sectionsCatalog.value.sections[sid]
          return row ? { sectionId: sid, ...row } : null
        })
        .filter((row): row is SectionCatalogEntry & { sectionId: string } => Boolean(row))
    : [],
)

type SubjectPayload = {
  subjectId: string
  label: string
  sectionids: string[]
}

type SubjectCreatePayload = {
  subject_id: string
  label: string
  sectionids: string[]
}

type SectionCreatePayload = {
  subject_id: string
  section_id: string
  stem: string
  label: string
  title: string
  interaction: string
  marks: number
  instruction: string
  template: Record<string, unknown>
}

type SectionEditPayload = {
  subject_id: string
  section_id: string
  stem: string
  label: string
  title: string
  interaction: string
  marks: number
  instruction: string
  template: Record<string, unknown>
}

type SchoolPayload = {
  schoolId: string
  slug: string
  official_name: string
  zh: string
  short_name: string
}

type SchoolCreatePayload = {
  school_id: string
  slug: string
  official_name: string
  zh: string
  short_name: string
}

type SubjectModalRef = {
  show: (initial: SubjectPayload) => void
}

const subjectModal = ref<SubjectModalRef | null>(null)
const subjectModalOpen = ref(false)
type SubjectCreateModalRef = {
  show: () => void
}

const subjectCreateModal = ref<SubjectCreateModalRef | null>(null)
type SectionCreateModalRef = {
  show: (initial?: {
    subject_id: string
    subject_label: string
    section_id: string
    stem?: string
    label?: string
    title?: string
    interaction?: string
    marks?: number
    instruction?: string
    template?: Record<string, unknown>
  }) => void
}

const sectionCreateModal = ref<SectionCreateModalRef | null>(null)
type SectionEditModalRef = {
  show: (initial?: {
    subject_id: string
    subject_label: string
    section_id: string
    stem?: string
    label?: string
    title?: string
    interaction?: string
    marks?: number
    instruction?: string
    template?: Record<string, unknown>
  }) => void
}

const sectionEditModal = ref<SectionEditModalRef | null>(null)
type SchoolModalRef = {
  show: (initial: SchoolPayload) => void
}

const schoolModal = ref<SchoolModalRef | null>(null)
type SchoolCreateModalRef = {
  show: () => void
}

const schoolCreateModal = ref<SchoolCreateModalRef | null>(null)

type PaperCreateModalRef = {
  show: (initial?: { level?: string; subject_key?: string }) => void
}

const paperCreateModal = ref<PaperCreateModalRef | null>(null)

type UserCreateModalRef = {
  show: () => void
}

const userCreateModal = ref<UserCreateModalRef | null>(null)

function nextSectionId(sectionIds: string[]): string {
  const numericIds = sectionIds
    .map((id) => Number.parseInt(String(id), 10))
    .filter((id) => Number.isInteger(id) && id > 0)
  return String((numericIds.length ? Math.max(...numericIds) : 0) + 1)
}

function openSubjectEditor() {
  if (!activeSubject.value) return
  subjectModalOpen.value = true
  subjectModal.value?.show({
    subjectId: activeSubject.value.key,
    label: activeSubject.value.label,
    sectionids: [...activeSubject.value.sectionids],
  })
}

function openSubjectCreate() {
  subjectCreateModal.value?.show()
}

function openSectionCreate() {
  if (!activeSubject.value) return
  sectionCreateModal.value?.show({
    subject_id: activeSubject.value.key,
    subject_label: activeSubject.value.label,
    section_id: nextSectionId(activeSubject.value.sectionids),
    template: {},
  })
}

function openSectionEditor(section: (typeof activeSubjectSections.value)[number]) {
  if (!activeSubject.value) return
  sectionEditModal.value?.show({
    subject_id: activeSubject.value.key,
    subject_label: activeSubject.value.label,
    section_id: section.sectionId,
    stem: section.stem,
    label: section.label,
    title: section.title,
    interaction: section.interaction,
    marks: section.marks ?? 0,
    instruction: section.instruction || '',
    template: section.template ?? {},
  })
}

async function saveSubject(payload: SubjectPayload) {
  await api.updateSubject(payload.subjectId, {
    label: payload.label,
    sectionids: payload.sectionids,
  })
  api.invalidateManifest()
  await refreshManifest()
}

async function createSubject(payload: SubjectCreatePayload) {
  await api.createSubject({
    subject_id: payload.subject_id,
    label: payload.label,
    sectionids: payload.sectionids,
  })
  api.invalidateManifest()
  await refreshManifest()
}

async function createSection(payload: SectionCreatePayload) {
  await api.createSection({
    subject_id: payload.subject_id,
    section_id: payload.section_id,
    stem: payload.stem,
    label: payload.label,
    title: payload.title,
    interaction: payload.interaction,
    marks: payload.marks,
    instruction: payload.instruction,
    template: payload.template,
  })
  api.invalidateManifest()
  await refreshManifest()
}

async function saveSection(payload: SectionEditPayload) {
  await api.updateSection(payload.section_id, {
    stem: payload.stem,
    label: payload.label,
    title: payload.title,
    interaction: payload.interaction,
    marks: payload.marks,
    instruction: payload.instruction,
    template: payload.template,
  })
  api.invalidateManifest()
  await refreshManifest()
}

function openSchoolEditor(school: (typeof schoolRows.value)[number]) {
  schoolModal.value?.show({
    schoolId: school.schoolId,
    slug: school.slug || '',
    official_name: school.official_name || '',
    zh: school.zh || '',
    short_name: school.short_name || '',
  })
}

function openSchoolCreate() {
  schoolCreateModal.value?.show()
}

function openPaperCreate() {
  paperCreateModal.value?.show()
}

type PaperCreatePayload = {
  school_key: string
  year: number
  level: string
  subject_key: string
  term: string
}

type PaperCreateResult = {
  paper_id: string
  subject: string
}

async function createPaper(payload: PaperCreatePayload): Promise<PaperCreateResult> {
  const result = await api.fetchJson<PaperCreateResult>('/api/prototype', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  api.invalidateManifest()
  await Promise.all([refreshManifest(), refreshPapers()])
  return result
}

function paperViewerHref(paper: PaperCatalogEntry) {
  return `/papers/${paper.subject}?paper=${encodeURIComponent(paper.paper_id)}`
}

async function confirmDeletePaper(paper: PaperCatalogEntry) {
  const ok = window.confirm(
    `Delete paper "${paper.paper_id}"? This removes the database row and the paper folder on disk.`,
  )
  if (!ok) return
  deletingPaperId.value = paper.paper_id
  try {
    await api.deletePaper(paper.paper_id)
    api.invalidateManifest()
    api.invalidatePaper(paper.paper_id)
    await Promise.all([refreshManifest(), refreshPapers()])
  } finally {
    deletingPaperId.value = ''
  }
}

function openUserCreate() {
  userCreateModal.value?.show()
}

type UserCreatePayload = {
  user_id: string
  gender: string
  level: string
  role: string
}

async function createUser(payload: UserCreatePayload): Promise<UserCatalogEntry> {
  const result = await api.createUser(payload)
  await refreshUsers()
  return result.user
}

async function onUserCreated() {
  await refreshUsers()
}

async function confirmDeleteUser(user: UserCatalogEntry) {
  const ok = window.confirm(`Delete user "${user.user_id}"? This cannot be undone.`)
  if (!ok) return
  deletingUserId.value = user.user_id
  try {
    await api.deleteUser(user.user_id)
    if (currentUserStore.userId === user.user_id) {
      currentUserStore.logout()
    }
    await Promise.all([refreshUsers(), refreshNuxtData('current-user-list')])
  } finally {
    deletingUserId.value = ''
  }
}

async function saveSchool(payload: SchoolPayload) {
  await api.updateSchool(payload.schoolId, {
    slug: payload.slug,
    official_name: payload.official_name,
    zh: payload.zh,
    short_name: payload.short_name,
  })
  api.invalidateManifest()
  await refreshManifest()
}

async function createSchool(payload: SchoolCreatePayload) {
  await api.createSchool({
    school_id: payload.school_id,
    slug: payload.slug,
    official_name: payload.official_name,
    zh: payload.zh,
    short_name: payload.short_name,
  })
  api.invalidateManifest()
  await refreshManifest()
}

async function confirmDeleteSchool(school: SchoolPayload) {
  const ok = window.confirm(`Delete school \"${school.official_name}\"? This cannot be undone.`)
  if (!ok) return
  await api.deleteSchool(school.schoolId)
  api.invalidateManifest()
  await refreshManifest()
}

const sampleMarkdown = `# Note title

This is a short paragraph with \`inline code\`, a reference, and a small list.

## Key points

- First point
- Second point

> A gentle callout can help key ideas stand out.`

const sampleHtml = computed(() => String(marked.parse(sampleMarkdown, { gfm: true, breaks: false })))
</script>
