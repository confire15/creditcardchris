/** Coalesce rapid edits, with an explicit flush for pagehide, visibility and unmount. */
export function createSaveQueue(delay = 250) {
  let pending: (() => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    clearTimeout(timer);
    const save = pending;
    pending = undefined;
    save?.();
  };
  return {
    flush,
    schedule(save: () => void) {
      clearTimeout(timer);
      pending = save;
      timer = setTimeout(flush, delay);
    },
  };
}
