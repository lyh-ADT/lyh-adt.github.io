import {
  DEFAULT_EXTENSION,
  extensionOf,
  isTodoFileName,
  parseTodoContent,
  sanitizeFileName,
  serializeTodoContent,
  uniqueFileName,
} from './todoFile.js'
import {
  getDirectoryHandle,
  getFileHandle,
  readDirectoryEntries,
  readFileText,
  removeFile,
  writeFileText,
} from './fsAccess.js'

export function createTodoId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `todo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function makeTodo(category, fileHandle, parsed) {
  return {
    id: createTodoId(),
    category,
    storedCategory: category,
    fileName: fileHandle.name,
    storedFileName: fileHandle.name,
    title: parsed.title,
    details: parsed.details,
    done: parsed.done,
    priority: parsed.priority,
    due: parsed.due,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
  }
}

async function readOneTodo(category, fileHandle, errors) {
  try {
    const { text, lastModified } = await readFileText(fileHandle)
    const parsed = parseTodoContent(fileHandle.name, text, lastModified)
    return makeTodo(category, fileHandle, parsed)
  } catch (error) {
    errors.push({
      path: category ? `${category}/${fileHandle.name}` : fileHandle.name,
      message: error?.message || '读取失败',
    })
    return null
  }
}

/**
 * 读取选中文件夹的完整结构：一级子文件夹是分类，分类内（以及根目录）的
 * .md / .markdown / .mdown / .mkd / .txt 文件是待办。
 */
export async function loadWorkspace(rootHandle) {
  if (!rootHandle) throw new Error('尚未选择文件夹')

  const errors = []
  const categories = []
  const fileRefs = []
  const rootEntries = await readDirectoryEntries(rootHandle)

  for (const entry of rootEntries) {
    if (entry.name.startsWith('.')) continue

    if (entry.kind === 'directory') {
      categories.push(entry.name)
      try {
        const entries = await readDirectoryEntries(entry)
        for (const child of entries) {
          if (child.name.startsWith('.')) continue
          if (child.kind === 'file' && isTodoFileName(child.name)) {
            fileRefs.push({ category: entry.name, fileHandle: child })
          }
        }
      } catch (error) {
        errors.push({
          path: entry.name,
          message: error?.message || '无法读取分类文件夹',
        })
      }
    } else if (entry.kind === 'file' && isTodoFileName(entry.name)) {
      fileRefs.push({ category: '', fileHandle: entry })
    }
  }

  const todos = (
    await Promise.all(fileRefs.map(({ category, fileHandle }) => readOneTodo(category, fileHandle, errors)))
  ).filter(Boolean)

  categories.sort((a, b) => a.localeCompare(b, 'zh-CN'))
  todos.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  return { todos, categories, errors }
}

async function takenFileNames(directoryHandle, todos, category, excludeId, oldName = '') {
  const names = new Set()
  const entries = await readDirectoryEntries(directoryHandle)
  const oldNameLower = String(oldName || '').toLowerCase()

  for (const entry of entries) {
    if (entry.kind === 'file' && entry.name.toLowerCase() !== oldNameLower) {
      names.add(entry.name)
    }
  }

  for (const todo of todos) {
    if (todo.id === excludeId) continue
    if ((todo.category || '') !== category) continue
    if (String(todo.fileName || '').toLowerCase() !== oldNameLower) {
      names.add(todo.fileName)
    }
  }

  return names
}

/**
 * 新建一个待办文件。标题会转换为文件名，详情初始为空。
 */
export async function createTodo(rootHandle, { title, category = '', todos = [] }) {
  const now = new Date().toISOString()
  const safeTitle = String(title || '').trim() || '未命名待办'
  const directoryHandle = category ? await getDirectoryHandle(rootHandle, category) : rootHandle
  const existing = todos
    .filter((todo) => (todo.category || '') === category)
    .map((todo) => todo.fileName)
  for (const entry of await readDirectoryEntries(directoryHandle)) {
    if (entry.kind === 'file') existing.push(entry.name)
  }
  const fileName = uniqueFileName(sanitizeFileName(safeTitle, DEFAULT_EXTENSION), existing)
  const fileHandle = await getFileHandle(directoryHandle, fileName, { create: true })

  const todo = {
    id: createTodoId(),
    category,
    storedCategory: category,
    fileName,
    storedFileName: fileName,
    title: safeTitle,
    details: '',
    done: false,
    priority: 'normal',
    due: '',
    createdAt: now,
    updatedAt: now,
  }

  try {
    await writeFileText(fileHandle, serializeTodoContent(todo))
  } catch (error) {
    await removeFile(directoryHandle, fileName).catch(() => {})
    throw error
  }

  return todo
}

/**
 * 保存待办。标题变化会重命名文件，分类变化会把文件移动到对应文件夹。
 * 先写新位置，再删除旧位置，避免中途失败丢内容。
 */
export async function saveTodo(rootHandle, todo, allTodos = []) {
  const now = new Date().toISOString()
  const targetCategory = todo.category || ''
  const storedCategory = todo.storedCategory || ''
  const oldName = todo.storedFileName || todo.fileName || ''
  const extension =
    extensionOf(todo.fileName) || extensionOf(todo.storedFileName) || DEFAULT_EXTENSION
  const desiredName = sanitizeFileName(todo.title, extension)

  const sameFolder = storedCategory === targetCategory
  const sameNameIgnoringCase =
    Boolean(oldName) && oldName.toLowerCase() === desiredName.toLowerCase()

  const directoryHandle = targetCategory
    ? await getDirectoryHandle(rootHandle, targetCategory)
    : rootHandle

  let targetName = sameFolder && sameNameIgnoringCase ? oldName : desiredName
  const sameLocation = sameFolder && oldName === targetName

  if (!sameLocation) {
    const taken = await takenFileNames(
      directoryHandle,
      allTodos,
      targetCategory,
      todo.id,
      sameFolder ? oldName : ''
    )
    targetName = uniqueFileName(targetName, taken)
  }

  const targetHandle = await getFileHandle(directoryHandle, targetName, { create: true })
  const nextTodo = {
    ...todo,
    category: targetCategory,
    fileName: targetName,
    updatedAt: now,
  }

  await writeFileText(targetHandle, serializeTodoContent(nextTodo))

  const moved = !(storedCategory === targetCategory && oldName === targetName)
  if (moved && oldName) {
    const oldDirectory = storedCategory
      ? await getDirectoryHandle(rootHandle, storedCategory).catch((error) => {
          if (error?.name === 'NotFoundError') return null
          throw error
        })
      : rootHandle
    if (oldDirectory) {
      await removeFile(oldDirectory, oldName)
    }
  }

  return {
    category: targetCategory,
    fileName: targetName,
    storedCategory: targetCategory,
    storedFileName: targetName,
    updatedAt: now,
  }
}

export async function deleteTodo(rootHandle, todo) {
  const category = todo.storedCategory || ''
  const name = todo.storedFileName || todo.fileName
  if (!name) return false

  const directoryHandle = category
    ? await getDirectoryHandle(rootHandle, category).catch((error) => {
        if (error?.name === 'NotFoundError') return null
        throw error
      })
    : rootHandle

  if (!directoryHandle) return false
  return removeFile(directoryHandle, name)
}

export async function createCategory(rootHandle, name) {
  await getDirectoryHandle(rootHandle, name, { create: true })
  return name
}

/**
 * 把一个分类下的待办整体移动到一个新分类（newCategory 为空字符串时移到根目录），
 * 并尽量删除已经清空的旧分类文件夹。非待办文件会让旧文件夹保留下来。
 */
export async function relocateCategory(rootHandle, oldCategory, newCategory, todos) {
  if (newCategory) {
    await getDirectoryHandle(rootHandle, newCategory, { create: true })
  }

  let working = todos.map((todo) => {
    if ((todo.storedCategory || '') !== oldCategory) return todo
    return { ...todo, category: newCategory }
  })

  const candidates = working.filter((todo) => (todo.storedCategory || '') === oldCategory)
  const errors = []
  const movedIds = []

  for (const candidate of candidates) {
    const current = working.find((todo) => todo.id === candidate.id)
    if (!current) continue
    try {
      const saved = await saveTodo(rootHandle, current, working)
      working = working.map((todo) => (todo.id === current.id ? { ...todo, ...saved } : todo))
      movedIds.push(current.id)
    } catch (error) {
      working = working.map((todo) =>
        todo.id === current.id ? { ...todo, category: oldCategory } : todo
      )
      errors.push({
        todoId: current.id,
        title: current.title,
        message: error?.message || '移动失败',
      })
    }
  }

  const oldDirectory = await getDirectoryHandle(rootHandle, oldCategory).catch((error) => {
    if (error?.name === 'NotFoundError') return null
    throw error
  })

  let removedOld = false
  let leftovers = []

  if (oldDirectory) {
    const entries = await readDirectoryEntries(oldDirectory)
    if (entries.length === 0) {
      try {
        await rootHandle.removeEntry(oldCategory)
        removedOld = true
      } catch {
        // 删除空文件夹失败不影响已经移动的待办。
      }
    } else {
      leftovers = entries.map((entry) => entry.name)
    }
  }

  return { todos: working, errors, movedIds, removedOld, leftovers }
}
