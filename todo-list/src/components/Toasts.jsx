import { AlertIcon, CheckIcon, CloseIcon, SparkIcon } from './Icons'

const ICONS = {
  success: CheckIcon,
  error: AlertIcon,
  warning: AlertIcon,
  info: SparkIcon,
}

export default function Toasts({ toasts, onDismiss }) {
  if (!toasts.length) return null

  return (
    <div className="toast-viewport" role="status" aria-live="polite">
      {toasts.map((toast) => {
        const ToastIcon = ICONS[toast.type] || SparkIcon
        return (
          <div key={toast.id} className={`toast toast-${toast.type || 'info'}`}>
            <span className="toast-icon">
              <ToastIcon size={17} />
            </span>
            <span className="toast-message">{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => onDismiss(toast.id)}
              aria-label="关闭提示"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
