import type { Ref } from 'vue'
import type { SectionBucket, ViewMode } from '~/types/paper'
import {
  chineseClozeResolvedAnswers,
  CLOZE_PASSAGE_PARA_CLASS,
  clozeZhPassageRows,
  escapeHtml,
  passageBankMap,
  questionIdsForSection,
  renderMarkdownInline,
} from '~/utils/paperBundle'

function normalizeClozeAnswer(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function useInlinePassageCloze(options: {
  bucket: Ref<SectionBucket>
  viewMode: Ref<ViewMode>
  paperId: Ref<string>
}) {
  const studyReview = useStudyReviewStore()
  const passageRoot = ref<HTMLElement | null>(null)
  const composingQids = new Set<string>()
  /** Stored study answers (bank key or free text), not the display label. */
  const draftSelections = new Map<string, string>()

  const resolvedAnswers = computed(() => chineseClozeResolvedAnswers(options.bucket.value))

  const passageWordBank = computed(() => {
    const passages = options.bucket.value.passages as {
      work_bank?: Record<string, string>
      word_bank?: Record<string, string>
    }
    return passages?.work_bank || passages?.word_bank || null
  })

  const passagePhraseBank = computed(() => passageBankMap(options.bucket.value))

  const bankMap = computed(() => {
    const out: Record<string, string> = { ...passagePhraseBank.value }
    const wb = passageWordBank.value
    if (wb && typeof wb === 'object') {
      for (const [key, value] of Object.entries(wb)) {
        const text = value != null ? String(value).trim() : ''
        if (text) out[String(key)] = text
      }
    }
    return out
  })

  const clozeQids = computed(() =>
    questionIdsForSection(options.bucket.value).filter((qid) => !!options.bucket.value.questions[qid]),
  )

  const clozeAnswerRows = computed(() =>
    clozeQids.value
      .map((qid) => {
        const question = options.bucket.value.questions[qid]
        const answerRow = options.bucket.value.answers?.[qid] as Record<string, unknown> | undefined
        if (!question && !answerRow) return null

        const answer = String(resolvedAnswers.value[qid]?.answer || '').trim()
        const concept = String(answerRow?.concept || '').trim()
        const note = String(answerRow?.note || '').trim()

        return {
          qid,
          answer,
          concept,
          noteHtml: note ? renderMarkdownInline(note) : '',
        }
      })
      .filter((row): row is { qid: string; answer: string; concept: string; noteHtml: string } => Boolean(row)),
  )

  function bankWordForKey(key: string): string {
    const k = String(key || '').trim()
    if (!k) return ''
    return String(bankMap.value[k] || '').trim()
  }

  /** Resolve typed value to a bank key when possible (``3``, ``(3)``, ``(3) 陪伴``). */
  function normalizeBankKey(raw: string): string {
    const t = String(raw || '').trim()
    if (!t) return ''
    if (bankWordForKey(t)) return t
    const paren = /^\(\s*([^)]+?)\s*\)/.exec(t)
    if (paren) {
      const key = String(paren[1] || '').trim()
      if (bankWordForKey(key)) return key
    }
    const first = t.split(/\s+/)[0]?.replace(/[()]/g, '') || ''
    if (bankWordForKey(first)) return first
    return t
  }

  function displayForStoredValue(stored: string): string {
    const key = normalizeBankKey(stored)
    const word = bankWordForKey(key)
    if (word) return `(${key}) ${word}`
    return String(stored || '').trim()
  }

  function storedValueForQid(qid: string): string {
    if (draftSelections.has(qid)) return draftSelections.get(qid) || ''
    return studyReview.getSelection(options.paperId.value, qid)
  }

  function applyInputDisplay(input: HTMLInputElement, stored: string, focused: boolean) {
    const key = normalizeBankKey(stored)
    const word = bankWordForKey(key)
    if (word) {
      input.value = focused ? key : `(${key}) ${word}`
      input.classList.toggle('is-bank-resolved', !focused)
      input.style.width = focused ? '' : `${Math.min(28, Math.max(8, input.value.length + 1))}ch`
      return
    }
    input.value = String(stored || '')
    input.classList.remove('is-bank-resolved')
    input.style.width = ''
  }

  const sectionId = computed(() => String(options.bucket.value.sectionid || ''))
  const isSectionMarked = computed(
    () =>
      options.viewMode.value === 'study' &&
      !!sectionId.value &&
      studyReview.isSectionReviewed(options.paperId.value, sectionId.value),
  )

  function renderMarkedBlank(
    qid: string,
    bucket: SectionBucket,
    opts?: { showEditButton?: boolean },
  ): string {
    const answerRow = bucket.answers?.[qid] as Record<string, unknown> | undefined
    const correctKey = String(answerRow?.answer ?? '').trim()
    const correctAnswer = String(resolvedAnswers.value[qid]?.answer || '').trim()
    const userStored = studyReview.getSelection(options.paperId.value, qid)
    const userKey = normalizeBankKey(userStored)
    const userLabel = userStored ? displayForStoredValue(userStored) : ''
    const correctLabel =
      correctKey && bankWordForKey(correctKey)
        ? displayForStoredValue(correctKey)
        : correctAnswer
    const isCorrect =
      !!userKey &&
      (userKey === correctKey ||
        normalizeClozeAnswer(bankWordForKey(userKey) || userStored) ===
          normalizeClozeAnswer(correctAnswer))
    const value = userLabel
      ? isCorrect
        ? userLabel
        : `${userLabel} → ${correctLabel}`
      : correctLabel
    const editBtn = opts?.showEditButton
      ? `<button type="button" class="tpb-inline-question-marker" data-section-id="${escapeHtml(bucket.sectionid)}" data-question-id="${escapeHtml(qid)}" aria-label="Edit question Q${escapeHtml(qid)}">` +
        `Q${escapeHtml(qid)}` +
        '</button>'
      : `<span class="tpb-inline-question-marker tpb-inline-question-marker--study">${escapeHtml(`(${qid})`)}</span>`
    return (
      editBtn +
      `<span class="tpb-inline-edit-answer ${isCorrect ? 'tpb-inline-edit-answer--correct' : 'tpb-inline-edit-answer--wrong'}">${escapeHtml(value)}</span>`
    )
  }

  function renderClozeParagraph(text: string) {
    const bucket = options.bucket.value
    const markerRe = /\[Q(\d+)\s*([^\]]*?)\]/g
    let out = ''
    let last = 0
    let match: RegExpExecArray | null
    const showMarked = options.viewMode.value === 'answers' || isSectionMarked.value
    while ((match = markerRe.exec(text)) !== null) {
      const qid = match[1]
      const q = bucket.questions[qid]
      out += escapeHtml(text.slice(last, match.index))
      if (q) {
        if (showMarked) {
          out += renderMarkedBlank(qid, bucket, {
            showEditButton: options.viewMode.value === 'answers',
          })
        } else {
          const input = `<input class="tpb-inline-edit-input" data-question-id="${escapeHtml(qid)}" aria-label="Question ${escapeHtml(qid)} answer" value="" />`
          out += `<span class="tpb-inline-question-marker tpb-inline-question-marker--study">${escapeHtml(`(${qid})`)}</span>` + input
        }
      } else {
        out += escapeHtml(match[0])
      }
      last = markerRe.lastIndex
    }
    out += escapeHtml(text.slice(last))
    return out
  }

  const passageHtml = computed(() => {
    // Depend on marked state so Mark/Unmark re-renders blanks.
    void isSectionMarked.value
    const rows = clozeZhPassageRows(options.bucket.value.passages)
    if (!rows.length) return ''
    return rows
      .map(({ en, zh }) => {
        const inner = renderClozeParagraph(en)
        return (
          `<p class="${CLOZE_PASSAGE_PARA_CLASS}">${inner}</p>` +
          (zh ? `<div class="tpb-passage-zh tpb-zh-surface">${renderMarkdownInline(zh)}</div>` : '')
        )
      })
      .join('')
  })

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement | null
    if (!target?.classList.contains('tpb-inline-edit-input')) return
    const qid = target.getAttribute('data-question-id') || ''
    if (!qid) return
    if (composingQids.has(qid)) return
    draftSelections.set(qid, target.value || '')
  }

  function handleCompositionStart(event: CompositionEvent) {
    const target = event.target as HTMLInputElement | null
    if (!target?.classList.contains('tpb-inline-edit-input')) return
    const qid = target.getAttribute('data-question-id') || ''
    if (qid) composingQids.add(qid)
  }

  function handleCompositionEnd(event: CompositionEvent) {
    const target = event.target as HTMLInputElement | null
    if (!target?.classList.contains('tpb-inline-edit-input')) return
    const qid = target.getAttribute('data-question-id') || ''
    if (!qid) return
    composingQids.delete(qid)
    draftSelections.set(qid, target.value || '')
  }

  function persistInput(target: HTMLInputElement | null) {
    if (options.viewMode.value !== 'study' || isSectionMarked.value) return
    if (!target?.classList.contains('tpb-inline-edit-input')) return
    const qid = target.getAttribute('data-question-id') || ''
    if (!qid) return
    const raw = target.value || ''
    const key = normalizeBankKey(raw)
    const stored = bankWordForKey(key) ? key : raw.trim()
    draftSelections.set(qid, stored)
    studyReview.setSelection(options.paperId.value, qid, stored)
    applyInputDisplay(target, stored, false)
  }

  function handleCommit(event: Event) {
    persistInput(event.target as HTMLInputElement | null)
  }

  function handleFocus(event: FocusEvent) {
    if (options.viewMode.value !== 'study' || isSectionMarked.value) return
    const target = event.target as HTMLInputElement | null
    if (!target?.classList.contains('tpb-inline-edit-input')) return
    const qid = target.getAttribute('data-question-id') || ''
    if (!qid) return
    const stored = normalizeBankKey(target.value) || storedValueForQid(qid)
    if (bankWordForKey(stored)) {
      draftSelections.set(qid, stored)
      applyInputDisplay(target, stored, true)
    }
  }

  function persistAllStudyInputs() {
    if (options.viewMode.value !== 'study' || isSectionMarked.value) return
    const root = passageRoot.value
    if (!root) return
    for (const input of Array.from(root.querySelectorAll<HTMLInputElement>('.tpb-inline-edit-input'))) {
      persistInput(input)
    }
  }

  function hydrateStudyInputs() {
    if (options.viewMode.value !== 'study' || isSectionMarked.value) return
    nextTick(() => {
      const root = passageRoot.value
      if (!root) return
      for (const input of Array.from(root.querySelectorAll<HTMLInputElement>('.tpb-inline-edit-input'))) {
        const qid = input.getAttribute('data-question-id') || ''
        if (!qid || document.activeElement === input) continue
        applyInputDisplay(input, storedValueForQid(qid), false)
      }
    })
  }

  const reloadKey = computed(() =>
    [
      passageHtml.value,
      options.viewMode.value,
      options.paperId.value,
      isSectionMarked.value ? '1' : '0',
      JSON.stringify(bankMap.value),
    ].join('|'),
  )

  watch(reloadKey, () => hydrateStudyInputs(), { immediate: true })
  onBeforeUnmount(() => {
    persistAllStudyInputs()
  })

  return {
    passageRoot,
    passageHtml,
    passageWordBank,
    passagePhraseBank,
    clozeAnswerRows,
    handleInput,
    handleCompositionStart,
    handleCompositionEnd,
    handleCommit,
    handleFocus,
  }
}
