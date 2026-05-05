import { ref, watch } from 'vue';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'markdown-editor:theme';

function readInitialTheme(): Theme {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  }
  if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

const theme = ref<Theme>(readInitialTheme());

/**
 * 将主题同步到 <html data-theme>，并持久化。
 */
function applyTheme(t: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = t;
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, t);
  }
}

applyTheme(theme.value);
watch(theme, applyTheme);

export function useTheme() {
  const toggle = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
  };
  return { theme, toggle };
}
