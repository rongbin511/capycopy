import type { AnswerRow, QuestionRow, SubQuestionRow } from '~/types/paper'
import {
  openEndedModelLinesForTableSlots,
  openEndedTableBlankPlan,
  openEndedTableHasShape,
} from '~/utils/openEndedTable'

const OE_SUB_COMPACT_UNDERSCORE_LEN = 30

export interface InlineItemsSubSegment {
  text?: string
  blank?: boolean
  answerKey?: string
}

export interface InlineRadioCueSegment {
  text?: string
  option?: { key: string; label: string }
}

const INLINE_RADIO_CUE_PATTERN = /\[([A-Za-z0-9]+)\(([^)]+)\)\]/g

/** Parse cue text with ``[A(label)]`` markers into text + inline radio option segments. */
export function splitInlineRadioCue(cue: string): InlineRadioCueSegment[] {
  const text = String(cue || '')
  const segments: InlineRadioCueSegment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  const re = new RegExp(INLINE_RADIO_CUE_PATTERN.source, 'g')
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) })
    }
    segments.push({ option: { key: match[1]!, label: match[2]! } })
    lastIndex = re.lastIndex
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) })
  }
  return segments
}

export function isInlineRadioInteraction(interaction: string): boolean {
  const i = String(interaction || '')
  return i === 'inline_radio' || i === 'inline_radiobutton'
}

export function openEndedItemsUseInlineSubBlanks(q: QuestionRow): boolean {
  return (
    !!q &&
    (String(q.interaction || '') === 'items_comp' ||
      String(q.interaction || '') === 'open_ended_items') &&
    Array.isArray(q.sub) &&
    q.sub.length > 0
  )
}

export function openEndedAnswerSlotCount(q: QuestionRow): number {
  if (!q) return 1
  const interaction = String(q.interaction || '')
  if (
    interaction === 'checkbox_comp' ||
    interaction === 'radio_comp' ||
    interaction === 'radio_textarea' ||
    isInlineRadioInteraction(interaction)
  ) {
    return 0
  }
  if (q.table && openEndedTableHasShape(q.table)) return 0
  if (interaction === 'sequencing') return 0
  if (
    (interaction === 'items_comp' || interaction === 'open_ended_items') &&
    Array.isArray(q.sub) &&
    q.sub.length >= 2
  ) {
    if (openEndedItemsUseInlineSubBlanks(q)) return 0
    return Math.min(8, q.sub.length)
  }
  return 1
}

export function openEndedStudyMarks(q: QuestionRow): number {
  const m = q?.marks != null ? parseInt(String(q.marks), 10) : 1
  if (Number.isNaN(m) || m < 1) return 1
  return Math.min(8, m)
}

export function isTextareaInteraction(q: QuestionRow): boolean {
  return String(q?.interaction || '') === 'textarea'
}

export function isRadioTextareaInteraction(q: QuestionRow): boolean {
  return String(q?.interaction || '') === 'radio_textarea'
}

/** Study-mode textarea row count; 0 means use a single-line input instead. */
export function openEndedStudyTextareaRows(q: QuestionRow): number {
  if (isTextareaInteraction(q) || isRadioTextareaInteraction(q)) return 2
  const marks = openEndedStudyMarks(q)
  return marks > 1 ? marks : 0
}

export function openEndedAnswerLinesStudyUi(q: QuestionRow): number {
  const interaction = String(q.interaction || '')
  if (
    interaction === 'checkbox_comp' ||
    interaction === 'radio_comp' ||
    interaction === 'radio_textarea' ||
    isInlineRadioInteraction(interaction)
  ) {
    return 0
  }
  if (q.table && openEndedTableHasShape(q.table)) return 0
  if (openEndedItemsUseInlineSubBlanks(q)) return 0
  return openEndedAnswerSlotCount(q)
}

export function openEndedModelLinesForSlots(ans: AnswerRow | undefined, n: number): string[] {
  const out: string[] = []
  if (!ans || ans.answer == null) {
    for (let i = 0; i < n; i++) out.push('')
    return out
  }
  if (Array.isArray(ans.answer)) {
    for (let i = 0; i < n; i++) {
      out.push(String(ans.answer[i] != null ? ans.answer[i] : '').trim())
    }
    return out
  }
  out.push(String(ans.answer).trim())
  for (let i = 1; i < n; i++) out.push('')
  return out
}

export function normalizeOeSubQuestionUnderscoresForDisplay(qu: string): string {
  return String(qu || '').replace(
    /_{3,}/g,
    '_'.repeat(OE_SUB_COMPACT_UNDERSCORE_LEN),
  )
}

export function splitItemsCompSubQuestion(question: string): InlineItemsSubSegment[] {
  const text = String(question || '')
  const segments: InlineItemsSubSegment[] = []
  const pattern = /(\[Q([^\]]+)\]|_{2,})/gi
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) })
    }
    if (match[2]) {
      segments.push({ blank: true, answerKey: String(match[2]).trim().toLowerCase() })
    } else {
      segments.push({ blank: true })
    }
    lastIndex = pattern.lastIndex
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) })
  }
  return segments
}

export function itemsCompAnswerKey(qid: string, index: number): string {
  const base = String(qid || '').replace(/^q/i, '').trim()
  const suffix = String.fromCharCode(97 + index)
  return `${base}${suffix}`
}

export function itemsCompAnswerToken(
  ans: AnswerRow | undefined,
  qid: string,
  index: number,
  answerKey?: string,
  fallback = '',
): string {
  if (!ans) return fallback
  const raw = ans.answer
  const key = String(answerKey || itemsCompAnswerKey(qid, index) || '').trim().toLowerCase()
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const map = raw as Record<string, unknown>
    const hit = map[key] ?? map[key.toUpperCase()]
    if (hit != null && String(hit).trim()) return String(hit).trim()
    for (const [k, v] of Object.entries(map)) {
      if (String(k).trim().toLowerCase() === key && v != null && String(v).trim()) {
        return String(v).trim()
      }
    }
  }
  return fallback
}

function hasAnswerRowContent(row: AnswerRow | undefined): boolean {
  if (!row || typeof row !== 'object') return false
  if (row.answer != null && String(row.answer).trim() !== '') return true
  if (String(row.note || '').trim()) return true
  if (String(row.concept || '').trim()) return true
  if (String(row.zh || '').trim()) return true
  if (String(row.image || '').trim()) return true
  return false
}

function cloneAnswerRow(row: AnswerRow): AnswerRow {
  return JSON.parse(JSON.stringify(row)) as AnswerRow
}

function seededAnswerRow(seed?: AnswerRow): AnswerRow {
  if (!seed) return {}
  const row = cloneAnswerRow(seed)
  delete row.answer
  return row
}

function setCombinedAnswer(
  combined: Record<string, unknown>,
  key: string,
  row: AnswerRow | undefined,
) {
  if (!row) return
  const answer = row.answer
  const value =
    answer != null && typeof answer === 'object' && !Array.isArray(answer)
      ? answer
      : answer != null
        ? String(answer).trim()
        : ''
  if (value === '' || value == null) return
  combined[key] = value
}

export function synthesizedOpenEndedAnswerRow(
  qid: string,
  q: QuestionRow,
  answersById: Record<string, AnswerRow | undefined>,
): AnswerRow | undefined {
  const direct = answersById[qid]
  if (hasAnswerRowContent(direct)) return direct

  const combined: Record<string, unknown> = {}
  let seed: AnswerRow | undefined
  const takeSeed = (row?: AnswerRow) => {
    if (seed || !hasAnswerRowContent(row)) return
    seed = row
  }

  if (openEndedItemsUseInlineSubBlanks(q) && Array.isArray(q.sub)) {
    let slot = 0
    for (const sp of q.sub) {
      if (openEndedSubPartIsRadio(sp) || openEndedSubPartIsCheckbox(sp)) {
        const key = itemsCompAnswerKey(qid, slot)
        const row = answersById[key]
        takeSeed(row)
        setCombinedAnswer(combined, key, row)
        slot += 1
        continue
      }
      const qu = sp?.question != null ? String(sp.question) : ''
      const segments = splitItemsCompSubQuestion(qu)
      for (const seg of segments) {
        if (!seg.blank) continue
        const key = String(seg.answerKey || itemsCompAnswerKey(qid, slot)).trim().toLowerCase()
        const row = answersById[key] || answersById[key.toUpperCase()]
        takeSeed(row)
        setCombinedAnswer(combined, key, row)
        slot += 1
      }
    }
  } else if (q.table && openEndedTableHasShape(q.table)) {
    const plan = openEndedTableBlankPlan(q.table)
    for (const slot of plan) {
      const key = String(slot.token || '').trim().toLowerCase()
      if (!key) continue
      const row = answersById[key] || answersById[key.toUpperCase()]
      takeSeed(row)
      setCombinedAnswer(combined, key, row)
    }
  }

  if (!Object.keys(combined).length) return direct
  return {
    ...seededAnswerRow(seed),
    answer: combined,
  }
}

export function openEndedSubStemIsSingleLetterParen(st: string): boolean {
  return /^\([a-z]\)$/i.test(String(st || '').trim())
}

export function openEndedSubPartIsRadio(sp: SubQuestionRow): boolean {
  return !!(
    sp &&
    String(sp.question_type || '').toLowerCase() === 'radio' &&
    Array.isArray(sp.options) &&
    sp.options.length
  )
}

export function openEndedSubPartIsCheckbox(sp: SubQuestionRow): boolean {
  return !!(
    sp &&
    String(sp.question_type || '').toLowerCase() === 'checkbox' &&
    Array.isArray(sp.options) &&
    sp.options.length
  )
}

export function openEndedSubPartModelToken(sp: SubQuestionRow, modelLine: string): string {
  if (sp?.answer != null && String(sp.answer).trim()) {
    return String(sp.answer).trim()
  }
  let s = String(modelLine != null ? modelLine : '').trim()
  const m = s.match(/^\([a-z]\)\s*/i)
  if (m) s = s.slice(m[0].length).trim()
  return s
}

export function openEndedItemsSubSlotCount(q: QuestionRow): number {
  if (!openEndedItemsUseInlineSubBlanks(q) || !Array.isArray(q.sub)) return 0
  let n = 0
  for (const sp of q.sub) {
    if (openEndedSubPartIsRadio(sp) || openEndedSubPartIsCheckbox(sp)) {
      n += 1
      continue
    }
    const qu = sp?.question != null ? String(sp.question) : ''
    const segments = splitItemsCompSubQuestion(qu)
    const blanks = segments.filter((seg) => seg.blank).length
    if (blanks > 0) n += blanks
  }
  return n
}

export function openEndedModelLinesFromQuestion(
  q: QuestionRow,
  ans: AnswerRow | undefined,
  n: number,
  qid = '',
): string[] {
  if (openEndedItemsUseInlineSubBlanks(q) && Array.isArray(q.sub)) {
    const out: string[] = []
    let slot = 0
    for (const sp of q.sub) {
      if (openEndedSubPartIsRadio(sp) || openEndedSubPartIsCheckbox(sp)) {
        out.push(itemsCompAnswerToken(ans, qid, slot, undefined, openEndedSubPartModelToken(sp, '')))
        slot += 1
        continue
      }
      const qu = sp?.question != null ? String(sp.question) : ''
      const segments = splitItemsCompSubQuestion(qu)
      for (const seg of segments) {
        if (!seg.blank) continue
        const token = itemsCompAnswerToken(ans, qid, slot, seg.answerKey, openEndedSubPartModelToken(sp, ''))
        out.push(token)
        slot += 1
      }
    }
    while (out.length < n) out.push('')
    return out.slice(0, n)
  }
  if (q.table && openEndedTableHasShape(q.table)) {
    return openEndedModelLinesForTableSlots(ans, q, openEndedTableBlankPlan(q.table).length).slice(0, n)
  }
  return openEndedModelLinesForSlots(ans, n)
}

export function parseEventOrderModelDigits(ans: AnswerRow | undefined, n: number): string[] | null {
  if (!n || n < 2) return null
  const raw = ans?.answer
  if (raw == null) return null
  const arr = Array.isArray(raw) ? raw.slice() : [raw]
  if (arr.length === 1 && typeof arr[0] === 'string') {
    const s = String(arr[0]).trim()
    const byComma = s.split(/\s*,\s*/).filter(Boolean)
    if (byComma.length === n && byComma.every((x) => /^\d+$/.test(String(x).trim()))) {
      return byComma.map((x) => String(x).trim())
    }
    const nums = s.match(/\b\d+\b/g)
    if (nums && nums.length >= n) {
      const slice = nums.slice(0, n)
      if (
        slice.every((x) => {
          const v = parseInt(x, 10)
          return !Number.isNaN(v) && v >= 1 && v <= n
        })
      ) {
        return slice
      }
    }
    return null
  }
  if (arr.length === n && arr.every((x) => /^\d+$/.test(String(x).trim()))) {
    return arr.map((x) => String(x).trim())
  }
  return null
}

export function openEndedTeachingNote(ans: AnswerRow | undefined): string {
  if (!ans) return ''
  let note = ans.note != null ? String(ans.note).trim() : ''
  if (!note && ans.explanation != null) note = String(ans.explanation).trim()
  if (!note || /Add explanation from the official key/i.test(note)) return ''
  return note
}

export function openEndedRadioOptionIsCorrect(opt: string, answerRow?: AnswerRow): boolean {
  const raw = answerRow?.answer
  const values = Array.isArray(raw) ? raw : raw != null ? [raw] : []
  const optTrim = opt.trim()
  const optLc = optTrim.toLowerCase()
  const optPrefix = optTrim.match(/^\(\d+\)/)?.[0]
  for (const value of values) {
    const ans = String(value).trim()
    if (!ans) continue
    if (ans.toLowerCase() === optLc || ans.startsWith(optTrim)) return true
    const ansPrefix = ans.match(/^\(\d+\)/)?.[0]
    if (optPrefix && ansPrefix && optPrefix === ansPrefix) return true
  }
  return false
}

/** Question types whose shell slot renders UI in study and answer modes (not only study). */
export function openEndedBodyUiInBothModes(q: QuestionRow): boolean {
  if (!q) return false
  const i = String(q.interaction || '')
  if (openEndedTableHasShape(q.table)) return true
  if (isInlineRadioInteraction(i)) return true
  if (i === 'sequencing') return true
  return (
    i === 'checkbox_comp' ||
    i === 'open_ended_checkbox' ||
    i === 'radio_comp' ||
    i === 'open_ended_radio' ||
    i === 'radio_textarea' ||
    i === 'items_comp' ||
    i === 'open_ended_items'
  )
}

export function isComprehensionOpenEndedInteraction(interaction: string): boolean {
  const i = interaction || 'open_ended'
  return (
    i === 'open_ended' ||
    i === 'textarea' ||
    i === 'radio_textarea' ||
    i === 'inline_input' ||
    i === 'inline_radio' ||
    i === 'inline_radiobutton' ||
    i === 'open_ended_items' ||
    i === 'items_comp' ||
    i === 'open_ended_table' ||
    i === 'table_reference' ||
    i === 'table_reasoning' ||
    i === 'sequencing' ||
    i === 'open_ended_checkbox' ||
    i === 'checkbox_comp' ||
    i === 'open_ended_radio' ||
    i === 'radio_comp' ||
    i === 'table_reference' ||
    i === 'true_false_reason' ||
    i === 'referencing' ||
    i === 'table' ||
    i === 'table_completion'
  )
}
