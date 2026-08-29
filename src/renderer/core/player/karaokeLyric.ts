export const LYRIC_OFFSET = 100

const LINE_TAG = /^\[(\d{1,3}):(\d{1,2}(?:\.\d+)?)\]/
const WORD_CHUNK = /<(\d+),(\d+)>([^<]*)/g

export interface LyricWordLine {
  time: number
  text: string
  charStarts: number[]
}

export const parseLxlrc = (lxlrc: string | null | undefined): LyricWordLine[] => {
  if (!lxlrc) return []
  const lines: LyricWordLine[] = []
  for (const raw of lxlrc.split(/\r\n|\n|\r/)) {
    const line = raw.trim()
    const tag = LINE_TAG.exec(line)
    if (!tag) continue
    const time = parseInt(tag[1], 10) * 60_000 + parseFloat(tag[2]) * 1000
    const body = line.slice(tag[0].length)
    if (!body.includes('<')) continue
    const charStarts: number[] = []
    let text = ''
    WORD_CHUNK.lastIndex = 0
    let match = WORD_CHUNK.exec(body)
    while (match) {
      const offset = parseInt(match[1], 10)
      const duration = parseInt(match[2], 10)
      const chars = Array.from(match[3])
      const step = chars.length > 1 && duration > 0 ? duration / chars.length : 0
      chars.forEach((ch, i) => {
        charStarts.push(time + offset + step * i)
        text += ch
      })
      match = WORD_CHUNK.exec(body)
    }
    if (charStarts.length) lines.push({ time, text, charStarts })
  }
  return lines
}

export const findWordLine = (lines: LyricWordLine[], lineTime: number, text: string): LyricWordLine | null => {
  if (!lines.length) return null
  let best: LyricWordLine | null = null
  let bestDist = 200
  for (const line of lines) {
    const dist = Math.abs(line.time - lineTime)
    if (dist < bestDist) {
      best = line
      bestDist = dist
    }
  }
  if (best) return best
  const normalized = text.trim()
  if (!normalized) return null
  return lines.find(line => line.text.trim() == normalized) ?? null
}

export const playedCharCount = ({
  text,
  lineTime,
  nextLineTime,
  nowMs,
  wordLine,
  active,
  played,
}: {
  text: string
  lineTime: number
  nextLineTime: number | null
  nowMs: number
  wordLine: LyricWordLine | null
  active: boolean
  played: boolean
}): number => {
  const len = Array.from(text).length
  if (!len) return 0
  if (played && !active) return len
  if (!active) return 0
  if (wordLine?.charStarts.length) {
    const starts = wordLine.charStarts
    const limit = Math.min(len, starts.length)
    let n = 0
    for (let i = 0; i < limit; i++) {
      if (nowMs >= starts[i]) n++
      else break
    }
    if (starts.length >= len) return n
    if (n < starts.length) return n
    const lastStart = starts[starts.length - 1]
    const end = nextLineTime != null && nextLineTime > lastStart
      ? nextLineTime
      : lastStart + 400 * (len - starts.length)
    if (nowMs >= end) return len
    const span = Math.max(end - lastStart, 1)
    return Math.min(len, n + Math.floor((nowMs - lastStart) / span * (len - starts.length)))
  }
  if (nowMs <= lineTime) return 0
  const end = nextLineTime != null && nextLineTime > lineTime
    ? nextLineTime
    : lineTime + Math.max(len * 400, 2000)
  if (nowMs >= end) return len
  return Math.min(len, Math.floor((nowMs - lineTime) / (end - lineTime) * len))
}

export const hasWordTags = (lrc: string | null | undefined): boolean => {
  if (!lrc) return false
  for (const raw of lrc.split(/\r\n|\n|\r/)) {
    const line = raw.trim()
    const tag = LINE_TAG.exec(line)
    if (!tag) continue
    const body = line.slice(tag[0].length)
    if (/^<\d+,\d+>/.test(body)) return true
  }
  return false
}

export const toEvenSplitLxlrc = (lrc: string): string => {
  const parsed: Array<{ time: number, tag: string, text: string }> = []
  for (const raw of lrc.split(/\r\n|\n|\r/)) {
    const line = raw.trim()
    const tag = LINE_TAG.exec(line)
    if (!tag) continue
    const time = parseInt(tag[1], 10) * 60_000 + parseFloat(tag[2]) * 1000
    const text = line.slice(tag[0].length).replace(/<\d+,\d+>/g, '')
    if (!text) continue
    parsed.push({ time, tag: tag[0], text })
  }
  return parsed.map((line, i) => {
    const chars = Array.from(line.text)
    if (!chars.length) return line.tag
    const next = parsed[i + 1]
    const end = next && next.time > line.time
      ? next.time
      : line.time + Math.max(chars.length * 400, 2000)
    const span = Math.max(end - line.time, 1)
    const per = span / chars.length
    const chunks = chars.map((ch, idx) => `<${Math.round(idx * per)},${Math.max(Math.round(per), 1)}>${ch}`).join('')
    return `${line.tag}${chunks}`
  }).join('\n')
}

export const ensureEvenSplitLxlrc = (lrc: string): string => {
  if (!lrc || hasWordTags(lrc)) return lrc
  return toEvenSplitLxlrc(lrc)
}
