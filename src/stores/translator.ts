import { useStorage, useThrottleFn } from '@vueuse/core'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { LANGUAGES } from '@/constants/lang'

export interface LanguageDetectionResult {
  detectedLanguage: string
  confidence: number
}

export type TranslatorStatusItem = {
  sourceLanguage: string
  targetLanguage: string
} & (
  {
    status: 'ready'
    instance: any
  } | {
    status: 'error'
    error: Error
  } | {
    status: 'downloading'
    progress: number
    signal?: AbortSignal
    controller?: AbortController
    instance?: any
    noNeedToDownload?: boolean
  }
)

export interface LanguageDetectorStatusItem {
  status: 'ready' | 'downloading' | 'error'
  progress?: number
  error?: Error
  signal?: AbortSignal
  controller?: AbortController
  instance?: any
}

export const useTranslatorStore = defineStore('translator', () => {
  const { t } = useI18n()

  const isTranslatorSupported = ref('Translator' in globalThis)
  const isLanguageDetectorSupported = ref('LanguageDetector' in globalThis)
  const translatorStatus = ref<TranslatorStatusItem>()
  const languageDetectorStatus = ref<LanguageDetectorStatusItem>()
  const supportMoreLanguages = useStorage('fancy_support_more_languages', false)

  watch(supportMoreLanguages, (val) => {
    if (!val) {
      const allowed = ['auto', 'zh-Hans', 'en']
      let changed = false
      if (!allowed.includes(_sourceLanguage.value)) {
        _sourceLanguage.value = 'auto'
        changed = true
      }
      if (!allowed.includes(_targetLanguage.value)) {
        _targetLanguage.value = 'auto'
        changed = true
      }
      if (changed) {
        translate(_sourceText.value)
      }
    }
  })

  let firstTime = true
  const _sourceText = ref('')
  const languageDetectionList = ref<LanguageDetectionResult[]>([])

  const _sourceLanguage = ref(isLanguageDetectorSupported.value ? 'auto' : 'en')
  const _realSourceLanguage = ref('')
  const _targetLanguage = ref('auto')
  const translateController = ref<AbortController>()
  const isTranslating = ref(false)
  const translateResult = ref<{
    error?: Error
    result: string
    duration?: number
  }>({
    error: undefined,
    result: '',
    duration: undefined,
  })

  const realTargetLanguage = computed(() => {
    if (_targetLanguage.value !== 'auto') {
      return _targetLanguage.value
    }
    const effectiveSource = (_sourceLanguage.value === 'auto'
      ? _realSourceLanguage.value
      : _sourceLanguage.value).toLowerCase()

    if (effectiveSource.startsWith('zh')) {
      return 'en'
    }
    return 'zh-Hans'
  })

  const sourceLanguage = computed({
    get: () => _sourceLanguage.value,
    set: (value) => {
      firstTime = false
      updateLangPair({ sourceLanguage: value, targetLanguage: _targetLanguage.value })
    },
  })
  const targetLanguage = computed({
    get: () => _targetLanguage.value,
    set: (value) => {
      firstTime = false
      updateLangPair({ sourceLanguage: _sourceLanguage.value, targetLanguage: value })
    },
  })

  const throttledTranslate = useThrottleFn(translate, 500, true)

  const sourceText = computed({
    get: () => _sourceText.value,
    set: (value) => {
      _sourceText.value = value
      isTranslating.value = true
      throttledTranslate(value)
    },
  })

  function updateLangPair(params: { sourceLanguage: string, targetLanguage: string }) {
    let { sourceLanguage, targetLanguage } = params
    if (!sourceLanguage || !targetLanguage) {
      // 若存在空参数，首先进行空参数补全
      if (!sourceLanguage) {
        // 默认源语言为中文或自动检测
        sourceLanguage = isLanguageDetectorSupported.value ? 'auto' : 'zh-Hans'
      }
      if (!targetLanguage) {
        const defaultTargetLanguage = 'auto'
        targetLanguage = defaultTargetLanguage
      }
    }
    _sourceLanguage.value = sourceLanguage
    _targetLanguage.value = targetLanguage

    if (_sourceLanguage.value !== 'auto') {
      _realSourceLanguage.value = _sourceLanguage.value
    }

    // 若源语言为自动检测，但是不支持语言检测，默认源语言为中文
    if (_sourceLanguage.value === 'auto' && !isLanguageDetectorSupported.value) {
      _sourceLanguage.value = 'zh-Hans'
      _realSourceLanguage.value = 'zh-Hans'
    }

    // 若源语言为自动检测，则初始化LanguageDetector
    if (_sourceLanguage.value === 'auto') {
      initLanguageDetector()
    }

    translate(_sourceText.value)
  }

  async function initLanguageDetector() {
    // 当前已初始化，直接返回
    if (languageDetectorStatus.value !== undefined) {
      return
    }
    try {
      const availability = await window.LanguageDetector.availability()
      if (availability === 'unavailable') {
        isLanguageDetectorSupported.value = false
        languageDetectorStatus.value = {
          status: 'error',
          error: new Error('LanguageDetector is unavailable'),
        }
        return
      }
    }
    catch (error) {
      isLanguageDetectorSupported.value = false
      languageDetectorStatus.value = {
        status: 'error',
        error: error as Error,
      }
      return
    }
    languageDetectorStatus.value = {
      status: 'downloading',
      progress: 0,
      error: undefined,
      signal: undefined,
      controller: undefined,
      instance: undefined,
    }
    try {
      const controller = new AbortController()
      languageDetectorStatus.value.signal = controller.signal
      languageDetectorStatus.value.controller = controller
      const instance = await window.LanguageDetector.create({
        monitor(monitor) {
          monitor.addEventListener('downloadprogress', (e) => {
            languageDetectorStatus.value!.progress = e.loaded || 0
          })
        },
        // expectedInputLanguages: LANGUAGES,
      })
      languageDetectorStatus.value.instance = instance
      languageDetectorStatus.value.status = 'ready'
    }
    catch (error) {
      languageDetectorStatus.value.error = error as Error
      languageDetectorStatus.value.status = 'error'
    }
  }

  async function translate(text: string) {
    if (firstTime) {
      firstTime = false
      updateLangPair({ sourceLanguage: _sourceLanguage.value, targetLanguage: _targetLanguage.value })
    }
    const start = performance.now()
    if (!text?.trim() || !_sourceLanguage.value || !_targetLanguage.value) {
      isTranslating.value = false
      translateResult.value = {
        error: undefined,
        result: '',
        duration: undefined,
      }
      languageDetectionList.value = []
      if (_sourceLanguage.value === 'auto') {
        _realSourceLanguage.value = ''
      }
      return
    }
    isTranslating.value = true
    translateController.value?.abort()
    let sourceLanguage = _sourceLanguage.value
    const controller = new AbortController()
    translateController.value = controller
    function isOutdated() {
      return controller.signal.aborted
    }
    if (sourceLanguage === 'auto') {
      // 此时需要使用语言检测模型
      if (!languageDetectorStatus.value?.instance) {
        await initLanguageDetector()
      }
      if (isOutdated()) {
        return
      }
      if (!languageDetectorStatus.value?.instance) {
        isTranslating.value = false
        return
      }
      languageDetectionList.value = []
      const detectedLanguage = await languageDetectorStatus.value.instance.detect(text, {
        signal: controller.signal,
      }).catch(() => {
        return []
      })
      if (isOutdated()) {
        return
      }
      languageDetectionList.value = detectedLanguage
      const rawDetected = detectedLanguage[0]?.detectedLanguage || 'und'
      if (!supportMoreLanguages.value) {
        // 默认模式仅支持中英文：如果检测为中文相关则为 zh，否则为 en
        if (rawDetected.startsWith('zh')) {
          sourceLanguage = 'zh'
        }
        else if (rawDetected === 'und') {
          sourceLanguage = 'und'
        }
        else {
          sourceLanguage = 'en'
        }
      }
      else {
        sourceLanguage = rawDetected
      }
      if (sourceLanguage === 'und') {
        // 未知语言
        sourceLanguage = 'und'
        translateResult.value = {
          error: new Error(t('language_detection_failed')),
          result: '',
        }
      }
      _realSourceLanguage.value = sourceLanguage
    }
    else {
      _realSourceLanguage.value = sourceLanguage
    }

    const targetLanguage = realTargetLanguage.value

    if (!translatorStatus.value?.instance || translatorStatus.value?.sourceLanguage !== sourceLanguage || translatorStatus.value?.targetLanguage !== targetLanguage) {
      translatorStatus.value?.instance?.destroy()
      translatorStatus.value = undefined
      await initTranslator(controller.signal).catch(() => { })
    }

    if (isOutdated()) {
      return
    }
    if (!translatorStatus.value?.instance) {
      isTranslating.value = false
      return
    }
    try {
      const result = translatorStatus.value.instance.translateStreaming(text.trim().replace(/\n/g, '<br>'), {
        signal: controller.signal,
      })
      if (isOutdated()) {
        return
      }

      translateResult.value = {
        error: undefined,
        result: '',
        duration: performance.now() - start,
      }

      const reader = result.getReader()
      while (true) {
        if (isOutdated()) {
          return {
            error: undefined,
            result: '',
          }
        }
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        translateResult.value.result += value
        translateResult.value.duration = performance.now() - start
      }

      isTranslating.value = false
    }
    catch (error) {
      if (isOutdated()) {
        return
      }
      translateResult.value = {
        error: error as Error,
        result: '',
      }
      isTranslating.value = false
    }
  }

  async function initTranslator(signal: AbortSignal) {
    if (signal.aborted) {
      return
    }
    const currentSourceLang = _realSourceLanguage.value
    const currentTargetLang = realTargetLanguage.value
    const status = await window.Translator.availability({
      sourceLanguage: currentSourceLang,
      targetLanguage: currentTargetLang,
    })
    if (signal.aborted) {
      return
    }
    if (status === 'unavailable') {
      translatorStatus.value = {
        sourceLanguage: currentSourceLang,
        targetLanguage: currentTargetLang,
        status: 'error',
        error: new Error(t('lang_pair_not_supported', {
          sourceLang: currentSourceLang,
          targetLang: currentTargetLang,
        })),
      }
    }
    else if (status === 'downloading' || status === 'downloadable' || status === 'available') {
      translatorStatus.value = {
        sourceLanguage: currentSourceLang,
        targetLanguage: currentTargetLang,
        noNeedToDownload: status === 'available',
        status: 'downloading',
        error: undefined,
        progress: 0,
      }
      try {
        const instance = await window.Translator.create({
          sourceLanguage: currentSourceLang,
          targetLanguage: currentTargetLang,
          monitor(monitor) {
            monitor.addEventListener('downloadprogress', (e) => {
              if (signal.aborted) {
                return
              }
              translatorStatus.value!.progress = e.loaded || 0
            })
          },
        })
        if (signal.aborted) {
          return
        }
        translatorStatus.value.instance = instance
        translatorStatus.value.status = 'ready'
      }
      catch (error) {
        if (signal.aborted) {
          return
        }
        translatorStatus.value.error = error as Error
        translatorStatus.value.status = 'error'
      }
    }
  }

  return {
    isTranslatorSupported,
    isLanguageDetectorSupported,
    sourceLanguage,
    targetLanguage,
    realTargetLanguage,
    translatorStatus,
    languageDetectorStatus,
    sourceText,
    isTranslating,
    translateResult,
    realSourceLanguage: _realSourceLanguage,
    languageDetectionList,
    supportMoreLanguages,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useTranslatorStore, import.meta.hot))
}
