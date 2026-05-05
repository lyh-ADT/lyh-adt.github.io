<script setup lang="ts">
import { ref } from 'vue';

import { useDocStore } from '@/composables/useDocStore';
import { useFileSystem } from '@/composables/useFileSystem';
import { useTheme } from '@/composables/useTheme';

const store = useDocStore();
const fs = useFileSystem();
const { theme, toggle: toggleTheme } = useTheme();

const busy = ref(false);
const errorMsg = ref<string | null>(null);

async function guarded(fn: () => Promise<void>) {
  if (busy.value) return;
  busy.value = true;
  errorMsg.value = null;
  try {
    await fn();
  } catch (err) {
    console.error(err);
    errorMsg.value = err instanceof Error ? err.message : String(err);
    setTimeout(() => (errorMsg.value = null), 4000);
  } finally {
    busy.value = false;
  }
}

const handleNew = () => guarded(() => store.createDoc());
const handleOpen = () => guarded(() => fs.openLocalFile());
const handleSave = () => guarded(() => fs.saveToLocal());
const handleSaveAs = () => guarded(() => fs.saveAs());
</script>

<template>
  <div class="topbar">
    <div class="topbar__title">Markdown Editor</div>
    <div class="topbar__actions">
      <button :disabled="busy" title="新建 (Ctrl+Shift+N)" @click="handleNew">新建</button>
      <button :disabled="busy" title="打开 (Ctrl+O)" @click="handleOpen">打开</button>
      <button :disabled="busy" title="保存 (Ctrl+S)" @click="handleSave">保存</button>
      <button :disabled="busy" @click="handleSaveAs">另存为</button>
      <button
        class="topbar__theme"
        :title="theme === 'dark' ? '切换到亮色' : '切换到暗色'"
        @click="toggleTheme"
      >
        {{ theme === 'dark' ? '☀' : '☾' }}
      </button>
    </div>
    <div v-if="errorMsg" class="topbar__error">{{ errorMsg }}</div>
  </div>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 100%;
  position: relative;
}

.topbar__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.topbar__actions {
  display: flex;
  gap: 8px;
}

.topbar__actions button {
  padding: 4px 12px;
  font-size: 13px;
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  transition: background 0.15s ease;
}

.topbar__actions button:hover:not(:disabled) {
  background: var(--color-bg-hover);
}

.topbar__actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.topbar__theme {
  width: 30px;
  padding: 4px !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.topbar__error {
  position: absolute;
  left: 50%;
  bottom: -28px;
  transform: translateX(-50%);
  padding: 4px 10px;
  background: var(--color-danger);
  color: #fff;
  font-size: 12px;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  z-index: 100;
  white-space: nowrap;
  max-width: 80vw;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
