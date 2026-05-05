import { prosePluginsCtx } from '@milkdown/core';
import type { MilkdownPlugin } from '@milkdown/ctx';

import { typoraIRProseMirrorPlugin } from './plugin';

export { typoraIRPluginKey } from './plugin';

/**
 * Typora IR 装饰器 Milkdown 插件。
 *
 * 在初始化阶段向 prosePluginsCtx 追加一个原生 ProseMirror Plugin，
 * 实现光标位置感知的语法装饰。
 *
 * 注意：Milkdown 插件是一个接受 ctx 的函数数组（(ctx) => () => Promise<void> | void）的集合，
 * 这里采用常见的 “pre / post / 仅 init” 三段式中的 init 段。
 */
export const typoraIR: MilkdownPlugin = (ctx) => {
  return async () => {
    const existing = ctx.get(prosePluginsCtx);
    ctx.set(prosePluginsCtx, [...existing, typoraIRProseMirrorPlugin()]);
  };
};
