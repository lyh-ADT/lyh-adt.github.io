import { prosePluginsCtx } from '@milkdown/core';
import type { MilkdownPlugin } from '@milkdown/ctx';

import { mermaidProseMirrorPlugin } from './plugin';
import './style.css';

export const mermaidPreview: MilkdownPlugin = (ctx) => {
  return async () => {
    const existing = ctx.get(prosePluginsCtx);
    ctx.set(prosePluginsCtx, [...existing, mermaidProseMirrorPlugin()]);
  };
};
