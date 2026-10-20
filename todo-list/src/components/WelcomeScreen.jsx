import {
  ArrowRightIcon,
  CheckIcon,
  FileTextIcon,
  FolderIcon,
  RefreshIcon,
  SparkIcon,
} from './Icons'

export default function WelcomeScreen({
  supported,
  savedHandleName,
  onChoose,
  onReconnect,
  reconnecting = false,
}) {
  return (
    <div className="welcome">
      <div className="welcome-glow" aria-hidden="true" />
      <div className="welcome-grid" aria-hidden="true" />

      <div className="welcome-inner">
        <section className="welcome-copy">
          <div className="wordmark">
            <span className="wordmark-mark">
              <CheckIcon size={15} />
            </span>
            <span>TODO FILES</span>
          </div>

          <p className="welcome-kicker">一页纸，一组文件，一份清静。</p>
          <h1>
            待办，
            <br />
            写进自己的文件夹。
          </h1>
          <p className="welcome-lead">
            选择一个本地文件夹，开始记录。子文件夹就是分类，每个待办都是一份 Markdown
            文件——数据始终留在你的电脑里。
          </p>

          <div className="welcome-actions">
            <button
              type="button"
              className="button button-primary button-large welcome-primary"
              onClick={onChoose}
              disabled={!supported}
            >
              <FolderIcon size={19} />
              <span>{supported ? '选择文件夹' : '浏览器不支持'}</span>
              <ArrowRightIcon size={17} className="button-arrow" />
            </button>

            {savedHandleName ? (
              <button
                type="button"
                className="button button-secondary welcome-reconnect"
                onClick={onReconnect}
                disabled={!supported || reconnecting}
              >
                <RefreshIcon size={16} />
                <span>
                  {reconnecting ? '正在连接…' : `重新连接「${savedHandleName}」`}
                </span>
              </button>
            ) : null}
          </div>

          <p className="welcome-hint">
            文件夹里已有的 <code>.md</code> / <code>.txt</code> 文件也会被读取为待办。
          </p>

          {!supported ? (
            <div className="browser-warning">
              <strong>当前浏览器不支持 File System Access API</strong>
              <span>请使用桌面版 Chrome、Edge 或其他 Chromium 浏览器打开本页。</span>
            </div>
          ) : null}
        </section>

        <section className="welcome-visual" aria-hidden="true">
          <div className="preview-window">
            <div className="preview-titlebar">
              <span className="preview-dots">
                <i />
                <i />
                <i />
              </span>
              <span className="preview-path">
                <FolderIcon size={13} />
                Todo / 工作
              </span>
            </div>

            <div className="preview-body">
              <aside className="preview-sidebar">
                <span className="preview-sidebar-title">分类</span>
                <span className="preview-category is-active">
                  <span>◈</span>全部待办
                </span>
                <span className="preview-category">
                  <span>□</span>工作
                </span>
                <span className="preview-category">
                  <span>□</span>生活
                </span>
                <span className="preview-category">
                  <span>□</span>阅读
                </span>
              </aside>

              <div className="preview-list">
                <div className="preview-list-head">
                  <span>工作</span>
                  <span className="preview-count">3</span>
                </div>
                <div className="preview-file is-active">
                  <span className="preview-check" />
                  <span>
                    <strong>准备周会材料</strong>
                    <small>整理本周进度与风险项</small>
                  </span>
                </div>
                <div className="preview-file">
                  <span className="preview-check is-done">
                    <CheckIcon size={10} />
                  </span>
                  <span>
                    <strong>回复设计评审意见</strong>
                    <small>周五前同步修改稿</small>
                  </span>
                </div>
                <div className="preview-file">
                  <span className="preview-check" />
                  <span>
                    <strong>更新项目排期</strong>
                    <small>10月24日截止</small>
                  </span>
                </div>
              </div>

              <div className="preview-detail">
                <span className="preview-detail-kicker">工作 / 准备周会材料.md</span>
                <span className="preview-detail-title">
                  <span className="preview-check" />
                  准备周会材料
                </span>
                <span className="preview-line is-wide" />
                <span className="preview-line" />
                <span className="preview-line is-short" />
                <span className="preview-detail-tag">
                  <SparkIcon size={11} /> 自动保存
                </span>
              </div>
            </div>
          </div>

          <div className="floating-card">
            <span className="floating-icon">
              <FileTextIcon size={17} />
            </span>
            <span>
              <strong>一个文件，一条待办</strong>
              <small>内容就是详情，随时可以用别的编辑器打开</small>
            </span>
          </div>
        </section>
      </div>

      <footer className="welcome-footer">
        <span>本地优先 · 不上传 · 不需要账号</span>
        <span className="welcome-footer-dot" />
        <span>File System Access API</span>
      </footer>
    </div>
  )
}
