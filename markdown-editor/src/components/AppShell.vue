<script setup lang="ts">
import { onMounted, ref } from 'vue';

import TopBar from './Toolbar/TopBar.vue';
import Sidebar from './Sidebar/FileList.vue';
import MarkdownEditor from './Editor/MarkdownEditor.vue';
import StatusBar from './StatusBar.vue';
import { useDocStore } from '@/composables/useDocStore';
import { useAutoSave } from '@/composables/useAutoSave';
import { useShortcuts } from '@/composables/useShortcuts';

const store = useDocStore();
const initError = ref<string | null>(null);

useAutoSave();
useShortcuts();

onMounted(async () => {
  try {
    await store.init();
  } catch (err) {
    console.error('[AppShell] init failed', err);
    initError.value = err instanceof Error ? err.message : String(err);
  }
});
</script>

<template>
  <div class="app-shell">
    <TopBar class="app-shell__topbar" />
    <div class="app-shell__body">
      <Sidebar class="app-shell__sidebar" />
      <main class="app-shell__main">
        <div v-if="initError" class="app-shell__error">
          初始化失败：{{ initError }}
        </div>
        <MarkdownEditor v-else-if="store.initialized.value" class="app-shell__editor" />
        <div v-else class="app-shell__loading">正在加载文档...</div>
      </main>
    </div>
    <StatusBar class="app-shell__statusbar" />
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-rows: var(--topbar-height) 1fr var(--statusbar-height);
  height: 100%;
  width: 100%;
}

.app-shell__topbar {
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
}

.app-shell__body {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  min-height: 0;
}

.app-shell__sidebar {
  border-right: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  overflow-y: auto;
}

.app-shell__main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--color-bg);
}

.app-shell__editor {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.app-shell__statusbar {
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
}

.app-shell__loading,
.app-shell__error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-muted);
  font-size: 14px;
}

.app-shell__error {
  color: var(--color-danger);
}
</style>
