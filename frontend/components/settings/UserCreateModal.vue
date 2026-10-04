<template>
  <UModal
    v-model:open="open"
    title="New user"
    description="Create a learner profile to track level, role, and last viewed paper."
    :ui="{ content: 'w-[56vw] max-w-[56vw]' }"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="User id">
          <UInput v-model="userId" placeholder="alex" />
        </UFormField>
        <div class="grid gap-4 sm:grid-cols-3">
          <UFormField label="Gender">
            <USelect v-model="gender" :items="genderItems" class="w-full" :ui="{ base: 'w-full' }" />
          </UFormField>
          <UFormField label="Level">
            <USelect v-model="level" :items="levelItems" class="w-full" :ui="{ base: 'w-full' }" />
          </UFormField>
          <UFormField label="Role">
            <USelect v-model="role" :items="roleItems" class="w-full" :ui="{ base: 'w-full' }" />
          </UFormField>
        </div>
        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="error"
        />
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton color="neutral" variant="ghost" @click="close">Cancel</UButton>
        <UButton :loading="saving" @click="save">Create</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { UserCatalogEntry } from '~/types/paper'

type UserPayload = {
  user_id: string
  gender: string
  level: string
  role: string
}

const props = defineProps<{
  saveFn?: (payload: UserPayload) => UserCatalogEntry | void | Promise<UserCatalogEntry | void>
}>()

const emit = defineEmits<{ created: [user: UserCatalogEntry]; close: [] }>()

const open = ref(false)
const userId = ref('')
const gender = ref('female')
const level = ref('P6')
const role = ref('student')
const error = ref('')
const saving = ref(false)

const genderItems = [
  { label: 'Female', value: 'female' },
  { label: 'Male', value: 'male' },
  { label: 'Prefer not to say', value: 'unspecified' },
]

const levelItems = ['P4', 'P5', 'P6'].map((value) => ({ label: value, value }))

const roleItems = [
  { label: 'Student', value: 'student' },
  { label: 'Teacher', value: 'teacher' },
  { label: 'Parent', value: 'parent' },
  { label: 'Admin', value: 'admin' },
]

function show() {
  userId.value = ''
  gender.value = 'female'
  level.value = 'P6'
  role.value = 'student'
  error.value = ''
  open.value = true
}

function close() {
  open.value = false
  emit('close')
}

async function save() {
  error.value = ''
  const payload: UserPayload = {
    user_id: userId.value.trim(),
    gender: gender.value,
    level: level.value,
    role: role.value,
  }
  if (!payload.user_id) {
    error.value = 'User id is required.'
    return
  }
  saving.value = true
  try {
    let result: UserCatalogEntry | void
    if (props.saveFn) {
      result = await props.saveFn(payload)
    } else {
      result = payload as UserCatalogEntry
    }
    if (result) emit('created', result)
    close()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    saving.value = false
  }
}

defineExpose({ show, close })
</script>
