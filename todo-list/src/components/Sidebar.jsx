import { useEffect, useMemo, useState } from 'react'
import {
  FileTextIcon,
  FolderIcon,
  FolderPlusIcon,
  InboxIcon,
  MoreIcon,
  UnplugIcon,
} from './Icons'

function pendingCount(todos, category) {
  return todos.filter(
    (todo) => !todo.done && (category === undefined || (todo.category || '') === category)
  ).length
}

export default function Sidebar({
  categories,
  todos,
  activeCategory,
  onSelectCategory,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
  onDisconnect,
  folderName,
}) {
  const [menuFor, setMenuFor] = useState(null)
  const allPending = useMemo(() => pendingCount(todos), [todos])
  const uncategorizedPending = useMemo(() => pendingCount(todos, ''), [todos])

  useEffect(() => {
    if (!menuFor) return undefined
    const close = (event) => {
      if (!event.target.closest?.('.category-item-wrap')) setMenuFor(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuFor])

  const counts = useMemo(() => {
    const result = new Map()
    for (const todo of todos) {
      if (todo.done) continue
      const category = todo.category || ''
      result.set(category, (result.get(category) || 0) + 1)
    }
    return result
  }, [todos])

  return (
    <aside className="sidebar">
      <div className="sidebar-heading">
        <span>分类</span>
        <button
          type="button"
          className="icon-button small"
          onClick={onCreateCategory}
          title="新建分类"
          aria-label="新建分类"
        >
          <FolderPlusIcon size={17} />
        </button>
      </div>

      <nav className="category-nav" aria-label="分类导航">
        <button
          type="button"
          className={`category-item${activeCategory === '__all__' ? ' is-active' : ''}`}
          onClick={() => onSelectCategory('__all__')}
        >
          <span className="category-icon">
            <InboxIcon size={16} />
          </span>
          <span className="category-name">全部待办</span>
          <span className="category-count">{allPending}</span>
        </button>

        <button
          type="button"
          className={`category-item${activeCategory === '__uncategorized__' ? ' is-active' : ''}`}
          onClick={() => onSelectCategory('__uncategorized__')}
        >
          <span className="category-icon">
            <FileTextIcon size={16} />
          </span>
          <span className="category-name">未分类</span>
          <span className="category-count">{uncategorizedPending}</span>
        </button>

        <div className="category-divider" />

        {categories.map((category) => {
          const key = `cat:${category}`
          const active = activeCategory === key
          return (
            <div key={category} className="category-item-wrap">
              <div className="category-item-row">
                <button
                  type="button"
                  className={`category-item category-item-with-actions${active ? ' is-active' : ''}`}
                  onClick={() => onSelectCategory(key)}
                  title={category}
                >
                  <span className="category-icon">
                    <FolderIcon size={16} />
                  </span>
                  <span className="category-name">{category}</span>
                  <span className="category-count">{counts.get(category) || 0}</span>
                </button>

                <div className="category-actions-wrap">
                  <button
                    type="button"
                    className="category-more"
                    aria-label={`管理分类 ${category}`}
                    aria-expanded={menuFor === category}
                    onClick={(event) => {
                      event.stopPropagation()
                      setMenuFor((current) => (current === category ? null : category))
                    }}
                  >
                    <MoreIcon size={16} />
                  </button>
                </div>
              </div>

              {menuFor === category ? (
                <div className="category-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuFor(null)
                      onRenameCategory(category)
                    }}
                  >
                    重命名分类
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="danger"
                    onClick={() => {
                      setMenuFor(null)
                      onDeleteCategory(category)
                    }}
                  >
                    删除分类
                  </button>
                </div>
              ) : null}
            </div>
          )
        })}

        <button
          type="button"
          className="category-item category-add-mobile"
          onClick={onCreateCategory}
        >
          <span className="category-icon">
            <FolderPlusIcon size={16} />
          </span>
          <span className="category-name">新建分类</span>
        </button>

        {categories.length === 0 ? (
          <p className="category-empty">
            还没有分类。
            <br />
            新建一个文件夹来归类待办。
          </p>
        ) : null}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-folder" title={folderName}>
          <span className="sidebar-folder-icon">
            <FolderIcon size={15} />
          </span>
          <span className="sidebar-folder-name">{folderName || '本地文件夹'}</span>
        </div>
        <p className="sidebar-note">
          {todos.length} 条待办 · 自动保存
        </p>
        <button type="button" className="sidebar-disconnect" onClick={onDisconnect}>
          <UnplugIcon size={15} />
          断开文件夹
        </button>
      </div>
    </aside>
  )
}
