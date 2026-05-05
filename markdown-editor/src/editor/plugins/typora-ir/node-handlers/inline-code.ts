import { Decoration } from '@milkdown/prose/view';
import type { Node as ProseNode } from '@milkdown/prose/model';

/**
 * 行内代码 mark（`code`）：当光标落在其范围内时两侧加反引号。
 *
 * Milkdown 中该 mark 名为 "inlineCode"（也有版本为 "code"，这里两者兼容）。
 */
const CODE_MARK_NAMES = ['inlineCode', 'code'];

export function buildInlineCodeDecorations(
  block: ProseNode,
  blockPos: number,
  cursorPos: number,
  decorations: Decoration[],
): void {
  let runStart: number | null = null;
  let cursor = blockPos + 1;

  const flush = (endExclusive: number) => {
    if (runStart === null) return;
    const start = runStart;
    const end = endExclusive;
    runStart = null;

    if (cursorPos < start || cursorPos > end) return;

    decorations.push(
      Decoration.widget(
        start,
        () => makeBacktickSpan(),
        { side: -1, ignoreSelection: true, key: `code-open-${start}` },
      ),
    );
    decorations.push(
      Decoration.widget(
        end,
        () => makeBacktickSpan(),
        { side: 1, ignoreSelection: true, key: `code-close-${end}` },
      ),
    );
  };

  block.forEach((child, offset) => {
    const childStart = blockPos + 1 + offset;
    const childEnd = childStart + child.nodeSize;
    cursor = childEnd;

    const hasCodeMark = child.marks.some((m) => CODE_MARK_NAMES.includes(m.type.name));
    if (hasCodeMark) {
      if (runStart === null) runStart = childStart;
    } else {
      flush(childStart);
    }
  });

  flush(cursor);
}

function makeBacktickSpan(): HTMLElement {
  const span = document.createElement('span');
  span.className = 'typora-ir-syntax typora-ir-syntax--code';
  span.textContent = '`';
  span.setAttribute('contenteditable', 'false');
  return span;
}
