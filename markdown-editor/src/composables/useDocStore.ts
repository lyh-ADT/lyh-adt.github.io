import { computed, ref } from 'vue';

import { indexedDBAdapter } from '@/storage/indexeddb';
import type { Doc, DocMeta } from '@/types/doc';
import { uuid } from '@/utils/uuid';

/**
 * 从 currentDoc 提取可序列化的纯数据，回避 Vue reactive proxy 导致 IndexedDB structredClone 失败。
 */
function toSerializable(doc: Doc): Doc {
  const clean: Doc = {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
  if (doc.fileHandle) {
    try {
      structuredClone({ h: doc.fileHandle }); // 提前检测可克隆性
      clean.fileHandle = doc.fileHandle;
    } catch { /* 丢弃不可序列化的 handle */ }
  }
  return clean;
}

const DEFAULT_CONTENT = `# 欢迎使用 Markdown Editor

这是一个 **纯浏览器端** 的 Markdown 编辑器，基于 Vue 3 与 Milkdown。

## 特性

- 实时渲染（后续升级 Typora IR 模式）
- 代码块、表格、任务列表
- IndexedDB 自动保存 + 本地文件读写

\`\`\`ts
console.log('Hello, Markdown!');
\`\`\`

> 开始你的创作吧。
`;

// 文档列表元数据（侧边栏渲染用）
const docsMeta = ref<DocMeta[]>([]);
// 当前打开的文档完整内容
const currentDoc = ref<Doc | null>(null);
// 脑子中内容与磁盘不一致时为 true
const isDirty = ref(false);
// 最后一次 IndexedDB 保存时间
const lastSavedAt = ref<number | null>(null);
// 是否已完成初始化（从 IndexedDB 加载或创建默认文档）
const initialized = ref(false);
// 当前正在保存中
const isSaving = ref(false);

const charCount = computed(() => currentDoc.value?.content.length ?? 0);

/**
 * 从内容第一行推断标题；没有则回退为日期字符串。
 */
function deriveTitle(content: string, fallback: string): string {
  const firstLine = content.split('\n').find((line) => line.trim().length > 0);
  if (!firstLine) return fallback;
  // 去掉 Markdown 标题前缀，截取 60 字
  return firstLine.replace(/^#+\s*/, '').slice(0, 60) || fallback;
}

/**
 * 初始化：加载文档列表，选中最新文档；空库时创建欢迎文档。
 * 必须在应用挖载时调用一次。
 */
async function init() {
  if (initialized.value) return;

  const list = await indexedDBAdapter.list();
  docsMeta.value = list;

  if (list.length === 0) {
    // 第一次运行：创建欢迎文档
    const now = Date.now();
    const welcome: Doc = {
      id: uuid(),
      title: deriveTitle(DEFAULT_CONTENT, '新文档'),
      content: DEFAULT_CONTENT,
      createdAt: now,
      updatedAt: now,
    };
    await indexedDBAdapter.save(welcome);
    docsMeta.value = [
      {
        id: welcome.id,
        title: welcome.title,
        createdAt: welcome.createdAt,
        updatedAt: welcome.updatedAt,
      },
    ];
    currentDoc.value = welcome;
    lastSavedAt.value = now;
  } else {
    // 打开最新的文档
    const latest = list[0];
    const doc = await indexedDBAdapter.load(latest.id);
    currentDoc.value = doc;
    lastSavedAt.value = latest.updatedAt;
  }

  isDirty.value = false;
  initialized.value = true;
}

/**
 * 编辑器 onChange 触发。仅更新内存状态，不落磁（落磁由 useAutoSave 防抖）。
 */
function updateContent(markdown: string) {
  if (!currentDoc.value) return;
  const fallback = currentDoc.value.title || '新文档';
  currentDoc.value = {
    ...currentDoc.value,
    content: markdown,
    title: deriveTitle(markdown, fallback),
    updatedAt: Date.now(),
  };
  isDirty.value = true;
}

/**
 * 将当前文档落到 IndexedDB。
 */
async function persistCurrent(): Promise<void> {
  if (!currentDoc.value) return;
  const doc = toSerializable(currentDoc.value);
  isSaving.value = true;
  try {
    await indexedDBAdapter.save(doc);
    // 更新侧边栏元数据
    const idx = docsMeta.value.findIndex((m) => m.id === doc.id);
    const meta: DocMeta = {
      id: doc.id,
      title: doc.title,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      fileHandle: doc.fileHandle,
    };
    if (idx >= 0) {
      docsMeta.value.splice(idx, 1, meta);
    } else {
      docsMeta.value.unshift(meta);
    }
    // 重新排序
    docsMeta.value.sort((a, b) => b.updatedAt - a.updatedAt);
    isDirty.value = false;
    lastSavedAt.value = doc.updatedAt;
  } finally {
    isSaving.value = false;
  }
}

/**
 * 新建文档并切换为当前。
 */
async function createDoc(initialContent = '# 新文档\n\n'): Promise<void> {
  const now = Date.now();
  const doc: Doc = {
    id: uuid(),
    title: deriveTitle(initialContent, '新文档'),
    content: initialContent,
    createdAt: now,
    updatedAt: now,
  };
  await indexedDBAdapter.save(doc);
  docsMeta.value.unshift({
    id: doc.id,
    title: doc.title,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
  currentDoc.value = doc;
  isDirty.value = false;
  lastSavedAt.value = now;
}

/**
 * 切换到指定文档。切换前如果脑子中有脏数据，先落磁。
 */
async function selectDoc(id: string): Promise<void> {
  if (currentDoc.value?.id === id) return;
  if (isDirty.value) {
    await persistCurrent();
  }
  const doc = await indexedDBAdapter.load(id);
  if (!doc) return;
  currentDoc.value = doc;
  isDirty.value = false;
  lastSavedAt.value = doc.updatedAt;
}

/**
 * 删除文档。如果删除的是当前打开的文档，自动切换到列表中另一个或新建。
 */
async function removeDoc(id: string): Promise<void> {
  await indexedDBAdapter.remove(id);
  const idx = docsMeta.value.findIndex((m) => m.id === id);
  if (idx >= 0) docsMeta.value.splice(idx, 1);

  if (currentDoc.value?.id === id) {
    if (docsMeta.value.length > 0) {
      await selectDoc(docsMeta.value[0].id);
    } else {
      await createDoc();
    }
  }
}

export function useDocStore() {
  return {
    docsMeta,
    currentDoc,
    isDirty,
    isSaving,
    lastSavedAt,
    initialized,
    charCount,
    init,
    updateContent,
    persistCurrent,
    createDoc,
    selectDoc,
    removeDoc,
  };
}
