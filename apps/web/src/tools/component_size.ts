import { useRef, useSyncExternalStore } from 'react';

function _subscribe(target: HTMLElement, callback: () => void): () => void {
  const observer = new ResizeObserver(callback);
  observer.observe(target);
  return () => observer.disconnect();
}
interface Size {
  width: number;
  height: number;
}
export function useComponentSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const stored = useRef<Size | null>(null);

  function _get() {
    const el = ref.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const ret = { width: rect.width, height: rect.height };
      if (
        stored.current &&
        ret.width === stored.current.width &&
        ret.height === stored.current.height
      ) {
        return stored.current;
      } else {
        stored.current = ret;
        return ret;
      }
    }
    return null;
  }
  function _getDummy() {
    return null;
  }
  const size = useSyncExternalStore(
    (onStoreChange) => {
      if (ref.current) {
        return _subscribe(ref.current, onStoreChange);
      } else {
        return () => {
          // Empty cleanup function
        };
      }
    },
    _get,
    _getDummy
  );
  return [ref, size] as const;
}
