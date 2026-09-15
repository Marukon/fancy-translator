import { useStorage } from '@vueuse/core'
import { acceptHMRUpdate, defineStore } from 'pinia'

export interface HistoryItem {
  id: string
  sourceText: string
  targetText: string
  sourceLang: string
  targetLang: string
  timestamp: number
}

const MAX_HISTORY_ITEMS = 60

export const useHistoryStore = defineStore('history', () => {
  const historyList = useStorage<HistoryItem[]>('fancy_translator_history', [])

  function addHistory(item: Omit<HistoryItem, 'id' | 'timestamp'>) {
    if (!item.sourceText?.trim() || !item.targetText?.trim()) {
      return
    }

    const trimmedSource = item.sourceText.trim()
    const trimmedTarget = item.targetText.trim()

    // 避免连续重复记录
    if (historyList.value.length > 0) {
      const latest = historyList.value[0]
      if (latest.sourceText === trimmedSource && latest.targetText === trimmedTarget) {
        return
      }
    }

    const newItem: HistoryItem = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      sourceText: trimmedSource,
      targetText: trimmedTarget,
      sourceLang: item.sourceLang,
      targetLang: item.targetLang,
      timestamp: Date.now(),
    }

    historyList.value = [newItem, ...historyList.value.filter(h => h.sourceText !== trimmedSource)].slice(0, MAX_HISTORY_ITEMS)
  }

  function removeHistory(id: string) {
    historyList.value = historyList.value.filter(item => item.id !== id)
  }

  function clearHistory() {
    historyList.value = []
  }

  return {
    historyList,
    addHistory,
    removeHistory,
    clearHistory,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useHistoryStore, import.meta.hot))
}
