import { useDocStore } from './useDocStore';

/**
 * 向后兼容的编辑器状态 composable。
 * 内部直接转发到 useDocStore，支持已接入的组件无缝迁移。
 */
export function useEditorState() {
  const store = useDocStore();
  return {
    currentDoc: store.currentDoc,
    isDirty: store.isDirty,
    lastSavedAt: store.lastSavedAt,
    charCount: store.charCount,
    updateContent: store.updateContent,
  };
}
