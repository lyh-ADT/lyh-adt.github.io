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
    /^#{1,6}\s+/.test(line) ||
    /^\s*>\s?/.test(line) ||
    /^\s*(?:[-*+]|\d+[.)])\s+/.test(line) ||
    /^\s*(?:\*\s*){3,}$/.test(line) ||
    /^\s*(?:-\s*){3,}$/.test(line) ||
    /^\s*(?:_\s*){3,}$/.test(line)
  )
}

export default function MarkdownPreview({ text, emptyText = '暂无详情，点击「编辑」开始记录。' }) {
  const value = String(text || '').replace(/\r\n/g, '\n')
  if (!value.trim()) return <div className="markdown-empty">{emptyText}</div>

  const lines = value.split('\n')
  const blocks = []
  let index = 0
  let blockKey = 0

  while (index < lines.length) {
    const line = lines[index]

    if (!line.trim()) {
      index += 1
      continue
    }

    const fence = line.match(/^\s*```(.*)$/)
    if (fence) {
      const code = []
      index += 1
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
        code.push(lines[index])
        index += 1
      }
      if (index < lines.length) index += 1
      blocks.push(
        <pre key={`block-${blockKey}`}>
          <code>{code.join('\n')}</code>
        </pre>
      )
      blockKey += 1
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (heading) {
      const level = heading[1].length
      const Tag = `h${level}`
      blocks.push(<Tag key={`block-${blockKey}`}>{renderInline(heading[2], `h${blockKey}`)}</Tag>)
      blockKey += 1
      index += 1
      continue
    }

    if (/^\s*>\s?/.test(line)) {
      const quote = []
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ''))
        index += 1
      }
      blocks.push(
        <blockquote key={`block-${blockKey}`}>{renderInline(quote.join(' '), `q${blockKey}`)}</blockquote>
      )
      blockKey += 1
      continue
    }

    if (/^\s*(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(line)) {
      blocks.push(<hr key={`block-${blockKey}`} />)
      blockKey += 1
      index += 1
      continue
    }

    if (/^\s*(?:[-*+]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line)
      const items = []
      while (index < lines.length && /^\s*(?:[-*+]|\d+[.)])\s+/.test(lines[index])) {
        const itemText = lines[index].replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '')
        const task = itemText.match(/^\[([ xX])\]\s*(.*)$/)
        items.push(
          task
            ? {
                kind: 'task',
                checked: task[1].toLowerCase() === 'x',
                text: task[2],
              }
            : { kind: 'normal', text: itemText }
        )
        index += 1
      }
      const Tag = ordered ? 'ol' : 'ul'
      blocks.push(
        <Tag key={`block-${blockKey}`} className={ordered ? 'md-list md-list-ordered' : 'md-list'}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className={item.kind === 'task' ? 'md-task-item' : ''}>
              {item.kind === 'task' ? (
                <span className={`md-check${item.checked ? ' is-checked' : ''}`}>
                  {item.checked ? '✓' : ''}
                </span>
              ) : null}
              <span>{renderInline(item.text, `li${blockKey}-${itemIndex}`)}</span>
            </li>
          ))}
        </Tag>
      )
      blockKey += 1
      continue
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
    blocks.push(
      <p key={`block-${blockKey}`}>{renderInline(paragraph.join(' '), `p${blockKey}`)}</p>
    )
    blockKey += 1
  }

  return <div className="markdown-body">{blocks}</div>
}
