import katex from 'katex'
import { marked } from 'marked'
import type { EnrichedPaperBundle, QuestionRow, SectionBucket, SectionsCatalog, WritingUiSpec } from '~/types/paper'
import { isComprehensionClozeInteraction } from '~/utils/clozeWord'
import { isInlineRadioInteraction } from '~/utils/openEndedQuestion'

const WRITING_SECTION_STEMS = new Set([
  '110-writing-situational',
  '111-writing-continuous',
  '207-topic-writing',
  '208-picture-writing',
  '305-writing-one',
  '306-writing-two',
])

const CHINESE_WRITING_SECTION_STEMS = new Set([
  '207-topic-writing',
  '208-picture-writing',
  '305-writing-one',
  '306-writing-two',
])

export function isWritingSection(bucket: Pick<SectionBucket, 'stem' | 'ui'> | null | undefined): boolean {
  if (!bucket) return false
  if (WRITING_SECTION_STEMS.has(bucket.stem)) return true
  const ui = bucket.ui
  return !!(ui && typeof ui === 'object' && 'show_image_upload' in ui && ui.show_image_upload)
}

export function writingUiForSection(bucket: SectionBucket | null | undefined): WritingUiSpec | null {
  if (!isWritingSection(bucket)) return null
  return (bucket?.ui as WritingUiSpec | undefined) || null
}

export function clozeUiForSection(bucket: SectionBucket | null | undefined) {
  const ui = bucket?.ui
  if (!ui || typeof ui !== 'object' || !('show_question_cards' in ui)) return null
  return ui
}

/** First-line indent (one tab stop) for cloze passage paragraphs. */
export const CLOZE_PASSAGE_PARA_CLASS = 'tpb-passage-p tpb-passage-p--indent leading-relaxed'

export function mcqUiForSection(bucket: SectionBucket | null | undefined) {
  const ui = bucket?.ui
  if (!ui || typeof ui !== 'object' || !('show_passage' in ui)) return null
  return ui
}

export function isSectionBucketPaper(data: EnrichedPaperBundle | null | undefined): boolean {
  const sections = data?.sections
  return !!(sections && typeof sections === 'object' && !Array.isArray(sections))
}

export function subjectSectionIds(catalog: SectionsCatalog | null, subjectKey: string): string[] {
  const block = catalog?.subjects?.[subjectKey || 'english']
  return block?.sectionids?.slice() ?? []
}

export function sectionIdForStem(
  catalog: SectionsCatalog | null,
  subjectKey: string,
  stem: string,
): string {
  const ids = subjectSectionIds(catalog, subjectKey)
  for (const sid of ids) {
    const row = catalog?.sections?.[sid]
    if (row && String(row.stem) === String(stem)) return sid
  }
  return ''
}

export function paperSectionsOrdered(
  data: EnrichedPaperBundle,
  catalog: SectionsCatalog | null,
): SectionBucket[] {
  if (!isSectionBucketPaper(data)) return []
  const subjectKey = data.paper?.subject_key || 'english'
  let ids = subjectSectionIds(catalog, subjectKey)
  if (!ids.length) ids = Object.keys(data.sections)
  const out: SectionBucket[] = []
  for (const sid of ids) {
    const bucket = data.sections[String(sid)]
    if (!bucket || typeof bucket !== 'object') continue
    const catalogRow = catalog?.sections?.[String(sid)]
    out.push({
      ...bucket,
      sectionid: bucket.sectionid != null ? bucket.sectionid : sid,
      stem: bucket.stem || catalogRow?.stem || String(sid),
      label: bucket.label || catalogRow?.label || String(sid),
      title: bucket.title || catalogRow?.title || bucket.stem || catalogRow?.stem || String(sid),
      marks: bucket.marks ?? catalogRow?.marks,
      instruction: bucket.instruction || catalogRow?.instruction,
    })
  }
  return out
}

export function sectionsByIdMap(data: EnrichedPaperBundle): Record<string, SectionBucket> {
  const map: Record<string, SectionBucket> = {}
  if (!isSectionBucketPaper(data) || !data.sections) return map
  for (const sid of Object.keys(data.sections)) {
    const bucket = data.sections[sid]
    if (bucket && typeof bucket === 'object') map[String(sid)] = bucket
  }
  return map
}

export function sectionNavKey(sec: SectionBucket | null | undefined): string {
  if (!sec) return ''
  if (sec.sectionid != null) return String(sec.sectionid)
  return sec.stem ? String(sec.stem) : ''
}

export type SectionQuestionBlock =
  | { kind: 'group'; groupId: string; stem: string; qids: string[] }
  | { kind: 'group_header'; groupId: string; stem: string }
  | { kind: 'question'; qid: string }

function questionIdSortKey(id: string): [number, number, string] {
  const m = /^(\d+)(?:-(\d+))?$/.exec(String(id).trim())
  const start = m ? Number(m[1]) : Number.MAX_SAFE_INTEGER
  const isRange = m && m[2] != null ? 0 : 1
  return [start, isRange, id]
}

function sortQuestionIds(ids: string[]): string[] {
  return ids.slice().sort((a, b) => {
    const ka = questionIdSortKey(a)
    const kb = questionIdSortKey(b)
    if (ka[0] !== kb[0]) return ka[0] - kb[0]
    if (ka[1] !== kb[1]) return ka[1] - kb[1]
    return ka[2].localeCompare(kb[2], undefined, { numeric: true })
  })
}

export function isGroupedStemQuestion(q: QuestionRow | undefined): boolean {
  return String(q?.interaction || '') === 'grouped_stem'
}

export function isGroupedQuestion(q: QuestionRow | undefined): boolean {
  if (!q || String(q.interaction || '') !== 'grouped') return false
  const items = q.items
  return !!items && typeof items === 'object' && !Array.isArray(items) && Object.keys(items).length > 0
}

export function groupedQuestionItemIds(q: QuestionRow): string[] {
  const items = q.items
  if (!items || typeof items !== 'object' || Array.isArray(items)) return []
  return sortQuestionIds(Object.keys(items as Record<string, unknown>))
}

export function questionRowForSection(
  bucket: SectionBucket,
  qid: string,
): QuestionRow | undefined {
  const direct = bucket.questions?.[qid]
  if (direct) return direct
  for (const q of Object.values(bucket.questions || {})) {
    if (!isGroupedQuestion(q)) continue
    const items = q.items as Record<string, QuestionRow> | undefined
    const item = items?.[qid]
    if (item) return item
  }
  return undefined
}

export function sectionQuestionBlocks(bucket: SectionBucket): SectionQuestionBlock[] {
  const qs = bucket.questions
  if (!qs || typeof qs !== 'object') return []

  const blocks: SectionQuestionBlock[] = []
  for (const key of sortQuestionIds(Object.keys(qs))) {
    const q = qs[key]
    if (!q) continue

    if (isGroupedStemQuestion(q)) {
      const stem = String(q.stem_plain || '').trim()
      if (stem) blocks.push({ kind: 'group_header', groupId: key, stem })
      continue
    }

    if (isGroupedQuestion(q)) {
      const stem = String(q.stem_plain || '').trim()
      blocks.push({
        kind: 'group',
        groupId: key,
        stem,
        qids: groupedQuestionItemIds(q),
      })
      continue
    }

    blocks.push({ kind: 'question', qid: key })
  }
  return blocks
}

export function questionIdsForSection(bucket: SectionBucket): string[] {
  const qs = bucket.questions
  if (!qs || typeof qs !== 'object') return []

  const ids: string[] = []
  for (const key of sortQuestionIds(Object.keys(qs))) {
    const q = qs[key]
    if (!q) continue
    if (isGroupedStemQuestion(q)) continue
    if (isGroupedQuestion(q)) {
      ids.push(...groupedQuestionItemIds(q))
      continue
    }
    ids.push(key)
  }
  return ids
}

export function paperAssetUrl(
  paperId: string,
  subjectKey: string,
  filename: string,
  visualVersion?: string,
): string {
  const base = `/papers/${subjectKey}/${encodeURIComponent(paperId)}/${filename}`
  if (!visualVersion) return base
  return `${base}?v=${encodeURIComponent(visualVersion)}`
}

export function answerImageFilename(
  _q: Record<string, unknown> | undefined,
  _qid: string,
  answer?: Record<string, unknown> | undefined,
): string {
  return typeof answer?.image === 'string' ? String(answer.image).trim() : ''
}

export function questionImageFilename(
  q: Record<string, unknown> | undefined,
  _qid: string,
): string {
  return typeof q?.image === 'string' ? String(q.image).trim() : ''
}

export function escapeHtml(s: unknown): string {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderMarkdownInline(text: string): string {
  if (!text) return ''
  const raw = String(text)
  // --x-- and __x__ → underline; **x** → bold. __ blanks (______) stay literal.
  const re = /--([\s\S]*?)--|\*\*(.+?)\*\*/g
  let out = ''
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(raw)) !== null) {
    if (match.index > last) out += escapeHtml(raw.slice(last, match.index))
    if (match[1] !== undefined) {
      out += `<u>${escapeHtml(match[1])}</u>`
    } else if (match[2] !== undefined) {
      out += `<strong>${escapeHtml(match[2])}</strong>`
    } else {
      out += `<u>${escapeHtml(match[3] ?? '')}</u>`
    }
    last = match.index + match[0].length
  }
  if (last < raw.length) out += escapeHtml(raw.slice(last))
  return out
}

const INLINE_MATH_RE = /\\\(([\s\S]+?)\\\)|\$(?!\s)([\s\S]+?)\$/g

export function renderRichInlineText(text: string, mathMode = false): string {
  if (!mathMode) return renderMarkdownInline(text)
  const raw = String(text || '')
  if (!raw) return ''
  return renderMarkdownInline(raw)
}

function stripVocabClozePassageSpanChips(s: string): string {
  return String(s).replace(
    /<span\b[^>]*\bmcq_vocab_cloze\b[^>]*>([\s\S]*?)<\/span>/gi,
    (_, inner) => inner,
  )
}

export function passageClozeList(passage: unknown): string[] {
  if (!passage || typeof passage !== 'object') return []
  const cloze = (passage as { cloze?: unknown }).cloze
  if (!Array.isArray(cloze)) return []
  return cloze
    .map((item) => String(item ?? '').trim())
    .filter((text) => text.length > 0)
}

export function clozeZhPassageRows(passage: unknown): Array<{ en: string; zh: string }> {
  if (!passage || typeof passage !== 'object') return []
  const p = passage as { cloze?: unknown; zh?: unknown; paragraphs?: unknown }
  if (Array.isArray(p.cloze) && p.cloze.length) {
    const zhList = Array.isArray(p.zh) ? p.zh : []
    return p.cloze.map((en, i) => ({
      en: String(en || '').trim(),
      zh: String(zhList[i] || '').trim(),
    }))
  }
  if (!Array.isArray(p.paragraphs)) return []
  return p.paragraphs
    .map((para) => {
      if (!para || typeof para !== 'object') return null
      const row = para as { en?: string; zh?: string }
      return {
        en: String(row.en || '').trim(),
        zh: String(row.zh || '').trim(),
      }
    })
    .filter((row): row is { en: string; zh: string } => !!row && !!(row.en || row.zh))
}

export function wrapVocabClozePassageHtml(
  text: string,
  questions: Record<string, { stem_plain?: string; answer?: string }> = {},
): string {
  if (!text) return ''
  const s = stripVocabClozePassageSpanChips(text)
  const markerRe = /\[Q(\d+)\s*\(([^)]*)\)\]/g
  let out = ''
  let last = 0
  let m: RegExpExecArray | null
  while ((m = markerRe.exec(s)) !== null) {
    out += escapeHtml(s.slice(last, m.index))
    const q = m[1]
    const phrase = String(m[2] || '').trim()
    const qRow = questions[q]
    const corr = qRow?.answer != null ? String(qRow.answer).trim() : ''
    const label = `(${q}) ${phrase}`
    out +=
      `<span id="q${escapeHtml(q)}" class="mcq_vocab_cloze tp-vocab-cloze-blank"` +
      (corr ? ` ans="${escapeHtml(corr)}"` : '') +
      `>${escapeHtml(label)}</span>`
    last = markerRe.lastIndex
  }
  out += escapeHtml(s.slice(last))
  return out
}

function writingTaskHasContent(task: unknown): boolean {
  if (Array.isArray(task)) {
    return task.some((line) => line != null && String(line).trim() !== '')
  }
  return task != null && String(task).trim() !== ''
}

function writingKeyInfoItemHtml(item: unknown): string {
  const raw = item != null ? String(item).trim() : ''
  if (!raw) return ''
  const underlined = /^--([\s\S]+)--$/.exec(raw)
  const inner = underlined ? `<u>${escapeHtml(underlined[1])}</u>` : escapeHtml(raw)
  return `<li class="qv-passage-hint-item">${inner}</li>`
}

function escapeHtmlWritingSampleInline(text: string): string {
  if (text == null) return ''
  const raw = String(text)
  const re = /--([\s\S]*?)--|\*\*([\s\S]*?)\*\*/g
  let out = ''
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(raw)) !== null) {
    if (match.index > last) out += escapeHtml(raw.slice(last, match.index))
    if (match[1] !== undefined) {
      out += `<u>${escapeHtml(match[1])}</u>`
    } else {
      out += `<strong class="qv-writing-em">${escapeHtml(match[2])}</strong>`
    }
    last = match.index + match[0].length
  }
  if (last < raw.length) out += escapeHtml(raw.slice(last))
  return out
}

function writingMarkingHasContent(row: Record<string, unknown>): boolean {
  if (!row || !Array.isArray(row.markdown) || !row.markdown.length) return false
  return row.markdown.some((chunk) => chunk != null && String(chunk).trim() !== '')
}

function writingMarkingMarkdown(row: Record<string, unknown>): string {
  if (!writingMarkingHasContent(row)) return ''
  return row.markdown
    .map((chunk) => (chunk != null ? String(chunk).trim() : ''))
    .filter(Boolean)
    .join('\n\n')
}

function renderWritingMarkingHtml(row: Record<string, unknown>): string {
  const md = writingMarkingMarkdown(row)
  if (!md) return ''
  let html = ''
  try {
    html = marked.parse(md, { gfm: true, breaks: false }) as string
  } catch {
    html = `<p>${escapeHtml(md)}</p>`
  }
  return (
    '<div class="qv-passage-writing-marking">' +
    '<p class="qv-passage-writing-h">评分说明</p>' +
    '<div class="qv-writing-marking-md">' +
    html +
    '</div></div>'
  )
}

function renderWritingTaskHtml(task: unknown): string {
  if (!writingTaskHasContent(task)) return ''
  let body = ''
  if (Array.isArray(task)) {
    body = task
      .map((line) => {
        const text = line != null ? String(line).trim() : ''
        if (!text) return ''
        return `<p class="qv-passage-p qv-passage-p--task-line">${renderMarkdownInline(text)}</p>`
      })
      .filter(Boolean)
      .join('')
  } else {
    body = `<div class="qv-writing-task-text">${renderMarkdownInline(String(task).trim()).replace(/\n/g, '<br />')}</div>`
  }
  if (!body) return ''
  return '<div class="qv-passage-writing-prompt"><p class="qv-passage-writing-h">Task</p>' + body + '</div>'
}

function writingQuestionStringListHtml(
  lines: unknown[],
  paraClass: string,
  formatLine: (text: string) => string,
): string {
  return lines
    .map((line) => {
      const text = line != null ? String(line).trim() : ''
      if (!text) return ''
      return `<p class="${paraClass}">${formatLine(text)}</p>`
    })
    .filter(Boolean)
    .join('')
}

function writingQuestionStringList(lines: unknown[]): string[] {
  return lines
    .map((line) => (line != null ? String(line).trim() : ''))
    .filter((text) => text.length > 0)
}

function writingQuestionHeaderLines(
  questions: Record<string, unknown>,
  sectionStem: string,
): string[] {
  const fromHeader = writingQuestionStringList(
    Array.isArray(questions.header) ? questions.header : [],
  )
  if (fromHeader.length) return fromHeader
  if (sectionStem === '306-writing-two') {
    return writingQuestionStringList(
      Array.isArray(questions.paragraphs) ? questions.paragraphs : [],
    )
  }
  return []
}

const WRITING_HEADER_PARA_CLASS =
  'qv-passage-p qv-passage-p--header tpb-passage-p--indent mb-3 leading-relaxed'

function renderWritingQuestionHtml(
  bucket: SectionBucket,
  opts?: { paperId?: string; subjectKey?: string; sectionId?: string | number },
): string {
  const questions = bucket.questions && typeof bucket.questions === 'object' ? bucket.questions : {}
  const answers = bucket.answers && typeof bucket.answers === 'object' ? bucket.answers : {}

  let block = ''
  if (passageImageFilenames(questions as Record<string, unknown>).length > 0) {
    block += renderPassageImagesHtml(bucket, opts)
  }

  let body = ''
  const sectionStem = String(bucket.stem || '')
  const title = questions.title != null ? String(questions.title).trim() : ''
  const situationLines = Array.isArray(questions.situation) ? questions.situation : []
  const headerLines = writingQuestionHeaderLines(questions as Record<string, unknown>, sectionStem)
  if (title || situationLines.length) {
    body += '<div class="qv-passage-writing-prompt">'
    if (title) {
      body +=
        '<p class="qv-passage-writing-h">题目</p>' +
        '<h3 class="qv-passage-title qv-passage-title--writing">' +
        renderMarkdownInline(title) +
        '</h3>'
    }
    body += writingQuestionStringListHtml(situationLines, 'qv-passage-p', renderMarkdownInline)
    body += '</div>'
  }

  if (headerLines.length) {
    body +=
      '<div class="qv-passage-writing-prompt qv-passage-writing-prompt--header">' +
      writingQuestionStringListHtml(headerLines, WRITING_HEADER_PARA_CLASS, renderMarkdownInline) +
      '</div>'
  }

  body += renderWritingTaskHtml(questions.task)
  const bank = Array.isArray(questions.bank) ? writingQuestionStringList(questions.bank) : []
  if (bank.length) {
    body +=
      '<div class="qv-passage-writing-prompt">' +
      '<p class="qv-passage-writing-h">词语提示</p>' +
      '<div class="qv-passage-writing-bank" role="list">' +
      bank
        .map(
          (item) =>
            `<div class="qv-passage-writing-bank-item" role="listitem">${renderMarkdownInline(item)}</div>`,
        )
        .join('') +
      '</div></div>'
  }
  const info = Array.isArray(questions.info) ? questions.info : []
  if (info.length) {
    const kiItems = info.map(writingKeyInfoItemHtml).filter(Boolean).join('')
    if (kiItems) {
      body +=
        '<div class="qv-passage-writing-prompt">' +
        '<p class="qv-passage-writing-h">Key information</p>' +
        '<ul class="qv-passage-hints-list">' +
        kiItems +
        '</ul></div>'
    }
  }
  const note = questions.note != null ? String(questions.note).trim() : ''
  if (note) {
    body += '<p class="qv-writing-note"><em>' + escapeHtml(note) + '</em></p>'
  }
  if (Array.isArray(answers.sample) && answers.sample.length) {
    const sampleParas = writingQuestionStringListHtml(
      answers.sample,
      'qv-passage-p qv-passage-p--sample',
      escapeHtmlWritingSampleInline,
    )
    if (sampleParas) {
      body +=
        '<div class="qv-passage-writing-sample">' +
        '<p class="qv-passage-sample-h">范文</p>' +
        sampleParas +
        '</div>'
    }
  }
  if (body) {
    const isChineseWriting = CHINESE_WRITING_SECTION_STEMS.has(sectionStem)
    const passageClass =
      'tpb-passage qv-passage qv-passage--writing' +
      (isChineseWriting ? ' qv-passage--plain-zh tpb-passage--hcl-writing' : '')
    const langAttr = isChineseWriting ? ' lang="zh-Hans"' : ''
    block += `<div class="${passageClass}"${langAttr}>${body}</div>`
  }
  block += renderWritingMarkingHtml(answers as Record<string, unknown>)
  return block
}

const CHINESE_PASSAGE_Q_MARKER_TEST = /\[Q\d+\]|\bQ\d+\b/

function chinesePassageHasQuestionMarkers(text: string): boolean {
  return CHINESE_PASSAGE_Q_MARKER_TEST.test(String(text || ''))
}

function mcqOptionEntries(options: unknown): Array<[string, string]> {
  if (!options || typeof options !== 'object') return []
  if (Array.isArray(options)) {
    return options.map((label, index) => [String(index + 1), String(label ?? '')])
  }
  return Object.entries(options as Record<string, string>).sort(
    (a, b) => Number(a[0]) - Number(b[0]),
  )
}

function renderChineseInlineMcqSelect(
  qid: string,
  optionEntries: Array<[string, string]>,
  studySelections: Record<string, string>,
): string {
  const selected = String(studySelections[qid] || '')
  const opts = optionEntries
    .map(([key, label], index) => {
      const keyText = String(key)
      const isSelected = selected === keyText
      const sep = index === 0 ? '' : ', '
      return (
        `${sep}<button type="button" class="tpb-inline-mcq-opt${isSelected ? ' is-selected' : ''}"` +
        ` data-question-id="${escapeHtml(qid)}" data-opt="${escapeHtml(keyText)}"` +
        ` aria-pressed="${isSelected ? 'true' : 'false'}"` +
        `>${escapeHtml(keyText)}. ${escapeHtml(label)}</button>`
      )
    })
    .join('')
  return (
    `<span class="tpb-inline-mcq-slot" data-question-id="${escapeHtml(qid)}">` +
    `<span class="tpb-inline-mcq-q">Q${escapeHtml(qid)}</span>` +
    ` <span class="tpb-inline-mcq-opts">(${opts})</span>` +
    `</span>`
  )
}

function renderChineseInlineMcqAnswerMarker(
  qid: string,
  sectionId: string | number,
  answerKey: string,
  answerText: string,
): string {
  const answerHtml = answerKey
    ? `<span class="tpb-inline-mcq-answer">(${escapeHtml(answerKey)})${answerText ? ` ${escapeHtml(answerText)}` : ''}</span>`
    : ''
  return (
    `<button type="button" class="tpb-inline-question-marker" data-section-id="${escapeHtml(sectionId)}" data-question-id="${escapeHtml(qid)}" aria-label="Edit question Q${escapeHtml(qid)}">` +
    `Q${escapeHtml(qid)}` +
    '</button>' +
    answerHtml
  )
}

/** Shared phrase/word bank on the section passage (dialogue §204, HCL §301). */
export function passageBankMap(bucket: SectionBucket): Record<string, string> {
  const bank = bucket.passages?.bank
  if (!bank || typeof bank !== 'object' || Array.isArray(bank)) return {}
  return bank as Record<string, string>
}

/** @deprecated Use ``passageBankMap``. */
export const passageOptionsMap = passageBankMap

export function questionHasMcqOptions(q: QuestionRow | undefined): boolean {
  if (!q || q.options == null) return false
  return Array.isArray(q.options) ? q.options.length > 0 : Object.keys(q.options).length > 0
}

/** Dialogue blank: no stem/options on question; answers pick from ``passages.bank``. */
export function isPassageInlineQuestion(bucket: SectionBucket, qid: string): boolean {
  const q = questionRowForSection(bucket, qid)
  if (!q) return false
  if (String(q.stem_plain || '').trim()) return false
  if (q.options != null) return false
  return Object.keys(passageBankMap(bucket)).length > 0
}

/** §107-style passage blank: empty stem, typed one-word answer in passage. */
export function isPassageClozeWordQuestion(bucket: SectionBucket, qid: string): boolean {
  const q = questionRowForSection(bucket, qid)
  if (!q) return false
  if (String(q.stem_plain || '').trim()) return false
  if (q.options != null) return false
  if (bucket.stem === '107-cloze-comprehension') return true
  return isComprehensionClozeInteraction(String(q.interaction || ''))
}

export function isSectionAnswerableQuestion(bucket: SectionBucket, qid: string): boolean {
  const q = questionRowForSection(bucket, qid)
  if (!q) return false
  if (questionHasMcqOptions(q)) return true
  if (isInlineRadioInteraction(String(q.interaction || ''))) return true
  if (isPassageClozeWordQuestion(bucket, qid)) return true
  return isPassageInlineQuestion(bucket, qid)
}

/** Resolve option keys to display text for §07-style passage blanks (mcq or dialogue). */
export function chineseClozeResolvedAnswers(
  bucket: SectionBucket,
): Record<string, { answer?: string }> {
  const passageBank = passageBankMap(bucket)

  const out: Record<string, { answer?: string }> = {}
  for (const [qid, q] of Object.entries(bucket.questions || {})) {
    if (!q || typeof q !== 'object') continue
    const answerRow = bucket.answers?.[qid] as Record<string, unknown> | undefined
    const key = String(answerRow?.answer ?? q.answer ?? '').trim()
    if (!key) continue
    const options = q.options
    if (options && typeof options === 'object' && !Array.isArray(options)) {
      const word = String((options as Record<string, string>)[key] || '').trim()
      out[qid] = { answer: word || key }
    } else if (passageBank[key]) {
      out[qid] = { answer: String(passageBank[key]).trim() }
    } else {
      out[qid] = { answer: key }
    }
  }
  return out
}

function renderChinesePassageQuestionMarkers(
  text: string,
  bucket: SectionBucket,
  sectionId?: string | number,
  viewMode: 'study' | 'answers' = 'answers',
  studySelections: Record<string, string> = {},
): string {
  const raw = String(text || '')
  if (!raw) return ''
  if (!chinesePassageHasQuestionMarkers(raw)) return escapeHtml(raw)

  let out = ''
  let last = 0
  const re = /\[Q(\d+)\]|\bQ(\d+)\b/g
  const passageBank = passageBankMap(bucket)
  const passageBankEntries = Object.entries(passageBank).sort(
    (a, b) => Number(a[0]) - Number(b[0]),
  )
  let match: RegExpExecArray | null
  while ((match = re.exec(raw)) !== null) {
    const qid = match[1] || match[2]
    out += escapeHtml(raw.slice(last, match.index))
    const q = bucket.questions?.[qid]
    const answerRow = bucket.answers?.[qid] as Record<string, unknown> | undefined
    const sid = sectionId ?? bucket.sectionid
    const usePassageOptions = isPassageInlineQuestion(bucket, qid)

    if (q && usePassageOptions) {
      if (viewMode === 'study') {
        out += renderChineseInlineMcqSelect(qid, passageBankEntries, studySelections)
      } else {
        const answerKey = String(answerRow?.answer ?? '').trim()
        const answerText = answerKey ? String(passageBank[answerKey] || '') : ''
        out += renderChineseInlineMcqAnswerMarker(qid, sid, answerKey, answerText)
      }
    } else if (q && q.options != null) {
      const optionEntries = mcqOptionEntries(q.options)
      if (viewMode === 'study') {
        out += renderChineseInlineMcqSelect(qid, optionEntries, studySelections)
      } else {
        const answerKey = String(answerRow?.answer ?? q.answer ?? '').trim()
        const optionMap = Object.fromEntries(optionEntries)
        const answerText = answerKey ? String(optionMap[answerKey] || '') : ''
        out += renderChineseInlineMcqAnswerMarker(qid, sid, answerKey, answerText)
      }
    } else if (q) {
      out +=
        `<button type="button" class="tpb-inline-question-marker" data-section-id="${escapeHtml(sid)}" data-question-id="${escapeHtml(qid)}" aria-label="Edit question Q${escapeHtml(qid)}">` +
        `Q${escapeHtml(qid)}` +
        '</button>'
    } else {
      out += escapeHtml(match[0])
    }
    last = re.lastIndex
  }
  out += escapeHtml(raw.slice(last))
  return out
}

export function wrapComprehensionClozePassageHtml(
  text: string,
  answers: Record<string, { answer?: string }> = {},
  questions: Record<string, { answer?: string }> = {},
  viewMode: 'study' | 'answers' = 'study',
): string {
  if (!text) return ''
  const s = String(text)
  const re = /\[Q(\d+)(?:\(([^)]*?)\))?\]|\((\d+)\)(\s*)(_{2,})/g
  let out = ''
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(s)) !== null) {
    out += escapeHtml(s.slice(last, m.index))
    const q = m[1] || m[3]
    const rawHint = m[2] || ''
    const space = m[4] || ''
    const us = m[5] || '_________'
    const row = answers[q] || questions[q]
    const corr = row?.answer != null ? String(row.answer).trim() : ''
    const rawMarker = m[1] ? `[Q${q}${rawHint ? `(${rawHint})` : ''}]` : `(${q})${space}${us}`
    out += corr && viewMode === 'answers'
      ? `<span id="q${escapeHtml(q)}" class="cloze_one_word tpb-cc-blank filled" data-us-len="${us.length}" ans="${escapeHtml(corr)}">` +
        `<span class="tpb-cc-label">(${escapeHtml(q)})</span> ` +
        `<span class="cloze-filled"><span class="cloze-ans-full">${escapeHtml(corr)}</span></span>` +
        `</span>`
      : `<span id="q${escapeHtml(q)}" class="cloze_one_word tpb-cc-blank" data-us-len="${us.length}"` +
        (corr ? ` ans="${escapeHtml(corr)}"` : '') +
        `><span class="tpb-cc-label">(${escapeHtml(q)})</span>${escapeHtml(rawMarker)}</span>`
    last = re.lastIndex
  }
  out += escapeHtml(s.slice(last))
  return out
}

function isEditingSectionStem(stem: string): boolean {
  return /-editing$/i.test(String(stem || ''))
}

export function renderPassageClozeListHtml(
  passage: unknown,
  bucket: SectionBucket,
  opts?: {
    mode?: 'images' | 'paragraphs' | 'dialogue' | 'writing'
    subjectKey?: string
    sectionId?: string | number
    viewMode?: 'study' | 'answers'
    studySelections?: Record<string, string>
    plainTextPassage?: boolean
  },
): string {
  const stringBlocks = passageClozeList(passage)
  if (!stringBlocks.length) return ''

  const stem = bucket.stem || ''
  const mode = opts?.mode
  return stringBlocks
    .map((para) => {
      const paraText = String(para)
      const inner = isEditingSectionStem(stem)
        ? wrapEditingPassageHtml(paraText, bucket.answers || {}, bucket.questions || {})
        : mode === 'dialogue' ||
            (opts?.subjectKey === 'chinese' &&
              !opts?.plainTextPassage &&
              chinesePassageHasQuestionMarkers(paraText))
          ? renderChinesePassageQuestionMarkers(
              paraText,
              bucket,
              opts?.sectionId,
              opts?.viewMode || 'answers',
              opts?.studySelections || {},
            )
          : escapeHtml(paraText)
      return `<p class="${CLOZE_PASSAGE_PARA_CLASS}">${inner}</p>`
    })
    .join('')
}

export function parseEditingMarker(plain: string, qFallback?: string): { q: string; wrong: string } {
  const s = String(plain || '').trim()
  const paren = /^\[Q(\d+)\(([^)]*?)\)\]$/.exec(s)
  if (paren) return { q: paren[1], wrong: paren[2] }
  const bare = /^\[Q(\d+)([^\[\(][^\]]*)\]$/.exec(s)
  if (bare) return { q: bare[1], wrong: bare[2].trim() }
  const leg = /^\((\d+)\)\s*(\S+)/.exec(s)
  if (leg) return { q: leg[1], wrong: leg[2] }
  return { q: qFallback != null ? String(qFallback) : '', wrong: '' }
}

function editingWrongWordFromPlain(plain: string, qFallback?: string): { q: string; wrong: string } {
  return parseEditingMarker(plain, qFallback)
}

export function wrapEditingPassageHtml(
  text: string,
  answers: Record<string, { answer?: string }> = {},
  questions: Record<string, { answer?: string }> = {},
): string {
  if (!text) return ''
  let s = String(text)
  s = s.replace(/\*\*\[Q(\d+)\(([^)]*?)\)\]\*\*/g, (_, a, b) => `[Q${a}(${String(b).trim()})]`)
  const re = /\[Q(\d+)(?:\(([^)]*?)\)|([^\[\(][^\]]*))\]|\((\d+)\)\s*(\S+)/g
  let out = ''
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(s)) !== null) {
    out += renderMarkdownInline(s.slice(last, m.index))
    const q = m[1] || m[4]
    const wrong = String(m[2] || m[3] || m[5] || '').trim()
    const row = answers[q] || questions[q]
    const corr = row?.answer != null ? String(row.answer).trim() : ''
    const rawMarker = m[0]
    out +=
      `<span id="q${escapeHtml(q)}" class="editing_word tpb-editing-chip"` +
      ` data-wrong="${escapeHtml(wrong)}"` +
      (corr ? ` ans="${escapeHtml(corr)}"` : '') +
      `>${escapeHtml(rawMarker)}</span>`
    last = re.lastIndex
  }
  out += renderMarkdownInline(s.slice(last))
  return out
}

function renderPassageEn(
  stem: string,
  en: string,
  bucket: SectionBucket,
  opts?: { viewMode?: 'study' | 'answers' },
): string {
  if (stem === '103-cloze-vocab') {
    return wrapVocabClozePassageHtml(en, bucket.questions || {})
  }
  if (isEditingSectionStem(stem)) {
    return wrapEditingPassageHtml(en, bucket.answers || {}, bucket.questions || {})
  }
  return renderMarkdownInline(en)
}

function isLinesRecord(lines: unknown): lines is Record<string, string> {
  return !!lines && typeof lines === 'object' && !Array.isArray(lines)
}

function isParagraphZhMap(paragraphs: unknown): paragraphs is Record<string, string> {
  if (!paragraphs || typeof paragraphs !== 'object' || Array.isArray(paragraphs)) return false
  const keys = Object.keys(paragraphs)
  if (!keys.length) return false
  const first = (paragraphs as Record<string, unknown>)[keys[0]]
  return typeof first === 'string'
}

function renderComprehensionReadingHtml(passage: {
  title?: string
  lines?: Record<string, string>
  paragraphs?: Record<string, string>
}): string {
  const lines = passage.lines
  if (!isLinesRecord(lines)) return ''

  const nums = Object.keys(lines)
    .map(Number)
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b)
  if (!nums.length) return ''

  let html = '<div class="tpb-reading">'

  const paraStarts: Record<string, boolean> = {}
  const paraZhByStart: Record<string, string> = {}
  if (isParagraphZhMap(passage.paragraphs)) {
    for (const k of Object.keys(passage.paragraphs)) {
      paraStarts[k] = true
      const zh = String(passage.paragraphs[k] || '').trim()
      if (zh) paraZhByStart[k] = zh
    }
  }

  const paraEndsZhBlocks: Record<string, Array<{ start: string; zh: string }>> = {}
  const zhStarts = Object.keys(paraZhByStart)
  if (zhStarts.length) {
    const maxLine = nums[nums.length - 1]
    const boundaryStarts = zhStarts.map(Number).sort((a, b) => a - b)
    for (const startStr of zhStarts) {
      const zh = paraZhByStart[startStr]
      const s = Number(startStr)
      const bi = boundaryStarts.indexOf(s)
      if (bi < 0) continue
      const nextS = bi + 1 < boundaryStarts.length ? boundaryStarts[bi + 1] : null
      const endLine = nextS != null ? nextS - 1 : maxLine
      const endStr = String(endLine)
      if (!paraEndsZhBlocks[endStr]) paraEndsZhBlocks[endStr] = []
      paraEndsZhBlocks[endStr].push({ start: startStr, zh })
    }
    for (const endStr of Object.keys(paraEndsZhBlocks)) {
      paraEndsZhBlocks[endStr].sort((a, b) => Number(a.start) - Number(b.start))
    }
  }

  for (const n of nums) {
    const nStr = String(n)
    const rowCls =
      'tpb-reading-line' + (paraStarts[nStr] ? ' tpb-reading-line--para-start' : '')
    const text = renderMarkdownInline(String(lines[nStr] || ''))
    html +=
      `<div class="${rowCls}">` +
      `<span class="tpb-reading-line-t">${text}</span>` +
      `<span class="tpb-reading-line-no" aria-hidden="true">${n}</span>` +
      `</div>`
    const zhBlocks = paraEndsZhBlocks[nStr]
    if (zhBlocks) {
      for (const item of zhBlocks) {
        html +=
          `<div class="tpb-reading-para-zh tpb-zh-surface" data-para-start="${escapeHtml(item.start)}">` +
          `${renderMarkdownInline(item.zh)}</div>`
      }
    }
  }

  html += '</div>'
  return html
}

function passageImageFilenames(passage: Record<string, unknown>): string[] {
  if (Array.isArray(passage.images) && passage.images.length) {
    return passage.images
      .map((name) => (name != null ? String(name).trim() : ''))
      .filter(Boolean)
  }
  if (passage.image != null && String(passage.image).trim()) {
    return [String(passage.image).trim()]
  }
  return []
}

export function getPassageImageFilenames(passage: Record<string, unknown> | undefined): string[] {
  if (!passage || typeof passage !== 'object') return []
  return passageImageFilenames(passage)
}

export function isComprehensionOpenEndedSection(bucket: SectionBucket): boolean {
  return String(bucket.stem || '').startsWith('109-comprehension-open-ended')
}

export function isVisualMcqSection(bucket: SectionBucket): boolean {
  return String(bucket.stem || '').startsWith('104-mcq-visual')
}

function renderPassageImagesHtml(
  bucket: SectionBucket,
  opts?: {
    paperId?: string
    subjectKey?: string
    sectionId?: string | number
    mode?: 'images' | 'paragraphs' | 'dialogue' | 'writing'
  },
): string {
  const stem = bucket.stem || ''
  const sectionId = opts?.sectionId != null ? String(opts.sectionId) : String(bucket.sectionid ?? '')
  const paperId = opts?.paperId || ''
  const subjectKey = opts?.subjectKey || 'english'
  const questions = bucket.questions && typeof bucket.questions === 'object' ? bucket.questions : {}
  const passages = bucket.passages && typeof bucket.passages === 'object' ? bucket.passages : {}
  const names =
    opts?.mode === 'writing'
      ? passageImageFilenames(questions as Record<string, unknown>)
      : passageImageFilenames(passages as Record<string, unknown>)
  if (!names.length) return ''

  const figs = names
    .map((name) => {
      const src = paperAssetUrl(paperId, subjectKey, name)
      const alt = name.replace(/\.(png|jpe?g|webp|gif)$/i, '')
      return (
        `<figure class="tpb-visual-figure" data-section-id="${escapeHtml(sectionId)}" data-visual-filename="${escapeHtml(name)}">` +
        `<img class="tpb-visual-img" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" ` +
        `onerror="this.hidden=true;this.nextElementSibling.hidden=false;this.parentElement.classList.add('is-missing')"` +
        `onload="this.hidden=false;this.nextElementSibling.hidden=true;this.parentElement.classList.remove('is-missing')" />` +
        `<button type="button" class="tpb-visual-figure-upload-btn" hidden data-section-id="${escapeHtml(sectionId)}" data-visual-filename="${escapeHtml(name)}">Upload image</button>` +
        `</figure>`
      )
    })
    .join('')

  const ariaLabel = stem.startsWith('104-mcq-visual') ? 'Visual text (images)' : 'Passage image'
  const wrapClass = isComprehensionOpenEndedSection(bucket) ? ' tpb-passage-image-answers' : ''
  return `<div class="tpb-visual-passage${wrapClass}" aria-label="${escapeHtml(ariaLabel)}">${figs}</div>`
}

function renderVocabClozePassageHtml(
  passage: Record<string, unknown>,
  bucket: SectionBucket,
  opts?: {
    viewMode?: 'study' | 'answers'
    plainTextPassage?: boolean
  },
): string {
  const rows = clozeZhPassageRows(passage)
  if (!rows.length) return ''
  const stem = bucket.stem || ''
  return rows
    .map(({ en, zh }) => {
      if (!en) return ''
      const inner = opts?.plainTextPassage
        ? escapeHtml(en)
        : renderPassageEn(stem, en, bucket, opts)
      let chunk = `<p class="${CLOZE_PASSAGE_PARA_CLASS}">${inner}</p>`
      if (zh) {
        chunk += `<div class="tpb-passage-zh tpb-zh-surface">${
          opts?.plainTextPassage ? escapeHtml(zh) : renderMarkdownInline(zh)
        }</div>`
      }
      return chunk
    })
    .join('')
}

export function renderPassageHtml(
  bucket: SectionBucket,
  opts?: {
    mode?: 'images' | 'paragraphs' | 'dialogue' | 'writing'
    paperId?: string
    subjectKey?: string
    sectionId?: string | number
    viewMode?: 'study' | 'answers'
    studySelections?: Record<string, string>
    plainTextPassage?: boolean
  },
): string {
  const mode = opts?.mode
  const p = bucket.passages

  if (mode === 'writing') {
    return renderWritingQuestionHtml(bucket, opts)
  }

  if (!p || typeof p !== 'object') return ''

  const stem = bucket.stem || ''
  const passageRecord = p as Record<string, unknown>
  const imageNames = passageImageFilenames(passageRecord)
  const imageHtml = imageNames.length ? renderPassageImagesHtml(bucket, opts) : ''

  if (mode === 'images') {
    return imageHtml
  }

  if (stem === '103-cloze-vocab' || isEditingSectionStem(stem)) {
    const clozeHtml = renderVocabClozePassageHtml(passageRecord, bucket, opts)
    if (clozeHtml) return clozeHtml
  }

  const paragraphs = (p as { paragraphs?: unknown }).paragraphs
  const linesObj = (p as { lines?: unknown }).lines

  if (isLinesRecord(linesObj)) {
    const readingHtml = renderComprehensionReadingHtml({
      title: (p as { title?: string }).title,
      lines: linesObj,
      paragraphs: isParagraphZhMap(paragraphs) ? paragraphs : undefined,
    })
    return imageHtml + readingHtml
  }

  if (imageNames.length) {
    return imageHtml
  }

  if (Array.isArray(paragraphs) && paragraphs.length) {
    const first = paragraphs[0]
    if (first && typeof first === 'object' && first !== null && 'en' in first) {
      return (paragraphs as Array<{ en?: string; zh?: string }>)
        .map((blk) => {
          const en = String(blk.en || '').trim()
          if (!en) return ''
          const inner = opts?.plainTextPassage ? escapeHtml(en) : renderPassageEn(stem, en, bucket, opts)
          let chunk = `<p class="${CLOZE_PASSAGE_PARA_CLASS}">${inner}</p>`
          const zh = String(blk.zh || '').trim()
          if (zh) {
            chunk += `<div class="tpb-passage-zh tpb-zh-surface">${opts?.plainTextPassage ? escapeHtml(zh) : renderMarkdownInline(zh)}</div>`
          }
          return chunk
        })
        .join('')
    }
  }

  const clozeHtml = renderPassageClozeListHtml(p, bucket, opts)
  if (clozeHtml) return clozeHtml

  if (Array.isArray((p as { lines?: string[] }).lines)) {
    const lines = (p as { lines: string[] }).lines
    return `<div class="space-y-1 font-mono text-sm">${lines
      .map(
        (line, i) =>
          `<div class="flex gap-3"><span class="text-muted w-6 shrink-0 text-right">${i + 1}</span><span>${escapeHtml(line)}</span></div>`,
      )
      .join('')}</div>`
  }

  const body = (p as { body?: string }).body
  if (typeof body === 'string' && body) {
    // marked is only used in PassageBlock; keep body rendering there if needed
    return ''
  }

  return ''
}

export interface ChoiceEntry {
  opt: string
  word: string
  zh?: string
  eg?: string
}

export function mcqOptionLabel(key: string): string {
  return `(${key})`
}

export function isPlaceholderVocabOptionExample(ex: string): boolean {
  if (!ex || typeof ex !== 'string') return true
  const s = ex.trim()
  if (!s) return true
  return /The best fit here is|fits the context best|In this item,|Residents can drop off recyclables|at nearby points\.|offered as a synonym|fits the blank best|fits this context|In this context,|In the passage,|could fit this context|Pupils should learn how/i.test(
    s,
  )
}

function choiceSortKeys(keys: string[]): string[] {
  return keys.slice().sort((a, b) => {
    const na = Number(a)
    const nb = Number(b)
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
    return a.localeCompare(b)
  })
}

export function choiceEntries(choices: unknown): ChoiceEntry[] {
  if (!Array.isArray(choices) || !choices.length) return []
  const rows: ChoiceEntry[] = []
  for (const row of choices) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue
    const item = row as { opt?: unknown; word?: unknown; zh?: unknown; eg?: unknown }
    const opt = String(item.opt || '').trim()
    const word = String(item.word || '').trim()
    if (!opt || !word) continue
    rows.push({
      opt,
      word,
      zh: item.zh != null ? String(item.zh) : '',
      eg: item.eg != null ? String(item.eg) : '',
    })
  }
  rows.sort((a, b) => {
    const na = Number(a.opt)
    const nb = Number(b.opt)
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
    return a.opt.localeCompare(b.opt)
  })
  return rows
}
