import { Decoration } from '@milkdown/prose/view';
import type { Mark, Node as ProseNode } from '@milkdown/prose/model';

/**
 * 当光标在 link mark 范围内，在范围前后插入 [ 与 ](url) widget。
 *
 * 与 emphasis 不同：link mark 携带 attrs.href / title，才能完整重现“[text](url)”语法。
 */
export function buildLinkDecorations(
  block: ProseNode,
  blockPos: number,
  cursorPos: number,
  decorations: Decoration[],
): void {
  let runStart: number | null = null;
  let runMark: Mark | null = null;
  let cursor = blockPos + 1;

  const flush = (endExclusive: number) => {
    if (runStart === null || runMark === null) return;
    const start = runStart;
    const end = endExclusive;
    const mark = runMark;
    runStart = null;
    runMark = null;

    if (cursorPos < start || cursorPos > end) return;

    const href = String(mark.attrs.href ?? '');
    const title = mark.attrs.title ? ` "${mark.attrs.title}"` : '';

    decorations.push(
      Decoration.widget(
        start,
        () => makeSyntaxSpan('['),
        { side: -1, ignoreSelection: true, key: `link-open-${start}` },
      ),
    );
    decorations.push(
      Decoration.widget(
        end,
        () => makeSyntaxSpan(`](${href}${title})`),
        { side: 1, ignoreSelection: true, key: `link-close-${end}` },
      ),
    );
  };

  block.forEach((child, offset) => {
    const childStart = blockPos + 1 + offset;
    const childEnd = childStart + child.nodeSize;
    cursor = childEnd;

    const linkMark = child.marks.find((m) => m.type.name === 'link') ?? null;
    if (linkMark) {
      if (runStart === null) {
        runStart = childStart;
        runMark = linkMark;
      } else if (
        runMark &&
        (runMark.attrs.href !== linkMark.attrs.href || runMark.attrs.title !== linkMark.attrs.title)
      ) {
        // 默认 ProseMirror 合并相同 attrs 的连续 mark，这里是防御性检查
        flush(childStart);
        runStart = childStart;
        runMark = linkMark;
      }
    } else {
      flush(childStart);
    }
  });

  flush(cursor);
}

function makeSyntaxSpan(text: string): HTMLElement {
  const span = document.createElement('span');
  span.className = 'typora-ir-syntax typora-ir-syntax--link';
  span.textContent = text;
  span.setAttribute('contenteditable', 'false');
  return span;
}
