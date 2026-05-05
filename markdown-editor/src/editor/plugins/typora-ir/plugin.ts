import { Plugin, PluginKey } from '@milkdown/prose/state';
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import type { EditorState } from '@milkdown/prose/state';
import type { Node as ProseNode } from '@milkdown/prose/model';

import { buildHeadingDecorations } from './node-handlers/heading';
import { buildEmphasisDecorations } from './node-handlers/emphasis';
import { buildLinkDecorations } from './node-handlers/link';
import { buildBlockquoteDecorations } from './node-handlers/blockquote';
import { buildInlineCodeDecorations } from './node-handlers/inline-code';

export const typoraIRPluginKey = new PluginKey('typora-ir');

/**
 * Typora IR 装饰器核心策略：
 *
 * 每次 ProseMirror 状态变化（输入 / 移动光标）重新计算装饰。
 * 正常渲染状态下（光标不在该 inline mark / block 内），不显示 Markdown 语法字符；
 * 当光标进入特定节点，通过 Decoration.widget() 向文档中插入"伪语法字符"，
 * 这些字符不会进入序列化后的 Markdown。
 *
 * 事务性说明：函数纯函数化，基于 EditorState 计算，进入不可变总延路径。
 */
function buildDecorations(state: EditorState): DecorationSet {
  const { doc, selection } = state;
  const decorations: Decoration[] = [];

  // 光标所在位置。只有 "折叠的" （empty）或任一端点在节点内才需要显语法。
  const cursorPos = selection.from;

  // 逐节点遍历，交给各类 handler
  doc.descendants((node: ProseNode, pos: number) => {
    // heading 是块级：当光标在此 heading 内，加 "## " 之类的 widget
    if (node.type.name === 'heading') {
      buildHeadingDecorations(node, pos, cursorPos, decorations);
      return true;
    }

    // blockquote 块级：为其内每个 textblock 加 "> " 前缀
    if (node.type.name === 'blockquote') {
      buildBlockquoteDecorations(node, pos, cursorPos, decorations);
      // 继续向下遍历，以便其内部的 textblock 仍可被行内 handler 处理
      return true;
    }

    // 内联节点：在 heading / paragraph / listItem 等内部遍历
    if (node.isTextblock) {
      buildEmphasisDecorations(node, pos, cursorPos, decorations);
      buildLinkDecorations(node, pos, cursorPos, decorations);
      buildInlineCodeDecorations(node, pos, cursorPos, decorations);
    }

    return true;
  });

  return DecorationSet.create(doc, decorations);
}

/**
 * Typora IR ProseMirror 插件。
 * 通过 `props.decorations` 提供装饰集合给 EditorView，
 * 每次状态变化 ProseMirror 会自动调用 decorations(state)。
 */
export function typoraIRProseMirrorPlugin(): Plugin {
  return new Plugin({
    key: typoraIRPluginKey,
    props: {
      decorations(state) {
        return buildDecorations(state);
      },
    },
  });
}
