const FOLD_STORAGE_PREFIX = 'todo-list:folds:v1'
const HEADING_RE = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/
const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/

function normalizeLabel(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function listLabel(raw) {
  return normalizeLabel(String(raw || '').replace(/^\[[ xX]\]\s*/, '')) || '列表项'
}

function indentOf(line) {
  const whitespace = String(line || '').match(/^[ \t]*/)[0]
  return whitespace.replace(/\t/g, '    ').length
}

function lineStarts(lines) {
  const starts = new Array(lines.length)
  let offset = 0
  for (let index = 0; index < lines.length; index += 1) {
    starts[index] = offset
    offset += lines[index].length + 1
  }
  return starts
}

/**
 * 把 Markdown 正文拆成可折叠块：
 * - heading：从这一行末尾到下一个同级/更高级标题之前
 * - list：列表项下面缩进更深的子内容
 * - code：围栏代码块
 *
 * 返回的 from/to 是 CodeMirror 文档中的字符偏移；startLine/endLine 是零起行号，
 * endLine 为折叠内容结束后的下一行。signature 用于跨编辑/预览和刷新保存折叠状态。
 */
export function getFoldBlocks(text) {
  const source = String(text || '').replace(/\r\n/g, '\n')
  const lines = source.split('\n')
  const starts = lineStarts(lines)
  const blocks = []
  const occurrences = new Map()
  const codeStart = new Map()
  const inCode = new Array(lines.length).fill(false)

  const nextSignature = (base) => {
    const count = (occurrences.get(base) || 0) + 1
    occurrences.set(base, count)
    return `${base}#${count}`
  }

  // 先识别围栏代码块，标题/列表解析时跳过代码块内部。
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(FENCE_RE)
    if (!match) continue
    const fence = match[1]
    const char = fence[0]
    const closePattern = new RegExp(`^ {0,3}${char}{${fence.length},}\\s*$`)
    let end = index + 1
    while (end < lines.length && !closePattern.test(lines[end])) end += 1
    const lastLine = Math.min(end, lines.length - 1)
    const range = { startLine: index, endLine: lastLine + 1 }
    codeStart.set(index, range)
    for (let line = index; line <= lastLine; line += 1) inCode[line] = true

    const from = starts[index] + lines[index].length
    const to = starts[lastLine] + lines[lastLine].length
    if (to > from) {
      const language = normalizeLabel(match[2]).split(/\s+/)[0] || ''
      const signature = nextSignature(`code:${char}:${language || 'text'}`)
      blocks.push({
        kind: 'code',
        signature,
        startLine: index,
        endLine: lastLine + 1,
        from,
        to,
        label: language ? `代码块 · ${language}` : '代码块',
        language,
      })
    }

    index = lastLine
  }

  // 标题块。
  const headings = []
  for (let index = 0; index < lines.length; index += 1) {
    if (inCode[index]) continue
    const match = lines[index].match(HEADING_RE)
    if (!match) continue
    headings.push({
      line: index,
      level: match[1].length,
      text: normalizeLabel(match[2]),
    })
  }

  for (let headingIndex = 0; headingIndex < headings.length; headingIndex += 1) {
    const heading = headings[headingIndex]
    let nextHeadingLine = lines.length
    for (let next = headingIndex + 1; next < headings.length; next += 1) {
      if (headings[next].level <= heading.level) {
        nextHeadingLine = headings[next].line
        break
      }
    }

    let lastContent = nextHeadingLine - 1
    while (lastContent > heading.line && !lines[lastContent].trim()) lastContent -= 1
    if (lastContent <= heading.line) continue

    const from = starts[heading.line] + lines[heading.line].length
    const to = starts[lastContent] + lines[lastContent].length
    if (to <= from) continue

    blocks.push({
      kind: 'heading',
      signature: nextSignature(`h:${heading.level}:${heading.text || '未命名标题'}`),
      startLine: heading.line,
      endLine: lastContent + 1,
      from,
      to,
      level: heading.level,
      label: heading.text || '未命名标题',
    })
  }

  // 列表项块。只折叠“有子内容”的项。
  for (let index = 0; index < lines.length; index += 1) {
    if (inCode[index]) continue
    const match = lines[index].match(LIST_RE)
    if (!match) continue

    const indent = indentOf(lines[index])
    let lastContent = index
    let cursor = index + 1

    while (cursor < lines.length) {
      if (!lines[cursor].trim()) {
        cursor += 1
        continue
      }

      const codeRange = codeStart.get(cursor)
      if (codeRange) {
        if (indentOf(lines[cursor]) > indent) {
          lastContent = codeRange.endLine - 1
          cursor = codeRange.endLine
          continue
        }
        break
      }

      if (inCode[cursor]) {
        cursor += 1
        continue
      }

      if (indentOf(lines[cursor]) > indent) {
        lastContent = cursor
        cursor += 1
        continue
      }

      break
    }

    if (lastContent <= index) continue
    const from = starts[index] + lines[index].length
    const to = starts[lastContent] + lines[lastContent].length
    if (to <= from) continue

    blocks.push({
      kind: 'list',
      signature: nextSignature(`li:${indent}:${listLabel(match[3])}`),
      startLine: index,
      endLine: lastContent + 1,
      from,
      to,
      indent,
      label: listLabel(match[3]),
    })
  }

  blocks.sort((a, b) => a.startLine - b.startLine || b.to - a.to)
  return blocks
}

export function topLevelBlocks(blocks) {
  const sorted = [...(blocks || [])].sort((a, b) => a.from - b.from || b.to - a.to)
  const result = []
  let coveredTo = -1

  for (const block of sorted) {
    if (block.from >= coveredTo) {
      result.push(block)
      coveredTo = block.to
    }
  }

  return result
}

export function foldStorageKey(folderName, category, fileName) {
  return [
    FOLD_STORAGE_PREFIX,
    encodeURIComponent(folderName || 'local'),
    encodeURIComponent(category || 'uncategorized'),
    encodeURIComponent(fileName || 'untitled'),
  ].join(':')
}

export function loadFoldedSignatures(storageKey) {
  if (!storageKey || typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => typeof item === 'string')
  } catch {
    return []
  }
}

export function saveFoldedSignatures(storageKey, signatures) {
  if (!storageKey || typeof localStorage === 'undefined') return
  try {
    const unique = [...new Set(signatures || [])]
    if (unique.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(unique))
    } else {
      localStorage.removeItem(storageKey)
    }
  } catch {
    // localStorage 不可用时折叠仍然在当前会话中生效。
  }
}

export function getFoldBlockAtLine(blocks, lineNumber) {
  return (blocks || []).find((block) => block.startLine === lineNumber) || null
}
