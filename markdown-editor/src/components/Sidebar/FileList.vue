<script setup lang="ts">
import { computed } from 'vue';

import { useDocStore } from '@/composables/useDocStore';

const store = useDocStore();

const docs = computed(() => store.docsMeta.value);

async function handleSelect(id: string) {
  await store.selectDoc(id);
}

async function handleCreate() {
  await store.createDoc();
}

async function handleDelete(id: string, title: string) {
  if (!window.confirm(`确定删除"${title}"？此操作不可恢复。`)) return;
  await store.removeDoc(id);
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isToday) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar__header">
      <span>文档列表</span>
      <button class="sidebar__add" title="新建文档" @click="handleCreate">+</button>
    </div>

    <div v-if="docs.length === 0" class="sidebar__empty">暂无文档</div>

    <ul v-else class="sidebar__list">
      <li
        v-for="doc in docs"
        :key="doc.id"
        class="sidebar__item"
        :class="{ 'sidebar__item--active': doc.id === store.currentDoc.value?.id }"
        @click="handleSelect(doc.id)"
      >
        <div class="sidebar__item-main">
          <div class="sidebar__item-title">{{ doc.title || '未命名' }}</div>
          <div class="sidebar__item-time">{{ formatDate(doc.updatedAt) }}</div>
        </div>
        <button
          class="sidebar__item-delete"
          title="删除文档"
          @click.stop="handleDelete(doc.id, doc.title)"
        >
          ×
        </button>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.sidebar__add {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  border-radius: var(--radius-sm);
  font-size: 16px;
  line-height: 1;
  transition: background 0.15s;
}

.sidebar__add:hover {
  background: var(--color-bg-hover);
  color: var(--color-text);
}

.sidebar__empty {
  padding: 24px 12px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 13px;
}

.sidebar__list {
  list-style: none;
  margin: 0;
  padding: 4px;
  overflow-y: auto;
}

.sidebar__item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.1s;
  gap: 8px;
}

.sidebar__item:hover {
  background: var(--color-bg-hover);
}

.sidebar__item--active {
  background: var(--color-bg-hover);
}

.sidebar__item--active::before {
  content: '';
  width: 3px;
  align-self: stretch;
  background: var(--color-accent);
  border-radius: 2px;
  margin-right: 4px;
}

.sidebar__item-main {
  flex: 1;
  min-width: 0;
}

.sidebar__item-title {
  font-size: 13px;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar__item-time {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.sidebar__item-delete {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 16px;
  line-height: 1;
  border-radius: var(--radius-sm);
  opacity: 0;
  transition: opacity 0.1s, background 0.1s;
}

.sidebar__item:hover .sidebar__item-delete {
  opacity: 1;
}

.sidebar__item-delete:hover {
  background: var(--color-danger);
  color: white;
}
</style>
