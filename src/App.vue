<script setup lang="ts">
import ColorModeSwitcher from './components/ColorModeSwitcher.vue'
import LangSwitcher from './components/LangSwitcher.vue'
import Logo from './components/logo.vue'
import ReloadPrompt from './components/ReloadPrompt.vue'
import SettingsModal from './components/SettingsModal.vue'
import { useDarkMode } from './composables/useDarkMode'

useDarkMode()
</script>

<template>
  <header class="select-none flex justify-between items-center">
    <h1 class="text-xl md:text-3xl text-dark-500/80 dark:text-light-50/80 flex items-center gap-0.5em">
      <div
        class="p-1.5 rounded-lg ring-1 text-current ring-dark-500/20 dark:ring-light-300/20 bg-white/30 dark:bg-dark-700/30 backdrop-blur-md shadow-xl shadow-dark-500/8 dark:shadow-light-500/8"
      >
        <Logo :stroke-width="1.25" class="text-0.875em" />
      </div>
      Fancy Translator
    </h1>
    <div class="flex gap-2 items-center">
      <SettingsModal />
      <ColorModeSwitcher />
      <LangSwitcher />
    </div>
  </header>
  <main class="flex-grow">
    <router-view />
  </main>
  <footer class="flex flex-col items-end gap-1 select-none py-4">
    <p class="whitespace-nowrap text-xs md:text-sm text-pink-500 dark:text-pink-400 font-medium">
      Lovingly created by Bubu for Yier. ❤️
    </p>
    <p class="whitespace-nowrap text-xs md:text-sm opacity-60">
      Based on open-source project by <a
        href="https://github.com/daidr/fancy-translator" target="_blank"
        rel="noopener" class="underline hover:opacity-100"
      >DAIDR</a>
    </p>
  </footer>
  <ReloadPrompt />
</template>

<style scoped></style>
