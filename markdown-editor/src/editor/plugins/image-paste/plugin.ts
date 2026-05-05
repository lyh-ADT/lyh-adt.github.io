import { Plugin, PluginKey } from '@milkdown/prose/state';
import type { EditorView } from '@milkdown/prose/view';

export const imagePastePluginKey = new PluginKey('image-paste');

/**
 * 将 File 读为 base64 data URL。
 */
function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('FileReader did not return a string'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

/**
 * 从剪贴板或拖放中提取图片文件。
 */
function extractImageFiles(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer) return [];
  const files: File[] = [];
  // items 有时比 files 更完整（包含剪贴板图片）
  for (let i = 0; i < dataTransfer.items.length; i++) {
    const item = dataTransfer.items[i];
    if (item.kind === 'file') {
      const f = item.getAsFile();
      if (f && f.type.startsWith('image/')) files.push(f);
    }
  }
  if (files.length === 0) {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const f = dataTransfer.files.item(i);
      if (f && f.type.startsWith('image/')) files.push(f);
    }
  }
  return files;
}

/**
 * 将图片节点插入到当前光标位置。
 * 优先使用 image-block 节点（Crepe 质量更高）；回退到标准 image 节点。
 */
function insertImage(view: EditorView, src: string, alt: string) {
  const { state, dispatch } = view;
  const { schema, tr } = state;
  const imageBlock = schema.nodes['image-block'];
  const imageInline = schema.nodes['image'];
  const type = imageBlock ?? imageInline;
  if (!type) return false;
  const node = type.create({ src, alt });
  dispatch(tr.replaceSelectionWith(node));
  return true;
}

/**
 * 创建 "粘贴 / 拖放 → base64 内嵌" 的 ProseMirror 插件。
 *
 * 行为：
 *  - paste / drop 事件中检测图片。有图片则 preventDefault，
 *    按顺序将每一张转 base64 后插入。
 *  - 如果同时有文本（如“图片 + 说明文字”的剪贴板），
 *    文本不被这个插件处理（继续交给其它插件）——因为我们
 *    只在“有图片”的条件下 preventDefault。
 */
export function imagePastePlugin(): Plugin {
  return new Plugin({
    key: imagePastePluginKey,
    props: {
      handlePaste(view, event) {
        const files = extractImageFiles(event.clipboardData ?? null);
        if (files.length === 0) return false;
        event.preventDefault();
        void (async () => {
          for (const file of files) {
            try {
              const dataUrl = await readAsDataURL(file);
              insertImage(view, dataUrl, file.name || 'image');
            } catch (err) {
              console.error('[image-paste] convert failed', err);
            }
          }
        })();
        return true;
      },

      handleDrop(view, event) {
        const dt = (event as DragEvent).dataTransfer;
        const files = extractImageFiles(dt ?? null);
        if (files.length === 0) return false;
        event.preventDefault();
        void (async () => {
          for (const file of files) {
            try {
              const dataUrl = await readAsDataURL(file);
              insertImage(view, dataUrl, file.name || 'image');
            } catch (err) {
              console.error('[image-drop] convert failed', err);
            }
          }
        })();
        return true;
      },
    },
  });
}
