import type { Doc, DocMeta } from '@/types/doc';

/**
 * 存储适配器统一接口。
 *
 * 适配器负责文档的 CRUD 操作；
 * 具体实现（IndexedDB、本地文件等）只要满足此接口即可互换。
 */
export interface StorageAdapter {
  /** 列出所有文档的元数据（不含正文，适合侧边栏列表） */
  list(): Promise<DocMeta[]>;
  /** 根据 id 加载完整文档 */
  load(id: string): Promise<Doc | null>;
  /** 新增或更新文档 */
  save(doc: Doc): Promise<void>;
  /** 删除文档 */
  remove(id: string): Promise<void>;
}
