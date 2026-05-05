import { onBeforeUnmount, watch } from 'vue';

import { useDocStore } from './useDocStore';
import { debounce } from '@/utils/debounce';

const AUTOSAVE_DEBOUNCE_MS = 500;

/**
 * 订阅 currentDoc 变化，防抖后写入 IndexedDB。
 *
 * 在 App 根组件安装一次即可。防扢可避免连续输入频繁落磁。
 * 卸载时 flush 一次，避免丢失未保存的修改。
 */
export function useAutoSave(): void {
  const store = useDocStore();

  const flush = debounce(() => {
    if (!store.currentDoc.value) return;
    if (!store.isDirty.value) return;
    store.persistCurrent().catch((err) => {
      console.error('[autosave] persist failed', err);
    });
  }, AUTOSAVE_DEBOUNCE_MS);

  // 监听脑子中文档变动 + dirty 标记。
  // 仅依赖 isDirty 不够：它为 true 后不会变动到 true。
  // 依赖 updatedAt 可精准捕获每次输入。
  watch(
    () => store.currentDoc.value?.updatedAt,
    (newVal, oldVal) => {
      if (newVal && newVal !== oldVal && store.isDirty.value) {
        flush();
      }
    },
  );

  // 页面卸载前同步一次防扢任务
  const beforeUnload = (e: BeforeUnloadEvent) => {
    if (store.isDirty.value) {
      flush.flush();
      // 给用户一个使他们决定是否要离开的提示
      e.preventDefault();
      e.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', beforeUnload);

  onBeforeUnmount(() => {
    flush.flush();
    window.removeEventListener('beforeunload', beforeUnload);
  });
}
