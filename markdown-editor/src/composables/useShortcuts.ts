import { onBeforeUnmount, onMounted } from 'vue';

import { useDocStore } from './useDocStore';
import { useFileSystem } from './useFileSystem';

/**
 * 全局快捷键：
 *  - Ctrl/Cmd + S: 保存到本地
 *  - Ctrl/Cmd + O: 打开本地文件
 *  - Ctrl/Cmd + N: 新建文档
 *
 * 这些快捷键需要拦截浏览器默认行为。通过监听文档级 keydown 实现。
 */
export function useShortcuts(): void {
  const store = useDocStore();
  const fs = useFileSystem();

  const isModifier = (e: KeyboardEvent) => e.ctrlKey || e.metaKey;

  const handler = async (e: KeyboardEvent) => {
    if (!isModifier(e)) return;
    const key = e.key.toLowerCase();

    try {
      if (key === 's') {
        e.preventDefault();
        await fs.saveToLocal();
      } else if (key === 'o') {
        e.preventDefault();
        await fs.openLocalFile();
      } else if (key === 'n' && e.shiftKey) {
        // Ctrl+Shift+N ：避免与浏览器 Ctrl+N 开新窗冲突（浏览器的 Ctrl+N 很难拦截）
        e.preventDefault();
        await store.createDoc();
      }
    } catch (err) {
      console.error('[shortcuts] error', err);
    }
  };

  onMounted(() => window.addEventListener('keydown', handler));
  onBeforeUnmount(() => window.removeEventListener('keydown', handler));
}
