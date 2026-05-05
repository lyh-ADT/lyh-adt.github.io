/**
 * 防抖：在调用间隔内只保留最后一次调用
 *
 * 附带 cancel() 与 flush()：
 *  - cancel(): 取消待执行的调用
 *  - flush(): 立即执行一次待执行的调用（如果有）
 */
export interface DebouncedFn<TArgs extends unknown[]> {
  (...args: TArgs): void;
  cancel(): void;
  flush(): void;
}

export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  wait: number,
): DebouncedFn<TArgs> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: TArgs | null = null;

  const debounced = ((...args: TArgs) => {
    lastArgs = args;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (lastArgs) {
        const a = lastArgs;
        lastArgs = null;
        fn(...a);
      }
    }, wait);
  }) as DebouncedFn<TArgs>;

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
  };

  debounced.flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (lastArgs) {
      const a = lastArgs;
      lastArgs = null;
      fn(...a);
    }
  };

  return debounced;
}
