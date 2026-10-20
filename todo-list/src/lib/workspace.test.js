import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createTodo,
  deleteTodo,
  loadWorkspace,
  relocateCategory,
  saveTodo,
} from './workspace.js'
import { parseTodoContent, serializeTodoContent } from './todoFile.js'

function namedError(name, message = name) {
  const error = new Error(message)
  error.name = name
  return error
}

class FakeFileHandle {
  constructor(name, content = '') {
    this.kind = 'file'
    this.name = name
    this.content = content
    this.lastModified = Date.now()
  }

  async getFile() {
    const content = this.content
    return {
      name: this.name,
      lastModified: this.lastModified,
      size: Buffer.byteLength(content),
      text: async () => content,
    }
  }

  async createWritable() {
    const self = this
    let buffer = ''
    return {
      async write(chunk) {
        buffer += String(chunk)
      },
      async close() {
        self.content = buffer
        self.lastModified = Date.now()
      },
      async abort() {
        buffer = ''
      },
    }
  }
}

class FakeDirectoryHandle {
  constructor(name, entries = new Map()) {
    this.kind = 'directory'
    this.name = name
    this.entriesMap = entries
  }

  async getFileHandle(name, { create = false } = {}) {
    const existing = this.entriesMap.get(name)
    if (existing) {
      if (existing.kind !== 'file') throw namedError('TypeMismatchError')
      return existing
    }
    if (!create) throw namedError('NotFoundError')
    const handle = new FakeFileHandle(name)
    this.entriesMap.set(name, handle)
    return handle
  }

  async getDirectoryHandle(name, { create = false } = {}) {
    const existing = this.entriesMap.get(name)
    if (existing) {
      if (existing.kind !== 'directory') throw namedError('TypeMismatchError')
      return existing
    }
    if (!create) throw namedError('NotFoundError')
    const handle = new FakeDirectoryHandle(name)
    this.entriesMap.set(name, handle)
    return handle
  }

  async removeEntry(name, { recursive = false } = {}) {
    const existing = this.entriesMap.get(name)
    if (!existing) throw namedError('NotFoundError')
    if (existing.kind === 'directory' && existing.entriesMap.size > 0 && !recursive) {
      throw namedError('InvalidModificationError')
    }
    this.entriesMap.delete(name)
  }

  async *values() {
    yield* this.entriesMap.values()
  }

  async *entries() {
    for (const [name, handle] of this.entriesMap) yield [name, handle]
  }
}

function file(name, content = '') {
  return new FakeFileHandle(name, content)
}

function directory(name, entries = []) {
  const map = new Map()
  for (const entry of entries) map.set(entry.name, entry)
  return new FakeDirectoryHandle(name, map)
}

const timestamps = {
  createdAt: '2026-10-20T01:00:00.000Z',
  updatedAt: '2026-10-20T02:00:00.000Z',
}

test('loadWorkspace reads root files, categories and frontmatter', async () => {
  const weekly = serializeTodoContent({
    title: '写周报',
    details: '本周进度',
    done: false,
    priority: 'high',
    due: '2026-10-25',
    ...timestamps,
  })
  const root = directory('root', [
    file('inbox.md', '# 收件箱\n处理邮件'),
    directory('工作', [file('周报.md', weekly)]),
    directory('.hidden', [file('hidden.md', '不应出现')]),
    file('ignore.pdf', 'not a todo'),
  ])

  const result = await loadWorkspace(root)
  assert.deepEqual(result.categories, ['工作'])
  assert.equal(result.todos.length, 2)
  assert.deepEqual(result.errors, [])

  const weeklyTodo = result.todos.find((todo) => todo.title === '写周报')
  assert.equal(weeklyTodo.category, '工作')
  assert.equal(weeklyTodo.details, '本周进度')
  assert.equal(weeklyTodo.priority, 'high')
  assert.equal(weeklyTodo.due, '2026-10-25')
  assert.equal(weeklyTodo.fileName, '周报.md')

  const inbox = result.todos.find((todo) => todo.title === '收件箱')
  assert.equal(inbox.category, '')
  assert.equal(inbox.details, '处理邮件')
})

test('createTodo writes a safe markdown file', async () => {
  const root = directory('root', [directory('工作')])
  const todo = await createTodo(root, {
    title: '写/周报',
    category: '工作',
    todos: [],
  })

  assert.equal(todo.category, '工作')
  assert.equal(todo.storedCategory, '工作')
  assert.equal(todo.fileName, '写 周报.md')
  assert.equal(todo.storedFileName, '写 周报.md')

  const workDir = root.entriesMap.get('工作')
  const stored = workDir.entriesMap.get('写 周报.md')
  assert.ok(stored)
  const parsed = parseTodoContent(stored.name, stored.content)
  assert.equal(parsed.title, '写/周报')
  assert.equal(parsed.done, false)
  assert.equal(parsed.details, '')
})

test('createTodo avoids file name collisions', async () => {
  const root = directory('root')
  const first = await createTodo(root, { title: '重复', todos: [] })
  const second = await createTodo(root, { title: '重复', todos: [first] })
  assert.equal(first.fileName, '重复.md')
  assert.equal(second.fileName, '重复 (2).md')
  assert.ok(root.entriesMap.has('重复 (2).md'))
})

test('createTodo also avoids files that exist on disk but are not loaded', async () => {
  const root = directory('root', [file('重复.md', '外部文件')])
  const todo = await createTodo(root, { title: '重复', todos: [] })
  assert.equal(todo.fileName, '重复 (2).md')
  assert.equal(root.entriesMap.get('重复.md').content, '外部文件')
})

test('saveTodo renames the file and updates content', async () => {
  const root = directory('root')
  const original = await createTodo(root, { title: '旧标题', todos: [] })
  const updated = {
    ...original,
    title: '新标题',
    details: '新的详情',
    done: true,
    priority: 'high',
    due: '2026-10-30',
  }

  const saved = await saveTodo(root, updated, [original])
  assert.equal(saved.fileName, '新标题.md')
  assert.equal(saved.storedFileName, '新标题.md')
  assert.equal(root.entriesMap.has('旧标题.md'), false)
  assert.ok(root.entriesMap.has('新标题.md'))

  const stored = root.entriesMap.get('新标题.md')
  const parsed = parseTodoContent(stored.name, stored.content)
  assert.equal(parsed.title, '新标题')
  assert.equal(parsed.details, '新的详情')
  assert.equal(parsed.done, true)
  assert.equal(parsed.priority, 'high')
  assert.equal(parsed.due, '2026-10-30')
})

test('saveTodo moves the file between categories', async () => {
  const workDirectory = directory('工作')
  const root = directory('root', [workDirectory])
  const created = await createTodo(root, { title: '任务', todos: [] })

  const moved = await saveTodo(root, { ...created, category: '工作' }, [created])
  assert.equal(moved.category, '工作')
  assert.equal(moved.storedCategory, '工作')
  assert.ok(workDirectory.entriesMap.has('任务.md'))
  assert.equal(root.entriesMap.has('任务.md'), false)
})

test('relocateCategory moves todos and removes the old empty folder', async () => {
  const oldDirectory = directory('旧', [
    file('a.md', '# A\nA 的详情'),
    file('b.md', '# B\nB 的详情'),
  ])
  const root = directory('root', [oldDirectory])
  const loaded = await loadWorkspace(root)

  const result = await relocateCategory(root, '旧', '新', loaded.todos)
  assert.deepEqual(result.errors, [])
  assert.equal(result.removedOld, true)
  assert.equal(root.entriesMap.has('旧'), false)
  assert.ok(root.entriesMap.has('新'))

  const newDirectory = root.entriesMap.get('新')
  // 文件名由标题推导；普通 Markdown 的标题来自第一行 # A / # B。
  assert.ok(newDirectory.entriesMap.has('A.md'))
  assert.ok(newDirectory.entriesMap.has('B.md'))
  assert.ok(result.todos.every((todo) => todo.category === '新'))
  assert.ok(result.todos.every((todo) => todo.storedCategory === '新'))
})

test('relocateCategory keeps the old folder when non-todo files remain', async () => {
  const oldDirectory = directory('旧', [
    file('a.md', '# A\nA'),
    file('说明.pdf', 'keep me'),
  ])
  const root = directory('root', [oldDirectory])
  const loaded = await loadWorkspace(root)

  const result = await relocateCategory(root, '旧', '新', loaded.todos)
  assert.deepEqual(result.errors, [])
  assert.equal(result.removedOld, false)
  assert.ok(root.entriesMap.has('旧'))
  assert.ok(result.leftovers.includes('说明.pdf'))
  assert.ok(root.entriesMap.get('新').entriesMap.has('A.md'))
})

test('deleteTodo removes the stored file', async () => {
  const root = directory('root')
  const todo = await createTodo(root, { title: '要删除', todos: [] })
  assert.equal(root.entriesMap.has('要删除.md'), true)

  const deleted = await deleteTodo(root, todo)
  assert.equal(deleted, true)
  assert.equal(root.entriesMap.has('要删除.md'), false)
})

test('saveTodo preserves a non-markdown extension', async () => {
  const root = directory('root', [file('旧笔记.txt', '# 旧笔记\n内容')])
  const loaded = await loadWorkspace(root)
  const todo = loaded.todos[0]

  const saved = await saveTodo(root, { ...todo, title: '新笔记', details: '更新' }, loaded.todos)
  assert.equal(saved.fileName, '新笔记.txt')
  assert.ok(root.entriesMap.has('新笔记.txt'))
  assert.equal(root.entriesMap.has('旧笔记.txt'), false)
})
