/**
 * 清洗从 PDF / SCI 论文复制文本时的异常格式：
 * 1. 修复跨行连字符截断的单词 (例如: "approxi-\nmately" -> "approximately")
 * 2. 将段落内的单行硬回车视为空格合并
 * 3. 保护段落之间的真实分段 (两个或更多换行符)
 * 4. 合并连续多个无意义空格与制表符
 */
export function cleanPdfText(text: string): string {
  if (!text) {
    return ''
  }

  return text
    // 1. 修复连字符跨行被截断单词: "method-\nology" -> "methodology"
    .replace(/(\b[a-zA-Z]+)-\s*\r?\n\s*([a-zA-Z]+\b)/g, '$1$2')
    // 2. 将 2 个或更多换行符标记为段落分界
    .replace(/(\r?\n\s*){2,}/g, '\n\n')
    // 3. 对每个段落内部，将单行换行转为空格，并合并连续空格
    .split('\n\n')
    .map((paragraph) => {
      return paragraph
        .replace(/\r?\n/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .trim()
    })
    .filter(Boolean)
    .join('\n\n')
}
