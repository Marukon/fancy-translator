<script setup lang="ts">
import { useStorage, useTextareaAutosize } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DouButton from '@/components/base/DouButton.vue'
import DouProgress from '@/components/base/DouProgress.vue'
import CopyButton from '@/components/CopyButton.vue'
import HistoryDrawer from '@/components/HistoryDrawer.vue'
import SourceSelect from '@/components/SourceSelect.vue'
import SpeechButton from '@/components/SpeechButton.vue'
import TargetSelect from '@/components/TargetSelect.vue'
import { useDisplayName } from '@/composables/useDisplayName'
import { type HistoryItem, useHistoryStore } from '@/stores/history'
import { useTranslatorStore } from '@/stores/translator'
import { cleanPdfText } from '@/utils/text.util'

const displayName = useDisplayName()

const translatorStore = useTranslatorStore()
const historyStore = useHistoryStore()
const historyOpen = ref(false)
const autoCleanPdf = useStorage('fancy_auto_clean_pdf', false)

const {
  isTranslatorSupported,
  isLanguageDetectorSupported,
  languageDetectorStatus,
  translatorStatus,
  sourceText,
  sourceLanguage,
  realSourceLanguage,
  targetLanguage,
  realTargetLanguage,
  isTranslating,
  translateResult,
  languageDetectionList,
} = storeToRefs(translatorStore)

const disabledTextarea = computed(() => {
  const _isTranslatorSupported = isTranslatorSupported.value

  return !_isTranslatorSupported
})

const { textarea } = useTextareaAutosize({ styleProp: 'height', input: sourceText })

const replacedTranslationResult = computed(() => {
  return (translateResult?.value?.result || '').replace(/<br>/g, '\n').trim()
})

const { t } = useI18n()

// 自动写入历史记录（当翻译完成且有内容时）
watch(isTranslating, (translating, wasTranslating) => {
  if (wasTranslating && !translating) {
    if (sourceText.value.trim() && replacedTranslationResult.value.trim()) {
      historyStore.addHistory({
        sourceText: sourceText.value,
        targetText: replacedTranslationResult.value,
        sourceLang: translatorStatus.value?.sourceLanguage || realSourceLanguage.value || 'auto',
        targetLang: translatorStatus.value?.targetLanguage || realTargetLanguage.value || 'zh-Hans',
      })
    }
  }
})

// 自动清洗开关打开时，立即清洗当前已有文本
watch(autoCleanPdf, (val) => {
  if (val && sourceText.value) {
    sourceText.value = cleanPdfText(sourceText.value)
  }
})

function handleSwap() {
  const currentResult = replacedTranslationResult.value
  if (!currentResult && !sourceText.value) {
    return
  }

  const nextSource = currentResult || ''
  if (sourceLanguage.value !== 'auto' || targetLanguage.value !== 'auto') {
    const oldSource = sourceLanguage.value === 'auto' ? realSourceLanguage.value : sourceLanguage.value
    const oldTarget = targetLanguage.value === 'auto' ? realTargetLanguage.value : targetLanguage.value
    sourceLanguage.value = oldTarget || 'auto'
    targetLanguage.value = oldSource || 'auto'
  }
  sourceText.value = nextSource
}

function handleCleanPdf() {
  if (!sourceText.value) {
    return
  }
  sourceText.value = cleanPdfText(sourceText.value)
}

function handleClear() {
  sourceText.value = ''
}

function handlePasteEvent(e: ClipboardEvent) {
  if (!autoCleanPdf.value) {
    return
  }
  const pastedText = e.clipboardData?.getData('text')
  if (!pastedText) {
    return
  }
  e.preventDefault()
  sourceText.value = cleanPdfText(pastedText)
}

async function handlePaste() {
  try {
    const clip = await navigator.clipboard.readText()
    if (clip) {
      sourceText.value = autoCleanPdf.value ? cleanPdfText(clip) : clip
    }
  }
  catch (e) {
    console.error('Failed to read clipboard:', e)
  }
}

function handleHistorySelect(item: HistoryItem) {
  sourceText.value = item.sourceText
}
</script>

<template>
  <div class="mx-auto mt-2 flex flex-col gap-4 max-w-1280px">
    <div class="h-20px md:h-30px" />
    <div v-if="!isTranslatorSupported" class="error-container f-ring">
      {{ t('browser_not_support') }}
    </div>
    <template v-else>
      <div class="flex flex-col gap-4 items-start relative md:flex-row">
        <div class="f-ring flex flex-col gap-4 w-full md:w-1/2 max-h-75dvh min-h-200px h-fit min-w-0">
          <div class="toolbar flex gap-2 items-center px-4 pt-4 min-w-0">
            <SourceSelect class="flex-shrink min-w-0" />
            <DouButton
              small
              :title="t('swap_languages')"
              class="flex-shrink-0 flex items-center justify-center p-1.5!"
              @click="handleSwap"
            >
              <div class="i-mingcute-transfer-line text-base" />
            </DouButton>
            <TargetSelect class="flex-shrink min-w-0" />

            <div class="ms-auto flex items-center gap-1.5 flex-shrink-0">
              <DouButton
                small
                :title="t('history')"
                class="flex items-center gap-1 text-xs py-1.5 px-2.5"
                @click="historyOpen = true"
              >
                <div class="i-mingcute-history-line text-base" />
                <span class="hidden sm:inline">{{ t('history') }}</span>
              </DouButton>
            </div>
          </div>
          <textarea
            ref="textarea" v-model="sourceText" :disabled="disabledTextarea" name="input" row="1"
            :placeholder="t('input_placeholder')"
            class="outline-none w-full resize-none px-4 text-xl flex-grow min-h-0 text-justify"
            @paste="handlePasteEvent"
          />
          <div class="toolbar flex gap-2 items-center px-4 pb-4 justify-between">
            <div class="flex items-center gap-2 flex-wrap">
              <!-- 清洗 PDF 换行 -->
              <DouButton
                v-if="sourceText"
                small
                :title="t('clean_pdf_title')"
                class="flex items-center gap-1 text-xs py-1 px-2 text-amber-600 dark:text-amber-400"
                @click="handleCleanPdf"
              >
                <div class="i-mingcute-broom-line text-sm" />
                <span>{{ t('clean_pdf') }}</span>
              </DouButton>

              <!-- 自动清洗开关 -->
              <label class="flex items-center gap-1 text-xs select-none cursor-pointer text-dark-500/80 dark:text-light-500/80 hover:opacity-100 transition py-1 px-1 rounded hover:bg-dark-500/5 dark:hover:bg-light-300/5">
                <input
                  v-model="autoCleanPdf"
                  type="checkbox"
                  class="cursor-pointer accent-amber-500 w-3.5 h-3.5 rounded"
                >
                <span>{{ t('auto_clean_pdf') }}</span>
              </label>

              <!-- 清空输入 -->
              <DouButton
                v-if="sourceText"
                small
                :title="t('clear_input')"
                class="flex items-center gap-1 text-xs py-1 px-2 text-red-500! hover:bg-red-500/10!"
                @click="handleClear"
              >
                <div class="i-mingcute-close-line text-sm" />
                <span>{{ t('clear_input') }}</span>
              </DouButton>

              <!-- 粘贴剪贴板 -->
              <DouButton
                v-else
                small
                :title="t('paste')"
                class="flex items-center gap-1 text-xs py-1 px-2 opacity-75"
                @click="handlePaste"
              >
                <div class="i-mingcute-clipboard-line text-sm" />
                <span>{{ t('paste') }}</span>
              </DouButton>
            </div>

            <div class="flex items-center gap-2 flex-shrink-0">
              <SpeechButton :text="sourceText" :lang="realSourceLanguage" />
              <CopyButton :text="sourceText" />
            </div>
          </div>
        </div>

        <div class="f-ring flex flex-col max-h-75dvh min-h-200px w-full md:w-1/2">
          <h1
            class="text-2xl font-light p-4 flex select-none items-center justify-between text-dark-500/50 dark:text-light-300/50"
          >
            {{ t('translate_result') }}
            <div v-if="isTranslating" class="i-mingcute-loading-3-line animate-spin" />
            <div v-else-if="translateResult?.duration" class="text-sm text-gray-400 dark:text-gray-500">
              {{ translateResult?.duration?.toFixed(2) }} ms
            </div>
          </h1>
          <div class="p-4 pt-0 overflow-y-auto text-xl flex flex-col gap-4">
            <div
              v-if="languageDetectionList?.length && sourceLanguage === 'auto'"
              class="f-ring lh-[normal] text-sm p-3 flex flex-col gap-2 select-none items-start justify-center rounded-xl!"
            >
              <h1>
                {{ t('language_detection_confidence') }}
              </h1>
              <div class="flex overflow-y-auto gap-1 min-w-100% w-0 flex-grow">
                <div
                  v-for="item in languageDetectionList" :key="item.detectedLanguage"
                  class="f-ring lh-[normal] text-xs px-2 flex flex-col rounded-lg!"
                >
                  <p class="whitespace-nowrap">
                    {{ displayName.getLabel(item.detectedLanguage) }}
                  </p>
                  <p class="whitespace-nowrap opacity-50">
                    {{ (item.confidence * 100).toPrecision(4) }}%
                  </p>
                </div>
              </div>
            </div>
            <div
              v-if="!isLanguageDetectorSupported || languageDetectorStatus?.status === 'downloading' || languageDetectorStatus?.status === 'error'"
              class="f-ring lh-[normal] text-sm p-3 flex flex-col gap-2 select-none items-center justify-center rounded-xl!"
            >
              <template v-if="!isLanguageDetectorSupported">
                {{ t('browser_not_support_language_detection') }}
              </template>
              <template v-else-if="languageDetectorStatus?.status === 'downloading'">
                <div class="flex flex-col gap-4 items-center">
                  <div class="flex gap-2 items-center">
                    <div class="i-mingcute-loading-3-line animate-spin text-lg" />
                    {{ t('language_detection_model_downloading') }} ({{ ((languageDetectorStatus?.progress || 0) * 100).toFixed(2) }}%)
                  </div>
                  <DouProgress :progress="(languageDetectorStatus?.progress || 0) * 100" />
                </div>
              </template>
              <template v-else-if="languageDetectorStatus?.status === 'error'">
                <div class="flex flex-col gap-4 items-center">
                  <div class="flex gap-2 items-center">
                    <div class="i-mingcute-warning-line text-lg" />
                    {{ t('language_detection_model_download_failed') }}
                  </div>
                  {{ languageDetectorStatus?.error?.message }}
                </div>
              </template>
            </div>
            <div
              v-if="translatorStatus?.status === 'downloading' || translatorStatus?.status === 'error'"
              class="f-ring lh-[normal] text-sm p-3 flex flex-col gap-2 select-none items-center justify-center rounded-xl!"
            >
              <template v-if="translatorStatus?.status === 'downloading'">
                <div class="flex flex-col gap-4 items-center">
                  <div>
                    {{ displayName.getLabel(translatorStatus?.sourceLanguage) }} -> {{
                      displayName.getLabel(translatorStatus?.targetLanguage)
                    }}
                  </div>
                  <div class="flex gap-2 items-center">
                    <div class="i-mingcute-loading-3-line animate-spin text-lg" />
                    {{
                      translatorStatus?.noNeedToDownload ? t('translator_model_loading') : t('translator_model_downloading') }}
                    <template v-if="!translatorStatus?.noNeedToDownload">
                      ({{ ((translatorStatus?.progress || 0) * 100).toFixed(2) }}%)
                    </template>
                  </div>
                  <DouProgress
                    v-if="!translatorStatus?.noNeedToDownload"
                    :progress="(translatorStatus?.progress || 0) * 100"
                  />
                </div>
              </template>
              <template v-else-if="translatorStatus?.status === 'error'">
                <div class="flex flex-col gap-4 items-center">
                  <div class="flex gap-2 items-center">
                    <div class="i-mingcute-warning-line text-lg" />
                    {{ t('translator_model_download_failed') }}
                  </div>
                  {{ translatorStatus?.error?.message }}
                </div>
              </template>
            </div>
            <template v-else>
              <div
                v-if="translateResult?.error"
                class="text-red-600 p-3 rounded-xl bg-red-600/10 dark:text-red-400 lh-[normal]"
              >
                {{ translateResult?.error?.message }}
              </div>
              <template v-else>
                <div class="whitespace-pre-wrap text-justify">
                  {{ replacedTranslationResult || '...' }}
                </div>
                <div class="toolbar flex gap-2 items-center justify-end pt-4 text-base">
                  <SpeechButton :text="replacedTranslationResult" :lang="realTargetLanguage" />
                  <CopyButton :text="replacedTranslationResult" />
                </div>
              </template>
            </template>
          </div>
        </div>
      </div>
    </template>
    <HistoryDrawer v-model:open="historyOpen" @select="handleHistorySelect" />
  </div>
</template>

<style scoped lang="scss">
.f-ring {
  --uno: shadow-xl shadow-dark-500/3 dark:shadow-light-500/3 border-1 border-dark-500/20 dark:border-light-300/20 rounded-2xl;
  --uno: bg-white/30 dark:bg-dark-700/30;
  --uno: backdrop-blur-md;
}

.error-container {
  --uno: flex items-center justify-center rounded-xl text-sm md:text-lg py-4 px-6 mx-auto;
  --uno: select-none;
}
</style>
