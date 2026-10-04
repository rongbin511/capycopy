export const ANSWER_CARD_DESIGNS = [
  {
    id: 'plain',
    label: 'Plain',
    description: 'High contrast, no colour tint',
    swatch: 'bg-slate-100 ring-1 ring-slate-300',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'White card with a light frame',
    swatch: 'bg-white ring-1 ring-slate-200',
  },
  {
    id: 'blue',
    label: 'Blue',
    description: 'Soft blue highlight',
    swatch: 'bg-blue-100 ring-1 ring-blue-300',
  },
  {
    id: 'mint',
    label: 'Mint',
    description: 'Green accent for answers',
    swatch: 'bg-emerald-100 ring-1 ring-emerald-300',
  },
  {
    id: 'warm',
    label: 'Warm',
    description: 'Warm paper tone',
    swatch: 'bg-amber-100 ring-1 ring-amber-300',
  },
] as const

export type AnswerCardDesign = (typeof ANSWER_CARD_DESIGNS)[number]['id']

const DESIGN_IDS = new Set<string>(ANSWER_CARD_DESIGNS.map((d) => d.id))

export const DEFAULT_ANSWER_DESIGN: AnswerCardDesign = 'plain'

export function normalizeAnswerDesign(value: string | null | undefined): AnswerCardDesign {
  if (value && DESIGN_IDS.has(value)) return value as AnswerCardDesign
  return DEFAULT_ANSWER_DESIGN
}
