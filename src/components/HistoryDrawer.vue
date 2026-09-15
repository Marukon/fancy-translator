<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DouButton from '@/components/base/DouButton.vue'
import { useDisplayName } from '@/composables/useDisplayName'
import { type HistoryItem, useHistoryStore } from '@/stores/history'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  select: [item: HistoryItem]
}>()

const { t } = useI18n()
const historyStore = useHistoryStore()
const { historyList } = storeToRefs(historyStore)
const displayName = useDisplayName()

const copiedId = ref<string | null>(null)

function handleSelect(item: HistoryItem) {
  emit('select', item)
  open.value = false
}

async function copyText(id: string, text: string) {
  await navigator.clipboard.writeText(text)
  copiedId.value = id
  setTimeout(() => {
    if (copiedId.value === id) {
      copiedId.value = null
    }
  }, 1500)
}

function formatTime(timestamp: number) {
  const diff = Date.now() - timestamp
  if (diff < 60 * 1000) {
    return t('just_now')
  }
  if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))} ${t('minutes_ago')}`
  }
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer-backdrop">
      <div v-if="open" class="drawer-backdrop" @click="open = false" />
    </Transition>

    <Transition name="drawer-slide">
      <div v-if="open" class="drawer-panel flex flex-col">
        <div class="flex items-center justify-between pb-3 border-b border-dark-500/10 dark:border-light-300/10">
          <div class="flex items-center gap-2">
            <div class="i-mingcute-history-line text-xl" />
            <h2 class="text-lg font-medium">
              {{ t('history') }}
            </h2>
            <span class="text-xs px-2 py-0.5 rounded-full bg-dark-500/10 dark:bg-light-300/10 opacity-70">
              {{ historyList.length }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <DouButton
              v-if="historyList.length > 0" small
              class="text-xs text-red-500! hover:bg-red-500/10!"
              @click="historyStore.clearHistory"
            >
              {{ t('clear_all') }}
            </DouButton>
            <DouButton small @click="open = false">
              <div class="i-mingcute-close-line text-sm" />
            </DouButton>
          </div>
        </div>

        <div v-if="historyList.length === 0" class="flex-grow flex flex-col items-center justify-center text-sm opacity-50 gap-2">
          <div class="i-mingcute-empty-page-line text-3xl" />
          {{ t('no_history') }}
        </div>

        <div v-else class="flex-grow overflow-y-auto pt-3 flex flex-col gap-3 min-h-0 pe-1">
          <div
            v-for="item in historyList" :key="item.id"
            class="history-card f-ring group cursor-pointer"
            @click="handleSelect(item)"
          >
            <div class="flex items-center justify-between text-xs opacity-60 mb-1.5">
              <span class="font-mono">
                {{ displayName.getLabel(item.sourceLang) }} &rarr; {{ displayName.getLabel(item.targetLang) }}
              </span>
              <span>{{ formatTime(item.timestamp) }}</span>
            </div>

            <div class="text-sm font-medium line-clamp-2 mb-1.5 text-dark-800 dark:text-light-200">
              {{ item.sourceText }}
            </div>

            <div class="text-xs line-clamp-2 opacity-75 text-dark-600 dark:text-light-400">
              {{ item.targetText }}
            </div>

            <div class="flex items-center justify-end gap-1.5 mt-2 pt-2 border-t border-dark-500/10 dark:border-light-300/10" @click.stop>
              <button
                class="icon-btn"
                :title="t('copy')"
                @click="copyText(item.id, item.targetText)"
              >
                <div v-if="copiedId === item.id" class="i-mingcute-check-line text-green-500" />
                <div v-else class="i-mingcute-copy-line" />
              </button>
              <button
                class="icon-btn hover:text-red-500!"
                :title="t('delete')"
                @click="historyStore.removeHistory(item.id)"
              >
                <div class="i-mingcute-delete-2-line" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.drawer-backdrop {
  --uno: fixed inset-0 bg-black/25 dark:bg-black/45 backdrop-blur-xs z-50;
}

.drawer-panel {
  --uno: fixed top-0 right-0 bottom-0 w-full max-w-420px;
  --uno: bg-light-200/90 dark:bg-dark-800/90 backdrop-blur-xl;
  --uno: border-s-1 border-dark-500/15 dark:border-light-300/15;
  --uno: p-4 shadow-2xl z-51;
}

.history-card {
  --uno: p-3 rounded-xl transition duration-150;
  --uno: bg-white/40 dark:bg-dark-700/40 border-1 border-dark-500/10 dark:border-light-300/10;
  --uno: hover:bg-white/70 dark:hover:bg-dark-700/70 hover:shadow-md;
}

.icon-btn {
  --uno: p-1.5 rounded-lg text-xs opacity-70 hover:opacity-100 transition;
  --uno: hover:bg-dark-500/10 dark:hover:bg-light-300/10 cursor-pointer;
}

.drawer-backdrop-enter-active,
.drawer-backdrop-leave-active {
  transition: opacity 0.2s ease;
}

.drawer-backdrop-enter-from,
.drawer-backdrop-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}
</style>
