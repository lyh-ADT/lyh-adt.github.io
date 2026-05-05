import { prosePluginsCtx } from '@milkdown/core';
import type { MilkdownPlugin } from '@milkdown/ctx';

import { imagePastePlugin } from './plugin';

/**
 * 将图片粘贴/拖放转换为 base64 内嵌的 Milkdown 插件。
 *
 * 这样做的目的：纯浏览器端无后端，图片需要与文档一起持久化。
 * blob URL 只在当前会话有效，不适合保存。
 */
export const imagePaste: MilkdownPlugin = (ctx) => {
  return async () => {
    const existing = ctx.get(prosePluginsCtx);
    ctx.set(prosePluginsCtx, [...existing, imagePastePlugin()]);
  };
};
