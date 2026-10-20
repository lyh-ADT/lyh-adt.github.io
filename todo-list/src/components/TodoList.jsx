import { useMemo, useRef, useState } from 'react'
import {
  CalendarIcon,
  CheckIcon,
  FileTextIcon,
  FolderIcon,
  PlusIcon,
  SearchIcon,
  CloseIcon,
} from './Icons'
import {
  formatDue,
  formatRelativeTime,
  isOverdue,
  priorityLabel,
  todoSnippet,
} from '../lib/todoFile'

function TodoCard({ todo, selected, showCategory, onSelect, onToggle }) {
  const snippet = useMemo(() => todoSnippet(todo.details), [todo.details])
  const overdue = isOverdue(todo.due, todo.done)

  return (
    <article
      className={`todo-card${selected ? ' is-selected' : ''}${todo.done ? ' is-done' : ''}${
        todo.priority === 'high' && !todo.done ? ' is-priority-high' : ''
      }`}
      role="button"
      tabIndex={0}
      aria-current={selected ? 'true' : undefined}
      onClick={() => onSelect(todo.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(todo.id)
        }
      }}
    >
      <button
        type="button"
        className={`todo-check${todo.done ? ' is-checked' : ''}`}
        aria-label={todo.done ? `标记「${todo.title}」为未完成` : `完成「${todo.title}」`}
        aria-pressed={todo.done}
        onClick={(event) => {
          event.stopPropagation()
          onToggle(todo.id)
        }}
      >
        {todo.done ? <CheckIcon size={13} /> : null}
      </button>

      <div className="todo-card-body">
        <div className="todo-card-title-row">
          <h3 title={todo.title}>{todo.title}</h3>
          {todo.priority === 'high' && !todo.done ? (
            <span className="priority-flag" title="高优先级">
              高
            </span>
          ) : null}
        </div>

        {snippet ? <p className="todo-snippet">{snippet}</p> : null}

        <div className="todo-meta">
          {todo.due ? (
            <span className={`todo-due${overdue ? ' is-overdue' : ''}`}>
              <CalendarIcon size={12} />
              {formatDue(todo.due)}
            </span>
          ) : null}
          {showCategory ? (
            <span className="todo-category">
              <FolderIcon size={12} />
              {todo.category || '未分类'}
            </span>
          ) : null}
          {todo.priority !== 'normal' && !todo.done ? (
            <span className={`todo-priority priority-${todo.priority}`}>
              {priorityLabel(todo.priority)}优先级
            </span>
          ) : null}
          <span className="todo-updated">{formatRelativeTime(todo.updatedAt)}</span>
        </div>
      </div>
    </article>
  )
}

function EmptyState({ mode, onClearSearch, onResetFilter, activeTitle }) {
  if (mode === 'search') {
    return (
      <div className="list-empty">
        <span className="empty-icon">
          <SearchIcon size={22} />
        </span>
        <h3>没有找到匹配的待办</h3>
        <p>换个关键词试试，或者清空搜索。</p>
        <button type="button" className="button button-ghost" onClick={onClearSearch}>
          清空搜索
        </button>
      </div>
    )
  }

  if (mode === 'done') {
    return (
      <div className="list-empty">
        <span className="empty-icon">
          <CheckIcon size={22} />
        </span>
        <h3>还没有完成的待办</h3>
        <p>完成一条待办后，它会出现在这里。</p>
        <button type="button" className="button button-ghost" onClick={onResetFilter}>
          查看未完成
        </button>
      </div>
    )
  }

  if (mode === 'completed-all') {
    return (
      <div className="list-empty">
        <span className="empty-icon">
          <CheckIcon size={22} />
        </span>
        <h3>全部完成了</h3>
        <p>「{activeTitle}」里没有未完成的待办。</p>
        <button type="button" className="button button-ghost" onClick={onResetFilter}>
          查看已完成
        </button>
      </div>
    )
  }

  return (
    <div className="list-empty">
      <span className="empty-icon">
        <FileTextIcon size={22} />
      </span>
      <h3>这里还没有待办</h3>
      <p>在上面的输入框里写下第一件事，回车即可创建文件。</p>
    </div>
  )
}

export default function TodoList({
  activeTitle,
  activeEyebrow,
  activeCategoryKey,
  todos,
  openCount,
  doneCount,
  totalCount,
  filter,
  search,
  onFilterChange,
  onSearchChange,
  onQuickAdd,
  onSelectTodo,
  onToggleTodo,
  selectedId,
  onNew,
}) {
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)
  const inputRef = useRef(null)
  const searchRef = useRef(null)

  const hasQuery = search.trim().length > 0

  const submit = async (event) => {
    event.preventDefault()
    const title = draft.trim()
    if (!title || adding) {
      inputRef.current?.focus()
      return
    }
    setAdding(true)
    try {
      const created = await onQuickAdd(title)
      if (created) {
        setDraft('')
        inputRef.current?.focus()
      }
    } finally {
      setAdding(false)
    }
  }

  let emptyMode = null
  if (hasQuery) emptyMode = 'search'
  else if (totalCount === 0) emptyMode = null
  else if (filter === 'done') emptyMode = 'done'
  else if (filter === 'open' && openCount === 0) emptyMode = 'completed-all'

  return (
    <section className="list-pane" aria-label="待办列表">
      <div className="list-head">
        <div className="list-heading">
          <p className="eyebrow">{activeEyebrow}</p>
          <h2>{activeTitle}</h2>
          <p className="list-subtitle">
            {openCount} 条未完成
            {doneCount > 0 ? ` · ${doneCount} 条已完成` : ''}
          </p>
        </div>
        <button
          type="button"
          className="icon-button list-new"
          onClick={() => {
            onNew?.()
            inputRef.current?.focus()
            inputRef.current?.select()
          }}
          title="新建待办"
          aria-label="新建待办"
        >
          <PlusIcon size={20} />
        </button>
      </div>

      <form className="quick-add" onSubmit={submit}>
        <span className="quick-add-icon">
          <PlusIcon size={17} />
        </span>
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={
            activeCategoryKey === '__all__'
              ? '添加一条待办，回车创建文件…'
              : `添加到「${activeTitle}」…`
          }
          aria-label="新建待办标题"
          disabled={adding}
        />
        <button type="submit" className="quick-add-submit" disabled={adding || !draft.trim()}>
          {adding ? <span className="mini-spinner" /> : '创建'}
        </button>
      </form>

      <div className="list-tools">
        <div className="segmented" role="group" aria-label="筛选待办">
          <button
            type="button"
            className={filter === 'open' ? 'is-active' : ''}
            onClick={() => onFilterChange('open')}
          >
            未完成
            <span>{openCount}</span>
          </button>
          <button
            type="button"
            className={filter === 'all' ? 'is-active' : ''}
            onClick={() => onFilterChange('all')}
          >
            全部
            <span>{totalCount}</span>
          </button>
          <button
            type="button"
            className={filter === 'done' ? 'is-active' : ''}
            onClick={() => onFilterChange('done')}
          >
            已完成
            <span>{doneCount}</span>
          </button>
        </div>

        <div className="search-box">
          <SearchIcon size={15} />
          <input
            ref={searchRef}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="搜索"
            aria-label="搜索待办"
          />
          {search ? (
            <button
              type="button"
              className="search-clear"
              onClick={() => {
                onSearchChange('')
                searchRef.current?.focus()
              }}
              aria-label="清空搜索"
            >
              <CloseIcon size={13} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="todo-list">
        {todos.map((todo) => (
          <TodoCard
            key={todo.id}
            todo={todo}
            selected={selectedId === todo.id}
            showCategory={activeCategoryKey === '__all__'}
            onSelect={onSelectTodo}
            onToggle={onToggleTodo}
          />
        ))}

        {todos.length === 0 ? (
          <EmptyState
            mode={emptyMode}
            activeTitle={activeTitle}
            onClearSearch={() => onSearchChange('')}
            onResetFilter={() => onFilterChange(emptyMode === 'completed-all' ? 'done' : 'open')}
          />
        ) : null}
      </div>
    </section>
  )
}
