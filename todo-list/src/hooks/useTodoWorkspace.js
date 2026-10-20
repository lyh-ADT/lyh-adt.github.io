import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearRootHandle,
  describeFileSystemError,
  ensurePermission,
  isFileSystemAccessSupported,
  listCategories,
  loadRootHandle,
  pickDirectory,
  queryPermission,
  requestPermission,
  saveRootHandle,
} from '../lib/fsAccess'
import {
  createCategory as createCategoryOnDisk,
  createTodo as createTodoOnDisk,
  deleteTodo as deleteTodoOnDisk,
  loadWorkspace,
  relocateCategory,
  saveTodo,
} from '../lib/workspace'

const AUTO_SAVE_DELAY = 650

export function useTodoWorkspace(notify) {
  const [supported] = useState(() => isFileSystemAccessSupported())
  const [screen, setScreen] = useState('boot')
  const [loadingLabel, setLoadingLabel] = useState('正在准备…')
  const [rootHandle, setRootHandle] = useState(null)
  const [savedHandle, setSavedHandle] = useState(null)
  const [categories, setCategories] = useState([])
  const [todos, setTodos] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [saveStatus, setSaveStatus] = useState({ state: 'idle', at: null, message: '' })
  const [isDirty, setIsDirty] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [permissionLost, setPermissionLost] = useState(false)
  const [busyAction, setBusyAction] = useState('')

  const todosRef = useRef([])
  const selectedRef = useRef(null)
  const rootRef = useRef(null)
  const savedHandleRef = useRef(null)
  const dirtyRef = useRef(new Map())
  const revisionRef = useRef(new Map())
  const savingRef = useRef(false)
  const activeFlushRef = useRef(null)
  const timerRef = useRef(null)
  const flushRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimeout(timerRef.current)
    }
  }, [])

  useEffect(() => {
    selectedRef.current = selectedId
  }, [selectedId])

  useEffect(() => {
    savedHandleRef.current = savedHandle
  }, [savedHandle])

  const applyTodos = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(todosRef.current) : updater
    todosRef.current = next
    setTodos(next)
    return next
  }, [])

  const scheduleFlush = useCallback((delay = AUTO_SAVE_DELAY) => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      flushRef.current?.()
    }, delay)
  }, [])

  const markDirty = useCallback(
    (id) => {
      const revision = (revisionRef.current.get(id) || 0) + 1
      revisionRef.current.set(id, revision)
      dirtyRef.current.set(id, revision)
      setIsDirty(true)
      setSaveStatus({ state: 'dirty', at: null, message: '' })
      scheduleFlush()
    },
    [scheduleFlush]
  )

  const flushSaves = useCallback(
    async ({ silent = false } = {}) => {
      const root = rootRef.current
      if (!root) return { ok: true, skipped: true }

      if (activeFlushRef.current) {
        const result = await activeFlushRef.current
        if (result?.ok === false) return result
        if (dirtyRef.current.size > 0) {
          return flushRef.current?.({ silent }) || { ok: true }
        }
        return result || { ok: true }
      }

      if (dirtyRef.current.size === 0) {
        if (!silent) {
          setSaveStatus((current) =>
            current.state === 'dirty' ? { state: 'saved', at: Date.now(), message: '' } : current
          )
        }
        return { ok: true }
      }

      const run = (async () => {
        savingRef.current = true
        setSaveStatus({ state: 'saving', at: null, message: '' })
        let failed = false
        let lastError = null

        try {
          let passes = 0
          while (dirtyRef.current.size > 0 && passes < 20) {
            passes += 1
            const entries = Array.from(dirtyRef.current.entries())
            let processed = 0

            for (const [id, revision] of entries) {
              if (dirtyRef.current.get(id) !== revision) continue
              dirtyRef.current.delete(id)
              const todo = todosRef.current.find((item) => item.id === id)
              if (!todo) continue

              try {
                const saved = await saveTodo(root, todo, todosRef.current)
                applyTodos((current) =>
                  current.map((item) => (item.id === id ? { ...item, ...saved } : item))
                )
                processed += 1
              } catch (error) {
                if (!dirtyRef.current.has(id)) dirtyRef.current.set(id, revision)
                failed = true
                lastError = error
                if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
                  setPermissionLost(true)
                }
                console.error('保存待办失败', error)
                break
              }
            }

            if (failed || processed === 0) break
          }
        } finally {
          savingRef.current = false
        }

        if (failed) {
          const message = describeFileSystemError(lastError) || '保存失败'
          setIsDirty(true)
          setSaveStatus({ state: 'error', at: null, message })
          if (!silent) notify(message, 'error')
          return { ok: false, error: lastError }
        }

        if (dirtyRef.current.size > 0) {
          setIsDirty(true)
          setSaveStatus({ state: 'dirty', at: null, message: '' })
          scheduleFlush(250)
          return { ok: true, deferred: true }
        }

        setIsDirty(false)
        setSaveStatus({ state: 'saved', at: Date.now(), message: '' })
        return { ok: true }
      })()

      activeFlushRef.current = run
      try {
        return await run
      } finally {
        activeFlushRef.current = null
      }
    },
    [applyTodos, notify, scheduleFlush]
  )

  flushRef.current = flushSaves

  const openWorkspace = useCallback(
    async (handle) => {
      if (!handle) return false
      setScreen('loading')
      setLoadingLabel(`正在读取「${handle.name || '文件夹'}」…`)
      setPermissionLost(false)

      try {
        const data = await loadWorkspace(handle)
        if (!mountedRef.current) return false

        rootRef.current = handle
        setRootHandle(handle)
        applyTodos(data.todos)
        setCategories(data.categories)
        setSelectedId(null)
        selectedRef.current = null
        dirtyRef.current.clear()
        revisionRef.current.clear()
        setSaveStatus({ state: 'idle', at: null, message: '' })
        setIsDirty(false)
        setScreen('ready')

        if (data.errors.length > 0) {
          notify(
            `有 ${data.errors.length} 个文件读取失败，已跳过`,
            'warning'
          )
        }
        return true
      } catch (error) {
        console.error('读取文件夹失败', error)
        setScreen('welcome')
        notify(describeFileSystemError(error), 'error')
        return false
      }
    },
    [applyTodos, notify]
  )

  useEffect(() => {
    let cancelled = false

    async function boot() {
      if (!supported) {
        setScreen('welcome')
        return
      }
      try {
        const handle = await loadRootHandle()
        if (cancelled) return
        if (!handle) {
          setScreen('welcome')
          return
        }
        setSavedHandle(handle)
        savedHandleRef.current = handle
        const state = await queryPermission(handle)
        if (cancelled) return
        if (state === 'granted') {
          await openWorkspace(handle)
        } else {
          setScreen('welcome')
        }
      } catch (error) {
        console.warn('恢复上次文件夹失败', error)
        if (!cancelled) setScreen('welcome')
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [openWorkspace, supported])

  const chooseFolder = useCallback(async () => {
    if (!supported) {
      notify('当前浏览器不支持 File System Access API，请使用 Chrome 或 Edge', 'error')
      return false
    }

    let handle
    try {
      handle = await pickDirectory()
    } catch (error) {
      if (error?.name === 'AbortError') return false
      notify(describeFileSystemError(error), 'error')
      return false
    }
    if (!handle) return false

    // 选择器返回后立即检查权限，尽量保留用户手势。
    const granted = await ensurePermission(handle)
    if (!granted) {
      notify('没有获得文件夹的读写权限', 'error')
      return false
    }

    const hadWorkspace = Boolean(rootRef.current)
    if (hadWorkspace) {
      const result = await flushRef.current?.({ silent: true })
      if (result && result.ok === false) {
        notify('当前文件夹还有未保存的修改，已取消切换', 'error')
        return false
      }
    }

    const opened = await openWorkspace(handle)
    if (!opened) {
      if (hadWorkspace) setScreen('ready')
      return false
    }

    try {
      await saveRootHandle(handle)
    } catch (error) {
      console.warn('无法记住文件夹句柄', error)
      notify('无法记住这个文件夹，下次打开需要重新选择', 'warning')
    }

    setSavedHandle(handle)
    savedHandleRef.current = handle
    return true
  }, [notify, openWorkspace, supported])

  const reconnectSaved = useCallback(async () => {
    const handle = savedHandleRef.current
    if (!handle) {
      notify('没有找到上次的文件夹，请重新选择', 'warning')
      return false
    }

    const state = await requestPermission(handle)
    if (state !== 'granted') {
      notify('没有获得文件夹权限', 'error')
      return false
    }

    try {
      await saveRootHandle(handle)
    } catch {
      // 句柄仍然可用，只是下次可能无法自动恢复。
    }
    return openWorkspace(handle)
  }, [notify, openWorkspace])

  const disconnect = useCallback(async () => {
    const result = await flushRef.current?.({ silent: true })
    if (result && result.ok === false) {
      notify('还有未保存的修改，已取消断开连接', 'error')
      return false
    }
    await clearRootHandle()
    rootRef.current = null
    setRootHandle(null)
    setSavedHandle(null)
    savedHandleRef.current = null
    applyTodos([])
    setCategories([])
    setSelectedId(null)
    selectedRef.current = null
    dirtyRef.current.clear()
    revisionRef.current.clear()
    setIsDirty(false)
    setSaveStatus({ state: 'idle', at: null, message: '' })
    setPermissionLost(false)
    setScreen('welcome')
    return true
  }, [applyTodos, notify])

  const refresh = useCallback(async () => {
    const root = rootRef.current
    if (!root) return false

    const flushResult = await flushRef.current?.({ silent: true })
    if (flushResult && flushResult.ok === false) {
      notify('还有未保存的修改，已取消重新读取', 'error')
      return false
    }

    const selected = todosRef.current.find((todo) => todo.id === selectedRef.current)
    const previousPath = selected
      ? { category: selected.category || '', fileName: selected.fileName }
      : null

    setRefreshing(true)
    try {
      const data = await loadWorkspace(root)
      applyTodos(data.todos)
      setCategories(data.categories)
      if (previousPath) {
        const match = data.todos.find(
          (todo) =>
            (todo.category || '') === previousPath.category && todo.fileName === previousPath.fileName
        )
        setSelectedId(match?.id || null)
        selectedRef.current = match?.id || null
      }
      if (data.errors.length > 0) {
        notify(`有 ${data.errors.length} 个文件读取失败`, 'warning')
      }
      return true
    } catch (error) {
      notify(describeFileSystemError(error), 'error')
      return false
    } finally {
      if (mountedRef.current) setRefreshing(false)
    }
  }, [applyTodos, notify])

  const selectTodo = useCallback((id) => {
    if (selectedRef.current === id) return
    flushRef.current?.()
    selectedRef.current = id
    setSelectedId(id)
  }, [])

  const updateTodo = useCallback(
    (id, patch) => {
      applyTodos((current) =>
        current.map((todo) =>
          todo.id === id ? { ...todo, ...patch, updatedAt: new Date().toISOString() } : todo
        )
      )
      markDirty(id)
    },
    [applyTodos, markDirty]
  )

  const toggleTodo = useCallback(
    (id) => {
      const todo = todosRef.current.find((item) => item.id === id)
      if (!todo) return
      updateTodo(id, { done: !todo.done })
    },
    [updateTodo]
  )

  const addTodo = useCallback(
    async (title, category = '') => {
      const root = rootRef.current
      if (!root) return null
      const trimmed = String(title || '').trim()
      if (!trimmed) return null
      setBusyAction('create-todo')
      try {
        const todo = await createTodoOnDisk(root, {
          title: trimmed,
          category,
          todos: todosRef.current,
        })
        applyTodos((current) => [todo, ...current])
        selectedRef.current = todo.id
        setSelectedId(todo.id)
        return todo
      } catch (error) {
        notify(describeFileSystemError(error), 'error')
        return null
      } finally {
        if (mountedRef.current) setBusyAction('')
      }
    },
    [applyTodos, notify]
  )

  const removeTodo = useCallback(
    async (id) => {
      const root = rootRef.current
      if (!root) return false
      const flushResult = await flushRef.current?.({ silent: true })
      if (flushResult && flushResult.ok === false) {
        notify('还有未保存的修改，已取消删除', 'error')
        return false
      }
      const todo = todosRef.current.find((item) => item.id === id)
      if (!todo) return false

      setBusyAction('delete-todo')
      try {
        await deleteTodoOnDisk(root, todo)
        applyTodos((current) => current.filter((item) => item.id !== id))
        dirtyRef.current.delete(id)
        revisionRef.current.delete(id)
        if (selectedRef.current === id) {
          selectedRef.current = null
          setSelectedId(null)
        }
        return true
      } catch (error) {
        notify(describeFileSystemError(error), 'error')
        return false
      } finally {
        if (mountedRef.current) setBusyAction('')
      }
    },
    [applyTodos, notify]
  )

  const addCategory = useCallback(
    async (name) => {
      const root = rootRef.current
      if (!root) return false
      try {
        await createCategoryOnDisk(root, name)
        setCategories((current) =>
          Array.from(new Set([...current, name])).sort((a, b) => a.localeCompare(b, 'zh-CN'))
        )
        return true
      } catch (error) {
        notify(describeFileSystemError(error), 'error')
        return false
      }
    },
    [notify]
  )

  const renameCategory = useCallback(
    async (oldName, newName) => {
      const root = rootRef.current
      if (!root) return false
      const flushResult = await flushRef.current?.({ silent: true })
      if (flushResult && flushResult.ok === false) {
        notify('还有未保存的修改，已取消重命名', 'error')
        return false
      }

      setBusyAction('rename-category')
      try {
        const result = await relocateCategory(root, oldName, newName, todosRef.current)
        applyTodos(result.todos)

        if (result.errors.length > 0) {
          notify(`有 ${result.errors.length} 条待办未能移动`, 'error')
          const data = await loadWorkspace(root)
          applyTodos(data.todos)
          setCategories(data.categories)
          setSelectedId(null)
          selectedRef.current = null
          return false
        }

        setCategories(await listCategories(root))
        if (result.leftovers.length > 0) {
          notify('旧分类里还有非待办文件，文件夹已保留', 'warning')
        }
        return true
      } catch (error) {
        notify(describeFileSystemError(error), 'error')
        return false
      } finally {
        if (mountedRef.current) setBusyAction('')
      }
    },
    [applyTodos, notify]
  )

  const removeCategory = useCallback(
    async (name) => {
      const root = rootRef.current
      if (!root) return false
      const flushResult = await flushRef.current?.({ silent: true })
      if (flushResult && flushResult.ok === false) {
        notify('还有未保存的修改，已取消删除分类', 'error')
        return false
      }

      setBusyAction('delete-category')
      try {
        const result = await relocateCategory(root, name, '', todosRef.current)
        applyTodos(result.todos)

        if (result.errors.length > 0) {
          notify(`有 ${result.errors.length} 条待办未能移动`, 'error')
          const data = await loadWorkspace(root)
          applyTodos(data.todos)
          setCategories(data.categories)
          setSelectedId(null)
          selectedRef.current = null
          return false
        }

        setCategories(await listCategories(root))
        if (result.leftovers.length > 0) {
          notify('分类里还有非待办文件，文件夹已保留', 'warning')
        }
        return true
      } catch (error) {
        notify(describeFileSystemError(error), 'error')
        return false
      } finally {
        if (mountedRef.current) setBusyAction('')
      }
    },
    [applyTodos, notify]
  )

  const saveNow = useCallback(async () => {
    const result = await flushRef.current?.({ silent: false })
    return result?.ok !== false
  }, [])

  const retryPermission = useCallback(async () => {
    const handle = rootRef.current
    if (!handle) return false
    const state = await requestPermission(handle)
    if (state !== 'granted') {
      notify('仍未获得文件夹权限', 'error')
      return false
    }
    setPermissionLost(false)
    const ok = await refresh()
    if (ok) notify('已重新连接文件夹', 'success')
    return ok
  }, [notify, refresh])

  useEffect(() => {
    if (!isDirty) return undefined
    const handler = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden') flushRef.current?.({ silent: true })
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  return {
    supported,
    screen,
    loadingLabel,
    rootHandle,
    savedHandle,
    folderName: rootHandle?.name || savedHandle?.name || '',
    categories,
    todos,
    selectedId,
    saveStatus,
    isDirty,
    refreshing,
    permissionLost,
    busyAction,
    chooseFolder,
    reconnectSaved,
    disconnect,
    refresh,
    selectTodo,
    updateTodo,
    toggleTodo,
    addTodo,
    removeTodo,
    addCategory,
    renameCategory,
    removeCategory,
    saveNow,
    retryPermission,
    flush: flushSaves,
  }
}
