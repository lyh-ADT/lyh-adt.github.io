/**
 * 文档元数据（供侧边栏列表使用，不包含正文）
 */
export interface DocMeta {
  id: string;
  title: string;
  updatedAt: number;
  createdAt: number;
  /** 如果绑定本地文件，保留 handle（FS Access API） */
  fileHandle?: FileSystemFileHandle;
}

/**
 * 完整文档（含正文）
 */
export interface Doc extends DocMeta {
  content: string;
}

/**
 * 创建新文档的输入
 */
export type DocCreateInput = Pick<Doc, 'title' | 'content'> & Partial<Pick<Doc, 'fileHandle'>>;
