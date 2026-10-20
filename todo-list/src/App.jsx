import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { CategoryDialog, ConfirmDialog } from './components/Modal'
import Sidebar from './components/Sidebar'
import Toasts from './components/Toasts'
import TodoEditor from './components/TodoEditor'
import TodoList from './components/TodoList'
import WelcomeScreen from './components/WelcomeScreen'
import {
  AlertIcon,
  CheckIcon,
  FileTextIcon,
  FolderIcon,
  RefreshIcon,
} from './components/Icons'
import { useTodoWorkspace } from './hooks/useTodoWorkspace'

const ALL = '__all__'
const UNCATEGORIZED = '__uncategorized__'
const CATEGORY_PREFIX = 'cat:'

function categoryNameFromKey(key) {
  return key.startsWith(CATEGORY_PREFIX) ? key.slice(CATEGORY_PREFIX.length) : null
}

function sortTodos(a, b) {
  if (a.done !== b.done) return a.done ? 1 : -1
  if (a.done) return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()

  if (a.due && b.due && a.due !== b.due) return a.due.localeCompare(b.due)
  if (Boolean(a.due) !== Boolean(b.due)) return a.due ? -1 : 1

  const rank = { high: 0, normal: 1, low: 2 }
  if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority]

  // 编辑时不要因为 updatedAt 变化而让卡片跳来跳去。
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

function isNarrowScreen() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 920px)').matches
}

function TopbarStatus({ status }) {
  if (status.state === 'saving') {
    return (
      <span className="topbar-status is-saving">
        <span className="mini-spinner" />
        保存中
      </span>
    )
  }
  if (status.state === 'error') {
    return <span className="topbar-status is-error">保存失败</span>
  }
  if (status.state === 'dirty') {
    return <span className="topbar-status is-dirty">未保存</span>
  }
  if (status.state === 'saved') {
    const date = new Date(status.at)
    return (
      <span className="topbar-status is-saved">
        <span className="status-dot" />
        已同步 {String(date.getHours()).padStart(2, '0')}:
        {String(date.getMinutes()).padStart(2, '0')}
      </span>
    )
  }
  return (
    <span className="topbar-status">
      <span className="status-dot" />
      就绪
    </span>
  )
}

function LoadingScreen({ label }) {
  return (
    <div className="loading-screen">
      <div className="loading-brand">
        <span className="loading-mark">
          <CheckIcon size={22} />
        </span>
        <div>
          <strong>待办记录</strong>
          <span>TODO FILES</span>
        </div>
      </div>
      <div className="loading-panel">
        <span className="loading-spinner" />
        <h1>{label || '正在准备…'}</h1>
        <p>正在从本地文件夹读取待办文件</p>
        <div className="loading-track">
          <span />
        </div>
      </div>
      <p className="loading-footnote">所有数据只在你的电脑上读写，不会上传。</p>
    </div>
  )
}

function EditorEmpty({ folderName }) {
  return (
    <section className="editor-pane editor-empty" aria-label="待办详情">
      <div className="editor-empty-inner">
        <div className="empty-illustration">
          <span className="empty-file">
            <FileTextIcon size={30} />
          </span>
          <span className="empty-file-shadow" />
        </div>
        <p className="eyebrow">GET STARTED</p>
        <h2>选择一条待办</h2>
        <p className="editor-empty-lead">
          从左侧列表中选择一条待办来编辑，或者直接在上方输入框写下一件新事情。
        </p>
        <div className="empty-facts">
          <div>
            <FolderIcon size={16} />
            <span>
              <strong>文件夹即分类</strong>
              <small>{folderName || '本地文件夹'} / 工作、生活、阅读…</small>
            </span>
          </div>
          <div>
            <FileTextIcon size={16} />
            <span>
              <strong>一个文件一条待办</strong>
              <small>内容就是详情，随时可用其他编辑器打开</small>
            </span>
          </div>
          <div>
            <CheckIcon size={16} />
            <span>
              <strong>自动保存</strong>
              <small>Ctrl / ⌘ + S 也可以手动保存</small>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function App() {
  const [toasts, setToasts] = useState([])
  const toastTimers = useRef(new Map())

  const dismissToast = useCallback((id) => {
    const timer = toastTimers.current.get(id)
    if (timer) clearTimeout(timer)
    toastTimers.current.delete(id)
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (message, type = 'info') => {
      if (!message) return
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((current) => [...current.slice(-3), { id, message, type }])
      const timer = setTimeout(
        () => dismissToast(id),
        type === 'error' ? 6000 : type === 'warning' ? 5000 : 3800
      )
      toastTimers.current.set(id, timer)
    },
    [dismissToast]
  )

  useEffect(
    () => () => {
      for (const timer of toastTimers.current.values()) clearTimeout(timer)
      toastTimers.current.clear()
    },
    []
  )

  const workspace = useTodoWorkspace(notify)
  const {
    supported,
    screen,
    loadingLabel,
    folderName,
    savedHandle,
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
  } = workspace

  const [activeCategory, setActiveCategory] = useState(ALL)
  const [filter, setFilter] = useState('open')
  const [search, setSearch] = useState('')
  const [mobileView, setMobileView] = useState('list')
  const [dialog, setDialog] = useState(null)
  const [reconnecting, setReconnecting] = useState(false)

  const selectedTodo = useMemo(
    () => todos.find((todo) => todo.id === selectedId) || null,
    [todos, selectedId]
  )

  const activeCategoryName = categoryNameFromKey(activeCategory)
  const activeTitle =
    activeCategory === ALL
      ? '全部待办'
      : activeCategory === UNCATEGORIZED
        ? '未分类'
        : activeCategoryName || '全部待办'
  const activeEyebrow =
    activeCategory === ALL ? 'ALL TASKS' : activeCategory === UNCATEGORIZED ? 'INBOX' : 'CATEGORY'

  const categoryTodos = useMemo(() => {
    if (activeCategory === ALL) return todos
    if (activeCategory === UNCATEGORIZED) return todos.filter((todo) => !todo.category)
    if (activeCategoryName) return todos.filter((todo) => todo.category === activeCategoryName)
    return todos
  }, [activeCategory, activeCategoryName, todos])

  const openCount = useMemo(() => categoryTodos.filter((todo) => !todo.done).length, [categoryTodos])
  const doneCount = useMemo(() => categoryTodos.filter((todo) => todo.done).length, [categoryTodos])

  const visibleTodos = useMemo(() => {
    const query = search.trim().toLowerCase()
    return categoryTodos
      .filter((todo) => {
        if (filter === 'open' && todo.done) return false
        if (filter === 'done' && !todo.done) return false
        if (!query) return true
        return [todo.title, todo.details, todo.category]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      })
      .sort(sortTodos)
  }, [categoryTodos, filter, search])

  useEffect(() => {
    if (activeCategoryName && !categories.includes(activeCategoryName)) {
      setActiveCategory(ALL)
    }
  }, [activeCategoryName, categories])

  useEffect(() => {
    if (!selectedTodo && mobileView === 'detail') setMobileView('list')
  }, [mobileView, selectedTodo])

  useEffect(() => {
    if (!isNarrowScreen()) return undefined
    const media = window.matchMedia('(max-width: 920px)')
    const handleChange = (event) => {
      if (!event.matches) setMobileView('list')
    }
    media.addEventListener?.('change', handleChange)
    return () => media.removeEventListener?.('change', handleChange)
  }, [])

  const handleChooseFolder = useCallback(async () => {
    await chooseFolder()
  }, [chooseFolder])

  const handleReconnect = useCallback(async () => {
    setReconnecting(true)
    try {
      await reconnectSaved()
    } finally {
      setReconnecting(false)
    }
  }, [reconnectSaved])

  const handleRefresh = useCallback(async () => {
    const ok = await refresh()
    if (ok) notify('已重新读取文件夹', 'success')
  }, [notify, refresh])

  const handleSelectTodo = useCallback(
    (id) => {
      selectTodo(id)
      if (isNarrowScreen()) setMobileView('detail')
    },
    [selectTodo]
  )

  const handleSelectCategory = useCallback(
    (key) => {
      setActiveCategory(key)
      selectTodo(null)
      setMobileView('list')
    },
    [selectTodo]
  )

  const handleQuickAdd = useCallback(
    async (title) => {
      const category =
        activeCategory === ALL
          ? ''
          : activeCategory === UNCATEGORIZED
            ? ''
            : activeCategoryName || ''
      const created = await addTodo(title, category)
      if (created) {
        setFilter('open')
        setSearch('')
        if (isNarrowScreen()) setMobileView('detail')
      }
      return created
    },
    [activeCategory, activeCategoryName, addTodo]
  )

  const handleSearchChange = useCallback((value) => {
    setSearch(value)
    if (value.trim()) setFilter('all')
  }, [])

  const handleUpdate = useCallback(
    (patch) => {
      if (selectedTodo) updateTodo(selectedTodo.id, patch)
    },
    [selectedTodo, updateTodo]
  )

  const handleToggleSelected = useCallback(() => {
    if (selectedTodo) toggleTodo(selectedTodo.id)
  }, [selectedTodo, toggleTodo])

  const handleSave = useCallback(async () => {
    const wasDirty = isDirty
    const ok = await saveNow()
    if (ok && wasDirty) notify('已保存', 'success')
    return ok
  }, [isDirty, notify, saveNow])

  useEffect(() => {
    const handler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave])

  const openDeleteTodo = useCallback(() => {
    if (selectedTodo) setDialog({ type: 'delete-todo', id: selectedTodo.id })
  }, [selectedTodo])

  const confirmDeleteTodo = useCallback(async () => {
    if (!dialog || dialog.type !== 'delete-todo') return false
    const id = dialog.id
    const pool = visibleTodos.length > 0 ? visibleTodos : [...categoryTodos].sort(sortTodos)
    const index = pool.findIndex((todo) => todo.id === id)
    const next = pool[index + 1] || pool[index - 1] || null
    const ok = await removeTodo(id)
    if (ok) {
      if (next) {
        selectTodo(next.id)
        if (isNarrowScreen()) setMobileView('detail')
      } else {
        setMobileView('list')
      }
      notify('待办已删除', 'success')
    }
    return ok
  }, [categoryTodos, dialog, notify, removeTodo, selectTodo, visibleTodos])

  const confirmDeleteCategory = useCallback(async () => {
    if (!dialog || dialog.type !== 'delete-category') return false
    const name = dialog.name
    const ok = await removeCategory(name)
    if (ok) {
      if (activeCategory === `${CATEGORY_PREFIX}${name}`) setActiveCategory(UNCATEGORIZED)
      notify(`已移出分类「${name}」`, 'success')
    }
    return ok
  }, [activeCategory, dialog, notify, removeCategory])

  const confirmDisconnect = useCallback(async () => {
    const ok = await disconnect()
    if (ok) {
      setActiveCategory(ALL)
      setSearch('')
      setFilter('open')
      setMobileView('list')
    }
    return ok
  }, [disconnect])

  const handleRenameSubmit = useCallback(
    async (newName) => {
      if (!dialog || dialog.type !== 'rename-category') return false
      const oldName = dialog.name
      const ok = await renameCategory(oldName, newName)
      if (ok) {
        setActiveCategory(`${CATEGORY_PREFIX}${newName}`)
        notify(`分类已迁移到「${newName}」`, 'success')
      }
      return ok
    },
    [dialog, notify, renameCategory]
  )

  const handleCreateCategorySubmit = useCallback(
    async (name) => {
      const ok = await addCategory(name)
      if (ok) {
        setActiveCategory(`${CATEGORY_PREFIX}${name}`)
        selectTodo(null)
        notify(`已创建分类「${name}」`, 'success')
      }
      return ok
    },
    [addCategory, notify, selectTodo]
  )

  if (screen === 'boot' || screen === 'loading') {
    return (
      <>
        <LoadingScreen label={screen === 'boot' ? '正在准备…' : loadingLabel} />
        <Toasts toasts={toasts} onDismiss={dismissToast} />
      </>
    )
  }

  if (screen === 'welcome') {
    return (
      <>
        <WelcomeScreen
          supported={supported}
          savedHandleName={savedHandle?.name || ''}
          onChoose={handleChooseFolder}
          onReconnect={handleReconnect}
          reconnecting={reconnecting}
        />
        <Toasts toasts={toasts} onDismiss={dismissToast} />
      </>
    )
  }

  const deleteCategoryCount = dialog?.type === 'delete-category'
    ? todos.filter((todo) => todo.category === dialog.name).length
    : 0
  const deleteTodoTarget = dialog?.type === 'delete-todo'
    ? todos.find((todo) => todo.id === dialog.id)
    : null

  return (
    <div className={`app-shell${mobileView === 'detail' ? ' is-detail-view' : ''}`}>
      <header className="topbar">
        <div className="topbar-brand">
          <span className="brand-mark">
            <CheckIcon size={17} />
          </span>
          <div className="brand-text">
            <strong>待办记录</strong>
            <span>TODO FILES</span>
          </div>
        </div>

        <button
          type="button"
          className="folder-pill"
          onClick={handleChooseFolder}
          title="更换文件夹"
        >
          <FolderIcon size={15} />
          <span className="folder-pill-name">{folderName || '本地文件夹'}</span>
        </button>

        <div className="topbar-actions">
          <TopbarStatus status={saveStatus} />
          <button
            type="button"
            className="icon-button topbar-icon"
            onClick={handleRefresh}
            disabled={refreshing}
            title="重新读取文件夹"
            aria-label="重新读取文件夹"
          >
            <RefreshIcon size={18} className={refreshing ? 'is-spinning' : ''} />
          </button>
          <button
            type="button"
            className="topbar-change"
            onClick={handleChooseFolder}
            title="更换文件夹"
          >
            <FolderIcon size={15} />
            <span>更换</span>
          </button>
        </div>
      </header>

      {permissionLost ? (
        <div className="permission-banner">
          <AlertIcon size={17} />
          <span>文件夹读写权限已失效，修改可能无法保存。</span>
          <button type="button" onClick={retryPermission}>
            重新授权
          </button>
        </div>
      ) : null}

      {busyAction ? (
        <div className="busy-line" aria-hidden="true">
          <span />
        </div>
      ) : null}

      <div className="workspace">
        <Sidebar
          categories={categories}
          todos={todos}
          activeCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
          onCreateCategory={() => setDialog({ type: 'create-category' })}
          onRenameCategory={(name) => setDialog({ type: 'rename-category', name })}
          onDeleteCategory={(name) => setDialog({ type: 'delete-category', name })}
          onDisconnect={() => setDialog({ type: 'disconnect' })}
          folderName={folderName}
        />

        <TodoList
          activeTitle={activeTitle}
          activeEyebrow={activeEyebrow}
          activeCategoryKey={activeCategory}
          todos={visibleTodos}
          openCount={openCount}
          doneCount={doneCount}
          totalCount={categoryTodos.length}
          filter={filter}
          search={search}
          onFilterChange={setFilter}
          onSearchChange={handleSearchChange}
          onQuickAdd={handleQuickAdd}
          onSelectTodo={handleSelectTodo}
          onToggleTodo={toggleTodo}
          selectedId={selectedId}
        />

        {selectedTodo ? (
          <TodoEditor
            key={selectedTodo.id}
            todo={selectedTodo}
            categories={categories}
            saveStatus={saveStatus}
            isDirty={isDirty}
            busy={Boolean(busyAction)}
            onUpdate={handleUpdate}
            onToggle={handleToggleSelected}
            onDelete={openDeleteTodo}
            onBack={() => setMobileView('list')}
            onSave={handleSave}
          />
        ) : (
          <EditorEmpty folderName={folderName} />
        )}
      </div>

      {dialog?.type === 'create-category' ? (
        <CategoryDialog
          mode="create"
          categories={categories}
          onSubmit={handleCreateCategorySubmit}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {dialog?.type === 'rename-category' ? (
        <CategoryDialog
          mode="rename"
          initialName={dialog.name}
          currentName={dialog.name}
          categories={categories}
          onSubmit={handleRenameSubmit}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {dialog?.type === 'delete-category' ? (
        <ConfirmDialog
          title={`删除分类「${dialog.name}」？`}
          description={
            deleteCategoryCount > 0
              ? `分类里的 ${deleteCategoryCount} 条待办会先移到「未分类」，然后删除文件夹。非待办文件会让文件夹保留下来。`
              : '这是一个空分类，删除后无法恢复。'
          }
          confirmLabel="删除分类"
          danger
          onConfirm={confirmDeleteCategory}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {dialog?.type === 'delete-todo' && deleteTodoTarget ? (
        <ConfirmDialog
          title="删除这条待办？"
          description={`文件「${deleteTodoTarget.category ? `${deleteTodoTarget.category}/` : ''}${deleteTodoTarget.fileName}」会从磁盘中删除，无法撤销。`}
          confirmLabel="删除待办"
          danger
          onConfirm={confirmDeleteTodo}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {dialog?.type === 'disconnect' ? (
        <ConfirmDialog
          title="断开这个文件夹？"
          description="不会删除任何文件。下次打开时可以重新选择同一个文件夹，或连接其他文件夹。"
          confirmLabel="断开连接"
          onConfirm={confirmDisconnect}
          onClose={() => setDialog(null)}
        />
      ) : null}

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
