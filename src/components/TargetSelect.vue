<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDisplayName } from '@/composables/useDisplayName'
import { LANGUAGES } from '@/constants/lang'
import { useTranslatorStore } from '@/stores/translator'
import DouSelect from './base/DouSelect.vue'

const { t } = useI18n()

const translatorStore = useTranslatorStore()

const { targetLanguage, realTargetLanguage } = storeToRefs(translatorStore)

const displayName = useDisplayName()

const options = computed(() => {
  const _displayName = displayName.value
  const _realTargetLanguage = realTargetLanguage.value
  const _targetLanguage = targetLanguage.value
  const finalOptions: {
    value: string
    label: string
    disabled?: boolean
  }[] = []

  finalOptions.push({
    label: _realTargetLanguage && _targetLanguage === 'auto'
      ? `${t('auto_with_lang', {
        lang: _displayName.getLabel(_realTargetLanguage),
      })}`
      : t('auto'),
    value: 'auto',
  })

  LANGUAGES.forEach((item) => {
    finalOptions.push({
      label: _displayName.getLabel(item),
      value: item,
    })
  })

  return finalOptions
})
</script>

<template>
  <DouSelect v-model="targetLanguage" :options="options" :placeholder="t('target_language')" />
</template>

<style scoped lang="scss"></style>
