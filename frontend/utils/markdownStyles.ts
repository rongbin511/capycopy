export const MARKDOWN_DISPLAY_STYLES = [
  {
    id: 'reader',
    label: 'Reader',
    description: 'Balanced spacing with subtle emphasis for long notes',
    swatch: 'bg-slate-100 ring-1 ring-slate-300',
  },
  {
    id: 'paper',
    label: 'Paper',
    description: 'Warm, textbook-like reading with softer contrast',
    swatch: 'bg-amber-50 ring-1 ring-amber-200',
  },
  {
    id: 'focus',
    label: 'Focus',
    description: 'Clear headings and stronger section separation',
    swatch: 'bg-sky-100 ring-1 ring-sky-300',
  },
  {
    id: 'compact',
    label: 'Compact',
    description: 'Tighter layout for dense notes and quick scanning',
    swatch: 'bg-zinc-100 ring-1 ring-zinc-300',
  },
] as const

export type MarkdownDisplayStyle = (typeof MARKDOWN_DISPLAY_STYLES)[number]['id']

const STYLE_IDS = new Set<string>(MARKDOWN_DISPLAY_STYLES.map((d) => d.id))

export const DEFAULT_MARKDOWN_STYLE: MarkdownDisplayStyle = 'reader'

export function normalizeMarkdownStyle(value: string | null | undefined): MarkdownDisplayStyle {
  if (value && STYLE_IDS.has(value)) return value as MarkdownDisplayStyle
  return DEFAULT_MARKDOWN_STYLE
}
