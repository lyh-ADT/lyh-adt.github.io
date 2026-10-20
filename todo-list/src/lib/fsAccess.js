const DB_NAME = 'todo-files'
const DB_VERSION = 1
const STORE_NAME = 'handles'
const ROOT_KEY = 'root-directory'

export function isFileSystemAccessSupported() {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前浏览器不支持 IndexedDB'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('IndexedDB 打开失败'))
    request.onblocked = () => reject(new Error('IndexedDB 被其他标签页占用'))
  })
}

export async function saveRootHandle(handle) {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(handle, ROOT_KEY)
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => {
      const error = transaction.error
      database.close()
      reject(error || new Error('保存文件夹句柄失败'))
    }
    transaction.onabort = () => {
      const error = transaction.error
      database.close()
      reject(error || new Error('保存文件夹句柄被中止'))
    }
  })
}

export async function loadRootHandle() {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(ROOT_KEY)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error || new Error('读取文件夹句柄失败'))
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => {
      const error = transaction.error
      database.close()
      reject(error || new Error('读取文件夹句柄失败'))
    }
  })
}

export async function clearRootHandle() {
  try {
    const database = await openDatabase()
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).delete(ROOT_KEY)
      transaction.oncomplete = () => {
        database.close()
        resolve()
      }
      transaction.onerror = () => {
        const error = transaction.error
        database.close()
        reject(error || new Error('清除文件夹句柄失败'))
      }
    })
  } catch {
    // 没有 IndexedDB 时不影响主流程。
  }
}

export async function pickDirectory() {
  if (!isFileSystemAccessSupported()) {
    throw new Error('当前浏览器不支持 File System Access API')
  }
  try {
    return await window.showDirectoryPicker({
      id: 'todo-files-root',
      mode: 'readwrite',
      startIn: 'documents',
    })
  } catch (error) {
    // 个别旧版 Chromium 不认识新的 picker 选项，回退到无参数调用。
    if (error?.name === 'TypeError') {
      return window.showDirectoryPicker()
    }
    throw error
  }
}

export async function queryPermission(handle) {
  if (!handle || typeof handle.queryPermission !== 'function') return 'granted'
  try {
    return await handle.queryPermission({ mode: 'readwrite' })
  } catch {
    return 'prompt'
  }
}

export async function requestPermission(handle) {
  if (!handle || typeof handle.requestPermission !== 'function') return 'granted'
  try {
    return await handle.requestPermission({ mode: 'readwrite' })
  } catch {
    return 'denied'
  }
}

export async function ensurePermission(handle) {
  const state = await queryPermission(handle)
  if (state === 'granted') return true
  if (state === 'denied') return false
  return (await requestPermission(handle)) === 'granted'
}

export async function readDirectoryEntries(directoryHandle) {
  const entries = []
  if (!directoryHandle) return entries
  if (typeof directoryHandle.values === 'function') {
    for await (const entry of directoryHandle.values()) entries.push(entry)
    return entries
  }
  for await (const [, entry] of directoryHandle.entries()) entries.push(entry)
  return entries
}

export async function listCategories(rootHandle) {
  const entries = await readDirectoryEntries(rootHandle)
  return entries
    .filter((entry) => entry.kind === 'directory' && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

export async function getDirectoryHandle(parentHandle, name, { create = false } = {}) {
  return parentHandle.getDirectoryHandle(name, { create })
}

export async function getFileHandle(parentHandle, name, { create = false } = {}) {
  return parentHandle.getFileHandle(name, { create })
}

export async function readFileText(fileHandle) {
  const file = await fileHandle.getFile()
  return {
    text: await file.text(),
    lastModified: file.lastModified,
    size: file.size,
  }
}

export async function writeFileText(fileHandle, content) {
  const writable = await fileHandle.createWritable()
  try {
    await writable.write(content)
    await writable.close()
  } catch (error) {
    try {
      await writable.abort()
    } catch {
      // 忽略 abort 的二次错误。
    }
    throw error
  }
}

export async function removeFile(parentHandle, name) {
  try {
    await parentHandle.removeEntry(name)
    return true
  } catch (error) {
    if (error?.name === 'NotFoundError') return false
    throw error
  }
}

export async function directoryIsEmpty(directoryHandle) {
  const entries = await readDirectoryEntries(directoryHandle)
  return entries.length === 0
}

export async function removeEmptyDirectory(parentHandle, name) {
  const directoryHandle = await parentHandle.getDirectoryHandle(name)
  if (!(await directoryIsEmpty(directoryHandle))) return false
  await parentHandle.removeEntry(name)
  return true
}

export function describeFileSystemError(error) {
  const name = error?.name || ''
  if (name === 'AbortError') return ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return '没有获得文件夹的读写权限，请重新选择或授权'
  }
  if (name === 'NotFoundError') return '文件或文件夹不存在，可能已在外部被移动或删除'
  if (name === 'InvalidModificationError') return '无法完成操作：文件夹不是空的'
  if (name === 'NoModificationAllowedError') return '文件被占用或不允许修改'
  if (name === 'QuotaExceededError') return '磁盘空间不足，无法写入文件'
  return error?.message || '操作失败，请稍后重试'
}
