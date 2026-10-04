import type { Ref } from 'vue'
import type { ViewMode } from '~/types/paper'
import { escapeHtml, parseEditingMarker } from '~/utils/paperBundle'

function normalizeEditAnswer(s: string): string {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function compareEditAnswer(user: string, model: string): boolean {
  return normalizeEditAnswer(user) === normalizeEditAnswer(model)
}

function editingWrongWordFromPlain(plain: string, qFallback?: string): { q: string; wrong: string } {
  return parseEditingMarker(plain, qFallback)
}

function saveEditingDrafts(root: HTMLElement) {
  root.querySelectorAll('span.tpb-editing-chip input.tpb-editing-word-inp').forEach((inp) => {
    const sp = inp.closest('span.tpb-editing-chip')
    if (sp instanceof HTMLElement) {
      sp.dataset.tpbEditUserDraft = (inp as HTMLInputElement).value
    }
  })
}

function decorateEditingPassage(root: HTMLElement, viewMode: ViewMode) {
  const study = viewMode === 'study'
  if (!study) saveEditingDrafts(root)

  root.querySelectorAll('span.editing_word.tpb-editing-chip[id^="q"]').forEach((node) => {
    const sp = node as HTMLElement
    const idm = /^q(\d+)$/.exec(sp.id || '')
    if (!idm) return
    const qn = idm[1]

    if (study) {
      if (sp.dataset.tpbEditDecorated === '1' && sp.querySelector('input.tpb-editing-word-inp')) return
      if (!sp.dataset.tpbEditHtmlOrig) sp.dataset.tpbEditHtmlOrig = sp.innerHTML

      const plain = sp.textContent?.replace(/\u00a0/g, ' ').trim() || ''
      const parsed = editingWrongWordFromPlain(plain, qn)
      const wrong = sp.dataset.wrong || parsed.wrong || ''
      const keyAns = (sp.getAttribute('ans') || '').trim()
      const wch = Math.max(4, Math.min(24, Math.max(wrong.length + 2, keyAns.length + 1)))
      const draft = sp.dataset.tpbEditUserDraft ?? ''

      sp.dataset.tpbEditDecorated = '1'
      sp.classList.remove('filled', 'tpb-editing-answer-mismatch')
      const wrongHtml = wrong
        ? ` <span class="tpb-editing-wrong-study">${escapeHtml(wrong)}</span> `
        : ' '
      sp.innerHTML =
        `<span class="tpb-editing-label">(${escapeHtml(parsed.q || qn)})</span>${wrongHtml}` +
        `<input type="text" class="tpb-editing-word-inp" data-q="${escapeHtml(qn)}" ` +
        `style="width:${wch}ch" maxlength="48" inputmode="text" autocomplete="off" spellcheck="true" ` +
        `aria-label="Editing correction for question ${escapeHtml(qn)}" />`

      const inp = sp.querySelector('input.tpb-editing-word-inp') as HTMLInputElement | null
      if (!inp) return
      inp.value = draft
      if (inp.dataset.tpbEditBound !== '1') {
        inp.dataset.tpbEditBound = '1'
        inp.addEventListener('input', () => {
          sp.dataset.tpbEditUserDraft = inp.value
        })
      }
      return
    }

    const ans = (sp.getAttribute('ans') || '').trim()
    if (!ans) return

    const plain = sp.dataset.tpbEditHtmlOrig
      ? sp.dataset.tpbEditHtmlOrig.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      : sp.textContent?.replace(/\u00a0/g, ' ').trim() || ''
    const parsed = editingWrongWordFromPlain(plain, qn)
    const wrong = sp.dataset.wrong || parsed.wrong || ''
    const user = (sp.dataset.tpbEditUserDraft || '').trim()
    const mismatch = !!(user && !compareEditAnswer(user, ans))

    sp.dataset.tpbEditDecorated = '1'
    sp.classList.add('filled')
    sp.classList.toggle('tpb-editing-answer-mismatch', mismatch)

    let filled = `<span class="tpb-editing-label">(${escapeHtml(parsed.q || qn)})</span>`
    if (wrong) {
      filled += ` <span class="tpb-editing-wrong">${escapeHtml(wrong)}</span> `
    }
    filled += `<span class="cloze-filled"><span class="cloze-ans-full">${escapeHtml(ans)}</span>`
    if (user) {
      filled += `<span class="tpb-editing-user-ans"> (${escapeHtml(user)})</span>`
    }
    filled += '</span>'
    sp.innerHTML = filled
  })
}

export function useEditingPassage(
  rootRef: Ref<HTMLElement | null | undefined>,
  viewMode: Ref<ViewMode>,
  reloadKey: Ref<unknown>,
) {
  function refresh() {
    nextTick(() => {
      const root = rootRef.value
      if (!root) return
      decorateEditingPassage(root, viewMode.value)
    })
  }

  watch(viewMode, refresh)
  watch(reloadKey, refresh)
  onMounted(refresh)
}
