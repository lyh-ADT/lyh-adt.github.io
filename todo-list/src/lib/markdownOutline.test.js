import test from 'node:test'
import assert from 'node:assert/strict'
import { getFoldBlocks, getFoldBlockAtLine, topLevelBlocks } from './markdownOutline.js'

function blockAt(blocks, startLine, kind) {
  return blocks.find((block) => block.startLine === startLine && (!kind || block.kind === kind))
}

test('heading blocks cover content until the next same-level heading', () => {
  const text = '# A\nintro\n## B\nb1\nb2\n## C\nc1'
  const blocks = getFoldBlocks(text)

  const h1 = blockAt(blocks, 0, 'heading')
  assert.ok(h1)
  assert.equal(h1.level, 1)
  assert.equal(h1.endLine, 7)
  assert.equal(h1.from, text.indexOf('\n')) // 标题行末尾
  assert.equal(h1.to, text.length)

  const h2b = blockAt(blocks, 2, 'heading')
  assert.ok(h2b)
  assert.equal(h2b.endLine, 5)
  assert.equal(h2b.label, 'B')

  const h2c = blockAt(blocks, 5, 'heading')
  assert.ok(h2c)
  assert.equal(h2c.endLine, 7)
})

test('list item blocks fold nested indented content only', () => {
  const text = '- outer\n  - child\n    - grand\n  - child2\n- sibling'
  const blocks = getFoldBlocks(text)

  const outer = blockAt(blocks, 0, 'list')
  assert.ok(outer)
  assert.equal(outer.endLine, 4)
  assert.equal(outer.label, 'outer')

  const child = blockAt(blocks, 1, 'list')
  assert.ok(child)
  assert.equal(child.endLine, 3)

  assert.equal(blockAt(blocks, 2, 'list'), undefined)
  assert.equal(blockAt(blocks, 3, 'list'), undefined)
  assert.equal(blockAt(blocks, 4, 'list'), undefined)
})

test('fenced code blocks and headings inside code are handled', () => {
  const text = '# Title\n\n```js\nconst x = 1\n```\n\ntail'
  const blocks = getFoldBlocks(text)

  const code = blockAt(blocks, 2, 'code')
  assert.ok(code)
  assert.equal(code.endLine, 5)
  assert.equal(code.label, '代码块 · js')
  assert.equal(code.from, text.indexOf('```js') + 5)

  const heading = blockAt(blocks, 0, 'heading')
  assert.ok(heading)
  assert.equal(heading.endLine, 7)

  const top = topLevelBlocks(blocks)
  assert.deepEqual(top.map((block) => block.kind), ['heading'])
})

test('duplicate block labels get unique signatures', () => {
  const text = '## 备注\na\n## 备注\nb'
  const blocks = getFoldBlocks(text).filter((block) => block.kind === 'heading')
  assert.equal(blocks.length, 2)
  assert.notEqual(blocks[0].signature, blocks[1].signature)
  assert.match(blocks[0].signature, /#1$/)
  assert.match(blocks[1].signature, /#2$/)
})

test('headings with no content are not foldable', () => {
  const text = '# Empty\n\n# Next\nbody'
  const blocks = getFoldBlocks(text)
  assert.equal(blockAt(blocks, 0, 'heading'), undefined)
  assert.ok(blockAt(blocks, 2, 'heading'))
})

test('getFoldBlockAtLine returns the block starting on that line', () => {
  const blocks = getFoldBlocks('# A\nbody\n- item\n  - child')
  const heading = getFoldBlockAtLine(blocks, 0)
  assert.equal(heading.kind, 'heading')
  const item = getFoldBlockAtLine(blocks, 2)
  assert.equal(item.kind, 'list')
})
