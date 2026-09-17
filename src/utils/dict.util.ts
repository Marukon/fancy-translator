/**
 * 浏览器端词典解析与智能单字识别引擎 (Browser-Powered Dictionary Engine)
 * 参照“混元软件开发”的模式设计（自动模式、翻译模式、词典模式），
 * 核心功能完全基于浏览器端能力与浏览器翻译引擎运行，无需任何外部大模型服务。
 */

export interface DictionaryOptions {
  showPhonetics?: boolean
  showExamples?: boolean
  targetLangName?: string
  signal?: AbortSignal
  onChunk?: (chunk: string) => void
  translatorTranslate?: (text: string) => Promise<string>
}

/**
 * 判断输入文本是否满足单字、单词或简短词组的特征（适合自动触发词典查询）
 * 规则（严格对标“混元软件开发”规范）：
 * 1. 判空；
 * 2. 包含硬回车换行（\r/\n）则判定为段落，非单词；
 * 3. 包含标点符号（,.。!?！？;；:：）判定为短语或句子，非单词；
 * 4. 长度超过 30 个字符不按单字查词；
 * 5. 外文：严格单个单词（words 长度为 1 且不包含空格），输入更多单词或空格时自动切回翻译模式；
 * 6. 中文：严格 1~4 个汉字（如单字、词语、四字成语）且无空格，输入更多汉字或空格时自动切回翻译模式。
 */
export function isDictionaryCandidate(text: string): boolean {
  if (!text) return false
  const clean = text.trim()
  if (!clean) return false

  if (clean.includes('\n') || clean.includes('\r')) return false
  if (/[,.。!?！？;；:：]/.test(clean)) return false
  if (clean.length > 30) return false

  const words = clean.match(/[a-zA-Z0-9'-]+/g) || []
  const cjkChars = clean.match(/[\u4e00-\u9fff]/g) || []

  // 中文单字/词语/成语：1~4 个汉字且不含空格
  if (cjkChars.length > 0 && cjkChars.length <= 4 && words.length === 0 && !clean.includes(' ')) {
    return true
  }

  // 西文/外文单词：严格单个单词（words 长度为 1 且不含空格）
  if (words.length === 1 && cjkChars.length === 0 && !clean.includes(' ')) {
    return true
  }

  return false
}

/**
 * 严格按照设置过滤词典输出（双重保底兜底）
 */
export function filterDictOutput(
  text: string,
  showPhonetics: boolean,
  showExamples: boolean,
): string {
  if (!text) return ''
  let lines = text.split('\n')

  if (!showExamples) {
    const filtered: string[] = []
    let inExampleBlock = false

    for (const line of lines) {
      const trimmed = line.trim()
      // 匹配“例句”、“双语例句”、“Example”、“Examples”作为标题或小节开头
      if (
        /^(?:[-*•#>\s]*)?(?:[【\[(]?\s*(?:双语)?(?:实用)?例句\s*[】\])]?|Examples?)[：:]/i.test(trimmed)
        || /^(?:[-*•#>\s]*)?(?:例\s*\d*|eg\.|e\.g\.)[：:]/i.test(trimmed)
      ) {
        inExampleBlock = true
        continue
      }

      // 如果进入了例句块，遇到后续新的词性分类（如 [名词]、[动词]、[n.] 等），退出例句块
      if (
        inExampleBlock
        && /^(?:[-*•#>\s]*)?(?:\[[a-zA-Z.]+\]|[【\[](?:名词|动词|形容词|副词|代词|介词|连词|感叹词|释义)[】\]])/i.test(trimmed)
      ) {
        inExampleBlock = false
      }

      if (!inExampleBlock) {
        // 过滤单行包含“*例句: ...*”或“• 例句: ...”
        if (!/^(?:[-*•\s]*)?(?:[【\[(]?\s*(?:双语)?例句\s*[】\])]?|Examples?)[：:]/i.test(trimmed)) {
          filtered.push(line)
        }
      }
    }
    lines = filtered
  }

  if (!showPhonetics) {
    lines = lines.filter((line) => {
      const trimmed = line.trim()
      if (
        /^(?:[-*•#>\s]*)?(?:[【\[(]?\s*(?:英美)?(?:音标|读音|发音)\s*[】\])]?|Phonetics?|Pronunciation)[：:]/i.test(trimmed)
      ) {
        return false
      }
      // 过滤类似 "[美] /.../  [英] /.../" 的独立音标行
      if (
        /^(?:[-*•\s]*)?(?:(?:\[?(?:美|英|UK|US)\]?|\/|\[)[\s\S]*(?:\/|\])\s*)+$/.test(trimmed)
        && trimmed.length < 40
        && !trimmed.includes('：')
        && !trimmed.includes(':')
      ) {
        return false
      }
      return true
    })
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n')
}

/**
 * 构建提示词（用于浏览器内置 AI）
 */
function buildBrowserDictPrompt(
  text: string,
  targetLangName: string = '中文',
  showPhonetics: boolean = false,
  showExamples: boolean = false,
): string {
  const rules: string[] = [
    `请将以下词语作为词典词条进行权威解析，列出其常用词性和${targetLangName}释义。`,
  ]

  if (showPhonetics) {
    rules.push('- 音标要求：请在词条后标明英美音标或标准读音。')
  }
  else {
    rules.push('- 音标要求：严格禁止输出任何音标或注音，不需要发音标注。')
  }

  if (showExamples) {
    rules.push('- 例句要求：请附带1~2条典型地道实用的双语例句。')
  }
  else {
    rules.push('- 例句要求：严格禁止输出任何例句！绝对不要输出任何双语例句、用法例句或示例句子。')
  }

  rules.push('- 格式要求：层次分明、极简专业，严禁任何前言废话、开场白或多余说明，直接输出条目。')

  return `${rules.join('\n')}\n\n待解析词条：\n${text.trim()}`
}

/**
 * 尝试通过浏览器原生 Chrome Prompt API (Gemini Nano) 解析
 */
async function streamFromBrowserAi(
  prompt: string,
  options: DictionaryOptions,
): Promise<string> {
  const aiObj = (globalThis as any).ai
  const lm = aiObj?.languageModel || (globalThis as any).LanguageModel
  if (!lm || typeof lm.create !== 'function') {
    throw new Error('未启用浏览器端 Prompt API')
  }

  const session = await lm.create({
    systemPrompt: '你是一个严格执行用户格式限制的双语词典解析引擎。当用户禁止输出例句时严禁包含任何例句，当用户禁止输出音标时严禁包含音标。仅输出精炼的词性与释义。',
    signal: options.signal,
  })

  let fullText = ''
  const emitChunk = (text: string) => {
    const filtered = filterDictOutput(
      text,
      options.showPhonetics ?? false,
      options.showExamples ?? false,
    )
    options.onChunk?.(filtered)
  }

  if (typeof session.promptStreaming === 'function') {
    const stream = session.promptStreaming(prompt, { signal: options.signal })
    for await (const chunk of stream) {
      if (options.signal?.aborted) break
      if (typeof chunk === 'string') {
        // 关键修复：Chrome Prompt API 在部分版本下返回增量 delta，在部分版本下返回全量文本
        // 如果 chunk 以已有 fullText 开头且更长，则为全量；否则为增量追加，避免文字被逐字顶替消失
        if (chunk.startsWith(fullText) && chunk.length >= fullText.length) {
          fullText = chunk
        }
        else {
          fullText += chunk
        }
        emitChunk(fullText)
      }
    }
  }
  else {
    fullText = await session.prompt(prompt, { signal: options.signal })
    emitChunk(fullText)
  }

  session.destroy?.()

  return filterDictOutput(
    fullText,
    options.showPhonetics ?? false,
    options.showExamples ?? false,
  )
}

/**
 * 浏览器端核心词典解析引擎
 * 核心使用浏览器的翻译引擎 (Translator API)，配合音标与结构化排版
 */
export async function resolveDictionaryEntry(
  text: string,
  options: DictionaryOptions,
): Promise<string> {
  const cleanWord = text.trim()

  // 1. 若浏览器内置了端侧 Prompt API，优先使用纯浏览器本地 AI
  try {
    const prompt = buildBrowserDictPrompt(
      cleanWord,
      options.targetLangName || '中文',
      options.showPhonetics || false,
      options.showExamples || false,
    )
    return await streamFromBrowserAi(prompt, options)
  }
  catch {
    // 降级使用浏览器的翻译引擎 + 词典排版合成
  }

  // 2. 使用浏览器的翻译引擎进行核心词义直译
  let baseTranslation = cleanWord
  if (options.translatorTranslate) {
    try {
      baseTranslation = await options.translatorTranslate(cleanWord)
    }
    catch (err) {
      console.warn('[Dictionary] 浏览器翻译引擎获取直译失败:', err)
    }
  }

  // 判断是否为英文单词
  const isEnglishWord = /^[a-zA-Z\s'-]+$/.test(cleanWord)

  if (isEnglishWord) {
    try {
      // 客户端获取权威音标与词性释义，并使用浏览器翻译引擎翻译释义
      const resp = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord.toLowerCase())}`,
        { signal: options.signal },
      )
      if (resp.ok) {
        const data = await resp.json()
        if (Array.isArray(data) && data.length > 0) {
          const item = data[0]
          const phonetic = item.phonetic || item.phonetics?.find((p: any) => p.text)?.text || ''
          const lines: string[] = []

          lines.push(`📖 **${cleanWord}**`)
          if (options.showPhonetics && phonetic) {
            lines.push(`🔊 读音：\`${phonetic}\``)
          }
          lines.push(`🎯 核心直译：**${baseTranslation}**\n`)

          // 提取词性与细分义项
          for (const meaning of (item.meanings || []).slice(0, 3)) {
            const pos = meaning.partOfSpeech || '释义'
            lines.push(`**[${pos}]**`)
            for (let i = 0; i < Math.min(meaning.definitions?.length || 0, 2); i++) {
              const def = meaning.definitions[i]
              let defText = def.definition || ''
              // 调用浏览器翻译引擎进行义项翻译
              if (options.translatorTranslate && defText) {
                try {
                  defText = await options.translatorTranslate(defText)
                }
                catch {}
              }
              lines.push(`• ${defText}`)
              if (options.showExamples && def.example) {
                let egTrans = def.example
                if (options.translatorTranslate) {
                  try {
                    egTrans = await options.translatorTranslate(def.example)
                  }
                  catch {}
                }
                lines.push(`  *例句: ${def.example}*`)
                lines.push(`  *(译: ${egTrans})*`)
              }
            }
            lines.push('')
          }

          const rawResult = lines.join('\n').trim()
          const finalResult = filterDictOutput(
            rawResult,
            options.showPhonetics ?? false,
            options.showExamples ?? false,
          )
          options.onChunk?.(finalResult)
          return finalResult
        }
      }
    }
    catch {
      // 离线或请求未返回，直接使用浏览器翻译引擎结果
    }
  }

  // 中文或其他语言，或离线状态：基于浏览器翻译引擎输出结构化词典格式
  const lines: string[] = [
    `📖 **${cleanWord}**\n`,
    `🎯 核心释义：**${baseTranslation}**`,
  ]

  if (options.showPhonetics) {
    lines.splice(1, 0, `🔊 读音：\`/${cleanWord}/\``)
  }

  const rawResult = lines.join('\n')
  const finalResult = filterDictOutput(
    rawResult,
    options.showPhonetics ?? false,
    options.showExamples ?? false,
  )
  options.onChunk?.(finalResult)
  return finalResult
}
