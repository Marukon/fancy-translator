# Fancy Translator

[简体中文](README.md) | [English](README_en.md)

Fancy Translator 是一个**完全在浏览器本地运行**的翻译工具。它基于浏览器内置的 Translator API / LanguageDetector API（端侧模型）提供快速、私密、可离线的翻译服务 —— **无需 API Key、无需服务器，文本不离开你的设备**。

> 本项目基于优秀的开源项目 [daidr/fancy-translator](https://github.com/daidr/fancy-translator) 二次开发。
>
> 当前仓库是面向 **Microsoft Edge 和 Chrome 适配**、**三种工作模式（自动 / 翻译 / 词典）**、**PDF 与论文粘贴清洗**、**历史记录抽屉**等方向深度改造的版本。

---

## 界面速览

| 模块 | 说明 |
| --- | --- |
| 语言工具栏 | 源语言自动检测 + 目标语言 + 工作模式切换 |
| 输入面板 | 粘贴 / 清空 / 清洗换行，支持"粘贴前自动清洗" |
| 结果面板 | 流式输出、字数与字号统计、耗时、复制与朗读 |
| 词典模式 | 结构化词条渲染（词性 / 音标 / 释义） |
| 历史记录抽屉 | 自动保存、再次取用、复制、删除（最多 60 条） |

---

## 功能特性

### 1. 浏览器原生翻译

- 使用 `Translator` / `LanguageDetector` API，**语言检测与双向翻译**全部在本地设备运行。
- 同时兼容 **`zh`** 与 **`zh-Hans`** 两种语言代码，通过能力探测自动协商最匹配的语言对。
- 同时兼容旧版 `capabilities()` 与新版 `availability()` 接口，以及 `ai.translator` / `translation.createTranslator` 等命名空间。
- 所有实例创建、能力探测、实例销毁调用均做了**防御性保护**，在各类 Edge / Chrome 版本上不会因 API 缺失而崩溃。

### 2. 三种工作模式

| 模式 | 触发条件 | 行为 |
| --- | --- | --- |
| **自动模式** | 默认 | 单字、单词、短语走词典解析；长句、段落走全文翻译 |
| **翻译模式** | 手动选择 | 始终全文直译，不套用词典格式 |
| **词典模式** | 手动选择 | 无论长短均按词典格式解析 |

切换模式或调整词典选项时，会**立即对当前输入重新翻译**，无需重新输入。

### 3. 词典模式

- 本地词典词条识别规则：不含换行、不含断句标点、长度 ≤ 50、外文单词数 ≤ 4 或中文字符数 ≤ 8。
- 当浏览器 Prompt API（端侧 AI）可用时优先用于结构化解析，否则自动降级为"翻译引擎 + 词典排版合成"。
- 针对英文单词在客户端获取音标与词性，再使用浏览器翻译引擎逐条翻译释义。
- 结果面板支持 Markdown 结构渲染（标题 / 加粗 / 列表 / 行内代码 / 引用块）。
- **开关严格隔离**：音标输出与双语例句默认关闭，并在提示词层与输出层做双重过滤，确保禁用内容不会漏出。

### 4. PDF / 论文粘贴清洗

- 修复跨行连字符截断的单词（`approxi-\nmately` → `approximately`）。
- 将段落内部的单行硬回车视为空格合并，同时保留真实的段落分段。
- 合并连续多个空格与制表符。
- 支持**手动清洗**与**自动清洗（粘贴时触发）**，开启自动清洗后自动隐藏手动按钮，避免重复操作。

### 5. Edge 与多浏览器适配

> 这是本项目改造的重点方向之一。

- **语言代码兼容**：在 `zh` 与 `zh-Hans` 之间做候选探测，谁可用就用谁。
- **可用性状态兼容**：同时识别 `available` / `readily` / `downloadable` / `downloading` / `after-download` / `unavailable` / `no`。
- **API 命名空间兼容**：探测 `translation` / `translator` 等多种命名空间与两种工厂方法名。
- **流式读取兼容**：`translateStreaming()` 的返回值同时支持 `ReadableStream`、异步迭代器与纯字符串三种形态，覆盖不同浏览器版本的实现差异。
- **模型预热**：页面加载后台预热 `en → zh-Hans` 翻译器与语言检测器，首次翻译近乎瞬时完成。
- **PWA 支持**：已配置 `manifest`、图标与应用名，可直接从 Edge 地址栏安装为桌面应用（应用 → 将此站点作为应用安装）。

> Microsoft Edge 内置了"翻译"端侧模型能力，Chrome 138+ 目前同样支持。若浏览器不支持这些 API，页面会给出"浏览器不支持"的明确提示，而不是白屏。

### 6. 交互体验

- **语言互换**与**内容互换**：前者交换源/目标语言设置，后者把译文回填到输入框，一键完成回环翻译。
- **历史记录抽屉**：翻译完成后自动保存，去重并保留最近 60 条，支持一键回填、复制与删除。
- **朗读与复制**：基于 Web Speech API，传入正确的源/目标语言，切换时自动停止上一次播放。
- **亮色 / 暗色主题**：支持亮色、暗色与跟随系统三种模式，并同步 `<meta name="theme-color">`。
- **国际化与 RTL**：界面提供 zh-CN / en-US，支持 RTL 语言自动设置 `dir="rtl"`。
- **响应式布局**：桌面端左右分栏，移动端上下堆叠，互换按钮在中置与底置间自动切换。

### 7. 部署与工程化

- `edgeone.json`：静态资源 30 天 immutable 缓存，HTML 与 `/sw.js` 强制 `no-cache`，并设置 `X-Robots-Tag: noindex` 保护隐私。
- 构建基于 Vite（rolldown-vite），产物输出至 `dist/`。
- 代码质量：Oxlint + ESLint + `vue-tsc` 类型检查，并配置 commitlint 与 lint-staged 提交钩子。

---

## 浏览器支持

| 浏览器 | 版本要求 | 说明 |
| --- | --- | --- |
| **Microsoft Edge** | 138+ | 支持翻译与语言检测，推荐使用 |
| Google Chrome | 138+（稳定版） | 同样支持 |
| 其他 Chromium 内核浏览器 | — | 取决于是否提供内置翻译模型 API |

若端侧模型尚未下载，首次使用时页面会显示下载进度；下载完成后即可离线使用。

---

## 技术栈

| 层次 | 技术 |
| --- | --- |
| 框架 | [Vue 3](https://vuejs.org/) + `<script setup>` + TypeScript |
| 构建 | [Vite](https://vite.dev/)（rolldown-vite） |
| 状态管理 | [Pinia](https://pinia.vuejs.org/) |
| UI 基元 | [Reka UI](https://reka-ui.com/) |
| 样式 | [UnoCSS](https://unocss.dev/)（Wind4 preset）+ SCSS |
| 国际化 | [vue-i18n](https://vue-i18n.intlify.dev/) |
| 工具库 | [VueUse](https://vueuse.org/) |
| PWA | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) |
| 代码检查 | [Oxlint](https://oxc.rs/docs/guide/usage/linter) + [ESLint](https://eslint.org/) |

---

## 目录结构

```
├─ src/
│  ├─ assets/                 # 基础样式、网格背景、字体
│  ├─ components/
│  │  ├─ base/                # DouButton / DouSelect / DouProgress 等基础组件
│  │  ├─ ColorModeSwitcher.vue
│  │  ├─ CopyButton.vue
│  │  ├─ HistoryDrawer.vue    # 历史记录抽屉
│  │  ├─ LangSwitcher.vue
│  │  ├─ ModeSelect.vue       # 自动 / 翻译 / 词典 模式切换
│  │  ├─ SettingsModal.vue    # 设置：更多语言、词典选项
│  │  ├─ SourceSelect.vue
│  │  ├─ SpeechButton.vue
│  │  └─ TargetSelect.vue
│  ├─ composables/            # useDarkMode、useDisplayName
│  ├─ constants/lang.ts       # 完整语言列表（40+ 语种）
│  ├─ locales/                # zh-CN / en-US 文案
│  ├─ pages/index.vue         # 翻译主页面
│  ├─ stores/
│  │  ├─ translator.ts        # 翻译引擎、语言检测、模式调度、模型预热
│  │  ├─ history.ts           # 历史记录
│  │  └─ page.ts              # 主题 / 语言 / RTL 方向
│  ├─ types/                  # Translator / LanguageDetector API 类型声明
│  └─ utils/
│     ├─ dict.util.ts         # 词典引擎：词条判定、提示词、输出过滤
│     ├─ markdown.util.ts     # 轻量、防 XSS 的 Markdown 渲染器
│     ├─ text.util.ts         # PDF 文本清洗
│     └─ lang.util.ts         # 语言标签与 locale 匹配
├─ plugins/html-plugin/       # 构建期注入统计脚本
├─ public/                    # favicon / PWA 图标
├─ edgeone.json               # EdgeOne Pages 缓存与响应头规则
└─ vite.config.ts
```

---

## 开发

### 环境要求

- [Bun](https://bun.sh/)（包管理器与运行时）
- 支持内置翻译模型的浏览器（Edge 138+ / Chrome 138+）

### 安装依赖

```sh
bun i
```

### 启动 HMR 开发服务器

```sh
bun dev
```

### 产物构建

```sh
bun run build
```

### 预览构建产物

```sh
bun preview
```

### 类型检查

```sh
bun run type-check
```

### 将 ESLint 迁移到 Oxlint

> 每次 ESLint 配置更新后都需要运行。

```sh
bun lint:migrate
```

### 使用 ESLint 和 Oxlint 进行代码检查

```sh
bun lint
```

---

## 开源协议

[MIT License](LICENSE)

---

## 致谢

本项目站在以下开源工作的肩膀上，由衷感谢它们的作者与贡献者。

### 上游项目

- **[daidr/fancy-translator](https://github.com/daidr/fancy-translator)** — 由 [DAIDR](https://github.com/daidr) 创建。本项目是它的衍生与增强版，整体架构、视觉风格与"浏览器原生翻译"思路均来自上游项目，原作者的版权声明保留在 [LICENSE](LICENSE) 中。

### 上游项目致谢并使用的项目

上游仓库由以下开源项目构建（见其 `package.json`），本项目同样继续依赖并受益于它们：

| 项目 | 作用 |
| --- | --- |
| [Vue.js](https://vuejs.org/) | 渐进式前端框架 |
| [Vite](https://vite.dev/) / [rolldown-vite](https://github.com/rolldown/rolldown) | 构建工具 |
| [Pinia](https://pinia.vuejs.org/) | 状态管理 |
| [VueUse](https://vueuse.org/) | 组合式工具集 |
| [Reka UI](https://reka-ui.com/) | 无样式 UI 基元 |
| [UnoCSS](https://unocss.dev/) | 原子化 CSS 引擎 |
| [vue-i18n](https://vue-i18n.intlify.dev/) | 国际化 |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | PWA / Service Worker |
| [Oxlint](https://oxc.rs/docs/guide/usage/linter) / [Oxc](https://oxc.rs/) | 代码检查 |
| [ESLint](https://eslint.org/) + [@antfu/eslint-config](https://github.com/antfu/eslint-config) | 代码规范 |
| [MingCute Icon](https://github.com/Richard9394/MingCute) | 图标集 |
| [SN Pro](https://github.com/supernotes/sn-pro) | 字体 |
| [commitlint](https://commitlint.js.org/) / [lint-staged](https://github.com/lint-staged/lint-staged) / [bun-git-hooks](https://github.com/tsconfig/bun) | 提交规范与 Git 钩子 |

### 浏览器能力

- MDN Web Docs — [Translator API](https://developer.mozilla.org/en-US/docs/Web/API/Translator) 与 [LanguageDetector API](https://developer.mozilla.org/en-US/docs/Web/API/LanguageDetector) 文档，感谢浏览器厂商将端侧翻译能力带到 Web 平台。

再次感谢以上所有项目的作者与维护者。

---

## 赞助者们

### 上游赞助者

> 感谢你的支持！上游项目通过 GitHub Sponsors / Buy Me a Coffee / Patreon / 爱发电 接受赞助。

<picture>
  <img src="https://github.com/daidr/static/blob/main/sponsors.png?raw=true" alt="Sponsors" width="100%">
</picture>
