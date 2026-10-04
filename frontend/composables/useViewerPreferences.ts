import { storeToRefs } from 'pinia'
import type { ViewMode } from '~/types/paper'
import { useViewerPreferencesStore } from '~/stores/viewerPreferences'
import type { AnswerCardDesign } from '~/utils/answerDesigns'
import type { MarkdownDisplayStyle } from '~/utils/markdownStyles'

export function useViewerPreferences() {
  const store = useViewerPreferencesStore()

  if (import.meta.client) {
    store.ensureHydrated()
    void store.hydrateFromServer()
  }

  const {
    viewMode,
    answerDesign,
    markdownStyle,
    showInstructions,
    paperZoom,
    paperZoomPercent,
    canZoomOut,
    canZoomIn,
  } = storeToRefs(store)

  const setViewMode = (mode: ViewMode) => {
    store.setViewMode(mode)
  }

  return {
    viewMode,
    answerDesign,
    markdownStyle,
    showInstructions,
    paperZoom,
    paperZoomPercent,
    canZoomOut,
    canZoomIn,
    setViewMode,
    setAnswerDesign: (design: AnswerCardDesign) => store.setAnswerDesign(design),
    setMarkdownStyle: (style: MarkdownDisplayStyle) => store.setMarkdownStyle(style),
    setShowInstructions: (on: boolean) => store.setShowInstructions(on),
    zoomIn: () => store.zoomIn(),
    zoomOut: () => store.zoomOut(),
    resetPaperZoom: () => store.resetPaperZoom(),
  }
}
