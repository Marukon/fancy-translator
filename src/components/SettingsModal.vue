<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTranslatorStore } from '@/stores/translator'

const open = ref(false)
const { t } = useI18n()

const translatorStore = useTranslatorStore()
const { supportMoreLanguages, dictShowPhonetics, dictShowExamples } = storeToRefs(translatorStore)
</script>

<template>
  <button
    class="settings-trigger-btn"
    :title="t('settings')"
    :aria-label="t('settings')"
    @click="open = true"
  >
    <div class="i-mingcute-settings-3-line text-lg" />
  </button>

  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="settings-backdrop" @click="open = false" />
    </Transition>

    <Transition name="zoom">
      <div v-if="open" class="settings-modal flex flex-col gap-4">
        <div class="flex items-center justify-between pb-3 border-b border-dark-500/10 dark:border-light-300/10">
          <div class="flex items-center gap-2">
            <div class="i-mingcute-settings-3-line text-lg" />
            <h2 class="text-base font-medium">
              {{ t('settings') }}
            </h2>
          </div>
          <button
            class="icon-close-btn"
            :title="t('clear_input')"
            @click="open = false"
          >
            <div class="i-mingcute-close-line text-base" />
          </button>
        </div>

        <div class="flex flex-col gap-3">
          <label class="setting-item flex items-start gap-3 cursor-pointer p-3 rounded-xl border-1 border-dark-500/10 dark:border-light-300/10 hover:bg-dark-500/5 dark:hover:bg-light-300/5 transition">
            <input
              v-model="supportMoreLanguages"
              type="checkbox"
              class="cursor-pointer accent-blue-600 mt-1 w-4 h-4 rounded"
            >
            <div class="flex flex-col gap-0.5">
              <span class="text-sm font-medium text-dark-800 dark:text-light-100">
                {{ t('support_more_languages') }}
              </span>
              <span class="text-xs text-dark-500/70 dark:text-light-400/70 leading-relaxed">
                {{ t('support_more_languages_desc') }}
              </span>
            </div>
          </label>

          <div class="pt-2 pb-1 border-t border-dark-500/10 dark:border-light-300/10">
            <span class="text-xs font-semibold text-dark-400 dark:text-light-400 uppercase tracking-wider">
              📖 {{ t('dict_options_title') }}
            </span>
          </div>

          <label class="setting-item flex items-start gap-3 cursor-pointer p-3 rounded-xl border-1 border-dark-500/10 dark:border-light-300/10 hover:bg-dark-500/5 dark:hover:bg-light-300/5 transition">
            <input
              v-model="dictShowPhonetics"
              type="checkbox"
              class="cursor-pointer accent-teal-600 mt-1 w-4 h-4 rounded"
            >
            <div class="flex flex-col gap-0.5">
              <span class="text-sm font-medium text-dark-800 dark:text-light-100">
                {{ t('dict_show_phonetics') }}
              </span>
              <span class="text-xs text-dark-500/70 dark:text-light-400/70 leading-relaxed">
                {{ t('dict_show_phonetics_desc') }}
              </span>
            </div>
          </label>

          <label class="setting-item flex items-start gap-3 cursor-pointer p-3 rounded-xl border-1 border-dark-500/10 dark:border-light-300/10 hover:bg-dark-500/5 dark:hover:bg-light-300/5 transition">
            <input
              v-model="dictShowExamples"
              type="checkbox"
              class="cursor-pointer accent-teal-600 mt-1 w-4 h-4 rounded"
            >
            <div class="flex flex-col gap-0.5">
              <span class="text-sm font-medium text-dark-800 dark:text-light-100">
                {{ t('dict_show_examples') }}
              </span>
              <span class="text-xs text-dark-500/70 dark:text-light-400/70 leading-relaxed">
                {{ t('dict_show_examples_desc') }}
              </span>
            </div>
          </label>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.settings-trigger-btn {
  --uno: flex items-center justify-center p-1.5 text-lg cursor-pointer select-none;
  --uno: rounded-lg bg-light-400 dark:bg-dark-800;
  --uno: border-1 border-dark/20 dark:border-light/20;
  --uno: shadow-lg shadow-dark/3 dark:shadow-light/3;
  --uno: transition duration-100;

  &:hover {
    --uno: bg-light-700 dark:bg-dark-200;
  }

  &:active {
    --uno: scale-90;
  }
}

.settings-backdrop {
  --uno: fixed inset-0 bg-black/25 dark:bg-black/45 backdrop-blur-xs z-50;
}

.settings-modal {
  --uno: fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2;
  --uno: w-90vw max-w-420px;
  --uno: rounded-2xl bg-light-100/95 dark:bg-dark-800/95 backdrop-blur-xl;
  --uno: border-1 border-dark-500/20 dark:border-light-300/20;
  --uno: shadow-2xl shadow-dark/10 dark:shadow-light/5 p-5 z-51;
}

.icon-close-btn {
  --uno: p-1 rounded-lg opacity-70 hover:opacity-100 transition cursor-pointer;
  --uno: hover:bg-dark-500/10 dark:hover:bg-light-300/10;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.zoom-enter-active,
.zoom-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.zoom-enter-from,
.zoom-leave-to {
  opacity: 0;
  transform: translate(-50%, -48%) scale(0.96);
}
</style>
