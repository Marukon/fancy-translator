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
 * 3. 包含断句标点（.。!?！？;；）判定为句子，非单字；
 * 4. 长度超过 50 个字符不按单字查词；
 * 5. 外文单词数 <= 4 且无中文（支持短语如 look forward to / break down）；
 * 6. 中文字符数 <= 8 且无外文单词（如 成语、单字词语）；
 */
export function isDictionaryCandidate(text: string): boolean {
  if (!text) return false
  const clean = text.trim()
  if (!clean) return false

  if (clean.includes('\n') || clean.includes('\r')) return false
  if (/[.。!?！？;；]$/.test(clean) || /[.。!?！？]/.test(clean)) return false
  if (clean.length > 50) return false

  const words = clean.match(/[a-zA-Z0-9'-]+/g) || []
  const cjkChars = clean.match(/[\u4e00-\u9fff]/g) || []

  if (cjkChars.length > 0 && cjkChars.length <= 8 && words.length === 0) return true
  if (words.length > 0 && words.length <= 4 && cjkChars.length === 0) return true

  return false
}

/**
 * 尝试通过浏览器原生 Chrome Prompt API (Gemini Nano) 解析
 */
async function streamFromBrowserAi(
  prompt: string,
  signal?: AbortSignal,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  const aiObj = (globalThis as any).ai
  const lm = aiObj?.languageModel || (globalThis as any).LanguageModel
  if (!lm || typeof lm.create !== 'function') {
    throw new Error('未启用浏览器端 Prompt API')
  }

  const session = await lm.create({
    systemPrompt: '你是一个权威双语电子词典助手，直接输出精炼、排版优美的结构化词典条目。',
    signal,
  })

  let fullText = ''
  if (typeof session.promptStreaming === 'function') {
    const stream = session.promptStreaming(prompt, { signal })
    for await (const chunk of stream) {
      if (signal?.aborted) break
      fullText = chunk
      onChunk?.(fullText)
    }
  }
  else {
    fullText = await session.prompt(prompt, { signal })
    onChunk?.(fullText)
  }

  session.destroy?.()
  return fullText
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
  let prompt = `请将以下词语作为词典词条进行权威解析，列出其词性和常用${targetLangName}释义`
  if (showPhonetics && showExamples) {
    prompt += '，并附带英美音标或标准读音以及典型地道双语实用例句'
  }
  else if (showPhonetics) {
    prompt += '，并附带英美音标或标准读音'
  }
  else if (showExamples) {
    prompt += '，并附带典型地道双语实用例句'
  }
  prompt += `：\n\n要求排版层次分明、紧凑清晰，无需多余开场白，直接输出解析结果。\n词条：\n${text.trim()}`
  return prompt
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
    return await streamFromBrowserAi(prompt, options.signal, options.onChunk)
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

          const result = lines.join('\n').trim()
          options.onChunk?.(result)
          return result
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

  const result = lines.join('\n')
  options.onChunk?.(result)
  return result
}
