import type { AnswerRow, QuestionRow } from '~/types/paper'
const V2_SKIP = new Set(['column_order', 'columnOrder'])

export interface OpenEndedTableSurface {
  th: Record<string, string>
  body: Record<string, string>[]
}

export interface TableBlankSlot {
  row: number
  key: string
  token?: string
}

export function openEndedTableIsV2(tbl: unknown): boolean {
  if (!tbl || typeof tbl !== 'object' || Array.isArray(tbl)) return false
  const t = tbl as Record<string, unknown>
  if (t.th && Array.isArray(t.body)) return false
  for (const vk of Object.keys(t)) {
    if (V2_SKIP.has(vk)) continue
    const o = t[vk]
    if (
      o &&
      typeof o === 'object' &&
      !Array.isArray(o) &&
      typeof (o as { header?: string }).header === 'string' &&
      Array.isArray((o as { rows?: unknown }).rows)
    ) {
      return true
    }
  }
  return false
}

export function openEndedTableV2ColumnKeys(tbl: Record<string, unknown>): string[] {
  const co = (tbl.column_order || tbl.columnOrder) as string[] | undefined
  if (Array.isArray(co)) {
    const ordered: string[] = []
    for (const ck of co) {
      if (typeof ck !== 'string' || V2_SKIP.has(ck)) continue
      const oc = tbl[ck] as { rows?: unknown } | undefined
      if (oc && typeof oc === 'object' && !Array.isArray(oc) && Array.isArray(oc.rows)) {
        ordered.push(ck)
      }
    }
    const extras: string[] = []
    for (const vk of Object.keys(tbl)) {
      if (V2_SKIP.has(vk) || ordered.includes(vk)) continue
      const o = tbl[vk] as { header?: string; rows?: unknown } | undefined
      if (o && typeof o === 'object' && !Array.isArray(o) && Array.isArray(o.rows)) {
        extras.push(vk)
      }
    }
    if (ordered.length || extras.length) return [...ordered, ...extras]
  }
  const keys: string[] = []
  for (const vk of Object.keys(tbl)) {
    if (V2_SKIP.has(vk)) continue
    const o = tbl[vk] as { header?: string; rows?: unknown } | undefined
    if (o && typeof o === 'object' && !Array.isArray(o) && typeof o.header === 'string' && Array.isArray(o.rows)) {
      keys.push(vk)
    }
  }
  return keys
}

export function openEndedTableLegacyFromV2(tbl: Record<string, unknown>): OpenEndedTableSurface {
  const keys = openEndedTableV2ColumnKeys(tbl)
  const th: Record<string, string> = {}
  for (const hk of keys) {
    const c = tbl[hk] as { header?: string } | undefined
    th[hk] = c?.header != null ? String(c.header) : ''
  }
  let nRows = 0
  for (const nk of keys) {
    const rs = ((tbl[nk] as { rows?: unknown[] })?.rows) || []
    if (rs.length > nRows) nRows = rs.length
  }
  const body: Record<string, string>[] = []
  for (let ri = 0; ri < nRows; ri++) {
    const row: Record<string, string> = {}
    for (const kk of keys) {
      const rs2 = ((tbl[kk] as { rows?: unknown[] })?.rows) || []
      row[kk] = rs2[ri] != null ? String(rs2[ri]) : ''
    }
    body.push(row)
  }
  return { th, body }
}

export function openEndedTableFillFlatV2(tbl: Record<string, unknown>): string[] {
  const keys = openEndedTableV2ColumnKeys(tbl)
  const flat: string[] = []
  if (!keys.length) return flat
  let nRows = 0
  for (const m of keys) {
    const rs0 = ((tbl[m] as { rows?: unknown[] })?.rows) || []
    if (rs0.length > nRows) nRows = rs0.length
  }
  for (let rj = 0; rj < nRows; rj++) {
    for (const colKey of keys) {
      const col = tbl[colKey] as { rows?: unknown[]; fill?: unknown[] } | undefined
      const rowsArr = col?.rows || []
      const cell = rowsArr[rj] != null ? String(rowsArr[rj]).trim() : ''
      if (!openEndedTableCellIsBlank(cell)) continue
      const fillArr = col?.fill
      const fv =
        Array.isArray(fillArr) && fillArr[rj] != null ? String(fillArr[rj]).trim() : ''
      flat.push(fv)
    }
  }
  return flat
}

export function openEndedSurfaceTable(tbl: unknown): OpenEndedTableSurface {
  if (!tbl || typeof tbl !== 'object') return { th: {}, body: [] }
  const t = tbl as Record<string, unknown>
  if (openEndedTableIsV2(t)) return openEndedTableLegacyFromV2(t)
  const th = (t.th as Record<string, string>) || {}
  const body = (Array.isArray(t.body) ? t.body : []) as Record<string, string>[]
  return { th, body }
}

export function openEndedTableHasShape(tbl: unknown): boolean {
  if (!tbl || typeof tbl !== 'object') return false
  const t = tbl as Record<string, unknown>
  if (t.th && Array.isArray(t.body)) return true
  return openEndedTableIsV2(t)
}

export function openEndedTableCellIsBlank(s: unknown): boolean {
  const t = s != null ? String(s).trim() : ''
  if (!t) return true
  if (/^\[Q\d+[a-z]+\]$/i.test(t)) return true
  if (/^_+$/.test(t)) return true
  if (/^\([a-z]\)$/i.test(t)) return true
  return /^\([a-z]\)\s*_+$/i.test(t)
}

export function openEndedTableCellTokenId(s: unknown): string | null {
  const t = s != null ? String(s).trim() : ''
  const m = /^\[Q(\d+[a-z]+)\]$/i.exec(t)
  return m ? m[1] : null
}

export function openEndedTableRowTokenId(s: unknown): string | null {
  const t = s != null ? String(s) : ''
  const m = /\[Q(\d+[a-z]*)\]/i.exec(t)
  return m ? m[1] : null
}

export function openEndedTableCellIsMergeUpToken(v: unknown): boolean {
  return String(v != null ? v : '').trim() === '^^'
}

export function openEndedTableColumnIsTrueFalse(colKey: string, headerText: string): boolean {
  if (colKey === 'true_false') return true
  const h = (headerText != null ? String(headerText) : '').toLowerCase()
  return /\btrue\s*\/\s*false\b/.test(h)
}

export function openEndedTableUsesTf415ColumnRatio(surf: OpenEndedTableSurface): boolean {
  const keys = Object.keys(surf.th || {})
  if (keys.length !== 3) return false
  const midKey = keys[1]
  return openEndedTableColumnIsTrueFalse(midKey, surf.th[midKey] || '')
}

/** Interaction for table layout when JSON uses ``open_ended`` but includes a ``table`` block. */
export function openEndedEffectiveTableInteraction(q: QuestionRow): string {
  let interaction = String(q.interaction || 'open_ended')
  if (interaction === 'grouped') interaction = 'open_ended'
  if (
    interaction !== 'open_ended' &&
    interaction !== 'open_ended_table'
  ) {
    return interaction
  }
  if (!q.table || !openEndedTableHasShape(q.table)) return interaction

  const surf = openEndedSurfaceTable(q.table)
  const keys = Object.keys(surf.th || {})
  if (openEndedTableUsesTf415ColumnRatio(surf)) return 'table_reasoning'
  if (keys.length >= 3) {
    const hasTf = keys.some((k) =>
      openEndedTableColumnIsTrueFalse(k, surf.th[k] || ''),
    )
    return hasTf ? 'true_false_reason' : 'table_reasoning'
  }
  if (keys.length === 2) {
    const k0 = keys[0].toLowerCase()
    const k1 = keys[1].toLowerCase()
    const h0 = (surf.th[keys[0]] || '').toLowerCase()
    const h1 = (surf.th[keys[1]] || '').toLowerCase()
    if (
      /refer|refers_to|refer_to/.test(k1) ||
      /\brefer/.test(h1) ||
      /word.*passage|passage/.test(h0 + h1)
    ) {
      return 'table_reference'
    }
  }
  return 'open_ended_table'
}

export function openEndedTableBlankPlan(tbl: unknown): TableBlankSlot[] {
  if (!tbl || typeof tbl !== 'object') return []
  const surf = openEndedSurfaceTable(tbl)
  const keys = Object.keys(surf.th || {})
  const rows = surf.body || []
  const plan: TableBlankSlot[] = []
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri] || {}
    for (const key of keys) {
      const v = row[key]
      const s = v != null ? String(v).trim() : ''
      const token = openEndedTableRowTokenId(s) || openEndedTableCellTokenId(s) || undefined
      if (token || openEndedTableCellIsBlank(s)) {
        plan.push({ row: ri, key, token })
      }
    }
  }
  return plan
}

export function openEndedTableRowspanLayout(rows: Record<string, string>[], keys: string[]) {
  const nR = rows.length
  const nK = keys.length
  const skipCell: boolean[][] = []
  const rowSpanAt: number[][] = []
  for (let ri = 0; ri < nR; ri++) {
    skipCell[ri] = []
    rowSpanAt[ri] = []
    for (let ki = 0; ki < nK; ki++) {
      skipCell[ri][ki] = false
      rowSpanAt[ri][ki] = 1
    }
  }
  for (let ki2 = 0; ki2 < nK; ki2++) {
    for (let ri2 = 0; ri2 < nR; ri2++) {
      const row2 = rows[ri2] || {}
      const v2 = row2[keys[ki2]]
      if (!openEndedTableCellIsMergeUpToken(v2)) continue
      let rup = ri2 - 1
      while (rup >= 0 && skipCell[rup][ki2]) rup--
      if (rup < 0) continue
      rowSpanAt[rup][ki2] = (rowSpanAt[rup][ki2] || 1) + 1
      skipCell[ri2][ki2] = true
    }
  }
  return { skipCell, rowSpanAt }
}

export function compactOeTableCellShow(s: unknown): string {
  return String(s != null ? s : '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function openEndedModelLinesForTableSlots(
  ans: AnswerRow | undefined,
  q: QuestionRow,
  n: number,
): string[] {
  const out: string[] = []
  const answerMap =
    ans && ans.answer != null && typeof ans.answer === 'object' && !Array.isArray(ans.answer)
      ? (ans.answer as Record<string, unknown>)
      : null
  const blankPlan =
    q.table && openEndedTableHasShape(q.table)
      ? openEndedTableBlankPlan(q.table)
      : []
  for (let i = 0; i < n; i++) {
    let v = ''
    const slot = blankPlan[i]
    if (slot?.token && answerMap && answerMap[slot.token] != null) {
      v = String(answerMap[slot.token]).trim()
    }
    out.push(compactOeTableCellShow(v))
  }
  return out
}
