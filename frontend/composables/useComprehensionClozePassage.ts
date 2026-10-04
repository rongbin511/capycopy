import type { Ref } from 'vue'
import type { ViewMode } from '~/types/paper'
import { clozeWordAnswerMatches, normalizeClozeWordAnswer } from '~/utils/clozeWord'
import { escapeHtml } from '~/utils/paperBundle'

function persistCcDraftsToStore(
  root: HTMLElement,
  paperId: string,
  studyReview: ReturnType<typeof useStudyReviewStore>,
) {
  root.querySelectorAll('span.tpb-cc-blank input.tpb-cc-word-inp').forEach((inp) => {
    const sp = inp.closest('span.tpb-cc-blank')
    if (!(sp instanceof HTMLElement)) return
    const idm = /^q(\d+)$/.exec(sp.id || '')
    if (!idm) return
    const value = (inp as HTMLInputElement).value
    sp.dataset.tpbCcUserDraft = value
    studyReview.setSelection(paperId, idm[1], value)
  })
}

function decorateComprehensionClozePassage(
  root: HTMLElement,
  viewMode: ViewMode,
  paperId: string,
  studyReview: ReturnType<typeof useStudyReviewStore>,
  inputWidth = '2cm',
) {
  const study = viewMode === 'study'
  if (!study) persistCcDraftsToStore(root, paperId, studyReview)

  root.querySelectorAll('span.cloze_one_word.tpb-cc-blank[id^="q"]').forEach((node) => {
    const sp = node as HTMLElement
    const idm = /^q(\d+)$/.exec(sp.id || '')
    if (!idm) return
    const qn = idm[1]

    if (study) {
      if (sp.dataset.tpbCcDecorated === '1' && sp.querySelector('input.tpb-cc-word-inp')) return
      if (!sp.dataset.tpbCcHtmlOrig) sp.dataset.tpbCcHtmlOrig = sp.innerHTML

      const draft = studyReview.getSelection(paperId, qn) || sp.dataset.tpbCcUserDraft || ''

      sp.dataset.tpbCcDecorated = '1'
      sp.classList.remove('filled', 'tpb-cc-answer-mismatch')
      sp.innerHTML =
        `<span class="tpb-cc-label">(${escapeHtml(qn)})</span>` +
        `<input type="text" class="tpb-cc-word-inp" data-q="${escapeHtml(qn)}" ` +
        `style="width:${inputWidth};min-width:${inputWidth};max-width:${inputWidth}" maxlength="48" inputmode="text" autocomplete="off" spellcheck="true" ` +
        `aria-label="Comprehension cloze blank ${escapeHtml(qn)}, one word" />`

      const inp = sp.querySelector('input.tpb-cc-word-inp') as HTMLInputElement | null
      if (!inp) return
      inp.value = draft
      if (inp.dataset.tpbCcBound !== '1') {
        inp.dataset.tpbCcBound = '1'
        inp.addEventListener('input', () => {
          sp.dataset.tpbCcUserDraft = inp.value
          studyReview.setSelection(paperId, qn, inp.value)
        })
        inp.addEventListener('blur', () => {
          studyReview.setSelection(paperId, qn, inp.value)
        })
      }
      return
    }

    const ans = (sp.getAttribute('ans') || '').trim()
    if (!ans) return

    const user = (studyReview.getSelection(paperId, qn) || sp.dataset.tpbCcUserDraft || '').trim()
    const mismatch = !!(user && !clozeWordAnswerMatches(user, ans))

    sp.dataset.tpbCcDecorated = '1'
    sp.classList.remove('filled', 'tpb-cc-answer-mismatch')
    const value = user ? `${ans} (${user})` : ans
    const sectionId = sp.closest('[data-section-id]')?.getAttribute('data-section-id') || ''
    sp.innerHTML =
      `<button type="button" class="tpb-inline-question-marker" data-section-id="${escapeHtml(sectionId)}" data-question-id="${escapeHtml(qn)}" aria-label="Edit question Q${escapeHtml(qn)}">` +
      `Q${escapeHtml(qn)}` +
      '</button>' +
      `<span class="tpb-cc-answer ${mismatch ? 'tpb-cc-answer--wrong' : 'tpb-cc-answer--correct'}">${escapeHtml(value)}</span>`
  })
}

export function useComprehensionClozePassage(
  rootRef: Ref<HTMLElement | null | undefined>,
  viewMode: Ref<ViewMode>,
  reloadKey: Ref<unknown>,
  paperId: Ref<string>,
  opts?: { inputWidth?: string },
) {
  const studyReview = useStudyReviewStore()
  const inputWidth = opts?.inputWidth ?? '2cm'

  function refresh() {
    nextTick(() => {
      const root = rootRef.value
      if (!root) return
      decorateComprehensionClozePassage(root, viewMode.value, paperId.value, studyReview, inputWidth)
    })
  }

  watch(
    viewMode,
    (mode, prev) => {
      if (prev === 'study' && mode !== 'study') {
        const root = rootRef.value
        if (root) persistCcDraftsToStore(root, paperId.value, studyReview)
      }
      refresh()
    },
    { flush: 'pre' },
  )
  watch(reloadKey, refresh)
  onMounted(refresh)
  onBeforeUnmount(() => {
    const root = rootRef.value
    if (root && viewMode.value === 'study') {
      persistCcDraftsToStore(root, paperId.value, studyReview)
    }
  })
}
