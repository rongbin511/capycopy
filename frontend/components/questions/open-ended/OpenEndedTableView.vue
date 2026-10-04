<template>
  <div
    v-if="hasTable"
    class="tpb-oe-table-wrap"
    :class="{
      'tpb-oe-table-wrap--reference': interaction === 'table_reference',
      'tpb-oe-table-wrap--tf415': usesTf415,
    }"
  >
    <table class="tpb-oe-table" :class="tableClasses">
      <colgroup v-if="interaction === 'table_reference' && columnKeys.length >= 2">
        <col
          v-for="(key, ci) in columnKeys"
          :key="key"
          :class="ci === columnKeys.length - 1 ? 'tpb-oe-ref-col-rest' : 'tpb-oe-ref-col-tight'"
        />
      </colgroup>
      <thead>
        <tr>
          <th
            v-for="key in columnKeys"
            :key="key"
            class="tpb-stem"
            v-html="renderMarkdownInline(surface.th[key] || '')"
          />
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, ri) in surface.body" :key="ri">
          <template v-for="(key, ki) in columnKeys" :key="key">
            <td
              v-if="!layout.skipCell[ri]?.[ki]"
              :rowspan="layout.rowSpanAt[ri]?.[ki] > 1 ? layout.rowSpanAt[ri][ki] : undefined"
              :class="cellClass(ri, key)"
            >
              <template v-if="isBlankCell(row[key])">
                <div class="tpb-oe-table-fill-stack">
                  <div v-if="viewMode === 'study' && isTfColumn(key)" class="tpb-oe-tf-study" role="group">
                    <button type="button" class="tpb-oe-tf-btn" @click="tfPick(ri, key, 'True')">T</button>
                    <button type="button" class="tpb-oe-tf-btn" @click="tfPick(ri, key, 'False')">F</button>
                  </div>
                  <input
                    v-else-if="viewMode === 'study'"
                    type="text"
                    class="tpb-oe-table-cell"
                    maxlength="800"
                  />
                  <div
                    v-if="viewMode === 'answers' && fillForSlot(blankIndex(ri, key))"
                    class="tpb-oe-table-model-line tpb-stem"
                    v-html="renderMarkdownInline(fillForSlot(blankIndex(ri, key)))"
                  />
                </div>
              </template>
              <span v-else class="tpb-stem" v-html="renderMarkdownInline(String(row[key] ?? ''))" />
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { AnswerRow, QuestionRow, ViewMode } from '~/types/paper'
import { renderMarkdownInline } from '~/utils/paperBundle'
import {
  openEndedEffectiveTableInteraction,
  openEndedModelLinesForTableSlots,
  openEndedSurfaceTable,
  openEndedTableBlankPlan,
  openEndedTableCellIsBlank,
  openEndedTableColumnIsTrueFalse,
  openEndedTableHasShape,
  openEndedTableRowspanLayout,
  openEndedTableUsesTf415ColumnRatio,
} from '~/utils/openEndedTable'

const props = defineProps<{
  q: QuestionRow
  viewMode: ViewMode
  answerRow?: AnswerRow
}>()

const hasTable = computed(() => openEndedTableHasShape(props.q.table))
const interaction = computed(() => openEndedEffectiveTableInteraction(props.q))
const surface = computed(() => openEndedSurfaceTable(props.q.table))
const columnKeys = computed(() => Object.keys(surface.value.th || {}))
const layout = computed(() =>
  openEndedTableRowspanLayout(surface.value.body, columnKeys.value),
)
const blankPlan = computed(() => openEndedTableBlankPlan(props.q.table))
const fills = computed(() =>
  openEndedModelLinesForTableSlots(props.answerRow, props.q, blankPlan.value.length),
)
const usesTf415 = computed(() => openEndedTableUsesTf415ColumnRatio(surface.value))

const tableClasses = computed(() => ({
  'tpb-oe-table--reference': interaction.value === 'table_reference',
  'tpb-oe-table--tf415': usesTf415.value,
}))

const tfState = ref<Record<string, string>>({})

function blankIndex(ri: number, key: string): number {
  return blankPlan.value.findIndex((s) => s.row === ri && s.key === key)
}

function isBlankCell(v: unknown) {
  return openEndedTableCellIsBlank(v)
}

function isTfColumn(key: string) {
  return openEndedTableColumnIsTrueFalse(key, surface.value.th[key] || '')
}

function cellClass(ri: number, key: string) {
  const blank = isBlankCell(surface.value.body[ri]?.[key])
  return {
    'tpb-oe-table-fill-td': blank,
    'tpb-oe-table-fill-td--tf': blank && isTfColumn(key),
  }
}

function fillForSlot(ix: number) {
  if (ix < 0) return ''
  return fills.value[ix] || ''
}

function tfPick(ri: number, key: string, val: string) {
  tfState.value[`${ri}:${key}`] = val
}
</script>
