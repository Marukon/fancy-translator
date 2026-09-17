# Fancy Translator

[简体中文](README.md) | [English](README_en.md)

Fancy Translator is a translation tool that runs **entirely in your browser**. Based on the browser's built-in Translator API / LanguageDetector API (*on-device models*), it provides fast, private, offline-capable translation — **no API key, no server, no text ever leaving your device**.

> Built on top of the excellent open-source project [daidr/fancy-translator](https://github.com/daidr/fancy-translator).
>
> This repository is a fork/deeply modified edition focused on **Microsoft Edge adaptation**, a **three-mode workflow (Auto / Translate / Dictionary)**, **PDF & academic paper paste cleaning**, and a **history drawer**.

---

## Preview

| Module | Description |
| --- | --- |
| Language toolbar | Auto-detect source language + target language + work-mode switcher |
| Input panel | Paste / clear / clean line breaks, one-click "clean before paste" |
| Result panel | Streaming output, word count/font size stats, timing, copy & read-aloud |
| Dictionary mode | Structured entry rendering (part of speech / phonetic / definition) |
| History drawer | Auto-save, re-pick, copy, delete (up to 60 entries) |

---

## Features

### 1. Browser-native translation

- Uses `Translator` / `LanguageDetector` API, with **language detection + bidirectional translation** running locally on device.
- Supports both the **`zh`** and **`zh-Hans`** language codes, and automatically negotiates the best matching pair by capability probing.
- Supports the older `capabilities()` and the newer `availability()` APIs simultaneously, plus `ai.translator` / `translation.createTranslator` style namespaces.
- All instance creation, capability probing and destruction calls are **defensively guarded** so third-party Edge/Chrome versions will not crash the page.

### 2. Three work modes

| Mode | Trigger condition | Behavior |
| --- | --- | --- |
| **Auto** | Default | Entries (words/short phrases) go to dictionary analysis; sentences/paragraphs go to full-text translation |
| **Translate** | Manual | Always full-text translation, dictionary formatting is never used |
| **Dictionary** | Manual | Always dictionary parsing, even for long text |

Switching modes or toggling dictionary options **re-runs the translation** on the current input immediately, with no need to retype.

### 3. Dictionary mode

- Local dictionary recognition rules: no line breaks, no sentence-ending punctuation, ≤ 50 characters, ≤ 4 foreign words or ≤ 8 Chinese characters.
- When browser Prompt API (on-device AI) is available, it is used for structured parsing; otherwise it automatically degrades to translation-engine + dictionary formatting.
- For English words it fetches phonetics and parts of speech client-side, then translates each definition with the browser translation engine.
- Renders Markdown structure (headings / bold / lists / inline code / blockquotes) in the result panel.
- **Strict switch isolation**: phonetic output and bilingual example sentences are both off by default, and enforced at the prompt layer plus filtered at the output layer, so restricted content will never leak through.

### 4. PDF / paper paste cleaning

- Repairs hyphenated words split across lines (`approxi-\nmately` → `approximately`).
- Treats single hard line breaks inside a paragraph as spaces, while preserving real paragraph breaks.
- Collapses duplicated spaces and tabs.
- Supports both **manual clean** and **auto clean on paste**, and when auto clean is on the manual button is hidden automatically to avoid duplicate actions.

### 5. Edge & multi-browser adaptation

> This is one of the main focuses of this fork.

- **Language code compatibility**: probes candidates between `zh` and `zh-Hans`; whichever pair the current browser reports as available wins.
- **Availability status compatibility**: recognizes `available` / `readily` / `downloadable` / `downloading` / `after-download` / `unavailable` / `no` at once.
- **API namespace compatibility**: probes `Translation`-like namespaces (translation / translator) and both factory method names.
- **Stream reading compatibility**: `translateStreaming()` results are consumed as `ReadableStream`, async iterator, or plain string, covering implementation differences across browser versions.
- **Model preload**: after page load, the `en → zh-Hans` translator and the language detector are warmed up in the background, making the first translation nearly instant.
- **PWA support**: `manifest`, icons and app name are all configured, so it can be installed to desktop from the Edge address bar (App → Install this site as an app).

> Microsoft Edge has a built-in "Translator" / translation model capability; Chrome 138+ currently supports it as well. If your browser does not support these APIs, the page will show a "browser not supported" hint instead of a blank screen.

### 6. Interaction experience

- **Language swap** vs. **Content swap**: the former swaps source/target language settings, the latter puts the translation result back into the input box, so you can do round-trip translation in one click.
- **History drawer**: auto-saves completed translations, deduplicates, keeps the latest 60 entries, supports one-click refill, copy and delete.
- **Read aloud & copy**: Web Speech API based, with the correct source/target language passed in, and prior playback is stopped automatically when switching.
- **Light / dark theme**: supports light, dark and follow-system modes, and syncs `<meta name="theme-color">`.
- **Internationalization & RTL**: zh-CN / en-US UI, with automatic `dir="rtl"` setting for RTL languages.
- **Responsive layout**: side-by-side on desktop, stacked on mobile, and the swap button moves between center and bottom accordingly.

### 7. Deployment & engineering

- `edgeone.json`: 30-day immutable cache for static assets, `no-cache` for HTML and `/sw.js`, and `X-Robots-Tag: noindex` for privacy.
- Build is based on Vite (rolldown-vite) and outputs to `dist/`.
- Code quality: Oxlint + ESLint + `vue-tsc` type-checking, together with commitlint and lint-staged git hooks.

---

## Browser support

| Browser | Requirement | Notes |
| --- | --- | --- |
| **Microsoft Edge** | 138+ | Translation and language detection are both supported; recommended |
| Google Chrome | 138+ (stable) | Also supported |
| Other Chromium-based | — | Depends on whether the built-in translation model API is available |

If the model is not downloaded yet, the first use will download it (progress is shown on the page). After that it works offline.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | [Vue 3](https://vuejs.org/) + `<script setup>` + TypeScript |
| Build | [Vite](https://vite.dev/) (rolldown-vite) |
| State | [Pinia](https://pinia.vuejs.org/) |
| UI primitives | [Reka UI](https://reka-ui.com/) |
| Styling | [UnoCSS](https://unocss.dev/) (Wind4 preset) + SCSS |
| i18n | [vue-i18n](https://vue-i18n.intlify.dev/) |
| Utilities | [VueUse](https://vueuse.org/) |
| PWA | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) |
| Lint | [Oxlint](https://oxc.rs/docs/guide/usage/linter) + [ESLint](https://eslint.org/) |

---

## Project structure

```
├─ src/
│  ├─ assets/                 # Base styles, grid background, fonts
│  ├─ components/
│  │  ├─ base/                # DouButton / DouSelect / DouProgress and other primitives
│  │  ├─ ColorModeSwitcher.vue
│  │  ├─ CopyButton.vue
│  │  ├─ HistoryDrawer.vue    # History drawer
│  │  ├─ LangSwitcher.vue
│  │  ├─ ModeSelect.vue       # Auto / Translate / Dictionary mode switcher
│  │  ├─ SettingsModal.vue    # Settings: more languages, dictionary options
│  │  ├─ SourceSelect.vue
│  │  ├─ SpeechButton.vue
│  │  └─ TargetSelect.vue
│  ├─ composables/            # useDarkMode, useDisplayName
│  ├─ constants/lang.ts       # Full language list (40+ languages)
│  ├─ locales/                # zh-CN / en-US copy
│  ├─ pages/index.vue         # Main translation page
│  ├─ stores/
│  │  ├─ translator.ts        # Translation engine, language detection, modes, preload
│  │  ├─ history.ts           # History records
│  │  └─ page.ts              # Theme / locale / RTL direction
│  ├─ types/                  # Translator / LanguageDetector API type declarations
│  └─ utils/
│     ├─ dict.util.ts         # Dictionary engine: candidate detection, prompt, output filtering
│     ├─ markdown.util.ts     # Lightweight XSS-safe Markdown renderer
│     ├─ text.util.ts         # PDF text cleaning
│     └─ lang.util.ts         # Language label and locale matching
├─ plugins/html-plugin/       # Inject analytics script at build time
├─ public/                    # favicon / PWA icons
├─ edgeone.json               # EdgeOne Pages cache & header rules
└─ vite.config.ts
```

---

## Development

### Requirements

- [Bun](https://bun.sh/) (package manager and runtime)
- A browser that supports the built-in translation model (Edge 138+ / Chrome 138+)

### Install dependencies

```sh
bun i
```

### Start the HMR dev server

```sh
bun dev
```

### Build for production

```sh
bun run build
```

### Preview the production build

```sh
bun preview
```

### Type check

```sh
bun run type-check
```

### Migrate ESLint to Oxlint

> Needs to be run after any ESLint configuration change.

```sh
bun lint:migrate
```

### Lint with ESLint and Oxlint

```sh
bun lint
```

---

## License

[MIT License](LICENSE)

---

## Acknowledgements

This project stands on the shoulders of the following open-source works. Many thanks to their authors and contributors.

### Upstream project

- **[daidr/fancy-translator](https://github.com/daidr/fancy-translator)** — created by [DAIDR](https://github.com/daidr). This project is a fork and enhancement of it; the overall architecture, visual style and browser-native translation approach all come from the upstream project. The original author's copyright notice is retained in the [LICENSE](LICENSE).

### Projects acknowledged by the upstream project

The upstream repository is built with the following open-source projects (listed in its `package.json`), and this fork continues to depend on and benefit from them:

| Project | Role |
| --- | --- |
| [Vue.js](https://vuejs.org/) | Progressive front-end framework |
| [Vite](https://vite.dev/) / [rolldown-vite](https://github.com/rolldown/rolldown) | Build tool |
| [Pinia](https://pinia.vuejs.org/) | State management |
| [VueUse](https://vueuse.org/) | Composable utilities |
| [Reka UI](https://reka-ui.com/) | Headless UI primitives |
| [UnoCSS](https://unocss.dev/) | Atomic CSS engine |
| [vue-i18n](https://vue-i18n.intlify.dev/) | Internationalization |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | PWA / service worker |
| [Oxlint](https://oxc.rs/docs/guide/usage/linter) / [Oxc](https://oxc.rs/) | Linter |
| [ESLint](https://eslint.org/) + [@antfu/eslint-config](https://github.com/antfu/eslint-config) | Linting & code style |
| [MingCute Icon](https://github.com/Richard9394/MingCute) | Icon set |
| [SN Pro](https://github.com/supernotes/sn-pro) | Font |
| [commitlint](https://commitlint.js.org/) / [lint-staged](https://github.com/lint-staged/lint-staged) / [bun-git-hooks](https://github.com/tsconfig/bun) | Commit convention & git hooks |

### Browser capabilities

- MDN Web Docs — [Translator API](https://developer.mozilla.org/en-US/docs/Web/API/Translator) and [LanguageDetector API](https://developer.mozilla.org/en-US/docs/Web/API/LanguageDetector) references, thanks to the browser vendors for bringing on-device translation to the web.

Thanks again to every author and maintainer of the projects above.

---

## Sponsors

### Upstream sponsors

> Thank you for your support! The upstream project accepts sponsorship via GitHub Sponsors / Buy Me a Coffee / Patreon / Afdian.

<picture>
  <img src="https://github.com/daidr/static/blob/main/sponsors.png?raw=true" alt="Sponsors" width="100%">
</picture>
