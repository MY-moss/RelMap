// 文本分析模块：日记关键词提取和情感分析
// 基于 N-gram 分词 + 停用词过滤 + 情感词典，全部手写算法，无外部依赖

import type { Result } from '../../shared/types'

// 关键词提取结果
export interface KeywordResult {
  keywords: string[]
  topWords: { word: string; count: number }[]
}

// 情感分析结果
export interface EmotionResult {
  score: number // -1.0 到 1.0，负=消极，正=积极
  label: 'positive' | 'neutral' | 'negative'
  positiveWords: string[]
  negativeWords: string[]
}

// 中文停用词表
const STOP_WORDS = new Set<string>([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人',
  '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去',
  '你', '会', '着', '没有', '看', '好', '自己', '这',
])

// 积极情感词典（约 50 个）
const POSITIVE_WORDS = [
  '开心', '快乐', '高兴', '兴奋', '满意', '喜欢', '美好', '幸运',
  '成功', '希望', '感谢', '温暖', '幸福', '惊喜', '轻松', '愉快',
  '期待', '自豪', '感动', '安心', '舒心', '欣慰', '满足', '惊喜',
  '欢乐', '欣喜', '喜悦', '甜蜜', '浪漫', '美好', '美丽', '可爱',
  '善良', '温柔', '体贴', '贴心', '靠谱', '努力', '勤奋', '优秀',
  '棒', '赞', '厉害', '不错', '顺利', '顺心', '如意', '圆满',
  '收获', '进步', '成长',
]

// 消极情感词典（约 50 个）
const NEGATIVE_WORDS = [
  '难过', '伤心', '失望', '愤怒', '生气', '担心', '害怕', '焦虑',
  '孤独', '疲惫', '压力', '痛苦', '遗憾', '后悔', '无奈', '沮丧',
  '烦躁', '紧张', '无聊', '尴尬', '寂寞', '失落', '崩溃', '绝望',
  '抑郁', '低落', '消沉', '憋屈', '委屈', '心烦', '头疼', '难受',
  '糟', '差', '坏', '错', '失败', '挫折', '困难', '麻烦',
  '争吵', '吵架', '冲突', '矛盾', '冷战', '分手', '离别', '失去',
  '生病', '受伤', '哭',
]

/**
 * 判断字符是否为中文字符
 */
function isChineseChar(ch: string): boolean {
  if (!ch) return false
  const code = ch.charCodeAt(0)
  // CJK 统一汉字范围
  return code >= 0x4e00 && code <= 0x9fff
}

/**
 * 判断字符是否为英文字母或数字
 */
function isAlnum(ch: string): boolean {
  if (!ch) return false
  const code = ch.charCodeAt(0)
  return (
    (code >= 0x30 && code <= 0x39) || // 0-9
    (code >= 0x41 && code <= 0x5a) || // A-Z
    (code >= 0x61 && code <= 0x7a)    // a-z
  )
}

/**
 * 判断字符是否为分隔符（空白、标点等）
 */
function isSeparator(ch: string): boolean {
  if (!ch) return true
  return /\s/.test(ch) || /[，。！？、；：""''（）《》【】,.!?;:'"()[\]{}\s\n\r\t]/.test(ch)
}

/**
 * 从文本中提取连续的中文字符段和英文单词段
 * 返回字符串数组，每个元素是一段连续的同类型字符
 */
function tokenizeContinuous(text: string): string[] {
  const segments: string[] = []
  if (!text) return segments

  let i = 0
  const len = text.length
  while (i < len) {
    const ch = text[i]
    if (isSeparator(ch)) {
      i++
      continue
    }

    if (isChineseChar(ch)) {
      // 收集连续的中文字符
      let j = i
      while (j < len && isChineseChar(text[j])) j++
      segments.push(text.slice(i, j))
      i = j
    } else if (isAlnum(ch)) {
      // 收集连续的英文/数字字符
      let j = i
      while (j < len && isAlnum(text[j])) j++
      segments.push(text.slice(i, j))
      i = j
    } else {
      // 其他字符跳过
      i++
    }
  }
  return segments
}

/**
 * 对中文段落进行 N-gram（2-4 字）切分
 * 返回所有长度为 2、3、4 的子串
 */
function generateNGrams(segment: string): string[] {
  const result: string[] = []
  const len = segment.length
  if (len < 2) return result

  // 生成 2-gram、3-gram、4-gram
  for (let n = 2; n <= 4; n++) {
    if (len < n) break
    for (let i = 0; i <= len - n; i++) {
      result.push(segment.slice(i, i + n))
    }
  }
  return result
}

/**
 * 提取关键词（基于 TF-IDF 简化版 + 词频统计）
 *
 * 算法：
 * 1. 将文本按分隔符切分为连续字符段
 * 2. 对每个中文段生成 2-4 字 N-gram
 * 3. 英文段直接作为词
 * 4. 过滤停用词和长度 < 2 的词
 * 5. 统计词频，按频率降序返回 topN 个（默认 10）
 *
 * @param text 文本内容
 * @param topN 返回的关键词数量，默认 10
 */
export function extractKeywords(text: string, topN: number = 10): Result<KeywordResult> {
  try {
    if (!text || typeof text !== 'string') {
      return { success: true, data: { keywords: [], topWords: [] } }
    }

    if (topN <= 0) topN = 10

    // 1. 切分为连续字符段
    const segments = tokenizeContinuous(text)

    // 2. 生成候选词
    const wordCount = new Map<string, number>()
    for (const seg of segments) {
      if (isChineseChar(seg[0])) {
        // 中文段：生成 N-gram
        const grams = generateNGrams(seg)
        for (const g of grams) {
          // 过滤停用词
          if (STOP_WORDS.has(g)) continue
          wordCount.set(g, (wordCount.get(g) ?? 0) + 1)
        }
      } else {
        // 英文/数字段：转小写后直接作为词
        const word = seg.toLowerCase()
        if (word.length < 2) continue
        if (STOP_WORDS.has(word)) continue
        wordCount.set(word, (wordCount.get(word) ?? 0) + 1)
      }
    }

    // 3. 过滤长度 < 2 的词，转换为数组并排序
    const topWords = Array.from(wordCount.entries())
      .filter(([w]) => w.length >= 2)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => {
        // 按词频降序，词频相同则按词长降序（优先长词）
        if (b.count !== a.count) return b.count - a.count
        return b.word.length - a.word.length
      })
      .slice(0, topN)

    const keywords = topWords.map((tw) => tw.word)

    return {
      success: true,
      data: {
        keywords,
        topWords,
      },
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

/**
 * 情感分析（基于情感词典）
 *
 * 算法：
 * 1. 在文本中搜索每个积极词和消极词的出现次数
 * 2. score = (positiveCount - negativeCount) / (positiveCount + negativeCount + 1)
 * 3. label: score > 0.1 = positive, score < -0.1 = negative, 其他 = neutral
 *
 * @param text 文本内容
 */
export function analyzeEmotion(text: string): Result<EmotionResult> {
  try {
    if (!text || typeof text !== 'string') {
      return {
        success: true,
        data: {
          score: 0,
          label: 'neutral',
          positiveWords: [],
          negativeWords: [],
        },
      }
    }

    const matchedPositive: string[] = []
    const matchedNegative: string[] = []

    // 统计积极词出现情况（去重记录匹配到的词）
    for (const word of POSITIVE_WORDS) {
      if (text.includes(word)) {
        matchedPositive.push(word)
      }
    }

    // 统计消极词出现情况
    for (const word of NEGATIVE_WORDS) {
      if (text.includes(word)) {
        matchedNegative.push(word)
      }
    }

    const positiveCount = matchedPositive.length
    const negativeCount = matchedNegative.length

    // 计算情感分数
    const score = (positiveCount - negativeCount) / (positiveCount + negativeCount + 1)

    // 判定情感标签
    let label: 'positive' | 'neutral' | 'negative'
    if (score > 0.1) {
      label = 'positive'
    } else if (score < -0.1) {
      label = 'negative'
    } else {
      label = 'neutral'
    }

    return {
      success: true,
      data: {
        score,
        label,
        positiveWords: matchedPositive,
        negativeWords: matchedNegative,
      },
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
