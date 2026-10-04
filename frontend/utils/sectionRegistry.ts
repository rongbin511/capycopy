import type { Component } from 'vue'
import SectionVocabularyCloze from '~/components/sections/SectionVocabularyCloze.vue'
import SectionEditing from '~/components/sections/SectionEditing.vue'
import SectionCloze from '~/components/sections/SectionCloze.vue'
import SectionComprehensionCloze from '~/components/sections/SectionComprehensionCloze.vue'
import SectionMcqBase from '~/components/sections/_SectionMcqBase.vue'
import SectionSynthesis from '~/components/sections/SectionSynthesis.vue'
import SectionComprehensionOpenEnded from '~/components/sections/SectionComprehensionOpenEnded.vue'
import SectionSituationWriting from '~/components/sections/SectionSituationWriting.vue'
import SectionContinuousWriting from '~/components/sections/SectionContinuousWriting.vue'
import SectionChineseApplications from '~/components/sections/SectionChineseApplications.vue'
import SectionChineseCloze from '~/components/sections/SectionChineseCloze.vue'
import SectionChineseReadingOne from '~/components/sections/SectionChineseReadingOne.vue'
import SectionChineseDialogue from '~/components/sections/SectionChineseDialogue.vue'
import SectionChineseReadingTwoA from '~/components/sections/SectionChineseReadingTwoA.vue'
import SectionChineseReadingTwoB from '~/components/sections/SectionChineseReadingTwoB.vue'
import SectionHclEditing from '~/components/sections/SectionHclEditing.vue'
import SectionHclReading from '~/components/sections/SectionHclReading.vue'
import SectionHclWriting from '~/components/sections/SectionHclWriting.vue'
import SectionMcqMath from '~/components/sections/SectionMcqMath.vue'
import SectionMathSaq from '~/components/sections/SectionMathSaq.vue'

/** Map section stem → dedicated section component */
export const SECTION_COMPONENTS: Record<string, Component> = {
  '101-mcq-grammar': SectionMcqBase,
  '401-mcq': SectionMcqMath,
  '402-SAQ': SectionMathSaq,
  '102-mcq-vocab': SectionMcqBase,
  '103-cloze-vocab': SectionVocabularyCloze,
  '104-mcq-visual': SectionMcqBase,
  '105-cloze-grammar': SectionCloze,
  '106-editing': SectionEditing,
  '107-cloze-comprehension': SectionComprehensionCloze,
  '108-synthesis': SectionSynthesis,
  '109-comprehension-open-ended': SectionComprehensionOpenEnded,
  '110-writing-situational': SectionSituationWriting,
  '111-writing-continuous': SectionContinuousWriting,
  '201-mcq-applications': SectionChineseApplications,
  '202-cloze': SectionChineseCloze,
  '203-reading-one': SectionChineseReadingOne,
  '301-cloze_a': SectionCloze,
  '302-editing': SectionHclEditing,
  '204-dialogue': SectionChineseDialogue,
  '205-reading-two-a': SectionChineseReadingTwoA,
  '206-reading-two-b': SectionChineseReadingTwoB,
  '207-topic-writing': SectionHclWriting,
  '208-picture-writing': SectionHclWriting,
  '303-reading-one': SectionHclReading,
  '304-reading-two': SectionHclReading,
  '305-writing-one': SectionHclWriting,
  '306-writing-two': SectionHclWriting,
}

export function sectionComponentForStem(stem: string): Component | null {
  return SECTION_COMPONENTS[stem] ?? null
}
