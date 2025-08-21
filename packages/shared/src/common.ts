export interface CursorJson {
  x: number;
  y: number;
  blinking: boolean;
  visible: boolean;
}

export interface AnsiDisplayJson {
  cursor: CursorJson;
  altScreen: boolean;
}
