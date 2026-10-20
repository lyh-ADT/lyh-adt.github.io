import { useMemo, useState } from 'react'
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  EyeIcon,
  FileTextIcon,
  FolderIcon,
  PencilIcon,
  TrashIcon,
} from './Icons'
import { formatDue, isOverdue, priorityLabel } from '../lib/todoFile'
import MarkdownPreview from './MarkdownPreview'

function SaveStatus({ status }) {
  if (status.state === 'saving') {
    return (
      <span className="save-status is-saving">
        <span className="mini-spinner" />
        保存中…
      </span>
    )
  }
  if (status.state === 'error') {
    return <span className="save-status is-error">{status.message || '保存失败'}</span>
  }
  if (status.state === 'dirty') {
    return <span className="save-status is-dirty">未保存</span>
  }
  if (status.state === 'saved') {
    const date = new Date(status.at)
    const time = `${String(date.getHours()).padStart(2, '0')}:${String(
      date.getMinutes()
    ).padStart(2, '0')}`
    return <span className="save-status is-saved">已保存 {time}</span>
  }
  return <span className="save-status">自动保存</span>
}

export default function TodoEditor({
  todo,
  categories,
  saveStatus,
  isDirty,
  busy,
  onUpdate,
  onToggle,
  onDelete,
  onBack,
  onSave,
}) {
  const [mode, setMode] = useState('edit')
  const overdue = isOverdue(todo.due, todo.done)
  const detailsLength = useMemo(() => Array.from(todo.details || '').length, [todo.details])

  const handleTitleBlur = () => {
    if (!todo.title.trim()) onUpdate({ title: '未命名待办' })
  }

  return (
    <section className="editor-pane" aria-label="待办详情">
      <header className="editor-head">
        <button type="button" className="editor-back" onClick={onBack}>
          <ArrowLeftIcon size={17} />
          返回列表
        </button>
        <div className="editor-path" title={`${todo.category || '未分类'}/${todo.fileName}`}>
          <FolderIcon size={14} />
          <span>{todo.category || '未分类'}</span>
          <span className="path-separator">/</span>
          <span className="path-file">{todo.fileName}</span>
        </div>
        <div className="editor-head-actions">
          <button
            type="button"
            className="editor-delete"
            onClick={onDelete}
            disabled={busy}
            title="删除这条待办"
          >
            <TrashIcon size={16} />
            <span>删除</span>
          </button>
        </div>
      </header>

      <div className="editor-scroll">
        <div className="editor-title-row">
          <button
            type="button"
            className={`todo-check large${todo.done ? ' is-checked' : ''}`}
            aria-label={todo.done ? '标记为未完成' : '标记为完成'}
            aria-pressed={todo.done}
            onClick={onToggle}
          >
            {todo.done ? <CheckIcon size={17} /> : null}
          </button>
          <input
            className={`title-input${todo.done ? ' is-done' : ''}`}
            value={todo.title}
            onChange={(event) => onUpdate({ title: event.target.value })}
            onBlur={handleTitleBlur}
            placeholder="待办标题"
            aria-label="待办标题"
            maxLength={160}
          />
        </div>

        <div className="editor-meta">
          <label className="meta-field">
            <span className="meta-label">分类</span>
            <span className="select-wrap">
              <FolderIcon size={14} />
              <select
                value={todo.category || ''}
                onChange={(event) => onUpdate({ category: event.target.value })}
                aria-label="待办分类"
              >
                <option value="">未分类</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </span>
          </label>

          <label className="meta-field">
            <span className="meta-label">优先级</span>
            <span className="select-wrap">
              <span className={`priority-dot priority-${todo.priority}`} />
              <select
                value={todo.priority}
                onChange={(event) => onUpdate({ priority: event.target.value })}
                aria-label="优先级"
              >
                <option value="low">{priorityLabel('low')}</option>
                <option value="normal">{priorityLabel('normal')}</option>
                <option value="high">{priorityLabel('high')}</option>
              </select>
            </span>
          </label>

          <label className={`meta-field date-field${overdue ? ' is-overdue' : ''}`}>
            <span className="meta-label">截止日期</span>
            <span className="date-control">
              <CalendarIcon size={14} />
              <input
                type="date"
                value={todo.due || ''}
                onChange={(event) => onUpdate({ due: event.target.value })}
                aria-label="截止日期"
              />
              {todo.due ? (
                <button
                  type="button"
                  className="date-clear"
                  onClick={() => onUpdate({ due: '' })}
                  aria-label="清除截止日期"
                  title="清除截止日期"
                >
                  ×
                </button>
              ) : null}
            </span>
            {overdue ? <span className="overdue-label">已逾期</span> : null}
          </label>

          <div className="meta-field meta-file">
            <span className="meta-label">文件</span>
            <span className="file-name" title={todo.fileName}>
              <FileTextIcon size={14} />
              {todo.fileName}
            </span>
          </div>
        </div>

        <div className="detail-head">
          <div className="detail-tabs" role="tablist" aria-label="详情视图">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'edit'}
              className={mode === 'edit' ? 'is-active' : ''}
              onClick={() => setMode('edit')}
            >
              <PencilIcon size={14} />
              编辑
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'preview'}
              className={mode === 'preview' ? 'is-active' : ''}
              onClick={() => setMode('preview')}
            >
              <EyeIcon size={14} />
              预览
            </button>
          </div>
          <span className="detail-count">
            {todo.due ? `截止 ${formatDue(todo.due)} · ` : ''}
            {detailsLength} 字
          </span>
        </div>

        <div className={`detail-body detail-${mode}`}>
          {mode === 'edit' ? (
            <textarea
              className="detail-textarea"
              value={todo.details}
              onChange={(event) => onUpdate({ details: event.target.value })}
              placeholder="写下这件事的背景、下一步、链接，或者任何想记下的细节…"
              aria-label="待办详情"
              spellCheck="false"
            />
          ) : (
            <MarkdownPreview text={todo.details} />
          )}
        </div>

        <footer className="editor-footer">
          <div className="editor-footer-status">
            <SaveStatus status={saveStatus} />
            <span className="footer-hint">Markdown · 文件夹内自动同步</span>
          </div>
          <button
            type="button"
            className="button button-primary editor-save"
            onClick={onSave}
            disabled={!isDirty && saveStatus.state !== 'error'}
          >
            {saveStatus.state === 'saving' ? <span className="mini-spinner light" /> : null}
            {isDirty ? '保存' : '已保存'}
          </button>
        </footer>
      </div>
    </section>
  )
}
