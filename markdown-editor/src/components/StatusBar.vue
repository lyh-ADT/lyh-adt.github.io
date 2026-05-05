<script setup lang="ts">
import { computed } from 'vue';
import { useEditorState } from '@/composables/useEditorState';

const { currentDoc, isDirty, lastSavedAt, charCount } = useEditorState();

const savedLabel = computed(() => {
  if (isDirty.value) return '未保存';
  if (lastSavedAt.value === null) return '未修改';
  const date = new Date(lastSavedAt.value);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `已保存 ${hh}:${mm}:${ss}`;
});
</script>

<template>
  <div class="statusbar">
    <span class="statusbar__item statusbar__title">{{ currentDoc?.title ?? '未加载' }}</span>
    <span class="statusbar__spacer" />
    <span
      class="statusbar__item"
      :class="{ 'statusbar__item--dirty': isDirty }"
    >
      {{ savedLabel }}
    </span>
    <span class="statusbar__item">{{ charCount }} 字</span>
  </div>
</template>

<style scoped>
.statusbar {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 12px;
  font-size: 12px;
  color: var(--color-text-muted);
  gap: 12px;
}

.statusbar__spacer {
  flex: 1;
}

.statusbar__item {
  white-space: nowrap;
}

.statusbar__title {
  color: var(--color-text);
  font-weight: 500;
}

.statusbar__item--dirty {
  color: var(--color-danger);
}
</style>
