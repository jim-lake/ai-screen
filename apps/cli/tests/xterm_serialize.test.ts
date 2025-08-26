import { describe, it } from 'node:test';
import assert from 'node:assert';
import { lineToString } from '../src/lib/xterm_serialize';
import type { IBufferLine, IBufferCell } from '@xterm/headless';

// Mock IBufferCell implementation
class MockBufferCell implements IBufferCell {
  public constructor(
    private readonly chars: string,
    private readonly fg_color_mode = 0,
    private readonly fg_color = 0,
    private readonly bg_color_mode = 0,
    private readonly bg_color = 0,
    private readonly bold = false,
    private readonly italic = false,
    private readonly dim = false,
    private readonly underline = false,
    private readonly blink = false,
    private readonly inverse = false,
    private readonly invisible = false,
    private readonly strikethrough = false,
    private readonly overline = false
  ) {}

  public getWidth(): number {
    return this.chars.length > 0 ? 1 : 0;
  }

  public getChars(): string {
    return this.chars;
  }

  public getCode(): number {
    return this.chars.charCodeAt(0) || 0;
  }

  public getFgColorMode(): number {
    return this.fg_color_mode;
  }

  public getBgColorMode(): number {
    return this.bg_color_mode;
  }

  public getFgColor(): number {
    return this.fg_color;
  }

  public getBgColor(): number {
    return this.bg_color;
  }

  public isBold(): number {
    return this.bold ? 1 : 0;
  }

  public isItalic(): number {
    return this.italic ? 1 : 0;
  }

  public isDim(): number {
    return this.dim ? 1 : 0;
  }

  public isUnderline(): number {
    return this.underline ? 1 : 0;
  }

  public isBlink(): number {
    return this.blink ? 1 : 0;
  }

  public isInverse(): number {
    return this.inverse ? 1 : 0;
  }

  public isInvisible(): number {
    return this.invisible ? 1 : 0;
  }

  public isStrikethrough(): number {
    return this.strikethrough ? 1 : 0;
  }

  public isOverline(): number {
    return this.overline ? 1 : 0;
  }

  public isFgRGB(): boolean {
    return this.fg_color_mode === 2;
  }

  public isBgRGB(): boolean {
    return this.bg_color_mode === 2;
  }

  public isFgPalette(): boolean {
    return this.fg_color_mode === 1;
  }

  public isBgPalette(): boolean {
    return this.bg_color_mode === 1;
  }

  public isFgDefault(): boolean {
    return this.fg_color_mode === 0;
  }

  public isBgDefault(): boolean {
    return this.bg_color_mode === 0;
  }

  public isAttributeDefault(): boolean {
    return (
      this.fg_color_mode === 0 &&
      this.bg_color_mode === 0 &&
      !this.bold &&
      !this.italic &&
      !this.dim &&
      !this.underline &&
      !this.blink &&
      !this.inverse &&
      !this.invisible &&
      !this.strikethrough &&
      !this.overline
    );
  }
}

// Mock IBufferLine implementation
class MockBufferLine implements IBufferLine {
  public constructor(
    private readonly cells: (MockBufferCell | undefined)[],
    public isWrapped = false
  ) {}

  public get length(): number {
    return this.cells.length;
  }

  public getCell(x: number): IBufferCell | undefined {
    return this.cells[x];
  }

  public translateToString(
    trim_right?: boolean,
    start_column?: number,
    end_column?: number
  ): string {
    const start = start_column ?? 0;
    const end = end_column ?? this.length;
    let result = '';

    for (let i = start; i < end && i < this.length; i++) {
      const cell = this.cells[i];
      result += cell ? cell.getChars() : ' ';
    }

    return trim_right ? result.trimEnd() : result;
  }
}

void describe('xterm_serialize', () => {
  void describe('lineToString', () => {
    void it('should return empty string for empty line', () => {
      const line = new MockBufferLine([]);
      assert.strictEqual(lineToString(line), '');
    });

    void it('should return empty string for line with only spaces', () => {
      const line = new MockBufferLine([
        new MockBufferCell(' '),
        new MockBufferCell(' '),
        new MockBufferCell(' '),
      ]);
      assert.strictEqual(lineToString(line), '');
    });

    void it('should handle plain text without formatting', () => {
      const line = new MockBufferLine([
        new MockBufferCell('h'),
        new MockBufferCell('e'),
        new MockBufferCell('l'),
        new MockBufferCell('l'),
        new MockBufferCell('o'),
      ]);
      assert.strictEqual(lineToString(line), 'hello');
    });

    void it('should trim trailing spaces', () => {
      const line = new MockBufferLine([
        new MockBufferCell('h'),
        new MockBufferCell('i'),
        new MockBufferCell(' '),
        new MockBufferCell(' '),
      ]);
      assert.strictEqual(lineToString(line), 'hi');
    });

    void it('should preserve internal spaces', () => {
      const line = new MockBufferLine([
        new MockBufferCell('h'),
        new MockBufferCell(' '),
        new MockBufferCell('i'),
      ]);
      assert.strictEqual(lineToString(line), 'h i');
    });

    void it('should handle bold text', () => {
      const line = new MockBufferLine([
        new MockBufferCell('h', 0, 0, 0, 0, true), // bold
        new MockBufferCell('i'),
      ]);
      assert.strictEqual(lineToString(line), '\x1b[1mh\x1b[0mi');
    });

    void it('should handle italic text', () => {
      const line = new MockBufferLine([
        new MockBufferCell('h', 0, 0, 0, 0, false, true), // italic
        new MockBufferCell('i'),
      ]);
      assert.strictEqual(lineToString(line), '\x1b[3mh\x1b[0mi');
    });

    void it('should handle underline text', () => {
      const line = new MockBufferLine([
        new MockBufferCell('h', 0, 0, 0, 0, false, false, false, true), // underline
        new MockBufferCell('i'),
      ]);
      assert.strictEqual(lineToString(line), '\x1b[4mh\x1b[0mi');
    });

    void it('should handle multiple attributes', () => {
      const line = new MockBufferLine([
        new MockBufferCell('h', 0, 0, 0, 0, true, true), // bold + italic
        new MockBufferCell('i'),
      ]);
      assert.strictEqual(lineToString(line), '\x1b[1m\x1b[3mh\x1b[0mi');
    });

    void it('should handle basic ANSI colors (0-7)', () => {
      const line = new MockBufferLine([
        new MockBufferCell('r', 1, 1), // red foreground
        new MockBufferCell('g', 1, 2), // green foreground
        new MockBufferCell('b', 1, 4), // blue foreground
      ]);
      assert.strictEqual(
        lineToString(line),
        '\x1b[31mr\x1b[32mg\x1b[34mb\x1b[0m'
      );
    });

    void it('should handle bright ANSI colors (8-15)', () => {
      const line = new MockBufferLine([
        new MockBufferCell('r', 1, 9), // bright red
        new MockBufferCell('g', 1, 10), // bright green
      ]);
      assert.strictEqual(lineToString(line), '\x1b[91mr\x1b[92mg\x1b[0m');
    });

    void it('should handle 256-color palette', () => {
      const line = new MockBufferLine([
        new MockBufferCell('x', 1, 196), // bright red in 256-color palette
        new MockBufferCell('y', 1, 46), // bright green in 256-color palette
      ]);
      assert.strictEqual(
        lineToString(line),
        '\x1b[38;5;196mx\x1b[38;5;46my\x1b[0m'
      );
    });

    void it('should handle RGB colors', () => {
      const line = new MockBufferLine([
        new MockBufferCell('r', 2, 0xff0000), // red RGB
        new MockBufferCell('g', 2, 0x00ff00), // green RGB
      ]);
      assert.strictEqual(
        lineToString(line),
        '\x1b[38;2;255;0;0mr\x1b[38;2;0;255;0mg\x1b[0m'
      );
    });

    void it('should handle background colors', () => {
      const line = new MockBufferLine([
        new MockBufferCell('x', 0, 0, 1, 1), // red background
        new MockBufferCell('y', 0, 0, 1, 2), // green background
      ]);
      assert.strictEqual(lineToString(line), '\x1b[41mx\x1b[42my\x1b[0m');
    });

    void it('should handle bright background colors', () => {
      const line = new MockBufferLine([
        new MockBufferCell('x', 0, 0, 1, 9), // bright red background
        new MockBufferCell('y', 0, 0, 1, 10), // bright green background
      ]);
      assert.strictEqual(lineToString(line), '\x1b[101mx\x1b[102my\x1b[0m');
    });

    void it('should handle RGB background colors', () => {
      const line = new MockBufferLine([
        new MockBufferCell('x', 0, 0, 2, 0xff0000), // red RGB background
        new MockBufferCell('y', 0, 0, 2, 0x00ff00), // green RGB background
      ]);
      assert.strictEqual(
        lineToString(line),
        '\x1b[48;2;255;0;0mx\x1b[48;2;0;255;0my\x1b[0m'
      );
    });

    void it('should handle foreground and background colors together', () => {
      const line = new MockBufferLine([
        new MockBufferCell('x', 1, 1, 1, 4), // red fg, blue bg
        new MockBufferCell('y'),
      ]);
      assert.strictEqual(lineToString(line), '\x1b[31m\x1b[44mx\x1b[0my');
    });

    void it('should optimize consecutive characters with same formatting', () => {
      const line = new MockBufferLine([
        new MockBufferCell('h', 1, 1), // red
        new MockBufferCell('e', 1, 1), // red (same)
        new MockBufferCell('l', 1, 1), // red (same)
        new MockBufferCell('l', 1, 2), // green (different)
        new MockBufferCell('o', 1, 2), // green (same)
      ]);
      assert.strictEqual(lineToString(line), '\x1b[31mhel\x1b[32mlo\x1b[0m');
    });

    void it('should handle reset to default colors', () => {
      const line = new MockBufferLine([
        new MockBufferCell('r', 1, 1), // red
        new MockBufferCell('d', 0, 0), // default
        new MockBufferCell('b', 1, 4), // blue
      ]);
      assert.strictEqual(
        lineToString(line),
        '\x1b[31mr\x1b[0md\x1b[34mb\x1b[0m'
      );
    });

    void it('should handle complex formatting transitions', () => {
      const line = new MockBufferLine([
        new MockBufferCell('a', 1, 1, 1, 4, true), // red fg, blue bg, bold
        new MockBufferCell('b', 1, 2, 1, 4, false, true), // green fg, blue bg, italic
        new MockBufferCell('c', 0, 0, 0, 0), // default
      ]);
      // First char: red fg + blue bg + bold
      // Second char: needs reset (bold->italic), then green fg + blue bg + italic
      // Third char: reset to default
      assert.strictEqual(
        lineToString(line),
        '\x1b[1m\x1b[31m\x1b[44ma\x1b[0m\x1b[3m\x1b[32m\x1b[44mb\x1b[0mc'
      );
    });

    void it('should handle undefined cells as spaces', () => {
      const line = new MockBufferLine([
        new MockBufferCell('a'),
        undefined,
        new MockBufferCell('c'),
      ]);
      assert.strictEqual(lineToString(line), 'a c');
    });

    void it('should not add reset sequence if line ends with default formatting', () => {
      const line = new MockBufferLine([
        new MockBufferCell('h'),
        new MockBufferCell('i'),
      ]);
      assert.strictEqual(lineToString(line), 'hi');
    });

    void it('should handle strikethrough attribute', () => {
      const line = new MockBufferLine([
        new MockBufferCell(
          'x',
          0,
          0,
          0,
          0,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          true
        ), // strikethrough
        new MockBufferCell('y'),
      ]);
      assert.strictEqual(lineToString(line), '\x1b[9mx\x1b[0my');
    });

    void it('should handle dim attribute', () => {
      const line = new MockBufferLine([
        new MockBufferCell('x', 0, 0, 0, 0, false, false, true), // dim
        new MockBufferCell('y'),
      ]);
      assert.strictEqual(lineToString(line), '\x1b[2mx\x1b[0my');
    });

    void it('should handle blink attribute', () => {
      const line = new MockBufferLine([
        new MockBufferCell('x', 0, 0, 0, 0, false, false, false, false, true), // blink
        new MockBufferCell('y'),
      ]);
      assert.strictEqual(lineToString(line), '\x1b[5mx\x1b[0my');
    });

    void it('should handle inverse attribute', () => {
      const line = new MockBufferLine([
        new MockBufferCell(
          'x',
          0,
          0,
          0,
          0,
          false,
          false,
          false,
          false,
          false,
          true
        ), // inverse
        new MockBufferCell('y'),
      ]);
      assert.strictEqual(lineToString(line), '\x1b[7mx\x1b[0my');
    });

    void it('should handle invisible attribute', () => {
      const line = new MockBufferLine([
        new MockBufferCell(
          'x',
          0,
          0,
          0,
          0,
          false,
          false,
          false,
          false,
          false,
          false,
          true
        ), // invisible
        new MockBufferCell('y'),
      ]);
      assert.strictEqual(lineToString(line), '\x1b[8mx\x1b[0my');
    });

    void it('should handle overline attribute', () => {
      const line = new MockBufferLine([
        new MockBufferCell(
          'x',
          0,
          0,
          0,
          0,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          true
        ), // overline
        new MockBufferCell('y'),
      ]);
      assert.strictEqual(lineToString(line), '\x1b[53mx\x1b[0my');
    });
  });
});
