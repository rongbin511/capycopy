/** §107 comprehension one-word cloze — question ``interaction`` value. */
export function isComprehensionClozeInteraction(interaction: string | undefined | null): boolean {
  return String(interaction || '').trim() === 'cloze'
}

export function normalizeClozeWordAnswer(s: string): string {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function clozeWordAnswerVariants(model: string): string[] {
  return String(model || '')
    .split('/')
    .map(normalizeClozeWordAnswer)
    .filter(Boolean)
}

/** True when ``user`` matches ``model`` or any slash-separated alternative in ``model``. */
export function clozeWordAnswerMatches(user: string, model: string): boolean {
  const normalizedUser = normalizeClozeWordAnswer(user)
  if (!normalizedUser) return false
  const variants = clozeWordAnswerVariants(model)
  if (!variants.length) return false
  return variants.includes(normalizedUser)
}
