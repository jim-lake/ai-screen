import { useEffect, useState } from 'react';

export interface TerminalLine {
  content: string;
  y: number;
}

export interface CursorState {
  x: number;
  y: number;
  visible: boolean;
}

export interface SelectionState {
  start?: [number, number];
  end?: [number, number];
  columnMode: boolean;
}

export const rendererCallbacks = new Map<
  string,
  {
    setLines: React.Dispatch<React.SetStateAction<TerminalLine[]>>;
    setCursor: React.Dispatch<React.SetStateAction<CursorState>>;
    setSelection: React.Dispatch<React.SetStateAction<SelectionState>>;
    setFocused: React.Dispatch<React.SetStateAction<boolean>>;
  }
>();

export function useXTermReactRenderer(sessionName: string) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [cursor, setCursor] = useState<CursorState>({
    x: 0,
    y: 0,
    visible: true,
  });
  const [selection, setSelection] = useState<SelectionState>({
    columnMode: false,
  });
  const [focused, setFocused] = useState(true);

  useEffect(() => {
    const callbacks = { setLines, setCursor, setSelection, setFocused };

    rendererCallbacks.set(sessionName, callbacks);

    return () => {
      rendererCallbacks.delete(sessionName);
    };
  }, [sessionName]);

  return { lines, cursor, selection, focused };
}
