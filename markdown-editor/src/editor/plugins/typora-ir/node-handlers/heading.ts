import { Decoration } from '@milkdown/prose/view';
import type { Node as ProseNode } from '@milkdown/prose/model';

/**
 * 当光标在 heading 节点内时，在 heading 文本开头前插入 "## " 等前缀。
 *
 * heading 节点内部：<heading level=2>Text</heading>
 *  pos          = heading 开始位置（即 "<heading>" 左外侧）
 *  pos + 1      = heading 内容起始（"<heading>" 右侧，"Text" 左侧）
 *  pos + size   = heading 结束位置
 *
 * Decoration.widget(pos) 将 widget 插入到 pos 位置，可设 side 指定在同位置的左/右。
 */
export function buildHeadingDecorations(
  node: ProseNode,
  pos: number,
  cursorPos: number,
  decorations: Decoration[],
): void {
  const start = pos;
  const end = pos + node.nodeSize;

  // 光标是否在 heading 的完整范围内（含边缘）
  if (cursorPos < start || cursorPos > end) return;

  const level = typeof node.attrs.level === 'number' ? node.attrs.level : 1;
  const marker = '#'.repeat(level) + ' ';

  // 在 heading 内部文本起始位置（pos + 1）的左侧插入 widget
  const widget = Decoration.widget(
    pos + 1,
    () => {
      const span = document.createElement('span');
      span.className = 'typora-ir-syntax typora-ir-syntax--heading';
      span.textContent = marker;
      span.setAttribute('contenteditable', 'false');
      return span;
    },
    {
      side: -1,
      ignoreSelection: true,
      key: `heading-marker-${level}`,
    },
  );

  decorations.push(widget);
}
