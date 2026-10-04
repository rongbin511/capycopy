import { inject, provide, type InjectionKey } from 'vue'

import type { AnswerRow, QuestionRow } from '~/types/paper'

export type QuestionEditorPayload = {
  paperId: string
  subjectKey: string
  sectionId: string | number
  questionId: string
  question: QuestionRow
  answer?: AnswerRow
}

export type OpenQuestionEditor = (payload: QuestionEditorPayload) => void

const QUESTION_EDITOR_KEY: InjectionKey<OpenQuestionEditor> = Symbol('tpb-question-editor')

export function provideQuestionEditor(openFn: OpenQuestionEditor) {
  provide(QUESTION_EDITOR_KEY, openFn)
}

export function useQuestionEditor() {
  return inject(QUESTION_EDITOR_KEY, null)
}
