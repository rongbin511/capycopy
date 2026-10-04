import { defineStore } from 'pinia'

const STORE_KEY = 'tpb-study-review-v1'

export const useStudyReviewStore = defineStore('studyReview', {
  state: () => ({
    selectionsByPaper: {} as Record<string, Record<string, string>>,
    reviewedSectionsByPaper: {} as Record<string, Record<string, boolean>>,
  }),

  actions: {
    getSelection(paperId: string, qid: string) {
      return this.selectionsByPaper[String(paperId || '')]?.[String(qid || '')] || ''
    },

    setSelection(paperId: string, qid: string, key: string) {
      const pid = String(paperId || '')
      const q = String(qid || '')
      if (!pid || !q) return
      if (!this.selectionsByPaper[pid]) this.selectionsByPaper[pid] = {}
      if (key) this.selectionsByPaper[pid][q] = String(key)
      else delete this.selectionsByPaper[pid][q]
    },

    toggleSelection(paperId: string, qid: string, key: string) {
      const current = this.getSelection(paperId, qid)
      this.setSelection(paperId, qid, current === key ? '' : key)
    },

    isSectionReviewed(paperId: string, sectionId: string) {
      return !!this.reviewedSectionsByPaper[String(paperId || '')]?.[String(sectionId || '')]
    },

    setSectionReviewed(paperId: string, sectionId: string, reviewed: boolean) {
      const pid = String(paperId || '')
      const sid = String(sectionId || '')
      if (!pid || !sid) return
      if (!this.reviewedSectionsByPaper[pid]) this.reviewedSectionsByPaper[pid] = {}
      if (reviewed) this.reviewedSectionsByPaper[pid][sid] = true
      else delete this.reviewedSectionsByPaper[pid][sid]
    },

    toggleSectionReviewed(paperId: string, sectionId: string) {
      this.setSectionReviewed(paperId, sectionId, !this.isSectionReviewed(paperId, sectionId))
    },

    clearPaper(paperId: string) {
      const pid = String(paperId || '')
      if (!pid) return
      delete this.selectionsByPaper[pid]
      delete this.reviewedSectionsByPaper[pid]
    },
  },

  persist: {
    key: STORE_KEY,
    pick: ['selectionsByPaper', 'reviewedSectionsByPaper'],
  },
})
