/**
 * Mermaid 懒加载封装。
 *
 * 仅在页面中出现 mermaid 代码块时才会下载 mermaid 包（约 600KB）。
 */

type MermaidLike = {
  initialize: (opts: Record<string, unknown>) => void;
  render: (id: string, code: string) => Promise<{ svg: string }>;
};

let mermaidPromise: Promise<MermaidLike> | null = null;
let renderCounter = 0;

async function getMermaid(): Promise<MermaidLike> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      const mermaid = (mod.default ?? mod) as unknown as MermaidLike;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'strict',
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

/**
 * 将 Mermaid 源码渲染为 SVG 字符串。
 * 语法错误时抛出异常，由调用方展示回退提示。
 */
export async function renderMermaid(code: string): Promise<string> {
  const mermaid = await getMermaid();
  // id 必须全局唯一
  const id = `mermaid-${++renderCounter}-${Date.now()}`;
  const { svg } = await mermaid.render(id, code);
  return svg;
}
