import type { Component } from 'vue'
import type { QuestionRow } from '~/types/paper'
import QuestionOpenEndedCheckbox from '~/components/questions/open-ended/QuestionOpenEndedCheckbox.vue'
import QuestionOpenEndedInlineInput from '~/components/questions/open-ended/QuestionOpenEndedInlineInput.vue'
import QuestionOpenEndedInlineRadio from '~/components/questions/open-ended/QuestionOpenEndedInlineRadio.vue'
import QuestionOpenEndedItems from '~/components/questions/open-ended/QuestionOpenEndedItems.vue'
import QuestionOpenEndedRadio from '~/components/questions/open-ended/QuestionOpenEndedRadio.vue'
import QuestionOpenEndedRadioTextarea from '~/components/questions/open-ended/QuestionOpenEndedRadioTextarea.vue'
import QuestionOpenEndedScratch from '~/components/questions/open-ended/QuestionOpenEndedScratch.vue'
import QuestionOpenEndedSequencing from '~/components/questions/open-ended/QuestionOpenEndedSequencing.vue'
import QuestionOpenEndedTable from '~/components/questions/open-ended/QuestionOpenEndedTable.vue'
import { isComprehensionOpenEndedInteraction } from '~/utils/openEndedQuestion'
import { openEndedTableHasShape } from '~/utils/openEndedTable'

export function openEndedQuestionComponent(q: QuestionRow | undefined): Component | null {
  if (!q) return null
  const interaction = String(q.interaction || 'open_ended')
  if (!isComprehensionOpenEndedInteraction(interaction)) return null

  switch (interaction) {
    case 'inline_input':
      return QuestionOpenEndedInlineInput
    case 'inline_radio':
    case 'inline_radiobutton':
      return QuestionOpenEndedInlineRadio
    case 'items_comp':
    case 'open_ended_items':
      return QuestionOpenEndedItems
    case 'sequencing':
      return QuestionOpenEndedSequencing
    case 'checkbox_comp':
    case 'open_ended_checkbox':
      return QuestionOpenEndedCheckbox
    case 'radio_comp':
    case 'open_ended_radio':
      return QuestionOpenEndedRadio
    case 'radio_textarea':
      return QuestionOpenEndedRadioTextarea
    case 'table_reference':
    case 'open_ended_table':
    case 'table_reasoning':
    case 'table_completion':
    case 'true_false_reason':
    case 'referencing':
    case 'table':
      return QuestionOpenEndedTable
    default:
      if (q.table && openEndedTableHasShape(q.table)) {
        return QuestionOpenEndedTable
      }
      return QuestionOpenEndedScratch
  }
}
