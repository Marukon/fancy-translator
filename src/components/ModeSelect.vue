<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTranslatorStore } from '@/stores/translator'
import DouSelect from './base/DouSelect.vue'

const { t } = useI18n()

const translatorStore = useTranslatorStore()
const { translationMode } = storeToRefs(translatorStore)

const options = computed(() => [
  {
    label: t('mode_auto'),
    value: 'auto',
    extra: t('mode_auto_desc'),
  },
  {
    label: t('mode_translate'),
    value: 'translate',
    extra: t('mode_translate_desc'),
  },
  {
    label: t('mode_dictionary'),
    value: 'dictionary',
    extra: t('mode_dictionary_desc'),
  },
])
</script>

<template>
  <DouSelect
    v-model="translationMode"
    :options="options"
    :placeholder="t('mode_select')"
    :title="t('mode_select_tip')"
    class="mode-select-trigger"
  >
    <template #default="{ label, extra }">
      <div class="flex items-center gap-1" :title="extra">
        <span class="whitespace-nowrap font-medium">{{ label }}</span>
      </div>
    </template>
  </DouSelect>
</template>

<style scoped lang="scss">
.mode-select-trigger {
  --uno: flex-shrink-0 text-xs py-1.5 px-2.5 font-medium;
}
</style>
