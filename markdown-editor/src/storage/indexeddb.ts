import { type IDBPDatabase, openDB } from 'idb';

import type { Doc, DocMeta } from '@/types/doc';
import type { StorageAdapter } from './types';

const DB_NAME = 'markdown-editor';
const DB_VERSION = 1;
const STORE_DOCS = 'docs';

interface Schema {
  [STORE_DOCS]: {
    key: string;
    value: Doc;
    indexes: { 'by-updatedAt': number };
  };
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;

function getDB(): Promise<IDBPDatabase<Schema>> {
  if (!dbPromise) {
    dbPromise = openDB<Schema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_DOCS)) {
          const store = db.createObjectStore(STORE_DOCS, { keyPath: 'id' });
          store.createIndex('by-updatedAt', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
}

/**
 * 从完整 Doc 中剥离出轻量元数据。
 * 列表场景避免读取大体积的 content。
 */
function toMeta(doc: Doc): DocMeta {
  const { id, title, createdAt, updatedAt, fileHandle } = doc;
  return { id, title, createdAt, updatedAt, fileHandle };
}

/**
 * IndexedDB 存储适配器。
 *
 * 注意：fileHandle 是 FileSystemFileHandle 对象，Chromium 内核下可结构化克隆并存入 IndexedDB，
 * 下次会话取出后需调用 handle.queryPermission() 重新授权。
 */
export const indexedDBAdapter: StorageAdapter = {
  async list() {
    const db = await getDB();
    const tx = db.transaction(STORE_DOCS, 'readonly');
    const docs = await tx.store.getAll();
    await tx.done;
    // 按更新时间倒序排列
    docs.sort((a, b) => b.updatedAt - a.updatedAt);
    return docs.map(toMeta);
  },

  async load(id) {
    const db = await getDB();
    const doc = await db.get(STORE_DOCS, id);
    return doc ?? null;
  },

  async save(doc) {
    const db = await getDB();
    await db.put(STORE_DOCS, doc);
  },

  async remove(id) {
    const db = await getDB();
    await db.delete(STORE_DOCS, id);
  },
};
