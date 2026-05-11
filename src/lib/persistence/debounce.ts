export type Debounced<TArgs extends unknown[]> = {
  (...args: TArgs): void;
  flush: () => void;
  cancel: () => void;
};

export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  waitMs: number,
  maxWaitMs?: number,
): Debounced<TArgs> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let maxTimer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: TArgs | null = null;

  const invoke = () => {
    if (!lastArgs) return;
    const args = lastArgs;
    lastArgs = null;
    fn(...args);
  };

  const cancelTimers = () => {
    if (timer) clearTimeout(timer);
    if (maxTimer) clearTimeout(maxTimer);
    timer = null;
    maxTimer = null;
  };

  const debounced = ((...args: TArgs) => {
    lastArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      cancelTimers();
      invoke();
    }, Math.max(0, waitMs));

    if (maxWaitMs !== undefined && maxWaitMs >= 0 && !maxTimer) {
      maxTimer = setTimeout(() => {
        cancelTimers();
        invoke();
      }, maxWaitMs);
    }
  }) as Debounced<TArgs>;

  debounced.flush = () => {
    cancelTimers();
    invoke();
  };

  debounced.cancel = () => {
    cancelTimers();
    lastArgs = null;
  };

  return debounced;
}

