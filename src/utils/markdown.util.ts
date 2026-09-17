/**
 * 极简且安全的轻量级 Markdown 渲染器 (针对词典排版与大模型流式输出优化)
 * 零额外依赖，内置 XSS 防护，完美适配暗黑/明亮主题与毛玻璃视觉体系。
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * 处理行内 Markdown 元素（加粗、斜体、行内代码、词性徽标等）
 */
function formatInline(text: string): string {
  return text
    // 行内代码 `` (通常用于音标或关键单词)
    .replace(
      /`([^`]+)`/g,
      '<code class="font-mono text-xs px-1.5 py-0.5 rounded bg-dark-500/10 dark:bg-light-300/10 text-teal-700 dark:text-teal-300 font-medium select-all">$1</code>',
    )
    // 粗体 **text**
    .replace(/\*\*([^*]+)\*\*/g, (_, p1) => {
      // 针对词性标头如 **[n.]** 或 **【名词】** 进行优雅着色与加粗
      if (/^[【\[].*[】\]]$/.test(p1.trim())) {
        return `<strong class="font-semibold text-teal-600 dark:text-teal-400">${p1}</strong>`
      }
      return `<strong class="font-semibold text-dark-900 dark:text-light-100">${p1}</strong>`
    })
    // 粗体 __text__
    .replace(/__([^_]+)__/g, '<strong class="font-semibold text-dark-900 dark:text-light-100">$1</strong>')
    // 斜体 *text* 或 _text_
    .replace(/\*([^*]+)\*/g, '<em class="italic opacity-85">$1</em>')
    .replace(/_([^_]+)_/g, '<em class="italic opacity-85">$1</em>')
}

/**
 * 将 Markdown 字符串渲染为安全的 HTML
 */
export function renderMarkdown(rawText: string): string {
  if (!rawText) return ''

  // 1. 转义 HTML，杜绝 XSS 注入风险
  const escaped = escapeHtml(rawText)

  // 按连续空行切分为段落块
  const paragraphs = escaped.split(/\n{2,}/)

  const renderedBlocks = paragraphs.map((block) => {
    const lines = block.split('\n')

    // 检查是否为标题行
    if (lines.length === 1 && lines[0].startsWith('#')) {
      const line = lines[0]
      if (line.startsWith('#### ')) {
        return `<h4 class="text-sm font-semibold my-1 text-dark-800 dark:text-light-200">${formatInline(line.slice(5))}</h4>`
      }
      if (line.startsWith('### ')) {
        return `<h3 class="text-base font-semibold my-1.5 text-teal-600 dark:text-teal-400">${formatInline(line.slice(4))}</h3>`
      }
      if (line.startsWith('## ')) {
        return `<h2 class="text-lg font-semibold my-2 text-teal-600 dark:text-teal-400">${formatInline(line.slice(3))}</h2>`
      }
      if (line.startsWith('# ')) {
        return `<h1 class="text-xl font-bold my-2 text-dark-900 dark:text-light-100">${formatInline(line.slice(2))}</h1>`
      }
    }

    // 检查是否为水平分割线
    if (lines.length === 1 && /^(?:---|\*\*\*|___)$/.test(lines[0].trim())) {
      return '<hr class="my-3 border-dark-500/10 dark:border-light-300/10" />'
    }

    // 处理列表行与普通文本行
    const renderedLines = lines.map((line) => {
      const trimmed = line.trim()
      if (!trimmed) {
        return '<div class="h-2"></div>'
      }

      // 无序列表: -, *, •
      if (/^[-*•]\s+/.test(trimmed)) {
        const content = trimmed.replace(/^[-*•]\s+/, '')
        return `<div class="flex items-start gap-2 my-1 ps-1">
          <span class="text-teal-500 font-bold select-none text-sm leading-normal">•</span>
          <div class="flex-1 leading-relaxed">${formatInline(content)}</div>
        </div>`
      }

      // 有序列表: 1. 2.
      if (/^\d+\.\s+/.test(trimmed)) {
        const match = trimmed.match(/^(\d+)\.\s+(.*)$/)
        if (match) {
          return `<div class="flex items-start gap-2 my-1 ps-1">
            <span class="text-teal-600 dark:text-teal-400 font-medium select-none text-xs leading-normal">${match[1]}.</span>
            <div class="flex-1 leading-relaxed">${formatInline(match[2])}</div>
          </div>`
        }
      }

      // 引用块: >
      if (/^&gt;\s+/.test(trimmed)) {
        const content = trimmed.replace(/^&gt;\s+/, '')
        return `<blockquote class="border-s-3 border-teal-500/50 ps-3 my-1.5 opacity-85 italic leading-relaxed">${formatInline(content)}</blockquote>`
      }

      // 普通文本行
      return `<div class="my-0.5 leading-relaxed">${formatInline(line)}</div>`
    })

    return `<div class="my-1.5">${renderedLines.join('')}</div>`
  })

  return renderedBlocks.join('')
}
