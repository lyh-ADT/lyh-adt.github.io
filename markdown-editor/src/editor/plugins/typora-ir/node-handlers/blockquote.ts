import { Decoration } from '@milkdown/prose/view';
import type { Node as ProseNode } from '@milkdown/prose/model';

/**
 * 当光标在 blockquote 节点内时，在其每个直接子 textblock 起始位置加上 "> "。
 *
 * 与 heading 不同，blockquote 包含多个段落，需为每一行单独插入前缀。
 */
export function buildBlockquoteDecorations(
  node: ProseNode,
  pos: number,
  cursorPos: number,
  decorations: Decoration[],
): void {
  const start = pos;
  const end = pos + node.nodeSize;

  if (cursorPos < start || cursorPos > end) return;

  // 遍历 blockquote 的直接子节点，为每个 textblock 加前缀
  let offset = pos + 1; // blockquote 内部起始
  node.forEach((child) => {
    if (child.isTextblock) {
      const textStart = offset + 1; // child 内部文本起始
      decorations.push(
        Decoration.widget(
          textStart,
          () => {
            const span = document.createElement('span');
            span.className = 'typora-ir-syntax typora-ir-syntax--blockquote';
            span.textContent = '> ';
            span.setAttribute('contenteditable', 'false');
            return span;
          },
          { side: -1, ignoreSelection: true, key: `blockquote-${textStart}` },
        ),
      );
    }
    offset += child.nodeSize;
  });
}
