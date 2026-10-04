export type ViewMode = 'study' | 'answers'

export interface SchoolEntry {
  slug: string
  official_name: string
  zh?: string
}

export interface SectionCatalogEntry {
  sectionid: number
  stem: string
  label: string
  title: string
  interaction: string
  marks?: number
  instruction?: string
  template?: Record<string, unknown>
}

export interface PaperManifestEntry {
  id: string
  year: number | string
  level: string
  title: string
  subjectKey: string
  subject: string
}

export interface PaperCatalogEntry {
  paper_id: string
  level: string
  subject: string
  year: number
  term: string
  school: string
}

export interface UserCatalogEntry {
  user_id: string
  gender: string
  level: string
  preference: Record<string, unknown>
  last_viewed: string
  role: string
}

export interface SubjectManifestBlock {
  label: string
  sectionids: string[]
  default: string
  papers: PaperManifestEntry[]
}

export interface CombinedManifest {
  schools: Record<string, SchoolEntry>
  sections: Record<string, SectionCatalogEntry>
  subjects: Record<string, SubjectManifestBlock>
}

export interface PaperDisplay {
  id: string
  year: number | string
  level: string
  subject: string
  subject_key: string
  title: string
  navTitle: string
}

export interface SectionBucket {
  sectionid: number | string
  stem: string
  label: string
  title: string
  marks?: number | null
  instruction?: string
  questions: Record<string, QuestionRow>
  passages: Record<string, unknown>
  answers: Record<string, AnswerRow>
  ui?: SectionUi
}

export interface EnrichedPaperBundle {
  paperid: string
  paper: PaperDisplay
  sections: Record<string, SectionBucket>
}

export interface ChoiceRow {
  opt: string
  word: string
  zh?: string
  eg?: string
}

export interface ClozeUiSpec {
  show_bank: boolean
  show_question_cards: boolean
  items_per_line: number
}

export interface McqUiSpec {
  show_passage: boolean
  passage_mode: 'images' | 'paragraphs' | 'dialogue' | 'writing'
  options_per_line: number
}

export interface WritingUiSpec {
  interaction?: string
  show_image_upload?: boolean
  allow_passage_edit?: boolean
  markdown_field?: string
}

export type SectionUi = ClozeUiSpec | McqUiSpec | WritingUiSpec

export interface QuestionRow {
  stem_plain?: string
  marks?: number | null
  interaction?: string
  options?: Record<string, string> | string[]
  answer?: string | string[] | Record<string, unknown>
  concept?: string
  note?: string
  zh?: string
  image?: string
  sub?: SubQuestionRow[]
  table?: Record<string, unknown>
  events?: string[]
  cue?: string
  fill?: string[]
  max_selections?: number
  breakdown?: { note?: string; zh?: string }
  [key: string]: unknown
}

export interface SubQuestionRow {
  stem_plain?: string
  question?: string
  answer?: string
  options?: string[]
  max_selections?: number
  question_type?: string
}

export interface AnswerRow extends Record<string, unknown> {
  image?: string
  choices?: ChoiceRow[]
}

export interface SectionsCatalog {
  sections: Record<string, SectionCatalogEntry>
  subjects: Record<string, { label: string; sectionids: string[] }>
}
