import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatDue,
  formatRelativeTime,
  parseTodoContent,
  sanitizeFileName,
  serializeTodoContent,
  todoSnippet,
  uniqueFileName,
  validateCategoryName,
} from './todoFile.js'

const iso = (value) => new Date(value).toISOString()

test('serializeTodoContent / parseTodoContent round-trip', () => {
  const todo = {
    title: '写周报: "Q4" 总结',
    details: '第一行\n\n- 列表项\n- [x] 已完成\n\n\n结尾',
    done: true,
    priority: 'high',
    due: '2026-10-25',
    createdAt: iso('2026-10-20T01:00:00.000Z'),
    updatedAt: iso('2026-10-20T04:30:00.000Z'),
  }

  const content = serializeTodoContent(todo)
  assert.ok(content.startsWith('---\ntitle:'))
  assert.match(content, /done: true/)
  assert.match(content, /priority: "high"/)
  assert.match(content, /due: "2026-10-25"/)

  const parsed = parseTodoContent('任意文件名.md', content)
  assert.equal(parsed.title, todo.title)
  assert.equal(parsed.done, true)
  assert.equal(parsed.priority, 'high')
  assert.equal(parsed.due, '2026-10-25')
  assert.equal(parsed.createdAt, todo.createdAt)
  assert.equal(parsed.updatedAt, todo.updatedAt)
  assert.equal(parsed.details, todo.details.replace(/\s+$/, ''))
  assert.equal(parsed.hasFrontmatter, true)
})

test('parse plain markdown heading as title', () => {
  const parsed = parseTodoContent(
    '随便.md',
    '# 买牛奶\n\n顺便买鸡蛋。\n- 两盒\n',
    1700000000000
  )
  assert.equal(parsed.title, '买牛奶')
  assert.equal(parsed.details, '顺便买鸡蛋。\n- 两盒')
  assert.equal(parsed.done, false)
  assert.equal(parsed.priority, 'normal')
  assert.equal(parsed.due, '')
  assert.equal(parsed.createdAt, new Date(1700000000000).toISOString())
})

test('parse plain text using file name as title', () => {
  const parsed = parseTodoContent('整理书架.md', '把最上层清空。')
  assert.equal(parsed.title, '整理书架')
  assert.equal(parsed.details, '把最上层清空。')
  assert.equal(parsed.hasFrontmatter, false)
})

test('parse unquoted frontmatter values and booleans', () => {
  const content = [
    '---',
    'title: 读书笔记: 第一章',
    'done: yes',
    'priority: urgent',
    'due: 2026-11-03',
    'created: 2026-10-01T08:00:00.000Z',
    'updated: 2026-10-02T09:00:00.000Z',
    '---',
    '',
    '正文',
  ].join('\n')

  const parsed = parseTodoContent('notes.md', content)
  assert.equal(parsed.title, '读书笔记: 第一章')
  assert.equal(parsed.done, true)
  assert.equal(parsed.priority, 'high')
  assert.equal(parsed.due, '2026-11-03')
  assert.equal(parsed.details, '正文')
})

test('invalid dates are ignored and incomplete frontmatter falls back', () => {
  const invalid = parseTodoContent(
    'x.md',
    '---\ntitle: "测试"\ndue: "2026-02-31"\n---\n内容'
  )
  assert.equal(invalid.due, '')

  const incomplete = parseTodoContent('普通.md', '---\ntitle: "没有结束"\n内容')
  assert.equal(incomplete.title, '普通')
  assert.equal(incomplete.details, '---\ntitle: "没有结束"\n内容')
})

test('sanitizeFileName handles invalid characters and reserved names', () => {
  assert.equal(sanitizeFileName('a/b:c*?"<>|d'), 'a b c d.md')
  assert.equal(sanitizeFileName('  ..名字..  '), '名字.md')
  assert.equal(sanitizeFileName('CON'), '_CON.md')
  assert.equal(sanitizeFileName('   '), '未命名待办.md')
  assert.equal(sanitizeFileName('报告', '.txt'), '报告.txt')
  assert.equal(sanitizeFileName('笔记.md'), '笔记.md')
  assert.ok(sanitizeFileName('很长的'.repeat(80)).length <= 84)
})

test('uniqueFileName is case-insensitive and avoids collisions', () => {
  assert.equal(uniqueFileName('周报.md', []), '周报.md')
  assert.equal(uniqueFileName('周报.md', ['周报.md']), '周报 (2).md')
  assert.equal(uniqueFileName('Report.md', ['report.md']), 'Report (2).md')
  assert.equal(uniqueFileName('周报.md', ['周报.md', '周报 (2).md']), '周报 (3).md')
})

test('validateCategoryName rejects unsafe and duplicate names', () => {
  assert.equal(validateCategoryName('', []), '请输入分类名称')
  assert.match(validateCategoryName('a/b', []), /不能包含/)
  assert.match(validateCategoryName('.hidden', []), /不能以 \. 开头/)
  assert.match(validateCategoryName('工作', ['工作']), /已存在同名分类/)
  assert.equal(validateCategoryName('工作', ['工作'], '工作'), '')
  assert.equal(validateCategoryName('生活', ['工作']), '')
})

test('formatting helpers', () => {
  const now = new Date(2026, 9, 20, 12, 0, 0)
  assert.equal(formatDue('2026-10-25', now), '10月25日')
  assert.equal(formatDue('2027-01-02', now), '2027年1月2日')
  assert.equal(formatRelativeTime(new Date(2026, 9, 20, 11, 58).toISOString(), now), '2 分钟前')
  assert.equal(formatRelativeTime(new Date(2026, 9, 20, 9, 15).toISOString(), now), '今天 09:15')
  assert.equal(todoSnippet('## 标题\n- [ ] 第一项\n**加粗**内容'), '标题 第一项 加粗内容')
})
