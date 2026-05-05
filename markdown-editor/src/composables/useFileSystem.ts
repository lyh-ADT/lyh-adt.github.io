import { computed } from 'vue';

import { useDocStore } from './useDocStore';
import {
  isFileSystemAccessSupported,
  openMarkdownFile,
  saveAsMarkdownFile,
  writeFileToHandle,
} from '@/storage/filesystem';
import { downloadTextFile } from '@/utils/download';
import { uuid } from '@/utils/uuid';
import { indexedDBAdapter } from '@/storage/indexeddb';
import type { Doc, DocMeta } from '@/types/doc';

/**
 * 为文档推荐一个下载文件名。
 */
function pickFilename(doc: Doc): string {
  const safe = doc.title
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim()
    .slice(0, 80);
  return `${safe || '未命名'}.md`;
}

export function useFileSystem() {
  const store = useDocStore();
  const supported = computed(() => isFileSystemAccessSupported());

  /**
   * 打开本地 .md 文件：创建新文档并绑定 fileHandle。
   * 浏览器不支持时报错。
   */
  async function openLocalFile(): Promise<void> {
    const opened = await openMarkdownFile();
    if (!opened) return;

    const now = Date.now();
    const doc: Doc = {
      id: uuid(),
      title: opened.filename.replace(/\.(md|markdown|mdown|mkd|txt)$/i, ''),
      content: opened.content,
      createdAt: now,
      updatedAt: now,
      fileHandle: opened.handle,
    };
    await indexedDBAdapter.save(doc);

    const meta: DocMeta = {
      id: doc.id,
      title: doc.title,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      fileHandle: doc.fileHandle,
    };
    store.docsMeta.value.unshift(meta);

    // 切换到该文档
    if (store.isDirty.value) {
      await store.persistCurrent();
    }
    store.currentDoc.value = doc;
    store.isDirty.value = false;
    store.lastSavedAt.value = now;
  }

  /**
   * 保存到本地文件：
   *  - 有 fileHandle → 直接写入
   *  - 无 fileHandle 且支持 FS API → 调“另存为”
   *  - 不支持→下载兜底
   */
  async function saveToLocal(): Promise<void> {
    const doc = store.currentDoc.value;
    if (!doc) return;
    // 先落一次 IndexedDB（保证脑子中的修改不丢失）
    if (store.isDirty.value) {
      await store.persistCurrent();
    }

    if (doc.fileHandle) {
      await writeFileToHandle(doc.fileHandle, doc.content);
      return;
    }

    if (supported.value) {
      const handle = await saveAsMarkdownFile(pickFilename(doc), doc.content);
      if (!handle) return;
      // 写回 fileHandle 并依靠 IndexedDB 持久化
      const updated: Doc = { ...doc, fileHandle: handle, updatedAt: Date.now() };
      await indexedDBAdapter.save(updated);
      store.currentDoc.value = updated;
      // 同步侧边栏
      const idx = store.docsMeta.value.findIndex((m) => m.id === updated.id);
      if (idx >= 0) {
        store.docsMeta.value.splice(idx, 1, {
          id: updated.id,
          title: updated.title,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
          fileHandle: updated.fileHandle,
        });
      }
      store.lastSavedAt.value = updated.updatedAt;
      return;
    }

    // 兜底：下载
    downloadTextFile(pickFilename(doc), doc.content);
  }

  /**
   * “另存为”总是弹选择器（即使已有 fileHandle）。不支持时也下载兜底。
   */
  async function saveAs(): Promise<void> {
    const doc = store.currentDoc.value;
    if (!doc) return;
    if (!supported.value) {
      downloadTextFile(pickFilename(doc), doc.content);
      return;
    }
    const handle = await saveAsMarkdownFile(pickFilename(doc), doc.content);
    if (!handle) return;
    const updated: Doc = { ...doc, fileHandle: handle, updatedAt: Date.now() };
    await indexedDBAdapter.save(updated);
    store.currentDoc.value = updated;
    const idx = store.docsMeta.value.findIndex((m) => m.id === updated.id);
    if (idx >= 0) {
      store.docsMeta.value.splice(idx, 1, {
        id: updated.id,
        title: updated.title,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        fileHandle: updated.fileHandle,
      });
    }
    store.lastSavedAt.value = updated.updatedAt;
  }

  return {
    supported,
    openLocalFile,
    saveToLocal,
    saveAs,
  };
}
