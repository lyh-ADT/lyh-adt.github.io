<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch, nextTick } from 'vue';

import { createEditor, type EditorHandle } from '@/editor';
import { useDocStore } from '@/composables/useDocStore';

const containerRef = ref<HTMLDivElement | null>(null);
// 编辑器实例不需要被 Vue 深度响应跟踪，用 shallowRef 避免伤害性 proxy
const editorHandle = shallowRef<EditorHandle | null>(null);
const isReady = ref(false);
const errorMessage = ref<string | null>(null);

const store = useDocStore();

/**
 * 耐久性创建 / 重建编辑器。Crepe 不提供 setMarkdown，
 * 切换文档时采用"销毁旧实例 + 联同新 defaultValue 创建"的策略。
 */
async function mountEditor(initialMarkdown: string) {
  if (!containerRef.value) return;

  // 先销毁旧实例
  if (editorHandle.value) {
    try {
      await editorHandle.value.destroy();
    } catch (err) {
      console.warn('[MarkdownEditor] destroy previous instance failed', err);
    }
    editorHandle.value = null;
  }

  try {
    isReady.value = false;
    errorMessage.value = null;
    editorHandle.value = await createEditor({
      root: containerRef.value,
      initialMarkdown,
      onChange: (markdown) => {
        store.updateContent(markdown);
      },
    });
    isReady.value = true;
  } catch (err) {
    console.error('[MarkdownEditor] create editor failed', err);
    errorMessage.value = err instanceof Error ? err.message : String(err);
  }
}

// 文档 id 变化时重建编辑器（immediate 使初次满足条件即触发）。
// 注意：immediate 回调在 setup 期间同步触发，此时 containerRef 还没绑定，
// mountEditor 会因 containerRef null 而提前返回。等 onMounted 后补登。
watch(
  () => store.currentDoc.value?.id,
  async (id) => {
    if (!id) return;
    const content = store.currentDoc.value?.content ?? '';
    await mountEditor(content);
  },
  { immediate: true },
);

onMounted(async () => {
  // 如果 watch(immediate) 时 containerRef 未就绪导致编辑器未创建，在这里补登。
  // 切换文档时已有 editorHandle，走正常的 destroy+create 路径，不走这里。
  if (!editorHandle.value && containerRef.value) {
    await nextTick();
    const content = store.currentDoc.value?.content ?? '';
    await mountEditor(content);
  }
});

onBeforeUnmount(async () => {
  if (editorHandle.value) {
    await editorHandle.value.destroy();
    editorHandle.value = null;
  }
});
</script>

<template>
  <div class="editor-wrap">
    <div v-if="errorMessage" class="editor-error">
      编辑器初始化失败：{{ errorMessage }}
    </div>
    <div v-show="!isReady && !errorMessage" class="editor-loading">
      加载中...
    </div>
    <div ref="containerRef" class="editor-host" />
  </div>
</template>

<style scoped>
.editor-wrap {
  position: relative;
  height: 100%;
  width: 100%;
}

.editor-host {
  height: 100%;
  width: 100%;
}

.editor-loading,
.editor-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  color: var(--color-text-muted);
  font-size: 14px;
}

.editor-error {
  color: var(--color-danger);
  pointer-events: auto;
  padding: 24px;
  text-align: center;
}
</style>

<style>
/* Crepe 编辑器容器需要占满宿主高度，不能加 scoped */
.editor-host > .milkdown {
  height: 100%;
  background: var(--color-bg);
}

.editor-host .ProseMirror {
  min-height: 100%;
  padding: 32px 64px 64px;
  max-width: 860px;
  margin: 0 auto;
  outline: none;
  color: var(--color-text);
  font-size: 16px;
  line-height: 1.7;
}

.editor-host .ProseMirror:focus {
  outline: none;
}

@media (max-width: 768px) {
  .editor-host .ProseMirror {
    padding: 24px 20px 48px;
  }
}
</style>
