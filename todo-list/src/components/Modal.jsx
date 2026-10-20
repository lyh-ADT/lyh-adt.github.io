import { useEffect, useId, useRef, useState } from 'react'
import { CloseIcon } from './Icons'
import { validateCategoryName } from '../lib/todoFile'

export function Modal({ title, description, children, onClose, size = 'normal', danger = false }) {
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const generatedId = useId()
  const titleId = `${generatedId}-title`
  const descriptionId = `${generatedId}-desc`

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previous = document.activeElement
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current?.()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    const focusTarget = dialogRef.current?.querySelector('[data-autofocus]') || dialogRef.current
    focusTarget?.focus?.()
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previous && typeof previous.focus === 'function') previous.focus()
    }
  }, [])

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <div
        className={`modal modal-${size}${danger ? ' modal-danger' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="modal-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? (
              <p id={descriptionId} className="modal-description">
                {description}
              </p>
            ) : null}
          </div>
          <button type="button" className="icon-button modal-close" onClick={onClose} aria-label="关闭">
            <CloseIcon size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function CategoryDialog({
  mode = 'create',
  initialName = '',
  categories = [],
  currentName = '',
  onSubmit,
  onClose,
}) {
  const [value, setValue] = useState(initialName)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isRename = mode === 'rename'

  const submit = async (event) => {
    event.preventDefault()
    const trimmed = value.trim()
    const validation = validateCategoryName(trimmed, categories, isRename ? currentName : '')
    if (validation) {
      setError(validation)
      return
    }
    setError('')
    setBusy(true)
    try {
      const ok = await onSubmit(trimmed)
      if (ok) onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={isRename ? '重命名分类' : '新建分类'}
      description={
        isRename
          ? `把「${currentName}」文件夹及其中待办改名。`
          : '分类会作为子文件夹创建在待办文件夹中。'
      }
      onClose={onClose}
    >
      <form onSubmit={submit} className="dialog-form">
        <label className="field">
          <span>分类名称</span>
          <input
            data-autofocus
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              if (error) setError('')
            }}
            placeholder="例如：工作、生活、阅读"
            maxLength={60}
            disabled={busy}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="modal-actions">
          <button type="button" className="button button-ghost" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button type="submit" className="button button-primary" disabled={busy || !value.trim()}>
            {busy ? '处理中…' : isRename ? '重命名' : '创建分类'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = '确认',
  cancelLabel = '取消',
  danger = false,
  onConfirm,
  onClose,
}) {
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    setBusy(true)
    try {
      const ok = await onConfirm()
      if (ok !== false) onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={title} description={description} onClose={onClose} danger={danger} size="small">
      <div className="modal-actions">
        <button type="button" className="button button-ghost" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={danger ? 'button button-danger' : 'button button-primary'}
          onClick={confirm}
          disabled={busy}
          data-autofocus
        >
          {busy ? '处理中…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
