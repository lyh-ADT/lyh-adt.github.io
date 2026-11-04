import { useEffect, useMemo, useState } from 'react'
import {
  getFoldBlocks,
  loadFoldedSignatures,
  saveFoldedSignatures,
} from '../lib/markdownOutline'

function isSafeHref(href) {
  const value = String(href || '').trim()
  return /^(https?:\/\/|mailto:)/i.test(value) || value.startsWith('#')
}

function renderInline(text, keyPrefix = 'inline') {
  const nodes = []
  const pattern =
    /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)|(~~[^~\n]+~~)|(\[[^\]\n]+\]\([^)\n]+\))/g
  let lastIndex = 0
  let match
  let index = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index))
    const token = match[0]
    const key = `${keyPrefix}-${index}`
    index += 1

    if (token.startsWith('`')) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(<strong key={key}>{renderInline(token.slice(2, -2), key)}</strong>)
    } else if (token.startsWith('~~')) {
      nodes.push(<del key={key}>{renderInline(token.slice(2, -2), key)}</del>)
    } else if (token.startsWith('*') || token.startsWith('_')) {
      nodes.push(<em key={key}>{renderInline(token.slice(1, -1), key)}</em>)
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (link && isSafeHref(link[2])) {
        nodes.push(
          <a key={key} href={link[2].trim()} target="_blank" rel="noreferrer noopener">
            {renderInline(link[1], key)}
          </a>
        )
      } else if (link) {
        nodes.push(<span key={key}>{link[1]}</span>)
      } else {
        nodes.push(token)
      }
    }

    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes.length > 0 ? nodes : [text]
}

function isBlockStart(line) {
  return (
    /^\s*```/.test(line) ||
    /^\s*~~~/.test(line) ||
    /^ {0,3}#{1,6}\s+/.test(line) ||
    /^\s*>\s?/.test(line) ||
    /^\s*(?:[-*+]|\d+[.)])\s+/.test(line) ||
    /^\s*(?:\*\s*){3,}$/.test(line) ||
    /^\s*(?:-\s*){3,}$/.test(line) ||
    /^\s*(?:_\s*){3,}$/.test(line)
  )
}

function indentOf(line) {
  return String(line || '').match(/^[ \t]*/)[0].replace(/\t/g, '    ').length
}

const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/

function parseListItem(line, index) {
  const match = String(line || '').match(LIST_RE)
  if (!match) return null
  const task = match[3].match(/^\[([ xX])\]\s*(.*)$/)
  return {
    index,
    indent: indentOf(line),
    ordered: /^\d/.test(match[2]),
    task: Boolean(task),
    checked: task ? task[1].toLowerCase() === 'x' : false,
    text: task ? task[2] : match[3],
    children: [],
  }
}

function parseList(lines, start) {
  const first = parseListItem(lines[start], start)
  if (!first) return { items: [], nextIndex: start + 1, ordered: false }
  const baseIndent = first.indent
  const items = []
  const stack = []
  let index = start

  while (index < lines.length) {
    if (!lines[index].trim()) {
      let next = index + 1
      while (next < lines.length && !lines[next].trim()) next += 1
      const nextItem = next < lines.length ? parseListItem(lines[next], next) : null
      if (nextItem && nextItem.indent >= baseIndent) {
        index = next
        continue
      }
      break
    }

    const item = parseListItem(lines[index], index)
    if (!item || item.indent < baseIndent) break

    while (stack.length > 0 && stack[stack.length - 1].indent >= item.indent) {
      stack.pop()
    }

    if (stack.length > 0) {
      stack[stack.length - 1].children.push(item)
    } else {
      items.push(item)
    }
    stack.push(item)
    index += 1
  }

  return { items, nextIndex: index, ordered: first.ordered }
}

function FoldToggle({ folded, onClick, label, className = '' }) {
  return (
    <button
      type="button"
      className={`md-fold-toggle ${className}`}
      aria-expanded={!folded}
      aria-label={`${folded ? '展开' : '折叠'}${label ? `「${label}」` : ''}`}
      title={folded ? '展开' : '折叠'}
      onClick={onClick}
    >
      {folded ? '▸' : '▾'}
    </button>
  )
}

export default function MarkdownPreview({
  text,
  emptyText = '暂无详情，点击「编辑」开始记录。',
  foldKey = '',
}) {
  const value = String(text || '').replace(/\r\n/g, '\n')
  const foldBlocks = useMemo(() => getFoldBlocks(value), [value])
  const blockByStartLine = useMemo(
    () => new Map(foldBlocks.map((block) => [block.startLine, block])),
    [foldBlocks]
  )
  const [collapsed, setCollapsed] = useState(() => new Set(loadFoldedSignatures(foldKey)))

  useEffect(() => {
    setCollapsed(new Set(loadFoldedSignatures(foldKey)))
  }, [foldKey])

  const toggleFold = (signature) => {
    if (!signature) return
    const next = new Set(collapsed)
    if (next.has(signature)) next.delete(signature)
    else next.add(signature)
    setCollapsed(next)
    saveFoldedSignatures(foldKey, next)
  }

  const expandAll = () => {
    setCollapsed(new Set())
    saveFoldedSignatures(foldKey, [])
  }

  const foldedCount = useMemo(
    () => foldBlocks.filter((block) => collapsed.has(block.signature)).length,
    [collapsed, foldBlocks]
  )

  if (!value.trim()) return <div className="markdown-empty">{emptyText}</div>

  const lines = value.split('\n')
  const elements = []
  let index = 0
  let blockKey = 0

  const renderList = (items, ordered, keyPrefix) => {
    const Tag = ordered ? 'ol' : 'ul'
    return (
      <Tag className={ordered ? 'md-list md-list-ordered' : 'md-list'}>
        {items.map((item) => {
          const block = blockByStartLine.get(item.index)
          const folded = Boolean(block && collapsed.has(block.signature))
          const hasChildren = item.children.length > 0

          return (
            <li
              key={`${keyPrefix}-${item.index}`}
              className={item.task ? 'md-task-item' : ''}
            >
              <div className="md-list-line">
                {hasChildren && block ? (
                  <FoldToggle
                    folded={folded}
                    className="list"
                    label={item.text}
                    onClick={() => toggleFold(block.signature)}
                  />
                ) : null}
                {item.task ? (
                  <span className={`md-check${item.checked ? ' is-checked' : ''}`}>
                    {item.checked ? '✓' : ''}
                  </span>
                ) : null}
                <span className="md-list-text">
                  {renderInline(item.text, `${keyPrefix}-${item.index}`)}
                </span>
                {folded ? (
                  <span className="md-folded-label">已折叠 {item.children.length} 项</span>
                ) : null}
              </div>

              {hasChildren && !folded
                ? renderList(
                    item.children,
                    item.children[0].ordered,
                    `${keyPrefix}-${item.index}`
                  )
                : null}
            </li>
          )
        })}
      </Tag>
    )
  }

  while (index < lines.length) {
    const line = lines[index]

    if (!line.trim()) {
      index += 1
      continue
    }

    const fence = line.match(/^\s*(`{3,}|~{3,})(.*)$/)
    if (fence) {
      const startIndex = index
      const fenceText = fence[1]
      const char = fenceText[0]
      const closePattern = new RegExp(`^ {0,3}${char}{${fenceText.length},}\\s*$`)
      const code = []
      index += 1
      while (index < lines.length && !closePattern.test(lines[index])) {
        code.push(lines[index])
        index += 1
      }
      if (index < lines.length) index += 1

      const block = blockByStartLine.get(startIndex)
      const folded = Boolean(block && collapsed.has(block.signature))

      if (block) {
        elements.push(
          <div className="md-code-block" key={`block-${blockKey}`}>
            <div className="md-code-head">
              <span>{block.label || '代码块'}</span>
              <button
                type="button"
                className="md-code-toggle"
                onClick={() => toggleFold(block.signature)}
              >
                {folded ? '展开' : '收起'}
              </button>
            </div>
            {folded ? (
              <div className="md-code-folded">
                已折叠 {Math.max(1, block.endLine - block.startLine - 1)} 行
              </div>
            ) : (
              <pre>
                <code>{code.join('\n')}</code>
              </pre>
            )}
          </div>
        )
        if (folded) index = block.endLine
      } else {
        elements.push(
          <pre key={`block-${blockKey}`}>
            <code>{code.join('\n')}</code>
          </pre>
        )
      }
      blockKey += 1
      continue
    }

    const heading = line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (heading) {
      const level = heading[1].length
      const Tag = `h${level}`
      const block = blockByStartLine.get(index)
      const folded = Boolean(block && collapsed.has(block.signature))

      elements.push(
        <div
          className={`md-heading-block${folded ? ' is-folded' : ''}`}
          key={`block-${blockKey}`}
        >
          {block ? (
            <FoldToggle
              folded={folded}
              className="heading"
              label={heading[2]}
              onClick={() => toggleFold(block.signature)}
            />
          ) : null}
          <Tag>
            {renderInline(heading[2], `h${blockKey}`)}
            {folded ? (
              <span className="md-folded-label">
                已折叠 {Math.max(1, block.endLine - block.startLine - 1)} 行
              </span>
            ) : null}
          </Tag>
        </div>
      )

      if (folded && block) index = block.endLine
      else index += 1
      blockKey += 1
      continue
    }

    if (/^\s*>\s?/.test(line)) {
      const quote = []
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ''))
        index += 1
      }
      elements.push(
        <blockquote key={`block-${blockKey}`}>{renderInline(quote.join(' '), `q${blockKey}`)}</blockquote>
      )
      blockKey += 1
      continue
    }

    if (/^\s*(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(line)) {
      elements.push(<hr key={`block-${blockKey}`} />)
      blockKey += 1
      index += 1
      continue
    }

    if (LIST_RE.test(line)) {
      const list = parseList(lines, index)
      if (list.items.length > 0) {
        elements.push(
          <div className="md-list-block" key={`block-${blockKey}`}>
            {renderList(list.items, list.ordered, `list${blockKey}`)}
          </div>
        )
        index = list.nextIndex
        blockKey += 1
        continue
      }
    }

    const paragraph = []
    while (
      index < lines.length &&
      lines[index].trim() &&
      (paragraph.length === 0 || !isBlockStart(lines[index]))
    ) {
      paragraph.push(lines[index])
      index += 1
    }
    elements.push(
      <p key={`block-${blockKey}`}>{renderInline(paragraph.join(' '), `p${blockKey}`)}</p>
    )
    blockKey += 1
  }

  return (
    <div className="markdown-body">
      {foldedCount > 0 ? (
        <div className="md-fold-bar">
          <span>已折叠 {foldedCount} 块</span>
          <button type="button" onClick={expandAll}>
            全部展开
          </button>
        </div>
      ) : null}
      {elements}
    </div>
  )
}
