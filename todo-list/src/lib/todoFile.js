export const TODO_EXTENSIONS = ['.md', '.markdown', '.mdown', '.mkd', '.txt']
export const DEFAULT_EXTENSION = '.md'
export const PRIORITIES = ['low', 'normal', 'high']

const PRIORITY_LABELS = {
  low: '低',
  normal: '普通',
  high: '高',
}

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i

export function isTodoFileName(name) {
  return TODO_EXTENSIONS.includes(extensionOf(name))
}

export function extensionOf(name) {
  const value = String(name || '')
  const index = value.lastIndexOf('.')
  if (index <= 0) return ''
  return value.slice(index).toLowerCase()
}

export function stripExtension(name) {
  const value = String(name || '')
  const extension = extensionOf(value)
  return extension ? value.slice(0, -extension.length) : value
}

function truncate(value, maxLength) {
  const chars = Array.from(value)
  return chars.length > maxLength ? chars.slice(0, maxLength).join('') : value
}

/**
 * 把待办标题转换成一个安全的文件名。
 * 保留扩展名，过滤 Windows / macOS / Linux 下不允许的字符。
 */
export function sanitizeFileName(title, extension = DEFAULT_EXTENSION) {
  const ext = extension && extension.startsWith('.') ? extension : DEFAULT_EXTENSION
  let base = String(title || '')
    .normalize('NFC')
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[. ]+/, '')
    .replace(/[. ]+$/, '')

  if (base.toLowerCase().endsWith(ext.toLowerCase())) {
    base = base.slice(0, -ext.length).trim().replace(/[. ]+$/, '')
  }
  if (!base) base = '未命名待办'
  if (WINDOWS_RESERVED.test(base)) base = '_' + base

  const maxBaseLength = Math.max(12, 80 - ext.length)
  base = truncate(base, maxBaseLength).trim().replace(/[. ]+$/, '') || '未命名待办'

  return base + ext
}

/**
 * 处理同一分类下的重名文件，例如「周报.md」→「周报 (2).md」。
 */
export function uniqueFileName(name, existingNames) {
  const taken = new Set(
    Array.from(existingNames || [], (item) => String(item || '').toLowerCase())
  )
  if (!taken.has(String(name).toLowerCase())) return name

  const extension = extensionOf(name)
  const base = extension ? name.slice(0, -extension.length) : name
  let index = 2
  let candidate = ''
  do {
    const suffix = ` (${index})`
    candidate = truncate(base, Math.max(12, 80 - extension.length - suffix.length)).trim() + suffix + extension
    index += 1
  } while (taken.has(candidate.toLowerCase()))
  return candidate
}

export function validateCategoryName(name, categories = [], currentName = '') {
  const value = String(name || '').trim()
  if (!value) return '请输入分类名称'
  if (value === '.' || value === '..') return '这个名称不能作为分类'
  if (value.length > 50) return '分类名称不能超过 50 个字符'
  if (/[\\/:*?"<>|\u0000-\u001f\u007f]/.test(value)) return '名称不能包含 \\ / : * ? " < > |'
  if (value.startsWith('.')) return '分类名称不能以 . 开头（隐藏文件夹不会被读取）'
  if (/[. ]$/.test(value)) return '分类名称不能以空格或点结尾'
  if (WINDOWS_RESERVED.test(value)) return '这个名称是系统保留名称，请换一个'
  if (
    categories.some(
      (category) =>
        category.toLowerCase() === value.toLowerCase() &&
        category.toLowerCase() !== String(currentName || '').toLowerCase()
    )
  ) {
    return '已存在同名分类'
  }
  return ''
}

function parseScalar(raw) {
  const value = String(raw || '').trim()
  if (!value) return ''
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value)
    } catch {
      return value.slice(1, -1)
    }
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'")
  }
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true'
  if (/^(null|~)$/i.test(value)) return ''
  return value
}

function parseFrontmatter(content) {
  const text = String(content || '').replace(/^\uFEFF/, '')
  if (!/^---[ \t]*\r?\n/.test(text)) return null

  const lines = text.split(/\r?\n/)
  let end = -1
  for (let index = 1; index < lines.length; index += 1) {
    if (/^(---|\.\.\.)[ \t]*$/.test(lines[index])) {
      end = index
      break
    }
  }
  if (end === -1) return null

  const data = {}
  for (let index = 1; index < end; index += 1) {
    const line = lines[index]
    if (!line.trim() || /^\s*#/.test(line)) continue
    const colon = line.indexOf(':')
    if (colon < 1) continue
    const key = line.slice(0, colon).trim()
    if (!/^[A-Za-z][\w-]*$/.test(key)) continue
    data[key] = parseScalar(line.slice(colon + 1))
  }

  const knownKeys = ['title', 'done', 'priority', 'due', 'created', 'updated']
  if (!knownKeys.some((key) => Object.prototype.hasOwnProperty.call(data, key))) {
    return null
  }

  return {
    data,
    body: lines.slice(end + 1).join('\n').replace(/^\n+/, ''),
  }
}

function normalizeDone(value) {
  if (value === true || value === false) return value
  return /^(true|yes|1|done|已完成|完成)$/i.test(String(value || '').trim())
}

function normalizePriority(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'low' || normalized === '低') return 'low'
  if (normalized === 'high' || normalized === 'urgent' || normalized === '高') return 'high'
  return 'normal'
}

function normalizeDue(value) {
  const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return ''
  const [, year, month, day] = match
  const date = new Date(`${year}-${month}-${day}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() + 1 !== Number(month) ||
    date.getDate() !== Number(day)
  ) {
    return ''
  }
  return `${year}-${month}-${day}`
}

function normalizeIso(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

/**
 * 解析一个待办文件。
 * 支持本应用写入的 frontmatter，也兼容普通 Markdown：
 *  - 第一行是「# 标题」时，标题取自该行；
 *  - 否则标题取自文件名，全部内容作为详情。
 */
export function parseTodoContent(fileName, content, lastModified = Date.now()) {
  const fallbackTitle = stripExtension(fileName).trim() || '未命名待办'
  const fallbackTime = Number.isFinite(lastModified)
    ? new Date(lastModified).toISOString()
    : new Date().toISOString()

  let title = fallbackTitle
  let details = ''
  let done = false
  let priority = 'normal'
  let due = ''
  let createdAt = fallbackTime
  let updatedAt = fallbackTime
  let hasFrontmatter = false

  const parsed = parseFrontmatter(content)
  if (parsed) {
    hasFrontmatter = true
    const data = parsed.data
    if (typeof data.title === 'string' && data.title.trim()) title = data.title.trim()
    done = normalizeDone(data.done)
    priority = normalizePriority(data.priority)
    due = normalizeDue(data.due)
    createdAt = normalizeIso(data.created) || fallbackTime
    updatedAt = normalizeIso(data.updated) || createdAt
    details = parsed.body
  } else {
    const normalized = String(content || '').replace(/^\uFEFF/, '')
    const lines = normalized.split(/\r?\n/)
    const firstContent = lines.findIndex((line) => line.trim())
    if (firstContent >= 0) {
      const heading = lines[firstContent].match(/^#\s+(.+?)\s*#*\s*$/)
      if (heading) {
        title = heading[1].trim() || fallbackTitle
        details = lines.slice(firstContent + 1).join('\n')
      } else {
        details = normalized
      }
    }
  }

  return {
    title,
    details: details.replace(/\r\n/g, '\n').replace(/^\s*\n+/, '').replace(/\s+$/, ''),
    done,
    priority,
    due,
    createdAt,
    updatedAt,
    hasFrontmatter,
  }
}

/**
 * 生成可读的 Markdown 文件。frontmatter 保存元数据，正文保存待办详情。
 */
export function serializeTodoContent(todo) {
  const now = new Date().toISOString()
  const singleLine = (value) =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim()

  const title = singleLine(todo.title) || '未命名待办'
  const details = String(todo.details || '')
    .replace(/\r\n/g, '\n')
    .replace(/\s+$/, '')

  const frontmatter = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `done: ${todo.done ? 'true' : 'false'}`,
    `priority: ${JSON.stringify(normalizePriority(todo.priority))}`,
    `due: ${JSON.stringify(normalizeDue(todo.due))}`,
    `created: ${JSON.stringify(normalizeIso(todo.createdAt) || now)}`,
    `updated: ${JSON.stringify(normalizeIso(todo.updatedAt) || now)}`,
    '---',
    '',
  ].join('\n')

  return frontmatter + details + '\n'
}

export function todoSnippet(details, maxLength = 88) {
  const text = String(details || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+\[[ xX]\]\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+[.)]\s+/gm, '')
    .replace(/[*_~`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return truncate(text, maxLength)
}

export function priorityLabel(priority) {
  return PRIORITY_LABELS[priority] || PRIORITY_LABELS.normal
}

export function todayKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isOverdue(due, done, now = new Date()) {
  return Boolean(due && !done && due < todayKey(now))
}

export function formatDue(due, now = new Date()) {
  if (!due) return ''
  const [year, month, day] = due.split('-').map(Number)
  if (!year || !month || !day) return due
  if (year !== now.getFullYear()) return `${year}年${month}月${day}日`
  return `${month}月${day}日`
}

export function formatRelativeTime(iso, now = new Date()) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const dayDiff = Math.round((startOfToday - startOfDate) / 86400000)
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

  if (dayDiff <= 0) return `今天 ${time}`
  if (dayDiff === 1) return `昨天 ${time}`
  if (dayDiff < 7) return `${dayDiff} 天前`
  if (date.getFullYear() === now.getFullYear()) return `${date.getMonth() + 1}月${date.getDate()}日`
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}
