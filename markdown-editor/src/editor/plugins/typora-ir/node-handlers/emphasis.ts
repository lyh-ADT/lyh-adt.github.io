import { Decoration } from '@milkdown/prose/view';
import type { Mark, Node as ProseNode } from '@milkdown/prose/model';

interface MarkSpec {
  /** Mark type name */
  name: string;
  /** 被识别为该 mark 的 markdown 包裹符 */
  delimiter: string;
}

/**
 * 支持的行内 mark 与它们的 Markdown 包裹符对应表。
 *
 * commonmark / gfm 默认 mark 名称 emphasis ↔ *，strong ↔ **，
 * gfm 额外提供 strike_through ↔ ~~。
 */
const SUPPORTED_MARKS: MarkSpec[] = [
  { name: 'strong', delimiter: '**' },
  { name: 'emphasis', delimiter: '*' },
  { name: 'strike_through', delimiter: '~~' },
];

/**
 * 遍历 textblock 的内联子节点，识别连续的 mark 范围。
 * 若光标落在该范围内，则在范围两侧插入包裹符 widget。
 *
 * 设计要点：
 *  - "连续" 以 mark 在多个相邻文本节点间为同一 attrs 为准。
 *  - 严限处理 emphasis / strong / strike_through，避免干扰 link/code 等使用不同
 *    Markdown 语法的 mark。
 */
export function buildEmphasisDecorations(
  block: ProseNode,
  blockPos: number,
  cursorPos: number,
  decorations: Decoration[],
): void {
  // textblock 内容从 blockPos + 1 开始
  for (const spec of SUPPORTED_MARKS) {
    collectMarkRanges(block, blockPos, cursorPos, spec, decorations);
  }
}

/**
 * 在一个 textblock 里寻找某 mark type 的连续范围。
 *
 * ProseMirror 中一个 textblock 的子节点是一系列 inline 节点（多为 TextNode），
 * 每个节点携带 marks 数组；使用 forEach 迭代。
 */
function collectMarkRanges(
  block: ProseNode,
  blockPos: number,
  cursorPos: number,
  spec: MarkSpec,
  decorations: Decoration[],
): void {
  let runStart: number | null = null;
  let runMark: Mark | null = null;
  let cursor = blockPos + 1; // 内容起始

  const flush = (endExclusive: number) => {
    if (runStart === null || runMark === null) return;
    const start = runStart;
    const end = endExclusive;
    runStart = null;
    runMark = null;

    // 判断光标是否在范围内（含两端边界，便于进入 / 离开时也可见）
    if (cursorPos < start || cursorPos > end) return;

    decorations.push(
      Decoration.widget(
        start,
        () => makeSyntaxSpan(spec.delimiter, 'open'),
        { side: -1, ignoreSelection: true, key: `${spec.name}-open-${start}` },
      ),
    );
    decorations.push(
      Decoration.widget(
        end,
        () => makeSyntaxSpan(spec.delimiter, 'close'),
        { side: 1, ignoreSelection: true, key: `${spec.name}-close-${end}` },
      ),
    );
  };

  block.forEach((child, offset) => {
    const childStart = blockPos + 1 + offset;
    const childEnd = childStart + child.nodeSize;
    cursor = childEnd;

    const hasMark = child.marks.some((m) => m.type.name === spec.name);
    if (hasMark) {
      const currentMark = child.marks.find((m) => m.type.name === spec.name) ?? null;
      if (runStart === null) {
        runStart = childStart;
        runMark = currentMark;
      }
      // 处于同一 mark 范围中（这里仅区分 attrs 是否相同）
      else if (
        runMark &&
        currentMark &&
        JSON.stringify(runMark.attrs) !== JSON.stringify(currentMark.attrs)
      ) {
        flush(childStart);
        runStart = childStart;
        runMark = currentMark;
      }
    } else {
      flush(childStart);
    }
  });

  // 快到 textblock 末尾时 flush
  flush(cursor);
}

function makeSyntaxSpan(text: string, role: 'open' | 'close'): HTMLElement {
  const span = document.createElement('span');
  span.className = `typora-ir-syntax typora-ir-syntax--mark typora-ir-syntax--${role}`;
  span.textContent = text;
  span.setAttribute('contenteditable', 'false');
  return span;
}
