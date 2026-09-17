import { useStorage, useThrottleFn } from '@vueuse/core'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { LANGUAGES } from '@/constants/lang'
import { isDictionaryCandidate, resolveDictionaryEntry } from '@/utils/dict.util'

export interface LanguageDetectionResult {
  detectedLanguage: string
  confidence: number
}

export interface TranslatorStatusItem {
  sourceLanguage: string
  targetLanguage: string
  status: 'ready' | 'error' | 'downloading'
  noNeedToDownload?: boolean
  progress?: number
  error?: Error
  signal?: AbortSignal
  controller?: AbortController
  instance?: any
}

export interface LanguageDetectorStatusItem {
  status: 'ready' | 'error' | 'downloading'
  progress?: number
  error?: Error
  signal?: AbortSignal
  controller?: AbortController
  instance?: any
}

function getTranslatorAPI(): any {
  if (typeof (globalThis as any).Translator !== 'undefined') return (globalThis as any).Translator
  if (typeof (globalThis as any).translation?.createTranslator !== 'undefined') return (globalThis as any).translation
  if (typeof (globalThis as any).ai?.translator !== 'undefined') return (globalThis as any).ai.translator
  return null
}

function getLanguageDetectorAPI(): any {
  if (typeof (globalThis as any).LanguageDetector !== 'undefined') return (globalThis as any).LanguageDetector
  if (typeof (globalThis as any).translation?.createDetector !== 'undefined') return (globalThis as any).translation
  if (typeof (globalThis as any).ai?.languageDetector !== 'undefined') return (globalThis as any).ai.languageDetector
  return null
}

export const useTranslatorStore = defineStore('translator', () => {
  const { t } = useI18n()

  const isTranslatorSupported = ref(!!getTranslatorAPI())
  const isLanguageDetectorSupported = ref(!!getLanguageDetectorAPI())
  const translatorStatus = ref<TranslatorStatusItem>()
  const languageDetectorStatus = ref<LanguageDetectorStatusItem>()
  const supportMoreLanguages = useStorage('fancy_support_more_languages', false)
  const translationMode = useStorage<'auto' | 'translate' | 'dictionary'>('fancy_translation_mode', 'auto')
  const dictShowPhonetics = useStorage('fancy_dict_show_phonetics', false)
  const dictShowExamples = useStorage('fancy_dict_show_examples', false)

  watch(supportMoreLanguages, (val) => {
    if (!val) {
      _sourceLanguage.value = 'auto'
      _targetLanguage.value = 'auto'
    }
    else {
      _sourceLanguage.value = 'auto'
      _targetLanguage.value = 'zh-Hans'
    }
    translate(_sourceText.value)
  })

  watch([translationMode, dictShowPhonetics, dictShowExamples], () => {
    if (_sourceText.value?.trim()) {
      translate(_sourceText.value)
    }
  })

  let firstTime = true
  const _sourceText = ref('')
  const languageDetectionList = ref<LanguageDetectionResult[]>([])

  const _sourceLanguage = ref(isLanguageDetectorSupported.value ? 'auto' : 'en')
  const _realSourceLanguage = ref('')
  const _targetLanguage = ref(supportMoreLanguages.value ? 'zh-Hans' : 'auto')
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

  const resolvedMode = computed<'translate' | 'dictionary'>(() => {
    if (translationMode.value === 'dictionary') return 'dictionary'
    if (translationMode.value === 'translate') return 'translate'
    return isDictionaryCandidate(_sourceText.value) ? 'dictionary' : 'translate'
  })

  const isCurrentDictionary = computed(() => resolvedMode.value === 'dictionary')

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
        const defaultTargetLanguage = supportMoreLanguages.value ? 'zh-Hans' : 'auto'
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
    const detectorAPI = getLanguageDetectorAPI()
    if (!detectorAPI) {
      isLanguageDetectorSupported.value = false
      return
    }
    try {
      let availability: any = 'available'
      if (typeof detectorAPI.availability === 'function') {
        availability = await detectorAPI.availability()
      } else if (typeof detectorAPI.capabilities === 'function') {
        const caps = await detectorAPI.capabilities()
        availability = caps.available
      }
      if (availability === 'unavailable' || availability === 'no') {
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
      const createFn = typeof detectorAPI.create === 'function'
        ? detectorAPI.create.bind(detectorAPI)
        : (typeof detectorAPI.createDetector === 'function' ? detectorAPI.createDetector.bind(detectorAPI) : null)
      const instance = await createFn({
        monitor(monitor: any) {
          monitor.addEventListener('downloadprogress', (e: any) => {
            if (languageDetectorStatus.value) {
              languageDetectorStatus.value.progress = e.loaded || 0
            }
          })
        },
        // expectedInputLanguages: LANGUAGES,
      })
      if (languageDetectorStatus.value) {
        languageDetectorStatus.value.instance = instance
        languageDetectorStatus.value.status = 'ready'
      }
    }
    catch (error) {
      if (languageDetectorStatus.value) {
        languageDetectorStatus.value.error = error as Error
        languageDetectorStatus.value.status = 'error'
      }
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
      let rawDetected = detectedLanguage[0]?.detectedLanguage
      if (rawDetected === 'zh') {
        rawDetected = 'zh-Hans'
      }
      if (rawDetected && rawDetected.startsWith('zh-')) {
        rawDetected = 'zh-Hans'
      }
      if (!supportMoreLanguages.value) {
        // 未开启更多语言支持，只支持中英文互译
        if (rawDetected === 'zh-Hans') {
          sourceLanguage = 'zh-Hans'
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
      translatorStatus.value?.instance?.destroy?.()
      translatorStatus.value = undefined
      await initTranslator(controller.signal).catch(() => { })
    }

    if (isOutdated()) {
      return
    }

    const isDict = translationMode.value === 'dictionary' || (translationMode.value === 'auto' && isDictionaryCandidate(text))

    if (isDict) {
      try {
        translateResult.value = {
          error: undefined,
          result: '',
          duration: performance.now() - start,
        }

        const helperTranslate = async (t: string) => {
          if (translatorStatus.value?.instance?.translate) {
            try {
              return await translatorStatus.value.instance.translate(t)
            }
            catch {}
          }
          return t
        }

        const targetLangName = targetLanguage === 'zh-Hans' ? '中文' : (targetLanguage === 'en' ? '英语' : targetLanguage)

        const res = await resolveDictionaryEntry(text, {
          showPhonetics: dictShowPhonetics.value,
          showExamples: dictShowExamples.value,
          targetLangName,
          signal: controller.signal,
          onChunk: (chunk) => {
            if (isOutdated()) return
            translateResult.value.result = chunk
            translateResult.value.duration = performance.now() - start
          },
          translatorTranslate: helperTranslate,
        })

        if (isOutdated()) return
        translateResult.value.result = res
        translateResult.value.duration = performance.now() - start
        isTranslating.value = false
        return
      }
      catch (error) {
        if (isOutdated()) return
        translateResult.value = {
          error: error as Error,
          result: '',
        }
        isTranslating.value = false
        return
      }
    }

    if (!translatorStatus.value?.instance) {
      translateResult.value = {
        error: undefined,
        result: '',
        duration: undefined,
      }
      isTranslating.value = false
      return
    }
    try {
      const instance = translatorStatus.value.instance
      translateResult.value = {
        error: undefined,
        result: '',
        duration: performance.now() - start,
      }

      if (typeof instance.translateStreaming === 'function') {
        let streamResult = instance.translateStreaming(text.trim().replace(/\n/g, '<br>'), {
          signal: controller.signal,
        })
        if (streamResult && typeof streamResult.then === 'function') {
          streamResult = await streamResult
        }
        if (isOutdated()) return

        if (streamResult && typeof streamResult.getReader === 'function') {
          const reader = streamResult.getReader()
          while (true) {
            if (isOutdated()) return
            const { done, value } = await reader.read()
            if (done) break
            translateResult.value.result += (typeof value === 'string' ? value : '')
            translateResult.value.duration = performance.now() - start
          }
        } else if (streamResult && typeof streamResult[Symbol.asyncIterator] === 'function') {
          for await (const chunk of streamResult) {
            if (isOutdated()) return
            translateResult.value.result += (typeof chunk === 'string' ? chunk : '')
            translateResult.value.duration = performance.now() - start
          }
        } else {
          translateResult.value.result = String(streamResult || '')
        }
      } else if (typeof instance.translate === 'function') {
        const fullText = await instance.translate(text.trim().replace(/\n/g, '<br>'), {
          signal: controller.signal,
        })
        if (isOutdated()) return
        translateResult.value.result = fullText
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
    const translatorAPI = getTranslatorAPI()
    if (!translatorAPI) {
      isTranslatorSupported.value = false
      return
    }

    // 针对 Chrome 进行语言代码适配候选
    const langCandidates = [
      { src: currentSourceLang, tgt: currentTargetLang },
      { src: currentSourceLang === 'zh-Hans' ? 'zh' : currentSourceLang, tgt: currentTargetLang === 'zh-Hans' ? 'zh' : currentTargetLang },
      { src: currentSourceLang === 'zh' ? 'zh-Hans' : currentSourceLang, tgt: currentTargetLang === 'zh' ? 'zh-Hans' : currentTargetLang },
    ]

    let bestPair = langCandidates[0]
    let status: any = 'unavailable'

    for (const pair of langCandidates) {
      try {
        if (typeof translatorAPI.availability === 'function') {
          status = await translatorAPI.availability({
            sourceLanguage: pair.src,
            targetLanguage: pair.tgt,
          })
        } else if (typeof translatorAPI.capabilities === 'function') {
          const caps = await translatorAPI.capabilities()
          status = caps.available
        }
        if (status === 'downloading' || status === 'downloadable' || status === 'available' || status === 'readily' || status === 'after-download') {
          bestPair = pair
          break
        }
      } catch (e) {}
    }

    if (signal.aborted) {
      return
    }

    if (status === 'unavailable' || status === 'no') {
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
    else if (status === 'downloading' || status === 'downloadable' || status === 'available' || status === 'readily' || status === 'after-download') {
      translatorStatus.value = {
        sourceLanguage: currentSourceLang,
        targetLanguage: currentTargetLang,
        noNeedToDownload: status === 'available' || status === 'readily',
        status: 'downloading',
        error: undefined,
        progress: 0,
      }
      try {
        const createFn = typeof translatorAPI.create === 'function'
          ? translatorAPI.create.bind(translatorAPI)
          : (typeof translatorAPI.createTranslator === 'function' ? translatorAPI.createTranslator.bind(translatorAPI) : null)

        const instance = await createFn({
          sourceLanguage: bestPair.src,
          targetLanguage: bestPair.tgt,
          monitor(monitor: any) {
            monitor.addEventListener('downloadprogress', (e: any) => {
              if (signal.aborted) {
                return
              }
              if (translatorStatus.value) {
                translatorStatus.value.progress = e.loaded || 0
              }
            })
          },
        })
        if (signal.aborted) {
          instance.destroy?.()
          return
        }
        if (translatorStatus.value) {
          translatorStatus.value.instance = instance
          translatorStatus.value.status = 'ready'
        }
      }
      catch (error) {
        if (signal.aborted) {
          return
        }
        if (translatorStatus.value) {
          translatorStatus.value.error = error as Error
          translatorStatus.value.status = 'error'
        }
      }
    }
  }

  /**
   * 预热翻译模型：页面加载后在后台预先创建 en→zh-Hans 翻译器实例，
   * 使用户首次输入文字时无需等待模型下载/初始化，实现秒级翻译响应。
   */
  async function preloadDefaultTranslator() {
    // 如果已经有翻译器实例，无需预热
    if (translatorStatus.value?.instance) {
      return
    }
    const translatorAPI = getTranslatorAPI()
    if (!translatorAPI) {
      return
    }

    const preloadSource = 'en'
    const preloadTarget = 'zh-Hans'

    // 尝试多种语言代码（兼容 Chrome 用 'zh' 和 Edge 用 'zh-Hans'）
    const langCandidates = [
      { src: preloadSource, tgt: preloadTarget },
      { src: preloadSource, tgt: 'zh' },
    ]

    let bestPair = langCandidates[0]
    let status: any = 'unavailable'

    for (const pair of langCandidates) {
      try {
        if (typeof translatorAPI.availability === 'function') {
          status = await translatorAPI.availability({
            sourceLanguage: pair.src,
            targetLanguage: pair.tgt,
          })
        } else if (typeof translatorAPI.capabilities === 'function') {
          const caps = await translatorAPI.capabilities()
          status = caps.available
        }
        if (status === 'downloading' || status === 'downloadable' || status === 'available' || status === 'readily' || status === 'after-download') {
          bestPair = pair
          break
        }
      } catch (_e) {}
    }

    if (status === 'unavailable' || status === 'no') {
      return
    }

    try {
      const createFn = typeof translatorAPI.create === 'function'
        ? translatorAPI.create.bind(translatorAPI)
        : (typeof translatorAPI.createTranslator === 'function' ? translatorAPI.createTranslator.bind(translatorAPI) : null)
      if (!createFn) return

      const instance = await createFn({
        sourceLanguage: bestPair.src,
        targetLanguage: bestPair.tgt,
        monitor(monitor: any) {
          monitor.addEventListener('downloadprogress', (e: any) => {
            if (translatorStatus.value) {
              translatorStatus.value.progress = e.loaded || 0
            }
          })
        },
      })

      // 预热完成后，只有在还没有其他翻译器实例时才设置
      if (!translatorStatus.value?.instance) {
        translatorStatus.value = {
          sourceLanguage: preloadSource,
          targetLanguage: preloadTarget,
          noNeedToDownload: status === 'available' || status === 'readily',
          status: 'ready',
          error: undefined,
          progress: 100,
          instance,
        }
        console.log('[Translator] Preloaded en→zh-Hans translator instance')
      } else {
        // 已有实例，销毁预热的实例
        instance.destroy?.()
      }
    } catch (e) {
      console.warn('[Translator] Preload failed (non-blocking):', e)
    }
  }

  // 页面加载后延迟 500ms 开始预热，避免阻塞首屏渲染
  setTimeout(() => {
    preloadDefaultTranslator()
  }, 500)

  // 同时预热语言检测器
  setTimeout(() => {
    if (isLanguageDetectorSupported.value && !languageDetectorStatus.value?.instance) {
      initLanguageDetector()
    }
  }, 600)

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
    translationMode,
    dictShowPhonetics,
    dictShowExamples,
    resolvedMode,
    isCurrentDictionary,
    translate,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useTranslatorStore, import.meta.hot))
}
