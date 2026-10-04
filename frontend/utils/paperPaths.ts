/** True when the path is a paper asset (not the Nuxt viewer page `/papers/english`). */
export function isPaperAssetPath(pathname: string): boolean {
  const path = pathname.split('?')[0]
  // /papers/{subject}/{paper_id}/…
  return /^\/papers\/[^/]+\/[^/]+(?:\/.*)?$/.test(path)
}

/** True for Nuxt viewer pages only. */
export function isPaperViewerPath(pathname: string): boolean {
  const path = pathname.split('?')[0]
  return /^\/papers\/[^/]+\/?$/.test(path)
}
