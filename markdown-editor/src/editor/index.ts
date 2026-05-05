import { Crepe } from '@milkdown/crepe';

import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import './styles/typora-ir.css';

import { typoraIR } from './plugins/typora-ir';
import { imagePaste } from './plugins/image-paste';
import { mermaidPreview } from './plugins/mermaid';

/**
 * 编辑器创建选项
 */
export interface CreateEditorOptions {
  root: HTMLElement;
  initialMarkdown: string;
  onChange: (markdown: string) => void;
}

/**
 * 编辑器句柄：Vue 层只需要调用这些语义方法
 */
export interface EditorHandle {
  /** 取当前编辑器中的 Markdown 文本 */
  getMarkdown(): string;
  /** 销毁编辑器（组件卸载时调用） */
  destroy(): Promise<void>;
}

/**
 * 创建 Milkdown Crepe 编辑器实例，并注入自研 Typora IR 装饰器。
 */
export async function createEditor(options: CreateEditorOptions): Promise<EditorHandle> {
  const { root, initialMarkdown, onChange } = options;

  const crepe = new Crepe({
    root,
    defaultValue: initialMarkdown,
  });

  // 在 Crepe 默认插件之后追加自研 Typora IR 装饰器。
  // crepe.editor 返回底层 Milkdown Editor 实例。
  crepe.editor.use(typoraIR);
  // 图片粘贴 / 拖放转 base64，使图片能随文档持久化。
  crepe.editor.use(imagePaste);
  // Mermaid 预览懒加载（仅在出现 mermaid 代码块时才会下载 mermaid 包）。
  crepe.editor.use(mermaidPreview);

  // 注册 markdown 变更监听（需在 create() 之前）
  crepe.on((api) => {
    api.markdownUpdated((_ctx, markdown, prevMarkdown) => {
      if (markdown !== prevMarkdown) {
        onChange(markdown);
      }
    });
  });

  await crepe.create();

  return {
    getMarkdown: () => crepe.getMarkdown(),
    destroy: async () => {
      await crepe.destroy();
    },
  };
}
