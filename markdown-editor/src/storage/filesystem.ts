/**
 * File System Access API 封装
 *
 * 能力探测与调用集成。仅在支持的浏览器（Chromium）上可用；
 * 不支持时调用方需要回退到 utils/download.ts。
 *
 * 参考：https://developer.mozilla.org/docs/Web/API/File_System_Access_API
 */

export interface OpenedFile {
  handle: FileSystemFileHandle;
  filename: string;
  content: string;
}

/**
 * 浏览器是否支持 File System Access API 的读写能力。
 */
export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showOpenFilePicker' in window &&
    'showSaveFilePicker' in window
  );
}

const MARKDOWN_TYPES: FilePickerAcceptType[] = [
  {
    description: 'Markdown',
    accept: {
      'text/markdown': ['.md', '.markdown', '.mdown', '.mkd'],
      'text/plain': ['.txt'],
    },
  },
];

/**
 * 读取 handle 对应的文件内容。
 */
export async function readFileFromHandle(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

/**
 * 弹出“打开”选择器，返回读取到的文件内容与 handle。
 * 用户取消返回 null。
 */
export async function openMarkdownFile(): Promise<OpenedFile | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('当前浏览器不支持 File System Access API，请使用 Chrome/Edge。');
  }
  try {
    const [handle] = await window.showOpenFilePicker({
      types: MARKDOWN_TYPES,
      multiple: false,
      excludeAcceptAllOption: false,
    });
    const content = await readFileFromHandle(handle);
    return { handle, filename: handle.name, content };
  } catch (err) {
    // 用户取消选择器 -> AbortError
    if (err instanceof DOMException && err.name === 'AbortError') return null;
    throw err;
  }
}

/**
 * 确保在 handle 上享有读写权限；必要时请求。
 *
 * 返回 true 表示可用；false 表示用户拒绝。
 */
export async function ensureWritable(handle: FileSystemFileHandle): Promise<boolean> {
  // 源始能力检测
  const queryFn = (handle as unknown as {
    queryPermission?: (desc: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
  }).queryPermission;
  const requestFn = (handle as unknown as {
    requestPermission?: (desc: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
  }).requestPermission;

  if (!queryFn || !requestFn) {
    // 如果浏览器未提供权限 API，主动尝试写入即可
    return true;
  }

  let state = await queryFn.call(handle, { mode: 'readwrite' });
  if (state === 'granted') return true;
  state = await requestFn.call(handle, { mode: 'readwrite' });
  return state === 'granted';
}

/**
 * 写入 handle。如果权限被拒绝会报错。
 */
export async function writeFileToHandle(
  handle: FileSystemFileHandle,
  content: string,
): Promise<void> {
  const granted = await ensureWritable(handle);
  if (!granted) {
    throw new Error('未获得文件写入权限');
  }
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

/**
 * 弹出“另存为”选择器，创建新的 handle 并写入内容。
 * 用户取消返回 null。
 */
export async function saveAsMarkdownFile(
  suggestedName: string,
  content: string,
): Promise<FileSystemFileHandle | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('当前浏览器不支持 File System Access API，请使用 Chrome/Edge。');
  }
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: MARKDOWN_TYPES,
      excludeAcceptAllOption: false,
    });
    await writeFileToHandle(handle, content);
    return handle;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return null;
    throw err;
  }
}
