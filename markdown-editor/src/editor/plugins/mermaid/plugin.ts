import { Plugin, PluginKey } from '@milkdown/prose/state';
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import type { EditorState } from '@milkdown/prose/state';
import type { Node as ProseNode } from '@milkdown/prose/model';

import { renderMermaid } from './lazy';

export const mermaidPluginKey = new PluginKey('mermaid-preview');

/**
 * Mermaid 预览缓存：以源码为 key，避免重复渲染。
 * 这是会话级缓存，不持久化。
 */
const renderCache = new Map<string, string>();
const inflight = new Set<string>();

/**
 * 扫描文档中所有 code_block，若 lang === 'mermaid'，在其后面插入一个预览 widget。
 */
function buildMermaidDecorations(state: EditorState, refresh: () => void): DecorationSet {
  const { doc } = state;
  const decorations: Decoration[] = [];

  doc.descendants((node: ProseNode, pos: number) => {
    const { type, attrs, textContent } = node;
    const isCodeBlock = type.name === 'code_block' || type.name === 'fence';
    if (!isCodeBlock) return true;

    const language = String(attrs.language ?? attrs.lang ?? '').trim().toLowerCase();
    if (language !== 'mermaid') return true;

    const code = textContent.trim();
    if (!code) return true;

    const endPos = pos + node.nodeSize;
    const cached = renderCache.get(code);

    if (cached) {
      decorations.push(
        Decoration.widget(
          endPos,
          () => {
            const container = document.createElement('div');
            container.className = 'mermaid-preview';
            container.innerHTML = cached;
            container.setAttribute('contenteditable', 'false');
            return container;
          },
          { side: 1, ignoreSelection: true, key: `mermaid-${code.slice(0, 64)}-${code.length}` },
        ),
      );
    } else if (!inflight.has(code)) {
      // 安排异步渲染，完成后触发重新 decorations
      inflight.add(code);
      renderMermaid(code)
        .then((svg) => {
          renderCache.set(code, svg);
          refresh();
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          renderCache.set(
            code,
            `<pre class="mermaid-error">Mermaid 渲染失败: ${escapeHTML(msg)}</pre>`,
          );
          refresh();
        })
        .finally(() => {
          inflight.delete(code);
        });

      // 在渲染完成前，先放一个占位 widget
      decorations.push(
        Decoration.widget(
          endPos,
          () => {
            const div = document.createElement('div');
            div.className = 'mermaid-preview mermaid-preview--loading';
            div.textContent = 'Mermaid 渲染中...';
            div.setAttribute('contenteditable', 'false');
            return div;
          },
          { side: 1, ignoreSelection: true, key: `mermaid-loading-${code.slice(0, 64)}-${code.length}` },
        ),
      );
    }

    return true;
  });

  return DecorationSet.create(doc, decorations);
}

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 创建 Mermaid 预览 ProseMirror 插件。
 *
 * 由于渲染本身是异步的，使用一个 "触发重渲染" 的回调（setMeta）
 * 来强制 ProseMirror 重新调用 decorations(state)，从而读到新缓存。
 */
export function mermaidProseMirrorPlugin(): Plugin {
  let view: { dispatch: (tr: unknown) => void; state: EditorState } | null = null;
  const refresh = () => {
    if (!view) return;
    const tr = view.state.tr.setMeta(mermaidPluginKey, { ts: Date.now() });
    view.dispatch(tr);
  };

  return new Plugin({
    key: mermaidPluginKey,
    view(editorView) {
      view = editorView as unknown as typeof view;
      return {
        destroy() {
          view = null;
        },
      };
    },
    props: {
      decorations(state) {
        return buildMermaidDecorations(state, refresh);
      },
    },
  });
}
