export interface AnsiDisplayJson {
  cursor: { x: number; y: number; blinking: boolean; visible: boolean };
  alt_screen: boolean;
}
